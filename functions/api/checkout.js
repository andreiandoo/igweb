/**
 * iGROWth · POST /api/checkout — reia plata pentru un cont deja creat.
 *
 * De ce există: fluxul e „plătește întâi, confirmă după". Dacă omul închide
 * pagina Stripe, contul rămâne creat dar inactiv, iar emailul de confirmare nu
 * a plecat (backend-ul îl trimite după plata reușită). Fără o cale de întoarcere,
 * acel cont rămâne blocat.
 *
 * Pagina /plata-anulata primește id-ul în `?a=` și oferă butonul „Reia plata",
 * care ajunge aici. Funcția doar reapelează /plan-checkout, cu secretul adăugat
 * server-side — la fel ca /api/lead.
 *
 * Id-ul din URL nu e un secret: cu el se poate doar PORNI o plată pentru un
 * abonament deja înregistrat, nu se poate citi sau modifica nimic.
 *
 * `m` e jetonul semnat pentru Purchase (lib/meta.js), venit din /api/lead prin
 * URL-ul de anulare; îl trecem mai departe, ca plata reluată să fie atribuită
 * la fel. Cu el, și cu acordul pentru cookie-uri, pleacă și InitiateCheckout.
 */

import { readIdentity, buildEvent, sendEvents, later, readToken } from '../../lib/meta.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.IG_API_URL || !env.REGISTRATION_API_SECRET) {
    return json({ ok: false, error: 'Plata nu e configurată. Scrie-ne și te ajutăm.' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Cerere invalidă.' }, 400);
  }

  const athleteId = String(body?.athlete_id ?? '').trim();
  /* id-urile sunt UUID-uri; orice altceva nu are ce căuta mai departe */
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(athleteId)) {
    return json({ ok: false, error: 'Link incomplet. Reia înscrierea sau scrie-ne.' }, 400);
  }

  const origin = new URL(request.url).origin;
  const token = (await readToken(env, body?.m)) ? String(body.m) : '';
  const m = token ? `m=${token}` : '';

  try {
    const res = await fetch(env.IG_API_URL.replace(/\/$/, '') + '/plan-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Registration-Key': env.REGISTRATION_API_SECRET,
      },
      body: JSON.stringify({
        athlete_id: athleteId,
        success_url: `${origin}/cont-creat${m ? `?${m}` : ''}`,
        cancel_url: `${origin}/plata-anulata?a=${encodeURIComponent(athleteId)}${m ? `&${m}` : ''}`,
      }),
    });

    let data = null;
    try { data = await res.json(); } catch { /* răspuns fără JSON */ }

    if (res.status === 200 && data?.url) {
      const meta = await initiateCheckout(request, env, waitUntil, body, token);
      return json({ ok: true, url: data.url, ...(meta ? { meta } : {}) });
    }

    console.error('[checkout] reluare eșuată', { athleteId, status: res.status, data });
    return json({
      ok: false,
      error: data?.error ?? 'Nu am putut porni plata. Scrie-ne și o rezolvăm.',
    }, 502);
  } catch (e) {
    console.error('[checkout] API inaccesibil', String(e));
    return json({ ok: false, error: 'Nu am putut contacta serverul de plăți. Încearcă din nou.' }, 502);
  }
}

/** InitiateCheckout pentru plata reluată — doar cu jeton valid și acord pentru cookie-uri. */
async function initiateCheckout(request, env, waitUntil, body, token) {
  const identity = readIdentity(body?.meta);
  const t = token ? await readToken(env, token) : null;
  if (!t || !identity.consent) return null;
  const ev = {
    name: 'InitiateCheckout',
    id: identity.eventId,
    custom: {
      content_name: t.src, content_ids: [t.plan], content_type: 'product', num_items: 1,
      billing_period: t.period, ...(t.v ? { value: t.v, currency: t.c } : {}),
    },
  };
  await later(waitUntil, sendEvents(env, [await buildEvent({ ...ev, request, identity })]));
  return { events: [ev], user: {} };
}

export function onRequestGet() {
  return json({ ok: false, error: 'Metodă neacceptată.' }, 405);
}

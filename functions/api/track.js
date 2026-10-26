/**
 * iGROWth · POST /api/track — evenimentele Meta din pagini, trimise prin
 * Conversions API.
 *
 * Browserul (site.js) pune fiecare eveniment în dataLayer, pentru Pixel-ul din
 * GTM, și îl trimite și aici, cu același event_id. Conversiile formularelor NU
 * trec pe aici — le trimite /api/lead, după răspunsul de succes.
 *
 * Primește: { event, event_id, custom_data?, token?, consent, fbp, fbc, vid, url }
 * Răspunde mereu 204: browserul nu are ce face cu rezultatul.
 *
 * Doar evenimentele din ALLOWED trec. Purchase cere jetonul semnat emis de
 * /api/lead la pornirea plății; valoarea se ia din jeton, nu din browser.
 */

import { readIdentity, buildEvent, sendEvents, later, readToken, metaConfigured } from '../../lib/meta.js';

const ALLOWED = new Set([
  'PageView', 'ViewContent', 'StartRegistration', 'ViewPricing',
  'Contact', 'ClickAppDownload', 'ClickLogin', 'Purchase',
]);

const empty = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/** Doar chei simple, valori scurte — nimic din browser nu ajunge nefiltrat la Meta. */
function cleanCustom(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw).slice(0, 10)) {
    if (!/^[a-z_]{1,40}$/.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 100);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!metaConfigured(env)) return empty();

  let body;
  try {
    const text = await request.text();
    if (text.length > 4000) return empty();
    body = JSON.parse(text);
  } catch {
    return empty();
  }

  const name = String(body?.event ?? '');
  const identity = readIdentity(body);
  if (!ALLOWED.has(name) || !identity.consent) return empty();

  let custom = cleanCustom(body.custom_data);
  let id = identity.eventId;

  if (name === 'Purchase') {
    const t = await readToken(env, body.token);
    if (!t) return empty();
    /* același event_id la fiecare reîncărcare a paginii → Meta îl numără o dată */
    id = t.id;
    custom = {
      content_name: t.src, content_ids: [t.plan], content_type: 'product', num_items: 1,
      billing_period: t.period, ...(t.v ? { value: t.v, currency: t.c } : {}),
    };
  }

  const event = await buildEvent({ name, id, request, identity, custom });
  await later(waitUntil, sendEvents(env, [event]));
  return empty();
}

/**
 * GET: spune dacă variabilele au ajuns la funcție (da/nu, niciodată valorile).
 * `?check=meta` verifică în plus că Meta acceptă token-ul pentru acest Pixel:
 * trimite o listă GOALĂ de evenimente. Meta verifică întâi token-ul (eroare
 * 190 dacă e greșit), apoi refuză lista goală — deci nu se înregistrează nimic.
 * Token-urile din Events Manager nu pot citi detaliile Pixel-ului, doar trimite.
 */
export async function onRequestGet({ request, env }) {
  const body = {
    ok: false,
    error: 'Metodă neacceptată.',
    configurat: { pixel: Boolean(env.META_PIXEL_ID), token: Boolean(env.META_CAPI_TOKEN), test: Boolean(env.META_TEST_EVENT_CODE) },
  };

  if (new URL(request.url).searchParams.get('check') === 'meta' && metaConfigured(env)) {
    const version = env.META_API_VERSION || 'v25.0';
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(env.META_PIXEL_ID)}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [], access_token: env.META_CAPI_TOKEN }),
      });
      const out = await res.json().catch(() => null);
      const err = out?.error;
      /* 190 = token invalid/expirat; 10/200 = fără drept pe acest Pixel */
      const authProblem = err && [190, 10, 200, 803].includes(err.code);
      body.meta = authProblem
        ? { ok: false, status: res.status, cod: err.code, mesaj: err.message }
        : { ok: true, mesaj: 'Token-ul e acceptat pentru acest Pixel.', raspuns_meta: err?.message ?? 'ok' };
    } catch (e) {
      body.meta = { ok: false, mesaj: `Meta inaccesibil: ${String(e?.message ?? e)}` };
    }
  }

  return new Response(JSON.stringify(body), {
    status: 405, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

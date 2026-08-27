/**
 * iGROWth · POST /api/lead — Cloudflare Pages Function
 *
 * Primește înscrierile din formularele site-ului (părinți, sportivi, cluburi,
 * antrenori), le validează pe server și le pune în siguranță.
 *
 * ┌─ ETAPA CURENTĂ ────────────────────────────────────────────────────────┐
 * │ NU creează conturi în app.sportiveducat.ro. Doar validează, salvează   │
 * │ lead-ul și trimite notificarea. Trimiterea către API-ul igapp este     │
 * │ scrisă mai jos, dar rulează DOAR dacă variabila IG_FORWARD = "on".     │
 * │ Vezi docs/PLAN-FORMULARE-APP.md.                                       │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Variabile de mediu (Cloudflare → Pages → Settings → Environment variables):
 *   LEAD_WEBHOOK     opțional  URL care primește lead-ul (Zapier / Make / Slack)
 *   POSTMARK_TOKEN   opțional  token Postmark pentru notificare pe email
 *   LEAD_EMAIL_TO    opțional  destinatarul notificării
 *   LEAD_EMAIL_FROM  opțional  expeditorul (adresă verificată în Postmark)
 *   IG_API_URL       opțional  ex. https://api.sportiveducat.ro
 *   IG_FORWARD       opțional  "on" ⇒ trimite mai departe către IG_API_URL
 *
 * Binding-uri (opțional, dar recomandat):
 *   LEADS            KV Namespace — stochează lead-urile și limitează rata
 */

const TYPES = ['parent', 'athlete', 'club', 'coach'];

/** Câmpuri obligatorii pe tip de formular. */
const REQUIRED = {
  parent: ['child_first_name', 'child_age', 'parent_name', 'parent_email'],
  athlete: ['first_name', 'age'],
  club: ['legal_name', 'short_name', 'president_name', 'phone', 'email'],
  coach: ['full_name', 'phone', 'email'],
};

/** Câmpuri care nu se stochează și nu se trimit nicăieri în afară de API. */
const SECRET = /password|parola/i;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/** Elimină parolele și câmpurile tehnice dintr-un obiect. */
function scrub(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (SECRET.test(k) || k === 'website_confirm') continue;
    out[k] = typeof v === 'string' ? v.trim().slice(0, 500) : v;
  }
  return out;
}

/** Limitare simplă pe IP, dacă există KV. Fără KV, se bazează pe regulile din zonă. */
async function rateLimited(env, ip) {
  if (!env.LEADS || !ip) return false;
  const key = `rl:${ip}`;
  const count = Number((await env.LEADS.get(key)) ?? 0);
  if (count >= 5) return true;
  await env.LEADS.put(key, String(count + 1), { expirationTtl: 600 });
  return false;
}

async function notify(env, lead) {
  const tasks = [];

  if (env.LEAD_WEBHOOK) {
    tasks.push(fetch(env.LEAD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    }).catch(() => {}));
  }

  if (env.POSTMARK_TOKEN && env.LEAD_EMAIL_TO && env.LEAD_EMAIL_FROM) {
    const rows = Object.entries(lead.data)
      .map(([k, v]) => `${k}: ${v}`).join('\n');
    tasks.push(fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': env.POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: env.LEAD_EMAIL_FROM,
        To: env.LEAD_EMAIL_TO,
        Subject: `[sportiveducat.ro] Înscriere nouă — ${lead.type}`,
        TextBody: `Tip: ${lead.type}\nData: ${lead.created_at}\nPagina: ${lead.page}\n\n${rows}`,
        MessageStream: 'outbound',
      }),
    }).catch(() => {}));
  }

  await Promise.allSettled(tasks);
}

/**
 * Trimiterea către API-ul aplicației. Rulează doar cu IG_FORWARD = "on".
 * Momentan există un singur endpoint public potrivit: cluburile.
 * Pentru părinți / antrenori / sportivi trebuie întâi create rutele în igapp —
 * vezi docs/PLAN-FORMULARE-APP.md, etapa 3.
 */
async function forward(env, lead) {
  if (env.IG_FORWARD !== 'on' || !env.IG_API_URL) return { forwarded: false };
  if (lead.type !== 'club') return { forwarded: false, reason: 'endpoint inexistent' };

  const d = lead.data;
  const payload = {
    legal_name: d.legal_name,
    short_name: d.short_name,
    sports: String(d.sports ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    cui: d.cui || null,
    cis_code: d.cis_code || null,
    president_name: d.president_name,
    phone: d.phone,
    website: d.website || null,
    email: d.email,
    street: d.street || null,
    city: d.city || null,
    county: d.county || null,
    heard_about_us: d.heard_about_us || null,
    terms_accepted: true,
    privacy_accepted: true,
  };

  const res = await fetch(`${env.IG_API_URL}/auth/register-club-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let body = null;
  try { body = await res.json(); } catch { /* răspuns fără JSON */ }
  return { forwarded: true, status: res.status, body };
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Cerere invalidă.' }, 400);
  }

  const type = payload?.type;
  const data = payload?.data;

  if (!TYPES.includes(type) || !data || typeof data !== 'object') {
    return json({ ok: false, error: 'Formular necunoscut.' }, 400);
  }

  /* honeypot: completat doar de boți — răspundem „ok" ca să nu învețe */
  if (data.website_confirm) return json({ ok: true });

  const missing = REQUIRED[type].filter((f) => !String(data[f] ?? '').trim());
  if (missing.length) {
    return json({ ok: false, error: 'Mai sunt câmpuri de completat.', fields: missing }, 422);
  }

  const email = data.email ?? data.parent_email ?? data.guardian_email ?? '';
  if (email && !isEmail(email)) {
    return json({ ok: false, error: 'Adresa de email nu pare validă.', fields: ['email'] }, 422);
  }
  if (!data.terms_accepted || !data.privacy_accepted) {
    return json({ ok: false, error: 'Trebuie să accepți termenii și politica de confidențialitate.' }, 422);
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (await rateLimited(env, ip)) {
    return json({ ok: false, error: 'Prea multe încercări. Încearcă din nou în câteva minute.' }, 429);
  }

  const lead = {
    type,
    created_at: new Date().toISOString(),
    page: request.headers.get('Referer') ?? '',
    country: request.headers.get('CF-IPCountry') ?? '',
    data: scrub(data),
  };

  if (env.LEADS) {
    const id = `lead:${lead.created_at}:${crypto.randomUUID()}`;
    await env.LEADS.put(id, JSON.stringify(lead));
  }

  await notify(env, lead);

  let result = { forwarded: false };
  try {
    result = await forward(env, lead);
  } catch {
    /* dacă API-ul e indisponibil, lead-ul e deja salvat — nu pierdem nimic */
  }

  /* erorile clare din API merg înapoi la utilizator */
  if (result.forwarded && result.status === 409) {
    return json({
      ok: false,
      error: result.body?.error ?? 'Există deja un cont cu aceste date.',
      conflict: true,
    }, 409);
  }

  return json({ ok: true });
}

/** GET pe endpoint nu are sens — răspundem scurt, ca să nu pară o pagină. */
export function onRequestGet() {
  return json({ ok: false, error: 'Metodă neacceptată.' }, 405);
}

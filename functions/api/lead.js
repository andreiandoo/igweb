/**
 * iGROWth · POST /api/lead — Cloudflare Pages Function
 *
 * Primește înscrierile din formularele site-ului, le validează pe server și le
 * trimite mai departe către API-ul aplicației (Railway), server-to-server.
 * Secretul de înregistrare NU ajunge niciodată în browser.
 *
 * Traseu:
 *   formular → /api/lead → validare + anti-spam
 *                        → POST către API (cu X-Registration-Key)
 *                        → [plan plătit] POST /plan-checkout
 *                        → { ok: true, checkout_url? }
 *
 * Variabile de mediu (Cloudflare → Settings → Environment variables):
 *   REGISTRATION_API_SECRET  obligatoriu  aceeași valoare ca în Railway (Encrypt!)
 *   IG_API_URL               obligatoriu  https://igapp-production.up.railway.app
 *   IG_FORWARD               "on" ⇒ trimite către API; altfel doar colectează
 *   LEAD_WEBHOOK             opțional     copie a lead-ului (Zapier / Make / Slack)
 *   POSTMARK_TOKEN + LEAD_EMAIL_TO + LEAD_EMAIL_FROM   opțional, notificare email
 *
 * Binding-uri (recomandat):
 *   LEADS   KV Namespace — copie de siguranță a înscrierilor + limitare pe IP
 */

/* ---------------------------------------------------------------- utilitare */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const str = (v) => String(v ?? '').trim();
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(s));
const isUsername = (s) => /^[a-z0-9_.]{3,30}$/.test(str(s));
const orNull = (v) => (str(v) === '' ? null : str(v));

/** Câmpurile care nu au voie să ajungă în stocare sau în notificări. */
const SECRET_FIELD = /password|parola/i;

/** Copie a datelor fără parole — doar asta se salvează sau se trimite pe email. */
function scrub(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (SECRET_FIELD.test(k) || k === 'website_confirm') continue;
    out[k] = typeof v === 'string' ? v.trim().slice(0, 500) : v;
  }
  return out;
}

/* -------------------------------------------------- validare per formular */

/**
 * Fiecare tip știe: ce câmpuri sunt obligatorii, ce verificări în plus are, ce
 * endpoint apelează și cum arată payload-ul. Un singur loc de modificat când se
 * schimbă contractul cu backend-ul.
 */
const FORMS = {
  parent: {
    endpoint: '/auth/register-parent',
    needsKey: true,
    required: ['child_first_name', 'child_age', 'child_password', 'parent_name', 'parent_email', 'parent_password'],
    check(d) {
      if (!isEmail(d.parent_email)) return ['Adresa de email a părintelui nu pare validă.', ['parent_email']];
      if (str(d.parent_password).length < 6) return ['Parola părintelui trebuie să aibă minim 6 caractere.', ['parent_password']];
      if (str(d.child_password).length < 6) return ['Parola copilului trebuie să aibă minim 6 caractere.', ['child_password']];
      if (!str(d.child_email) && !str(d.child_username)) {
        return ['Copilul are nevoie de un email sau de un username.', ['child_email', 'child_username']];
      }
      if (str(d.child_email) && !isEmail(d.child_email)) return ['Adresa de email a copilului nu pare validă.', ['child_email']];
      if (str(d.child_username) && !isUsername(d.child_username)) {
        return ['Username-ul poate avea 3–30 de caractere: litere mici, cifre, punct sau underscore.', ['child_username']];
      }
      if (!str(d.plan)) return ['Alege un plan.', ['plan']];
      return null;
    },
    payload: (d) => ({
      parent: {
        name: str(d.parent_name),
        email: str(d.parent_email).toLowerCase(),
        password: str(d.parent_password),
        ...(str(d.parent_phone) ? { phone: str(d.parent_phone) } : {}),
      },
      child: {
        first_name: str(d.child_first_name),
        age: Number(d.child_age),
        ...(str(d.child_sport) ? { sport: str(d.child_sport) } : {}),
        ...(str(d.child_email) ? { email: str(d.child_email).toLowerCase() } : {}),
        ...(str(d.child_username) ? { username: str(d.child_username).toLowerCase() } : {}),
        password: str(d.child_password),
      },
      plan: str(d.plan),
      billing_period: str(d.billing_period) || 'month',
      terms_accepted: true,
      privacy_accepted: true,
      source: 'web:parinti',
    }),
    /** id-ul pe care îl cere /plan-checkout */
    athleteId: (res) => res?.child?.id,
  },

  athlete: {
    endpoint: '/auth/register-athlete',
    needsKey: true,
    required: ['first_name', 'age', 'password'],
    check(d) {
      if (str(d.password).length < 6) return ['Parola trebuie să aibă minim 6 caractere.', ['password']];
      if (!str(d.email) && !str(d.username)) return ['Ai nevoie de un email sau de un username.', ['email', 'username']];
      if (str(d.email) && !isEmail(d.email)) return ['Adresa de email nu pare validă.', ['email']];
      if (str(d.username) && !isUsername(d.username)) {
        return ['Username-ul poate avea 3–30 de caractere: litere mici, cifre, punct sau underscore.', ['username']];
      }
      const age = Number(d.age);
      if (age < 18) {
        if (!str(d.guardian_name) || !str(d.guardian_email) || !d.guardian_consent) {
          return ['Pentru un sportiv minor sunt necesare datele părintelui și acordul lui.',
            ['guardian_name', 'guardian_email', 'guardian_consent']];
        }
        if (!isEmail(d.guardian_email)) return ['Adresa de email a părintelui nu pare validă.', ['guardian_email']];
      }
      return null;
    },
    payload: (d) => ({
      first_name: str(d.first_name),
      age: Number(d.age),
      ...(str(d.email) ? { email: str(d.email).toLowerCase() } : {}),
      ...(str(d.username) ? { username: str(d.username).toLowerCase() } : {}),
      password: str(d.password),
      ...(str(d.sport) ? { sport: str(d.sport) } : {}),
      ...(Number(d.age) < 18 ? {
        guardian_name: str(d.guardian_name),
        guardian_email: str(d.guardian_email).toLowerCase(),
        guardian_phone: orNull(d.guardian_phone),
        guardian_consent: true,
      } : {}),
      plan: str(d.plan) || 'free',
      billing_period: str(d.billing_period) || 'month',
      terms_accepted: true,
      privacy_accepted: true,
      source: 'web:sportivi',
    }),
    athleteId: (res) => res?.athlete?.id,
  },

  club: {
    endpoint: '/auth/register-club-admin',
    needsKey: false,          // endpoint public, nu cere secretul
    required: ['legal_name', 'short_name', 'president_name', 'phone', 'email'],
    check(d) {
      if (!isEmail(d.email)) return ['Adresa de email nu pare validă.', ['email']];
      if (!str(d.sports)) return ['Selectează cel puțin un sport.', ['sports']];
      return null;
    },
    payload: (d) => ({
      legal_name: str(d.legal_name),
      short_name: str(d.short_name),
      sports: str(d.sports).split(',').map((s) => s.trim()).filter(Boolean),
      cui: orNull(d.cui),
      cis_code: orNull(d.cis_code),
      president_name: str(d.president_name),
      phone: str(d.phone),
      website: orNull(d.website),
      email: str(d.email).toLowerCase(),
      street: orNull(d.street),
      city: orNull(d.city),
      county: orNull(d.county),
      heard_about_us: orNull(d.heard_about_us),
      terms_accepted: true,
      privacy_accepted: true,
    }),
    athleteId: () => null,     // cluburile nu trec prin /plan-checkout
  },

  /* Antrenorii nu au încă endpoint în aplicație — se colectează ca lead. */
  coach: {
    endpoint: null,
    needsKey: false,
    required: ['full_name', 'phone', 'email'],
    check: (d) => (isEmail(d.email) ? null : ['Adresa de email nu pare validă.', ['email']]),
    payload: null,
    athleteId: () => null,
  },
};

/* ------------------------------------------------- stocare și notificări */

/** Limitare pe IP, dacă e legat un KV namespace. */
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
    const rows = Object.entries(lead.data).map(([k, v]) => `${k}: ${v}`).join('\n');
    tasks.push(fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Postmark-Server-Token': env.POSTMARK_TOKEN },
      body: JSON.stringify({
        From: env.LEAD_EMAIL_FROM,
        To: env.LEAD_EMAIL_TO,
        Subject: `[sportiveducat.ro] Înscriere nouă — ${lead.type}`,
        TextBody: `Tip: ${lead.type}\nData: ${lead.created_at}\nPagina: ${lead.page}\nStatus: ${lead.status}\n\n${rows}`,
        MessageStream: 'outbound',
      }),
    }).catch(() => {}));
  }

  await Promise.allSettled(tasks);
}

/* ------------------------------------------------------------ apel API */

function apiHeaders(env, needsKey) {
  const h = { 'Content-Type': 'application/json' };
  if (needsKey && env.REGISTRATION_API_SECRET) {
    h['X-Registration-Key'] = env.REGISTRATION_API_SECRET;
  }
  return h;
}

async function callApi(env, path, needsKey, body) {
  const res = await fetch(env.IG_API_URL.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: apiHeaders(env, needsKey),
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* răspuns fără JSON */ }
  return { status: res.status, data };
}

/* ------------------------------------------------------------ handler */

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Cerere invalidă.' }, 400);
  }

  const type = payload?.type;
  const data = payload?.data;
  const form = FORMS[type];

  if (!form || !data || typeof data !== 'object') {
    return json({ ok: false, error: 'Formular necunoscut.' }, 400);
  }

  /* honeypot: completat doar de boți — răspundem „ok" ca să nu învețe */
  if (data.website_confirm) return json({ ok: true });

  const missing = form.required.filter((f) => !str(data[f]));
  if (missing.length) {
    return json({ ok: false, error: 'Mai sunt câmpuri de completat.', fields: missing }, 422);
  }
  if (!data.terms_accepted || !data.privacy_accepted) {
    return json({ ok: false, error: 'Trebuie să accepți termenii și politica de confidențialitate.' }, 422);
  }
  const problem = form.check(data);
  if (problem) return json({ ok: false, error: problem[0], fields: problem[1] }, 422);

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (await rateLimited(env, ip)) {
    return json({ ok: false, error: 'Prea multe încercări. Încearcă din nou în câteva minute.' }, 429);
  }

  const origin = new URL(request.url).origin;
  const lead = {
    type,
    created_at: new Date().toISOString(),
    page: request.headers.get('Referer') ?? '',
    country: request.headers.get('CF-IPCountry') ?? '',
    status: 'colectat',
    data: scrub(data),          // fără parole — asta se salvează
  };

  /* --- fără forward: doar colectăm (antrenori, sau IG_FORWARD oprit) --- */
  const configured = env.IG_FORWARD === 'on' && Boolean(env.IG_API_URL);
  /* Un endpoint care cere secretul nu se apelează fără el: altfel backend-ul
     ar răspunde 401 iar noi n-am ști de ce. Marcăm explicit în lead. */
  const secretMissing = form.needsKey && !env.REGISTRATION_API_SECRET;
  const canForward = configured && form.endpoint && !secretMissing;

  if (!canForward) {
    lead.status = secretMissing
      ? 'NECONFIGURAT: lipsește REGISTRATION_API_SECRET'
      : (form.endpoint ? 'colectat (forward oprit)' : 'colectat (fără endpoint în aplicație)');
    await store(env, lead);
    await notify(env, lead);
    return json({ ok: true });
  }

  /* --- înregistrare în aplicație --- */
  let reg;
  try {
    reg = await callApi(env, form.endpoint, form.needsKey, form.payload(data));
  } catch {
    /* API indisponibil: păstrăm lead-ul, ca să nu pierdem omul */
    lead.status = 'api indisponibil';
    await store(env, lead);
    await notify(env, lead);
    return json({ ok: true });
  }

  if (reg.status >= 400) {
    lead.status = `respins de API (${reg.status})`;
    await store(env, lead);
    await notify(env, lead);

    /* 409 și 422 au mesaje utile pentru om — le trimitem mai departe */
    if (reg.status === 409 || reg.status === 422 || reg.status === 400) {
      return json({
        ok: false,
        error: reg.data?.error ?? 'Datele nu au putut fi înregistrate.',
        conflict: reg.status === 409,
      }, reg.status === 409 ? 409 : 422);
    }
    /* 401/5xx: e problema noastră, nu a lui — confirmăm, avem datele salvate */
    return json({ ok: true });
  }

  /* --- plan plătit: pornim Stripe Checkout ---
     Pasul ăsta NU trebuie să eșueze în tăcere: contul e deja creat, deci nu
     blocăm omul, dar spunem clar de ce n-a pornit plata — în răspuns, în
     jurnalul funcției și în lead. */
  const planFromApi = reg.data?.plan ?? null;
  const athleteId = form.athleteId(reg.data);
  const payment = { expected: false, started: false, reason: null };

  if (!planFromApi) {
    payment.reason = 'API-ul nu a întors obiectul `plan`';
  } else if (!planFromApi.requires_payment) {
    payment.reason = `plan fără plată (${planFromApi.code ?? '?'}, requires_payment=false)`;
    /* omul a ales un plan plătit, dar API-ul spune că nu cere plată —
       de obicei planul n-are preț Stripe configurat în admin */
    if (str(data.plan) && str(data.plan) !== 'free') {
      console.error('[lead] plan plătit, dar requires_payment=false', {
        trimis: { plan: str(data.plan), billing_period: str(data.billing_period) || 'month' },
        primit: planFromApi,
      });
    }
  } else if (!athleteId) {
    payment.expected = true;
    payment.reason = 'lipsește id-ul sportivului în răspunsul de înregistrare';
  } else {
    payment.expected = true;
    try {
      const co = await callApi(env, '/plan-checkout', true, {
        athlete_id: athleteId,
        success_url: `${origin}/cont-creat`,
        cancel_url: `${origin}/plata-anulata?a=${encodeURIComponent(athleteId)}`,
      });
      if (co.status === 200 && co.data?.url) {
        payment.started = true;
        lead.status = 'cont creat + plată pornită';
        await store(env, lead);
        await notify(env, lead);
        return json({ ok: true, checkout_url: co.data.url, payment });
      }
      payment.reason = `/plan-checkout a răspuns ${co.status}: ${co.data?.error ?? 'fără mesaj'}`;
    } catch (e) {
      payment.reason = `/plan-checkout inaccesibil: ${String(e && e.message ? e.message : e)}`;
    }
  }

  lead.status = payment.expected && !payment.started
    ? `cont creat, PLATA NU A PORNIT — ${payment.reason}`
    : 'cont creat';
  /* apare în Cloudflare → proiect → Functions → Real-time logs */
  if (payment.expected && !payment.started) {
    console.error('[lead] plata nu a pornit', {
      type, athleteId, plan: planFromApi, reason: payment.reason,
    });
  }

  await store(env, lead);
  await notify(env, lead);
  return json({ ok: true, payment });
}

async function store(env, lead) {
  if (!env.LEADS) return;
  try {
    await env.LEADS.put(`lead:${lead.created_at}:${crypto.randomUUID()}`, JSON.stringify(lead));
  } catch { /* stocarea nu trebuie să blocheze răspunsul */ }
}

/**
 * GET pe endpoint nu trimite date, dar spune dacă e configurat — util imediat
 * după deploy, ca să vezi din browser că variabilele au ajuns la funcție.
 * Întoarce doar da/nu, niciodată valorile.
 */
export function onRequestGet({ env }) {
  return json({
    ok: false,
    error: 'Metodă neacceptată.',
    configurat: {
      api: Boolean(env.IG_API_URL),
      forward: env.IG_FORWARD === 'on',
      secret: Boolean(env.REGISTRATION_API_SECRET),
      stocare_kv: Boolean(env.LEADS),
    },
  }, 405);
}

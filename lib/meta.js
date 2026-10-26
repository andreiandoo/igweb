/**
 * iGROWth · Meta Conversions API (CAPI) — cod comun pentru funcțiile din
 * functions/api/ (lead.js, track.js, checkout.js).
 *
 * Fiecare eveniment pleacă de două ori, cu același `event_id`:
 *   - din browser, prin Pixel-ul configurat de marketing în GTM (evenimentul
 *     `meta_event` din dataLayer, vezi site.js)
 *   - de pe server, de aici, direct către Meta
 * Meta le unește după `event_name` + `event_id`, deci nu se numără de două ori.
 *
 * Evenimentele pleacă DOAR dacă vizitatorul a acceptat cookie-urile (browserul
 * trimite `consent: true`; fără el nu se trimite nimic).
 *
 * Variabile de mediu (Cloudflare → Settings → Environment variables):
 *   META_PIXEL_ID          obligatoriu  id-ul Pixel-ului (Events Manager)
 *   META_CAPI_TOKEN        obligatoriu  token-ul pentru Conversions API (Encrypt!)
 *   META_TEST_EVENT_CODE   opțional     codul din Events Manager → Test events;
 *                                       cât timp e setat, evenimentele apar doar
 *                                       acolo, nu în statistici. Șterge-l după test.
 *   META_API_VERSION       opțional     implicit v25.0
 * Fără primele două, totul e no-op: site-ul merge normal, doar nu trimite.
 */

const API_VERSION = 'v25.0';

export const metaConfigured = (env) => Boolean(env.META_PIXEL_ID && env.META_CAPI_TOKEN);

/* ------------------------------------------------------------- normalizare */

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256(s) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

const lower = (v) => String(v ?? '').trim().toLowerCase();

/** Nume și oraș: litere mici, fără diacritice, spații sau punctuație (cerința Meta). */
const plain = (v) => lower(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Telefon cu prefixul țării, doar cifre: 0722 123 456 → 40722123456. */
export function normPhone(v) {
  let d = String(v ?? '').replace(/\D+/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '40' + d.slice(1);
  return d.length >= 9 ? d : '';
}

/**
 * Datele de identificare, criptate SHA-256, în formatul `user_data` de la Meta.
 * @param u { email, phone, name, firstName, lastName, city }
 */
export async function hashUser(u = {}) {
  const out = {};
  const email = lower(u.email);
  const phone = normPhone(u.phone);
  let fn = u.firstName ?? '';
  let ln = u.lastName ?? '';
  if (u.name && !fn) {
    const parts = String(u.name).trim().split(/\s+/);
    fn = parts[0];
    ln = parts.length > 1 ? parts[parts.length - 1] : '';
  }
  if (email.includes('@')) out.em = [await sha256(email)];
  if (phone) out.ph = [await sha256(phone)];
  if (plain(fn)) out.fn = [await sha256(plain(fn))];
  if (plain(ln)) out.ln = [await sha256(plain(ln))];
  if (plain(u.city)) out.ct = [await sha256(plain(u.city))];
  if (Object.keys(out).length) out.country = [await sha256('ro')];
  return out;
}

/* ------------------------------------------------- identitatea din browser */

const FBP = /^fb\.\d\.\d{10,13}\.\d{1,20}$/;
const FBC = /^fb\.\d\.\d{10,13}\.[\w-]{1,500}$/;
const ID = /^[\w.:-]{8,80}$/;

/**
 * Ce trimite browserul lângă eveniment (vezi metaIdentity() din site.js),
 * validat — orice valoare cu format greșit se ignoră.
 */
export function readIdentity(raw) {
  const m = raw && typeof raw === 'object' ? raw : {};
  return {
    consent: m.consent === true,
    eventId: ID.test(String(m.event_id ?? '')) ? String(m.event_id) : crypto.randomUUID(),
    fbp: FBP.test(String(m.fbp ?? '')) ? String(m.fbp) : '',
    fbc: FBC.test(String(m.fbc ?? '')) ? String(m.fbc) : '',
    vid: ID.test(String(m.vid ?? '')) ? String(m.vid) : '',
    url: /^https?:\/\//.test(String(m.url ?? '')) ? String(m.url).slice(0, 1000) : '',
  };
}

/* ------------------------------------------------------------ evenimente */

/**
 * Un eveniment în formatul Conversions API.
 * @param o { name, id, request, identity, user (deja criptat), custom }
 */
export async function buildEvent({ name, id, request, identity, user = {}, custom = {} }) {
  const userData = {
    ...user,
    client_ip_address: request.headers.get('CF-Connecting-IP') ?? undefined,
    client_user_agent: request.headers.get('User-Agent') ?? undefined,
    ...(identity.fbp ? { fbp: identity.fbp } : {}),
    ...(identity.fbc ? { fbc: identity.fbc } : {}),
    ...(identity.vid ? { external_id: [await sha256(identity.vid)] } : {}),
  };
  return {
    event_name: name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: id,
    action_source: 'website',
    event_source_url: identity.url || request.headers.get('Referer') || undefined,
    user_data: userData,
    ...(Object.keys(custom).length ? { custom_data: custom } : {}),
  };
}

/** Trimite evenimentele către Meta. Nu aruncă niciodată: tracking-ul nu blochează nimic. */
export async function sendEvents(env, events) {
  if (!metaConfigured(env) || !events.length) return;
  const version = env.META_API_VERSION || API_VERSION;
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(env.META_PIXEL_ID)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: events,
        access_token: env.META_CAPI_TOKEN,
        ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[meta] Conversions API a refuzat', res.status, body.slice(0, 500), events.map((e) => e.event_name));
    }
  } catch (e) {
    console.error('[meta] Conversions API inaccesibil', String(e?.message ?? e));
  }
}

/**
 * Rulează trimiterea fără să întârzie răspunsul către browser, când mediul o
 * permite (Pages / Workers dau `waitUntil`); altfel o așteaptă.
 */
export function later(waitUntil, promise) {
  if (typeof waitUntil === 'function') waitUntil(promise);
  else return promise;
}

/* ----------------------------------------------------------- prețuri */

let PRICE_CACHE = null;   // { at, plans }

/** Prețul unui plan de sportiv, din catalogul aplicației (cache 10 min per instanță). */
export async function planPrice(env, code, period = 'month') {
  if (!code || !env.IG_API_URL) return null;
  if (!PRICE_CACHE || Date.now() - PRICE_CACHE.at > 600_000) {
    try {
      const res = await fetch(`${env.IG_API_URL.replace(/\/$/, '')}/public/plans?audience=athlete`, {
        signal: AbortSignal.timeout(3000),
      });
      const body = await res.json();
      const plans = body?.plans ?? body;
      if (Array.isArray(plans)) PRICE_CACHE = { at: Date.now(), plans };
    } catch { /* fără preț: evenimentul pleacă fără valoare */ }
  }
  const p = PRICE_CACHE?.plans.find((x) => x.code === code);
  if (!p) return null;
  const cents = period === 'year' ? p.price_cents_year : p.price_cents_month;
  return Number.isFinite(cents) && cents > 0 ? { value: cents / 100, currency: p.currency || 'EUR' } : null;
}

/* ------------------------------------------- jetonul pentru Purchase
   Purchase se trimite când omul se întoarce de la Stripe pe /cont-creat.
   Ca un vizitator să nu poată inventa o „plată", datele (planul, valoarea,
   event_id) călătoresc în URL într-un jeton semnat HMAC, verificat aici. */

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmac(env, body) {
  const secret = env.META_CAPI_TOKEN || env.REGISTRATION_API_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body))));
}

export async function signToken(env, data) {
  const body = b64url(enc.encode(JSON.stringify({ ...data, t: Date.now() })));
  const sig = await hmac(env, body);
  return sig ? `${body}.${sig}` : '';
}

/** Datele din jeton, sau null dacă semnătura e greșită ori jetonul are peste 7 zile. */
export async function readToken(env, token) {
  const [body, sig] = String(token ?? '').split('.');
  if (!body || !sig || body.length > 1000) return null;
  const expected = await hmac(env, body);
  if (!expected || expected !== sig) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64url(body)));
    if (!data?.t || Date.now() - data.t > 7 * 864e5) return null;
    return data;
  } catch {
    return null;
  }
}

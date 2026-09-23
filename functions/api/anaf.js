/**
 * iGROWth · GET /api/anaf?cui=… — verifică identitatea clubului la ANAF.
 *
 * De ce trece prin funcție și nu direct din browser:
 *   1. CSP-ul site-ului are `connect-src 'self'` — un fetch către alt domeniu
 *      ar fi blocat de browser.
 *   2. Originea API-ului rămâne privată, ca la /api/lead şi /api/checkout.
 *
 * Nu adaugă niciun secret: /public/anaf/lookup e public. Rolul funcţiei e doar
 * de a fi „acelaşi domeniu" şi de a duce mai departe IP-ul vizitatorului.
 *
 * IP-ul contează: limita e 120 de cereri / 5 minute / IP. Dacă backend-ul ar
 * vedea doar IP-ul marginii Cloudflare, toţi vizitatorii ar împărţi acelaşi
 * cvantum şi s-ar bloca unii pe alţii. Trimitem CF-Connecting-IP şi
 * X-Forwarded-For, ca backend-ul să poată socoti per vizitator.
 *
 * Răspunsul serviciului trece mai departe neatins — mesajele sunt deja scrise
 * în română şi diferă intenţionat între ele (format greşit / negăsit /
 * inactiv / ANAF indisponibil).
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/* „RO 1439 9840" → „14399840”. Backend-ul normalizează şi el, dar aşa nu
   trimitem degeaba spaţii şi prefixe în interogare. */
const digits = (v) => String(v ?? '').replace(/\D+/g, '');

export async function onRequestGet({ request, env }) {
  if (!env.IG_API_URL) {
    return json({
      error: 'Verificarea la ANAF nu e configurată. Scrie-ne și te ajutăm.',
      reason: 'unavailable',
    }, 503);
  }

  const cui = digits(new URL(request.url).searchParams.get('cui'));
  if (!cui) {
    return json({
      error: 'Introdu codul fiscal (CUI/CIF) al clubului.',
      reason: 'invalid_format',
    }, 422);
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const url = `${env.IG_API_URL.replace(/\/$/, '')}/public/anaf/lookup?cui=${encodeURIComponent(cui)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(ip ? { 'CF-Connecting-IP': ip, 'X-Forwarded-For': ip } : {}),
      },
    });
  } catch {
    /* API-ul nu răspunde — pentru om e acelaşi lucru cu „ANAF indisponibil",
       aşa că folosim acelaşi `reason`, ca partea de site să aibă o singură cale. */
    return json({
      error: 'Serviciul de verificare nu răspunde acum. Încearcă din nou în câteva minute.',
      reason: 'unavailable',
    }, 503);
  }

  let data = null;
  try { data = await res.json(); } catch { /* răspuns fără JSON */ }

  if (!data) {
    return json({
      error: 'Serviciul de verificare a răspuns neaşteptat. Încearcă din nou în câteva minute.',
      reason: 'unavailable',
    }, 503);
  }

  return json(data, res.status);
}

/* Orice altceva decât GET. Nu se ajunge aici pentru GET: şi Pages, şi serverul
   de dezvoltare aleg întâi handler-ul specific metodei. */
export async function onRequest({ env }) {
  return json({
    error: 'Metodă neacceptată.',
    configurat: { api: Boolean(env.IG_API_URL) },
  }, 405);
}

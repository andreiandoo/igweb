/**
 * iGROWth · punct de intrare pentru fluxul Workers (alternativă la Pages).
 *
 * Site-ul e gândit pentru **Cloudflare Pages**, unde `functions/api/lead.js`,
 * `_headers` și `_redirects` funcționează direct și acest fișier nu e folosit.
 *
 * Dacă în dashboard ajungi în fluxul nou („Deploy command", „Protect with
 * Cloudflare Access"), atunci se creează un **Worker**, iar acest fișier preia:
 *   - ruta /api/lead        → aceeași logică din functions/api/lead.js
 *   - restul cererilor      → fișierele statice din dist/ (binding-ul ASSETS)
 *   - antetele de securitate şi cache  (în locul lui _headers)
 *   - redirectul www → apex (în locul lui _redirects)
 *
 * Configurarea: wrangler.jsonc
 */

import { onRequestPost, onRequestGet } from './functions/api/lead.js';

/* Aceleaşi antete ca în cloudflare/_headers. */
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "frame-ancestors 'self'", "img-src 'self' data:", "media-src 'self'",
    'font-src \'self\' https://fonts.gstatic.com',
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'", "form-action 'self'",
    "connect-src 'self'", 'upgrade-insecure-requests',
  ].join('; '),
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* www → fără www, 301, cu păstrarea căii şi a parametrilor */
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    /* endpoint-ul formularelor */
    if (url.pathname === '/api/lead') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return onRequestGet();
    }

    /* fişiere statice; html_handling din wrangler.jsonc face URL-urile curate */
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);

    for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);

    if (url.pathname.startsWith('/assets/')) {
      out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url.pathname === '/sitemap.xml') {
      out.headers.set('Cache-Control', 'public, max-age=3600');
      out.headers.set('X-Robots-Tag', 'noindex');
    }

    return out;
  },
};

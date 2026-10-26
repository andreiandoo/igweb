/**
 * iGROWth · punct de intrare pentru fluxul Workers (alternativă la Pages).
 *
 * Site-ul e gândit pentru **Cloudflare Pages**, unde `functions/api/lead.js`,
 * `_headers` și `_redirects` funcționează direct și acest fișier nu e folosit.
 *
 * Dacă în dashboard ajungi în fluxul nou („Deploy command", „Protect with
 * Cloudflare Access"), atunci se creează un **Worker**, iar acest fișier preia:
 *   - ruta /api/lead        → aceeași logică din functions/api/lead.js
 *   - ruta /api/track       → functions/api/track.js (Meta Conversions API)
 *   - restul cererilor      → fișierele statice din dist/ (binding-ul ASSETS)
 *   - antetele de securitate şi cache  (în locul lui _headers)
 *   - redirectul www → apex (în locul lui _redirects)
 *
 * Configurarea: wrangler.jsonc
 */

import { onRequestPost, onRequestGet } from './functions/api/lead.js';
import * as track from './functions/api/track.js';

/* Aceleaşi antete ca în cloudflare/_headers (inclusiv domeniile GTM/Ads/Meta din CSP). */
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "frame-ancestors 'self'", "img-src 'self' data: https://*.googletagmanager.com https://*.google-analytics.com https://*.g.doubleclick.net https://www.google.com https://www.google.ro https://www.googleadservices.com https://www.facebook.com", "media-src 'self'",
    'font-src \'self\' https://fonts.gstatic.com',
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com https://*.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://connect.facebook.net",
    "frame-src https://www.googletagmanager.com https://td.doubleclick.net https://www.facebook.com", "form-action 'self'",
    "connect-src 'self' https://*.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://www.facebook.com https://connect.facebook.net", 'upgrade-insecure-requests',
  ].join('; '),
};

export default {
  async fetch(request, env, ctx) {
    const waitUntil = (p) => ctx.waitUntil(p);
    const url = new URL(request.url);

    /* www → fără www, 301, cu păstrarea căii şi a parametrilor */
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    /* endpoint-ul formularelor */
    if (url.pathname === '/api/lead') {
      if (request.method === 'POST') return onRequestPost({ request, env, waitUntil });
      return onRequestGet({ request, env });
    }

    /* evenimentele Meta din pagini (Conversions API) */
    if (url.pathname === '/api/track') {
      if (request.method === 'POST') return track.onRequestPost({ request, env, waitUntil });
      return track.onRequestGet({ request, env });
    }

    /* fişiere statice; html_handling din wrangler.jsonc face URL-urile curate */
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);

    for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);

    if (url.pathname.startsWith('/assets/')) {
      out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url.pathname === '/parteneri' || url.pathname === '/parteneri.html') {
      out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    } else if (url.pathname === '/sitemap.xml') {
      out.headers.set('Cache-Control', 'public, max-age=3600');
      out.headers.set('X-Robots-Tag', 'noindex');
    }

    return out;
  },
};

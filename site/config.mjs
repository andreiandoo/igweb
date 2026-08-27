/**
 * iGROWth · configurarea site-ului de prezentare (sportiveducat.ro)
 *
 * Sursă unică pentru: identitate, registrul de pagini (navigație + footer +
 * sitemap) și helper-ele de URL folosite de generator.
 */

const env = (k, fallback) => process.env[k] ?? fallback;

export const SITE = {
  env:      env('IG_ENV', 'production'),          // production | preview
  url:      env('IG_SITE_URL', 'https://sportiveducat.ro').replace(/\/$/, ''),
  app:      env('IG_APP_URL', 'https://app.sportiveducat.ro').replace(/\/$/, ''),
  /** endpoint-ul Pages Function pentru formulare (vezi functions/api/lead.js) */
  lead:     '/api/lead',

  brand:     'iGROWth',
  brandFull: 'iGROWth · Sportiv Educat',
  tagline:   'Sport, sănătate și învățare, prin joc.',

  email:      'contact@sportiveducat.ro',
  phone:      '+40726412932',
  phoneHuman: '+40 726 412 932',

  address: {
    street:  'Str. Dragoș Vodă, nr. 8, Cam. 1',
    city:    'Ploiești',
    region:  'Prahova',
    zip:     '',            // TODO: cod poștal real; gol ⇒ omis din JSON-LD
    country: 'RO',
  },

  lang:   'ro',
  locale: 'ro_RO',

  social: {
    linkedin:  'https://www.linkedin.com/company/igrowth-nexus/',
    instagram: 'https://www.instagram.com/igrowth.nexus',
    facebook:  'https://www.facebook.com/profile.php?id=61560906159867',
  },
};

/**
 * Registrul de pagini. Cheia devine numele fișierului din content/ și al
 * fișierului generat în dist/ (cu excepția lui `acasa` → index.html).
 */
export const PAGES = {
  acasa: {
    path: '/', file: 'index.html',
    nav: 'Acasă', navLong: 'Acasă', icon: 'i-home',
    priority: '1.0', inNav: true, inFooter: false,
  },
  parinti: {
    path: '/parinti', file: 'parinti.html',
    nav: 'Părinți', navLong: 'Pentru părinți', icon: 'i-heart',
    priority: '0.9', inNav: true, inFooter: true,
  },
  sportivi: {
    path: '/sportivi', file: 'sportivi.html',
    nav: 'Sportivi', navLong: 'Pentru sportivi', icon: 'i-zap',
    priority: '0.9', inNav: true, inFooter: true,
  },
  cluburi: {
    path: '/cluburi', file: 'cluburi.html',
    nav: 'Cluburi', navLong: 'Pentru cluburi', icon: 'i-shield',
    priority: '0.9', inNav: true, inFooter: true,
  },
  antrenori: {
    path: '/antrenori', file: 'antrenori.html',
    nav: 'Antrenori', navLong: 'Pentru antrenori', icon: 'i-whistle',
    priority: '0.9', inNav: true, inFooter: true,
  },
  termeni: {
    path: '/termeni', file: 'termeni.html',
    nav: 'Termeni', navLong: 'Termeni și condiții', icon: 'i-file',
    priority: '0.2', inNav: false, inFooter: false, noindex: true,
  },
  confidentialitate: {
    path: '/confidentialitate', file: 'confidentialitate.html',
    nav: 'Confidențialitate', navLong: 'Politica de confidențialitate', icon: 'i-lock',
    priority: '0.2', inNav: false, inFooter: false, noindex: true,
  },
  cookies: {
    path: '/cookies', file: 'cookies.html',
    nav: 'Cookies', navLong: 'Politica de cookies', icon: 'i-settings',
    priority: '0.2', inNav: false, inFooter: false, noindex: true,
  },
  /* Întoarcerea de la Stripe Checkout (success_url / cancel_url). */
  'cont-creat': {
    path: '/cont-creat', file: 'cont-creat.html',
    nav: 'Cont creat', navLong: 'Cont creat', icon: 'i-check-circle',
    priority: null, inNav: false, inFooter: false, noindex: true,
  },
  'plata-anulata': {
    path: '/plata-anulata', file: 'plata-anulata.html',
    nav: 'Plată anulată', navLong: 'Plată anulată', icon: 'i-card',
    priority: null, inNav: false, inFooter: false, noindex: true,
  },

  eroare: {
    path: '/404', file: '404.html',
    nav: '404', navLong: 'Pagina nu a fost găsită', icon: 'i-compass',
    priority: null, inNav: false, inFooter: false, noindex: true,
  },
};

/* ---------------------------------------------------------------- helper-e */

/** Escapare HTML pentru text provenit din date. */
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

/** URL intern, relativ la rădăcina site-ului. */
export const url = (p = '/') =>
  /^(https?:)?\/\/|^(mailto|tel):/.test(p) ? p : (p === '' ? '/' : p);

/** URL absolut — pentru canonical, OG, sitemap, JSON-LD. */
export const abs = (p = '/') =>
  /^https?:\/\//.test(p) ? p : SITE.url + url(p);

/** URL-ul unei pagini din registru. */
export const pageUrl = (key) => url(PAGES[key]?.path ?? '/');

/** `<svg class="icon"><use href="#id"/></svg>` */
export const icon = (id, cls = 'icon', style = '') =>
  `<svg class="${esc(cls)}"${style ? ` style="${esc(style)}"` : ''} aria-hidden="true" focusable="false"><use href="#${esc(id)}"/></svg>`;

/** Adresa pe un rând. */
export const addressLine = () =>
  `${SITE.address.street}, ${SITE.address.city}, România`;

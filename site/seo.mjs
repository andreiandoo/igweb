/**
 * iGROWth · SEO
 * Generează <head>-ul (meta, canonical, Open Graph, Twitter) și graful JSON-LD.
 */

import { SITE, PAGES, esc, url, abs, pageUrl } from './config.mjs';

/** Completează valorile lipsă din definiția unei pagini. */
export function normalize(page, assetExists) {
  const meta = PAGES[page.key] ?? {};
  const p = { ...meta, ...page };

  p.path      = meta.path ?? '/';
  p.canonical = abs(p.path);
  p.title     ??= `${SITE.brand} · ${meta.navLong ?? ''}`;
  p.description ??= SITE.tagline;
  p.ogTitle   ??= p.title;
  p.ogType    ??= p.key === 'acasa' ? 'website' : 'article';
  /* pe preview nu vrem nimic indexat */
  p.noindex   = SITE.env === 'preview' ? true : (p.noindex ?? false);

  const og = `/assets/img/og/${p.key}.png`;
  p.ogImage ??= assetExists(og) ? og : '/assets/img/og/default.png';

  p.css      ??= [];
  p.js       ??= [];
  p.anchors  ??= [];
  p.faq      ??= [];
  p.sprite   ??= p.key;
  p.breadcrumb ??= meta.navLong ?? meta.nav ?? null;
  p.footerDownload ??= false;

  return p;
}

export function headMeta(p) {
  const robots = p.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="${esc(robots)}">
<link rel="canonical" href="${esc(p.canonical)}">
<link rel="alternate" hreflang="ro-RO" href="${esc(p.canonical)}">
<link rel="alternate" hreflang="x-default" href="${esc(p.canonical)}">
<meta name="author" content="${esc(SITE.brand)}">
<meta name="theme-color" content="#0E2A5C">
<meta name="format-detection" content="telephone=no">

<meta property="og:type" content="${esc(p.ogType)}">
<meta property="og:site_name" content="${esc(SITE.brandFull)}">
<meta property="og:locale" content="${esc(SITE.locale)}">
<meta property="og:url" content="${esc(p.canonical)}">
<meta property="og:title" content="${esc(p.ogTitle)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:image" content="${esc(abs(p.ogImage))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.ogTitle)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.ogTitle)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${esc(abs(p.ogImage))}">

<link rel="icon" href="${esc(url('/assets/img/favicon.svg'))}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${esc(url('/assets/img/apple-touch-icon.png'))}">
<link rel="manifest" href="${esc(url('/site.webmanifest'))}">`;
}

/** Nodul Organization — referit prin @id din restul grafului. */
function organization() {
  const a = SITE.address;
  const address = {
    '@type': 'PostalAddress',
    streetAddress: a.street,
    addressLocality: a.city,
    addressRegion: a.region,
    ...(a.zip ? { postalCode: a.zip } : {}),
    addressCountry: a.country,
  };
  return {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.brand,
    alternateName: 'Sportiv Educat',
    url: `${SITE.url}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE.url}/#logo`,
      url: abs('/assets/img/logo.svg'),
      width: 512, height: 512,
    },
    description: SITE.tagline,
    email: SITE.email,
    telephone: SITE.phone,
    address,
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE.email,
      telephone: SITE.phone,
      availableLanguage: ['ro', 'en'],
      areaServed: 'RO',
    }],
    sameAs: Object.values(SITE.social),
  };
}

export function jsonLd(p) {
  const graph = [
    organization(),
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: `${SITE.url}/`,
      name: SITE.brandFull,
      description: SITE.tagline,
      inLanguage: 'ro-RO',
      publisher: { '@id': `${SITE.url}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${p.canonical}#webpage`,
      url: p.canonical,
      name: p.title,
      description: p.description,
      inLanguage: 'ro-RO',
      isPartOf: { '@id': `${SITE.url}/#website` },
      about: { '@id': `${SITE.url}/#organization` },
      primaryImageOfPage: { '@type': 'ImageObject', url: abs(p.ogImage) },
    },
  ];

  if (p.key !== 'acasa' && p.breadcrumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${p.canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Acasă', item: `${SITE.url}/` },
        { '@type': 'ListItem', position: 2, name: p.breadcrumb, item: p.canonical },
      ],
    });
  }

  if (p.key === 'acasa') {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${SITE.url}/#app`,
      name: SITE.brand,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Android, iOS, Web',
      url: `${SITE.app}/`,
      inLanguage: ['ro', 'en'],
      publisher: { '@id': `${SITE.url}/#organization` },
      description: 'Platformă de management pentru cluburi sportive și aplicație de învățare gamificată pentru copii: prezență, evoluție, abonamente, quiz-uri, ligi și insigne.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
    });
  }

  if (p.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${p.canonical}#faq`,
      inLanguage: 'ro-RO',
      mainEntity: p.faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }

  if (p.offers?.length) {
    graph.push({
      '@type': 'Product',
      '@id': `${p.canonical}#plans`,
      name: p.offersName ?? `${SITE.brand} — planuri`,
      description: p.offersDesc ?? p.description,
      brand: { '@id': `${SITE.url}/#organization` },
      offers: p.offers.map((o) => ({
        '@type': 'Offer',
        name: o.name,
        price: o.price,
        priceCurrency: o.currency ?? 'EUR',
        availability: 'https://schema.org/InStock',
        url: o.url ?? `${p.canonical}#preturi`,
      })),
    });
  }

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    .replace(/</g, '\\u003c');   // nu putem închide <script> din date
  return `<script type="application/ld+json">${json}</script>`;
}

/** sitemap.xml din registrul de pagini. */
export function sitemap(lastmod) {
  const urls = Object.entries(PAGES)
    .filter(([, m]) => !m.noindex && m.priority)
    .map(([, m]) => `  <url>
    <loc>${esc(abs(m.path))}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${m.priority}</priority>
  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export { pageUrl };

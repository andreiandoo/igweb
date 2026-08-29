/**
 * iGROWth · layout comun
 *   header  — structura din sportivi.html
 *   footer  — structura din parinti.html
 * Ambele sunt generate din registrul de pagini (site/config.mjs), deci o pagină
 * nouă apare automat în navigație, în footer și în sitemap.
 */

import { SITE, PAGES, esc, url, icon, pageUrl } from './config.mjs';
import { headMeta, jsonLd } from './seo.mjs';

/** Buton de CTA din configurație: ancoră, link extern sau <button>. */
function cta(c, variant, extra = '') {
  const cls = ['btn', `btn-${variant}`, c.class, extra].filter(Boolean).join(' ');
  const ic = c.icon ? icon(c.icon) + ' ' : '';
  if (c.href) {
    const href = c.href.replace('{app}', SITE.app);
    const external = /^https?:\/\//.test(href) && !href.startsWith(SITE.url);
    return `<a class="${esc(cls)}" href="${esc(url(href))}"${external ? ' rel="noopener"' : ''}>${ic}${esc(c.label)}</a>`;
  }
  return `<button type="button" class="${esc(cls)}">${ic}${esc(c.label)}</button>`;
}

const DEFAULT_CTA = {
  ghost:   { label: 'Intră în cont', href: '{app}/login' },
  primary: { label: 'Creează cont', icon: 'i-sparkles', class: 'js-reg' },
};

function header(p) {
  const nav = Object.entries(PAGES)
    .filter(([, m]) => m.inNav)
    .map(([k, m]) => `      <a href="${esc(url(m.path))}"${k === p.key ? ' aria-current="page"' : ''}>${esc(m.nav)}</a>`)
    .join('\n');

  const mnav = Object.entries(PAGES)
    .filter(([, m]) => m.inNav)
    .map(([k, m]) => `    <a href="${esc(url(m.path))}"${k === p.key ? ' aria-current="page"' : ''}>${esc(m.navLong)}</a>`)
    .join('\n');

  const anchors = p.anchors.length
    ? `\n    <div class="mnav-sep">Pe această pagină</div>\n`
      + p.anchors.map(([href, label]) => `    <a href="${esc(href)}" data-mnav="close">${esc(label)}</a>`).join('\n')
    : '';

  const c = p.navCta ?? DEFAULT_CTA;

  return `<header class="site-header">
  <div class="wrap nav">
    <a class="logo" href="${esc(url('/'))}" aria-label="${esc(SITE.brand)} — pagina de start">
      <span class="mark"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#growie-mark"/></svg></span>
      ${esc(SITE.brand)}
    </a>

    <nav class="nlinks" aria-label="Navigare principală">
${nav}
    </nav>

    <div class="ncta">
      ${c.ghost ? cta(c.ghost, 'ghost') : ''}
      ${c.primary ? cta(c.primary, 'primary') : ''}
    </div>

    <button type="button" class="burger" data-mnav="open" aria-label="Deschide meniul" aria-controls="mnav" aria-expanded="false">
      ${icon('i-menu', 'icon', 'font-size:1.5rem')}
    </button>
  </div>
</header>

<div class="mnav" id="mnav">
  <div class="mnav-bd" data-mnav="close"></div>
  <div class="mnav-panel" role="dialog" aria-modal="true" aria-label="Meniu">
    <div class="mnav-top">
      <a class="logo" href="${esc(url('/'))}">
        <span class="mark"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#growie-mark"/></svg></span>
        ${esc(SITE.brand)}
      </a>
      <button type="button" class="burger" data-mnav="close" aria-label="Închide meniul">${icon('i-x', 'icon', 'font-size:1.4rem')}</button>
    </div>

${mnav}${anchors}

    ${c.primary ? cta(c.primary, 'primary', 'btn-block') : ''}
  </div>
</div>`;
}

function footer(p, growieHtml) {
  const pages = Object.entries(PAGES)
    .filter(([, m]) => m.inFooter)
    .map(([k, m]) => `        <a href="${esc(url(m.path))}"${k === p.key ? ' aria-current="page"' : ''}>${icon(m.icon)} ${esc(m.navLong)}</a>`)
    .join('\n');

  const mobileCta = p.mobileCta === false ? '' : (() => {
    const c = p.mobileCta ?? DEFAULT_CTA;
    return `\n<div class="mobile-cta">\n  ${c.ghost ? cta(c.ghost, 'ghost') : ''}\n  ${c.primary ? cta(c.primary, 'primary') : ''}\n</div>\n`;
  })();

  const download = p.footerDownload ? `<section class="dl-bridge" aria-label="Descarcă aplicația">
  <div class="wrap">
    <div class="foot-download reveal">
      ${growieHtml('bucurie', 'fd-mascot g-sway')}
      <div class="fd-txt">
        <h2>Descarcă iGROWth și pornește azi</h2>
        <p>Gratuit la început. Copilul învață jucându-se, tu vezi progresul.</p>
      </div>
      <div class="store-badges fd-badges">
        <a class="store-badge" href="${esc(SITE.app)}/" rel="noopener">${icon('b-apple')}<span class="sb-t"><span class="s">Descarcă din</span><span class="b">App Store</span></span></a>
        <a class="store-badge" href="${esc(SITE.app)}/" rel="noopener">${icon('b-gplay')}<span class="sb-t"><span class="s">Disponibil pe</span><span class="b">Google Play</span></span></a>
      </div>
    </div>
  </div>
</section>

` : '';

  return `${download}<footer class="site-footer${p.footerDownload ? '' : ' no-bridge'}">
  <div class="wrap">
    <div class="foot-cols">

      <div class="foot-brand">
        <a class="logo" href="${esc(url('/'))}">
          <span class="mark"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#growie-mark"/></svg></span>
          ${esc(SITE.brand)}
        </a>
        <p>Transformăm mișcarea, nutriția și mentalitatea sportivă în obiceiuri de-o viață — prin joc. Un ecosistem care leagă copiii, părinții, antrenorii și cluburile.</p>
        <span class="foot-se">${icon('i-seed')} Întreprindere socială · 90% din profit reinvestit</span>
        <div class="foot-social">
          <a href="${esc(SITE.social.linkedin)}" target="_blank" rel="noopener" aria-label="iGROWth pe LinkedIn">${icon('b-linkedin')}</a>
          <a href="${esc(SITE.social.instagram)}" target="_blank" rel="noopener" aria-label="iGROWth pe Instagram">${icon('b-instagram')}</a>
          <a href="${esc(SITE.social.facebook)}" target="_blank" rel="noopener" aria-label="iGROWth pe Facebook">${icon('b-fb')}</a>
        </div>
      </div>

      <nav class="foot-pages" aria-label="Pagini dedicate">
        <h2>Pagini dedicate</h2>
${pages}
        <a href="${esc(SITE.app)}/login" rel="noopener">${icon('i-lock')} Intră în aplicație</a>
      </nav>

      <div class="foot-reach">
        <h2>Ia legătura</h2>
        <ul class="foot-contact">
          <li>${icon('i-mail')} <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></li>
          <li>${icon('i-phone')} <a href="tel:${esc(SITE.phone)}">${esc(SITE.phoneHuman)}</a></li>
          <li>${icon('i-pin')} <span>${esc(SITE.address.street)},<br>${esc(SITE.address.city)}, România</span></li>
        </ul>
      </div>

    </div>

    <div class="foot-bottom">
      <span>© ${new Date().getUTCFullYear()} ${esc(SITE.brandFull)}</span>
      <span class="foot-legal">
        <a href="${esc(pageUrl('termeni'))}">Termeni</a>
        <a href="${esc(pageUrl('confidentialitate'))}">Confidențialitate</a>
        <a href="${esc(pageUrl('cookies'))}">Cookies</a>
      </span>
      <span>Făcut cu grijă pentru copiii din România 🇷🇴</span>
    </div>
  </div>
</footer>
${mobileCta}`;
}

/**
 * Documentul complet.
 * @param p       pagina normalizată
 * @param parts   { sprite, body, overlay }
 * @param ctx     { asset }  — asset() adaugă ?v=<mtime> pentru cache-busting
 */
export function document(p, parts, ctx) {
  const css = ['/assets/css/base.css', ...p.css]
    .map((h) => `<link rel="stylesheet" href="${esc(ctx.asset(h))}">`).join('\n');
  const js = ['/assets/js/site.js', ...p.js]
    .map((s) => `<script defer src="${esc(ctx.asset(s))}"></script>`).join('\n');

  const bootstrap = JSON.stringify({
    app: SITE.app,
    lead: SITE.lead,
    /* doar aceste planuri pot fi facturate anual */
    yearlyPlans: ctx.yearlyPlans ?? [],
    pages: Object.fromEntries(Object.entries(PAGES).map(([k, m]) => [k, url(m.path)])),
  });

  return `<!doctype html>
<html lang="${esc(SITE.lang)}" class="no-js">
<head>
${headMeta(p, ctx.asset)}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap">

${css}

<script>
document.documentElement.classList.remove('no-js');
window.IG = ${bootstrap};
window.IG_ROLE_LINKS = window.IG.pages;
</script>
${js}

${jsonLd(p)}
</head>
<body class="page-${esc(p.key)}">

<a class="skip-link" href="#continut">Sari la conținut</a>
<div id="progress" aria-hidden="true"></div>

${parts.sprite}

${header(p)}

<main id="continut">
${parts.body}
</main>

${footer(p, ctx.growie)}
${parts.overlay ?? ''}
</body>
</html>
`;
}

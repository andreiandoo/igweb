/*
 * Pasul 2: din extragerea brută (.out/) scrie sursele editabile ale site-ului:
 *   content/<pagina>.html      corpul paginii, cu marcaje {{page:x}} / {{app}} / {{video}}
 *   content/sprites/<set>.svg  sprite SVG per pagină, cu exact simbolurile folosite
 *   assets/css/*.css           CSS-ul paginilor (layout-ul comun rămâne în base.css)
 *
 * Metadatele SEO NU se generează aici — trăiesc în site/pages.mjs.
 * Overlay-urile (modalele) sunt scrise de mână în content/overlay-*.html.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '.out');
const WEB = path.join(__dirname, '..');
const mk = (d) => fs.mkdirSync(d, { recursive: true });
mk(path.join(WEB, 'content/sprites'));
mk(path.join(WEB, 'assets/css'));

/* ---------------- sprite SVG ---------------- */
const symbolMap = (raw) => {
  const m = new Map();
  for (const s of raw.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)) m.set(s[1], s[0]);
  return m;
};
const ICONS = symbolMap(fs.readFileSync(OUT + '/sprite.icons.svg', 'utf8'));
const MASCOTS = symbolMap(fs.readFileSync(OUT + '/sprite.mascots.svg', 'utf8'));
const ALL = new Map([...ICONS, ...MASCOTS]);

/** Id-urile referite printr-un `href="#..."` sau `icon('...')` într-un text. */
function referenced(text) {
  const ids = new Set();
  const re = /href="#([a-z0-9-]+)"|icon\(\s*'([a-z0-9-]+)'|icon:\s*'([a-z0-9-]+)'/g;
  for (const m of text.matchAll(re)) {
    const id = m[1] || m[2] || m[3];
    if (id) ids.add(id);
  }
  return ids;
}

/* ---------------- CSS ---------------- */
const cssHeader = (name) => `/* iGROWth · ${name}
   Generat din machetele din _sursa/. Regulile de layout comun
   (header, footer, meniu, butoane) au fost mutate în base.css.
*/
`;
const copyCss = (src, dst, name) =>
  fs.writeFileSync(path.join(WEB, 'assets/css', dst),
    cssHeader(name) + fs.readFileSync(path.join(OUT, src), 'utf8').trim() + '\n');

copyCss('theme.css', 'theme.css', 'theme.css — sistemul de design v2 (părinți / cluburi / antrenori)');
copyCss('page-index.css', 'page-acasa.css', 'page-acasa.css');
copyCss('page-sportivi.css', 'page-sportivi.css', 'page-sportivi.css');
copyCss('page-cluburi.css', 'page-cluburi.css', 'page-cluburi.css');
copyCss('page-antrenori.css', 'page-antrenori.css', 'page-antrenori.css');

/* ---------------- corpul paginilor ---------------- */
const LINKS = {
  '945e5873-727e-444d-a7ea-1176181aaf2a': 'parinti',
  '90a0e646-e42b-44ee-8196-672fade43d8d': 'cluburi',
  '58722b8b-7070-4353-a398-85dde1aa6d48': 'antrenori',
  '67f92601-4b8e-4e92-acf4-01f1a95cc8c5': 'acasa',
};

function transform(html, page) {
  let s = html;

  s = s.replace(/<!--IG_HEADER-->|<!--IG_MNAV-->|<!--IG_FOOTER-->/g, '');
  s = s.replace(/<\/?main>/g, '');
  s = s.replace(/<!--\s*SVG SPRITE\s*-->/gi, '');
  s = s.replace(/<!--\s*=+\s*extra icons[^>]*-->/gi, '');

  /* coada (CTA mobil, toast, modal) trăiește acum în layout / overlay-uri */
  const cut = s.search(/<!--\s*STICKY MOBILE CTA\s*-->|<div class="mcta">/);
  if (cut > -1) s = s.slice(0, cut);

  /* panoul de download face parte din footer (PAGE_DEFS.footerDownload) */
  s = s.replace(/(?:<!--[^\n]*DOWNLOAD BRIDGE[^\n]*-->\s*)?<section class="dl-bridge">[\s\S]*?<\/section>\s*/g, '');

  /* linkuri către artefacte -> marcaje de pagină */
  for (const [id, key] of Object.entries(LINKS)) {
    const re = new RegExp('href="https://claude\\.ai/code/artifact/' + id + '"(\\s+target="_blank")?(\\s+rel="noopener")?', 'g');
    s = s.replace(re, `href="{{page:${key}}}"`);
  }

  /* „Sportivi — curând" devine link real (pagina există) */
  if (page === 'acasa') {
    s = s.replace(/<a href="#alege">Sportivi<span class="soon">curând<\/span><\/a>/, '<a href="{{page:sportivi}}">Sportivi</a>');
    s = s.replace(/<a class="pcard" style="--a:var\(--green\)" href="#alege">\s*<span class="soon">Curând<\/span>/, '<a class="pcard" style="--a:var(--green)" href="{{page:sportivi}}">');
    s = s.replace(/<span class="go">În pregătire /, '<span class="go">Vezi pagina ');
    s = s.replace(/<a href="#alege">Pentru sportivi<span class="soon">curând<\/span><\/a>/, '<a href="{{page:sportivi}}">Pentru sportivi</a>');
  }

  /* videoul de prezentare — generatorul decide ce randează */
  s = s.replace(/<video autoplay muted loop playsinline><source src="__VIDEO1__" type="video\/mp4"><\/video>/g, '{{video}}');

  /* insignele de magazin duc în aplicație, nu deschid modalul */
  s = s.replace(/<a class="store-badge js-reg" href="#">/g, '<a class="store-badge" href="{{app}}/" rel="noopener">');

  /* termeni / confidențialitate */
  s = s.replace(/<a href="#"([^>]*)>Termenii<\/a>/g, '<a href="{{page:termeni}}"$1>Termenii</a>');
  s = s.replace(/<a href="#"([^>]*)>Politica de confidențialitate<\/a>/g, '<a href="{{page:confidentialitate}}"$1>Politica de confidențialitate</a>');

  s = s.replace(/<img (?![^>]*loading=)/g, '<img loading="lazy" decoding="async" ');

  return s.trim() + '\n';
}

const BODY = {};
for (const [file, key] of [['index', 'acasa'], ['sportivi', 'sportivi'], ['parinti', 'parinti'], ['cluburi', 'cluburi'], ['antrenori', 'antrenori']]) {
  BODY[key] = transform(fs.readFileSync(path.join(OUT, file + '.body.html'), 'utf8'), key);
  fs.writeFileSync(path.join(WEB, 'content', key + '.html'), BODY[key]);
  console.log(`content/${key}.html`.padEnd(28), (BODY[key].length / 1024).toFixed(1) + ' KB');
}

/* ---------------- sprite per pagină ---------------- */
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

/* simboluri prezente pe orice pagină: layout + iconițe injectate din JS */
const COMMON = new Set([
  ...referenced([
    readIf(path.join(WEB, 'site/layout.mjs')),
    readIf(path.join(WEB, 'site/config.mjs')),
    readIf(path.join(WEB, 'build.mjs')),
    readIf(path.join(WEB, 'assets/js/site.js')),
  ].join('\n')),
  'growie-mark', 'i-menu', 'i-x', 'i-check', 'i-star', 'i-sparkles',
]);

const BRANDS = 'b-google b-fb b-apple b-gplay';
const SETS = {
  acasa: [BODY.acasa, readIf(path.join(WEB, 'assets/js/page-acasa.js'))],
  parinti: [BODY.parinti, readIf(path.join(WEB, 'content/overlay-parinti.html')), readIf(path.join(WEB, 'assets/js/page-parinti.js')), BRANDS],
  sportivi: [BODY.sportivi, readIf(path.join(WEB, 'content/overlay-sportivi.html')), readIf(path.join(WEB, 'assets/js/page-sportivi.js'))],
  cluburi: [BODY.cluburi, readIf(path.join(WEB, 'content/overlay-cluburi.html')), readIf(path.join(WEB, 'assets/js/page-cluburi.js')), BRANDS],
  antrenori: [BODY.antrenori, readIf(path.join(WEB, 'content/overlay-antrenori.html')), readIf(path.join(WEB, 'assets/js/page-antrenori.js')), BRANDS],
  legal: ['i-file'],
  // paginile de intoarcere de la Stripe (cont creat / plata anulata)
  stare: ['i-card i-check-circle i-rocket i-home i-mail i-lock'],
  eroare: [readIf(path.join(WEB, 'build.mjs')), 'growie'],
};

const usedAnywhere = new Set(COMMON);
console.log('');
for (const [key, sources] of Object.entries(SETS)) {
  const ids = new Set(COMMON);
  for (const src of sources) {
    if (/^[a-z0-9- ]+$/.test(src)) src.split(/\s+/).forEach((id) => ids.add(id));
    else referenced(src).forEach((id) => ids.add(id));
  }
  const keep = [...ALL.keys()].filter((id) => ids.has(id));
  keep.forEach((id) => usedAnywhere.add(id));

  const svg = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">\n`
    + keep.map((id) => '  ' + ALL.get(id)).join('\n') + '\n</svg>\n';
  fs.writeFileSync(path.join(WEB, 'content/sprites', key + '.svg'), svg);
  console.log(`sprite ${key.padEnd(10)} ${String(keep.length).padStart(2)} simboluri  ${(svg.length / 1024).toFixed(1)} KB`);
}

const never = [...ALL.keys()].filter((id) => !usedAnywhere.has(id));
if (never.length) console.log('\nsimboluri nefolosite nicăieri:', never.join(' '));
console.log('\nGata. Rulează `npm run build` ca să regenerezi dist/.');

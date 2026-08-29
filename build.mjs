#!/usr/bin/env node
/**
 * iGROWth · generator static pentru Cloudflare Pages
 *
 *   npm run build            → dist/
 *   IG_ENV=preview npm run build
 *
 * Nu are dependinţe: doar Node 18+. Citeşte conţinutul din content/, îl
 * îmbracă în layout-ul din site/ şi scrie HTML gata de servit în dist/.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, PAGES, esc, url, icon, pageUrl, addressLine } from './site/config.mjs';
import { normalize, jsonLd, sitemap } from './site/seo.mjs';
import { document } from './site/layout.mjs';
import { PAGE_DEFS } from './site/pages.mjs';
import { loadPlans, priceMarkers, yearlyCodes, schemaOffers } from './site/plans.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, process.argv[2] ?? 'dist');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const has  = (p) => existsSync(join(ROOT, p.replace(/^\//, '')));

let problems = 0;
const fail = (msg) => { problems++; console.log(`  ✗ ${msg}`); };

/* Catalogul de planuri, luat din backend la build (vezi site/plans.mjs). */
const API = process.env.IG_API_URL ?? 'https://igapp-production.up.railway.app';
const { plans: PLANS, source: PLANS_SOURCE } = await loadPlans(API, 'athlete');
const { plans: CLUB_PLANS, source: CLUB_SOURCE } = await loadPlans(API, 'club');
const PRICE_MARKERS = { ...priceMarkers(PLANS), ...priceMarkers(CLUB_PLANS, 'club') };
const YEARLY = yearlyCodes(PLANS);

/* ------------------------------------------------------------------ assets */

/** /assets/css/base.css → /assets/css/base.css?v=<mtime> */
function asset(p) {
  const disk = join(ROOT, p.replace(/^\//, ''));
  const v = existsSync(disk) ? Math.floor(statSync(disk).mtimeMs / 1000) : 1;
  return `${url(p)}?v=${v}`;
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of readdirSync(from, { withFileTypes: true })) {
    if (extname(e.name).toLowerCase() === '.md') continue;   // README-uri, nu în build
    const src = join(from, e.name), dst = join(to, e.name);
    if (e.isDirectory()) n += copyDir(src, dst);
    else { copyFileSync(src, dst); n++; }
  }
  return n;
}

/* ------------------------------------------------------- marcaje în conţinut */

const VIDEO = has('/assets/video/story.mp4')
  ? `<video autoplay muted loop playsinline preload="metadata" poster="${esc(url('/assets/img/story-poster.jpg'))}" aria-label="Cum arată aplicaţia iGROWth">
            <source src="${esc(url('/assets/video/story.mp4'))}" type="video/mp4">
          </video>`
  : `<svg viewBox="0 0 1440 420" class="sv-fallback" aria-hidden="true" focusable="false" style="width:100%;height:100%;object-fit:cover"><use href="#scene-hills"/></svg>`;

/* Comutatorul lunar/anual din modal — apare doar dacă facturarea anuală e
   activă. Altfel trimitem tăcut `month`, ca nimeni să nu aleagă o perioadă pe
   care backend-ul nu o poate factura. */
const BILLING_TOGGLE = SITE.yearlyBilling
  ? `<div class="bill-toggle mini" role="group" aria-label="Perioadă de facturare">
            <button type="button" id="rBtnM" class="active" onclick="setRegPeriod('m')">Lunar</button>
            <button type="button" id="rBtnY" onclick="setRegPeriod('y')">Anual <span class="bill-save">−17%</span></button>
          </div>
          <input type="hidden" name="billing_period" value="month">`
  : `<input type="hidden" name="billing_period" value="month">`;

/* Ilustraţiile din assets/img/ill/, produse de _tools/6-graphics.py. Manifestul
   ţine dimensiunile reale, ca <img> să rezerve locul şi pagina să nu sară. */
const ILL = JSON.parse(readFileSync(join(ROOT, 'site/illustrations.json'), 'utf8'));

/**
 * {{ill:slug|eager|Text alternativ}} → <picture> cu AVIF + WebP.
 *   eager — imagine din primul ecran (fără lazy, cu prioritate la descărcare)
 *   lazy  — imagine de mai jos în pagină
 */
function illustration(slug, load, alt) {
  const size = ILL[slug];
  if (!size) fail(`marcaj {{ill:${slug}}} — lipseşte din site/illustrations.json (rulează _tools/6-graphics.py)`);
  const attrs = load === 'eager'
    ? 'fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';
  return `<picture class="ill">
          <source srcset="${esc(asset(`/assets/img/ill/${slug}.avif`))}" type="image/avif">
          <img src="${esc(asset(`/assets/img/ill/${slug}.webp`))}" width="${size.w}" height="${size.h}" alt="${esc(alt)}" ${attrs}>
        </picture>`;
}

/** Rezolvă {{app}}, {{lead}}, {{video}}, {{ill:…}}, {{billingToggle}} şi {{page:cheie}}. */
function resolve(html) {
  for (const [marker, value] of Object.entries(PRICE_MARKERS)) {
    html = html.replaceAll(marker, value);
  }
  return html
    .replace(/\{\{icon:([a-z0-9-]+)\}\}/g, (_, id) => icon(id))
    .replace(/\{\{ill:([a-z0-9-]+)\|(eager|lazy)\|([^}]+)\}\}/g, (_, slug, load, alt) => illustration(slug, load, alt))
    .replaceAll('{{billingToggle}}', BILLING_TOGGLE)
    .replaceAll('{{app}}', SITE.app)
    .replaceAll('{{lead}}', SITE.lead)
    .replaceAll('{{video}}', VIDEO)
    .replace(/\{\{page:([a-z]+)\}\}/g, (_, k) => {
      if (!PAGES[k]) fail(`marcaj {{page:${k}}} — cheie inexistentă în registru`);
      return pageUrl(k);
    });
}

/* --------------------------------------------------------- corpuri generate */

function legalBody(d) {
  const sections = d.sections.map(([title, paras]) => `      <h2 style="margin-top:34px;font-size:1.25rem;font-weight:800;color:var(--ig-navy)">${esc(title)}</h2>
${paras.map((t) => `      <p style="margin-top:10px;color:var(--ig-muted)">${esc(t)}</p>`).join('\n')}`).join('\n');

  return `<section class="band">
  <div class="wrap" style="max-width:820px">
    <nav aria-label="Firimituri" style="font-size:.86rem;color:var(--ig-muted);margin-bottom:18px">
      <a href="${esc(url('/'))}" style="color:var(--ig-green-2);font-weight:600">Acasă</a>
      <span aria-hidden="true"> › </span>${esc(d.h1)}
    </nav>

    <h1 style="font-size:clamp(1.8rem,4vw,2.6rem);font-weight:900;color:var(--ig-navy)">${esc(d.h1)}</h1>
    <p style="margin-top:14px;color:var(--ig-muted);font-size:1.05rem">${esc(d.intro)}</p>

    <p style="margin-top:24px;padding:16px 18px;border-radius:16px;background:#fff3d9;border:1px solid #ffdfa1;color:#7a5200;font-weight:600">
      ${icon('i-file')}
      Document în curs de redactare. Până la publicarea versiunii finale, ne poți
      scrie oricând la <a href="mailto:${esc(SITE.email)}" style="color:#7a5200;text-decoration:underline">${esc(SITE.email)}</a>
      pentru orice întrebare legată de acest subiect.
    </p>

${sections}

      <h2 style="margin-top:34px;font-size:1.25rem;font-weight:800;color:var(--ig-navy)">Contact</h2>
      <p style="margin-top:10px;color:var(--ig-muted)">
        ${esc(SITE.brandFull)}, ${esc(addressLine())}<br>
        <a href="mailto:${esc(SITE.email)}" style="color:var(--ig-green-2);font-weight:600">${esc(SITE.email)}</a> ·
        <a href="tel:${esc(SITE.phone)}" style="color:var(--ig-green-2);font-weight:600">${esc(SITE.phoneHuman)}</a>
      </p>
  </div>
</section>`;
}

/** Pagini de stare: întoarcerea de la Stripe (cont creat / plată anulată). */
function statusBody(s) {
  const ok = s.tone === 'ok';
  const badge = ok
    ? 'linear-gradient(135deg,#2FB673,#38c983)'
    : 'linear-gradient(135deg,#FFB020,#ff8f3c)';

  const points = s.points.map(([ic, title, text]) => `        <li class="vcard" style="list-style:none">
          <div class="vic" style="background:${badge}">${icon(ic)}</div>
          <h2 style="font-size:1.05rem;color:var(--navy);font-weight:800">${esc(title)}</h2>
          <p style="color:var(--muted);font-size:.95rem;margin-top:6px">${esc(text)}</p>
        </li>`).join('\n');

  return `<section class="band" style="text-align:center">
  <div class="wrap" style="max-width:760px">
    <div style="width:88px;height:88px;border-radius:26px;margin:0 auto 22px;display:grid;place-items:center;color:#fff;font-size:2.4rem;background:${badge};box-shadow:0 16px 34px rgba(14,42,92,.2)">
      ${icon(ok ? 'i-check' : 'i-card')}
    </div>
    <p class="eyebrow eg" style="margin-bottom:18px">${esc(s.eyebrow)}</p>
    <h1 style="font-size:clamp(1.9rem,4vw,2.7rem);font-weight:900;color:var(--navy)">${esc(s.h1)}</h1>
    <p style="margin-top:16px;color:var(--muted);font-size:1.08rem;max-width:52ch;margin-inline:auto">${esc(s.lead)}</p>

    <div class="hero-cta" style="justify-content:center;margin-top:28px">
${s.resume ? `      <button type="button" class="btn btn-primary btn-lg" id="resumePay" hidden>${icon('i-card')} Reia plata</button>\n` : ''}      <a class="btn ${s.resume ? 'btn-ghost' : 'btn-primary'} btn-lg" href="${esc(url(s.cta.href.replace('{app}', SITE.app)))}" rel="noopener">${icon(s.cta.icon)} ${esc(s.cta.label)}</a>
      <a class="btn btn-ghost btn-lg" href="${esc(url('/'))}">${icon('i-home')} Înapoi pe site</a>
    </div>
${s.resume ? `    <p class="reg-error" id="resumeError" style="margin:20px auto 0;max-width:44ch;display:none"></p>
    <script>
    /* Butonul apare doar daca /plata-anulata a primit ?a=<id> de la Stripe. */
    (function () {
      var id = new URLSearchParams(location.search).get('a');
      var btn = document.getElementById('resumePay');
      var err = document.getElementById('resumeError');
      if (!id || !btn) return;
      btn.hidden = false;
      btn.addEventListener('click', function () {
        btn.disabled = true;
        var label = btn.innerHTML;
        btn.textContent = 'Te ducem la plată…';
        err.style.display = 'none';
        fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athlete_id: id })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res && res.ok && res.url) { location.assign(res.url); return; }
            throw new Error((res && res.error) || 'Nu am putut porni plata.');
          })
          .catch(function (e) {
            btn.disabled = false;
            btn.innerHTML = label;
            err.textContent = e.message;
            err.style.display = 'block';
          });
      });
    })();
    </script>
` : ''}

    <ul class="cards9" style="grid-template-columns:repeat(3,1fr);margin:44px 0 0;padding:0;text-align:left">
${points}
    </ul>

    <p style="margin-top:28px;color:var(--dim);font-size:.9rem">
      Ceva nu e în regulă? Scrie-ne la
      <a href="mailto:${esc(SITE.email)}" style="color:var(--green-2);font-weight:600">${esc(SITE.email)}</a>.
    </p>
  </div>
</section>`;
}

function errorBody() {
  const cards = Object.entries(PAGES).filter(([, m]) => m.inFooter).map(([k, m]) =>
    `        <a class="vcard" href="${esc(url(m.path))}">
          <div class="vic" style="background:linear-gradient(135deg,#2FB673,#5B4BD6)">${icon(m.icon)}</div>
          <h2 style="font-size:1.12rem;color:var(--navy);font-weight:800">${esc(m.navLong)}</h2>
        </a>`).join('\n');

  return `<section class="band" style="text-align:center">
  <div class="wrap" style="max-width:680px">
    <svg viewBox="0 0 240 260" aria-hidden="true" focusable="false" style="width:140px;height:auto;margin:0 auto 18px"><use href="#growie"/></svg>
    <p class="eyebrow eg" style="margin-bottom:18px">${icon('i-compass')} Eroare 404</p>
    <h1 style="font-size:clamp(1.9rem,4vw,2.7rem);font-weight:900;color:var(--navy)">Am căutat peste tot. Pagina asta nu există.</h1>
    <p style="margin-top:14px;color:var(--muted);font-size:1.06rem">
      Poate a fost mutată sau linkul e greșit. Mergi înapoi la început sau alege pagina potrivită rolului tău.
    </p>

    <div class="hero-cta" style="justify-content:center;margin-top:26px">
      <a class="btn btn-primary btn-lg" href="${esc(url('/'))}">${icon('i-home')} Înapoi la pagina de start</a>
      <a class="btn btn-ghost btn-lg" href="mailto:${esc(SITE.email)}">${icon('i-mail')} Scrie-ne</a>
    </div>

    <div class="cards9" style="grid-template-columns:repeat(2,1fr);margin-top:40px;text-align:left">
${cards}
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ FAQ */

/** Ia întrebările direct din `<details>`-urile paginii → JSON-LD FAQPage. */
function extractFaq(html) {
  const re = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<div class="fa-body">([\s\S]*?)<\/div>\s*<\/details>/g;
  const strip = (t) => t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const m of html.matchAll(re)) out.push([strip(m[1]), strip(m[2])]);
  return out;
}

/* ------------------------------------------------------------------ build */

console.log(`dist:   ${DIST}`);
console.log(`mediu:  ${SITE.env}`);
console.log(`site:   ${SITE.url}\n`);
console.log(`planuri: ${PLANS.length} din ${PLANS_SOURCE}; cu preţ anual: ${YEARLY.join(', ') || '—'}`);
console.log(`cluburi: ${CLUB_PLANS.length} tier-uri din ${CLUB_SOURCE}`);
if (PLANS_SOURCE.startsWith('copie')) fail(`catalog sportivi neactualizat — ${PLANS_SOURCE}`);
if (CLUB_SOURCE.startsWith('copie')) fail(`catalog cluburi neactualizat — ${CLUB_SOURCE}`);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const sprites = {};
for (const f of readdirSync(join(ROOT, 'content/sprites'))) {
  sprites[f.replace(/\.svg$/, '')] = read(`content/sprites/${f}`);
}

for (const [key, meta] of Object.entries(PAGES)) {
  const def = PAGE_DEFS[key] ?? {};
  let body;

  if (def.legal)             body = legalBody(def.legal);
  else if (def.status)       body = statusBody(def.status);
  else if (key === 'eroare') body = errorBody();
  else                       body = resolve(read(`content/${key}.html`));

  const overlayPath = `content/overlay-${key}.html`;
  const overlay = existsSync(join(ROOT, overlayPath)) ? resolve(read(overlayPath)) : '';

  const page = normalize({ key, ...def, faq: extractFaq(body) }, has);
  /* preţurile din datele structurate vin din acelaşi catalog ca cele afişate */
  if (page.offers && (key === 'parinti' || key === 'sportivi')) page.offers = schemaOffers(PLANS);
  const sprite = sprites[page.sprite];
  if (!sprite) fail(`lipseşte content/sprites/${page.sprite}.svg`);

  const html = document(page, { sprite: sprite ?? '', body, overlay }, { asset, yearlyPlans: YEARLY });
  writeFileSync(join(DIST, meta.file), html);

  console.log(`  ${meta.file.padEnd(24)} ${(html.length / 1024).toFixed(1).padStart(6)} KB   ${page.faq.length ? page.faq.length + ' întrebări' : ''}`);
}

/* sitemap + fişiere statice */
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(DIST, 'sitemap.xml'), sitemap(today));
console.log(`  ${'sitemap.xml'.padEnd(24)}`);

console.log('');
console.log(`  assets/ — ${copyDir(join(ROOT, 'assets'), join(DIST, 'assets'))} fişiere`);
copyFileSync(join(ROOT, 'robots.txt'), join(DIST, 'robots.txt'));
console.log('  robots.txt');

/* Iconiţele din manifest se versionează la fel ca restul asset-urilor: altfel
   o aplicaţie deja instalată ar păstra marca veche un an (/assets/* e
   immutable). Verificăm şi că fişierele chiar există. */
{
  const manifest = JSON.parse(read('site.webmanifest'));
  for (const ic of manifest.icons ?? []) {
    if (!has(ic.src)) fail(`site.webmanifest trimite la ${ic.src}, care lipseşte`);
    ic.src = asset(ic.src);
  }
  writeFileSync(join(DIST, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  site.webmanifest (${(manifest.icons ?? []).length} iconiţe)`);
}
for (const f of ['_headers', '_redirects']) {
  copyFileSync(join(ROOT, 'cloudflare', f), join(DIST, f));
  console.log(`  ${f} (Cloudflare Pages)`);
}
if (SITE.env === 'preview') {
  writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log('  robots.txt suprascris pentru preview (Disallow: /)');
}

/* ------------------------------------------------------------ verificări */

console.log('');
for (const [key, meta] of Object.entries(PAGES)) {
  const html = readFileSync(join(DIST, meta.file), 'utf8');

  if (/\{\{|<\?php|<\?=/.test(html)) fail(`${meta.file} — marcaje nerezolvate`);

  const defined = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
  const used = new Set([...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]));
  const missing = [...used].filter((id) => !defined.has(id));
  if (missing.length) fail(`${meta.file} — simboluri SVG lipsă: ${missing.join(' ')}`);

  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) fail(`${meta.file} — ${h1} elemente <h1> (aşteptat 1)`);

  if (/href="\/[a-z0-9\-/]*\.php/.test(html)) fail(`${meta.file} — link către un fişier .php`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fail(`${meta.file} — JSON-LD invalid: ${e.message}`); }
  }
}

let total = 0;
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p); else total += statSync(p).size;
  }
})(DIST);

if (problems) {
  console.log(`\n✗ ${problems} probleme — build oprit.`);
  process.exit(1);
}
console.log(`✓ build complet — ${(total / 1024 / 1024).toFixed(2)} MB în dist/`);

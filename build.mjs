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

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, process.argv[2] ?? 'dist');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const has  = (p) => existsSync(join(ROOT, p.replace(/^\//, '')));

let problems = 0;
const fail = (msg) => { problems++; console.log(`  ✗ ${msg}`); };

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

/** Rezolvă {{app}}, {{lead}}, {{video}} şi {{page:cheie}}. */
function resolve(html) {
  return html
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

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const sprites = {};
for (const f of readdirSync(join(ROOT, 'content/sprites'))) {
  sprites[f.replace(/\.svg$/, '')] = read(`content/sprites/${f}`);
}

for (const [key, meta] of Object.entries(PAGES)) {
  const def = PAGE_DEFS[key] ?? {};
  let body;

  if (def.legal)            body = legalBody(def.legal);
  else if (key === 'eroare') body = errorBody();
  else                       body = resolve(read(`content/${key}.html`));

  const overlayPath = `content/overlay-${key}.html`;
  const overlay = existsSync(join(ROOT, overlayPath)) ? resolve(read(overlayPath)) : '';

  const page = normalize({ key, ...def, faq: extractFaq(body) }, has);
  const sprite = sprites[page.sprite];
  if (!sprite) fail(`lipseşte content/sprites/${page.sprite}.svg`);

  const html = document(page, { sprite: sprite ?? '', body, overlay }, { asset });
  writeFileSync(join(DIST, meta.file), html);

  console.log(`  ${meta.file.padEnd(24)} ${(html.length / 1024).toFixed(1).padStart(6)} KB   ${page.faq.length ? page.faq.length + ' întrebări' : ''}`);
}

/* sitemap + fişiere statice */
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(DIST, 'sitemap.xml'), sitemap(today));
console.log(`  ${'sitemap.xml'.padEnd(24)}`);

console.log('');
console.log(`  assets/ — ${copyDir(join(ROOT, 'assets'), join(DIST, 'assets'))} fişiere`);
for (const f of ['robots.txt', 'site.webmanifest']) {
  copyFileSync(join(ROOT, f), join(DIST, f));
  console.log(`  ${f}`);
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

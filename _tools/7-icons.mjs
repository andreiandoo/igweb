#!/usr/bin/env node
/**
 * iGROWth · marca de brand, dintr-o singură sursă
 *
 *   node _tools/7-icons.mjs
 *
 * Sursa e _sursa/graphics/icon-logo.svg. De aici ies:
 *   content/sprites/*.svg        simbolul #growie-mark (header, meniu, footer)
 *   assets/img/favicon.svg       fila din browser (se adaptează la temă)
 *   assets/img/logo.svg          logo-ul din JSON-LD şi din partajări
 *   assets/img/apple-touch-icon.png · icon-192.png · icon-512.png
 *
 * Rasterizarea cere Chrome instalat — SVG-ul nu se poate desena cu Node curat.
 * Se rulează doar când se schimbă marca; restul build-ului nu depinde de el.
 */

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, '_sursa/graphics/icon-logo.svg');

/* Culorile de fundal — aceleaşi cu cele din site.webmanifest. */
const LIGHT = '#f4f7fc';
const DARK = '#0E2A5C';

/* ------------------------------------------------------------ sursa, curăţată */

/**
 * Sursa ţine culorile într-un bloc <style> cu clase .cls-N. Într-un sprite
 * partajat acele clase ar scăpa în toată pagina, deci le mut în atribute fill.
 */
function glyph() {
  const raw = readFileSync(SOURCE, 'utf8');

  const fills = {};
  for (const m of raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;}]+)[;\s]*\}/g)) {
    fills[m[1]] = m[2].trim();
  }

  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error('sursa nu are viewBox');

  const body = raw
    .replace(/^[\s\S]*?<defs>[\s\S]*?<\/defs>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
    .replace(/class="(cls-\d+)"/g, (_, c) => {
      if (!fills[c]) throw new Error(`clasa ${c} nu are culoare în <style>`);
      return `fill="${fills[c]}"`;
    });

  if (/class=|<style/.test(body)) throw new Error('au rămas clase sau <style> în corp');
  return { viewBox, body };
}

/**
 * Conturul real al desenului, nu al viewBox-ului: sursa are margini
 * inegale, iar iconiţele trebuie centrate pe desen. Măsurat cu Chrome.
 */
const INK = { x: 148.23, y: 89.93, w: 1218.51, h: 1537.26 };

/** Transformarea care aşează desenul centrat, ocupând `fill` din latura mare. */
function place(size, fill) {
  const k = (size * fill) / Math.max(INK.w, INK.h);
  const dx = size / 2 - k * (INK.x + INK.w / 2);
  const dy = size / 2 - k * (INK.y + INK.h / 2);
  return `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${k.toFixed(5)})`;
}

const indent = (body, pad) =>
  body.split('\n').map((l) => pad + l.trim()).filter((l) => l.trim()).join('\n');

/* --------------------------------------------------------------- sprite-urile */

function patchSprites({ viewBox, body }) {
  const symbol = `  <symbol id="growie-mark" viewBox="${viewBox}">\n${indent(body, '    ')}\n  </symbol>`;
  const dir = join(ROOT, 'content/sprites');
  let n = 0;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    const path = join(dir, file);
    const text = readFileSync(path, 'utf8');
    const re = /  <symbol id="growie-mark"[\s\S]*?<\/symbol>/;
    if (!re.test(text)) continue;
    writeFileSync(path, text.replace(re, symbol));
    n++;
  }
  return n;
}

/* -------------------------------------------------------------- SVG-urile fixe */

/** Fila din browser: pătrat rotunjit, cu fundal care urmează tema sistemului. */
function faviconSvg({ body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="iGROWth">
  <style>
    .bg { fill: ${LIGHT} }
    @media (prefers-color-scheme: dark) { .bg { fill: ${DARK} } }
  </style>
  <rect class="bg" width="100" height="100" rx="22"/>
  <g transform="${place(100, 0.72)}">
${indent(body, '    ')}
  </g>
</svg>
`;
}

/** Logo-ul din JSON-LD şi din partajări: fundal opac, ca să arate şi pe alb. */
function logoSvg({ body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="iGROWth">
  <title>iGROWth</title>
  <defs>
    <linearGradient id="igBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LIGHT}"/>
      <stop offset="1" stop-color="#e7f7ef"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#igBg)"/>
  <g transform="${place(512, 0.72)}">
${indent(body, '    ')}
  </g>
</svg>
`;
}

/* ------------------------------------------------------------------- rasterul */

/**
 * Iconiţele PNG. Niciuna nu are transparenţă: Android şi iOS pun negru în spate.
 *
 * Rolurile sunt separate, fiindcă cer desene diferite:
 *   any       — se afişează aşa cum e, deci are colţuri rotunde şi desen mare;
 *   maskable  — Android taie din ea ce formă vrea, deci fundalul merge până în
 *               margine (fără rotunjire) şi desenul stă în zona sigură, cercul
 *               central de 80%. De aceea e vizibil mai mic.
 * apple-touch-icon nu se rotunjeşte: iOS aplică singur masca.
 */
const RASTER = [
  { file: 'apple-touch-icon.png', size: 180, fill: 0.68, radius: 0, bg: LIGHT },
  { file: 'icon-192.png', size: 192, fill: 0.68, radius: 0.2, bg: 'gradient' },
  { file: 'icon-512.png', size: 512, fill: 0.68, radius: 0.2, bg: 'gradient' },
  { file: 'icon-maskable-512.png', size: 512, fill: 0.58, radius: 0, bg: LIGHT },
];

function chrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ];
  for (const c of candidates) {
    if (spawnSync('node', ['-e', `process.exit(require('fs').existsSync(${JSON.stringify(c)})?0:1)`]).status === 0) return c;
  }
  return null;
}

function rasterize(bin, { body }) {
  const work = mkdtempSync(join(tmpdir(), 'ig-icons-'));
  const made = [];

  for (const { file, size, fill, radius, bg } of RASTER) {
    const paint = bg === 'gradient'
      ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${LIGHT}"/><stop offset="1" stop-color="#e7f7ef"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${size * radius}" fill="url(#g)"/>`
      : `<rect width="${size}" height="${size}" rx="${size * radius}" fill="${bg}"/>`;

    const page = `<body style="margin:0;background:${LIGHT}">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
${paint}
<g transform="${place(size, fill)}">
${indent(body, '')}
</g>
</svg>
</body>`;

    const html = join(work, `${file}.html`);
    const out = join(work, file);
    writeFileSync(html, page);

    spawnSync(bin, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      '--virtual-time-budget=3000',
      `file:///${html.replace(/\\/g, '/')}`,
    ], { stdio: 'ignore' });

    const png = readFileSync(out);
    /* dimensiunea reală stă în header-ul IHDR, octeţii 16..24 */
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    if (w !== size || h !== size) throw new Error(`${file}: Chrome a dat ${w}x${h}, nu ${size}x${size}`);

    writeFileSync(join(ROOT, 'assets/img', file), png);
    made.push(`${file} ${size}px · ${(png.length / 1024).toFixed(1)} KB`);
  }

  rmSync(work, { recursive: true, force: true });
  return made;
}

/* ---------------------------------------------------------------------- main */

const g = glyph();

console.log(`  ${patchSprites(g)} sprite-uri · #growie-mark`);

writeFileSync(join(ROOT, 'assets/img/favicon.svg'), faviconSvg(g));
console.log('  favicon.svg');
writeFileSync(join(ROOT, 'assets/img/logo.svg'), logoSvg(g));
console.log('  logo.svg');

const bin = chrome();
if (!bin) {
  console.log('\n  Chrome nu e instalat — PNG-urile rămân neschimbate.');
  console.log('  Instalează Chrome sau Edge şi rulează din nou.');
} else {
  for (const line of rasterize(bin, g)) console.log(`  ${line}`);
}

console.log('\n  Nu uita `npm run build` după.');

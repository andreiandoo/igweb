#!/usr/bin/env node
/*
 * Verificare pe un site pornit (local sau un deploy de preview).
 *
 *   node _tools/4-verify.mjs http://localhost:8099
 *   node _tools/4-verify.mjs https://web.sportiveducat.pages.dev
 *
 * `npm run build` verifică deja HTML-ul generat (marcaje, simboluri SVG, h1,
 * JSON-LD). Scriptul ăsta verifică ce ține de server: coduri HTTP, URL-uri
 * curate, 404 real, redirecturi și endpoint-ul formularelor.
 */
const BASE = (process.argv[2] ?? 'http://localhost:8099').replace(/\/$/, '');

let failed = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) { failed++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ✓ ${name}`);
};

const get = (p, opts) => fetch(BASE + p, { redirect: 'manual', ...opts });

console.log(`Verific ${BASE}\n`);

/* pagini */
for (const p of ['/', '/parinti', '/sportivi', '/cluburi', '/antrenori', '/termeni', '/confidentialitate', '/cookies']) {
  const r = await get(p);
  const html = await r.text();
  ok(`${p} → 200`, r.status === 200, `primit ${r.status}`);
  if (r.status !== 200) continue;
  ok(`${p} canonical`, /<link rel="canonical" href="https:\/\//.test(html));
  ok(`${p} description`, /<meta name="description" content="..+"/.test(html));
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  ok(`${p} un singur <h1>`, h1 === 1, `${h1} găsite`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { ok(`${p} JSON-LD valid`, false, e.message); }
  }
}

/* fişiere de serviciu */
{
  const r = await get('/sitemap.xml');
  const b = await r.text();
  ok('/sitemap.xml', r.status === 200 && b.includes('</urlset>'));
  ok('/robots.txt', (await get('/robots.txt')).status === 200);
}

/* URL-uri curate şi 404 real */
{
  const r = await get('/parinti.html');
  ok('/parinti.html → 308 spre /parinti', r.status === 308 && (r.headers.get('location') ?? '').endsWith('/parinti'), `${r.status} ${r.headers.get('location')}`);
  const nf = await get('/pagina-inexistenta-xyz');
  ok('URL inexistent → 404 real', nf.status === 404, `primit ${nf.status}`);
}

/* endpoint-ul formularelor */
{
  const bad = await get('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'club', data: { legal_name: 'X' } }),
  });
  ok('/api/lead respinge datele incomplete', bad.status === 422, `primit ${bad.status}`);

  const hp = await get('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'club', data: { website_confirm: 'bot' } }),
  });
  ok('/api/lead înghite honeypot-ul', hp.status === 200);
}

console.log(failed ? `\n✗ ${failed} verificări eşuate.` : '\n✓ Toate verificările au trecut.');
process.exit(failed ? 1 : 0);

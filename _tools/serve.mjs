#!/usr/bin/env node
/**
 * Server local care imită comportamentul Cloudflare Pages peste dist/:
 *   /parinti       → dist/parinti.html          (URL „frumos")
 *   /parinti.html  → 308 → /parinti
 *   /              → dist/index.html
 *   necunoscut     → dist/404.html cu status 404
 *   /_headers      → aplică antetele definite acolo
 *   /api/*         → rulează funcţia din functions/api/*.js (aproximativ)
 *
 *   node _tools/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.argv[2] ?? 8099);

if (!existsSync(DIST)) {
  console.error('dist/ nu există — rulează întâi `npm run build`.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

/** Parsează dist/_headers în [{ pattern, headers }]. */
function loadHeaders() {
  const f = join(DIST, '_headers');
  if (!existsSync(f)) return [];
  const rules = [];
  let current = null;
  for (const raw of readFileSync(f, 'utf8').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { current = { pattern: line.trim(), headers: {} }; rules.push(current); continue; }
    const i = line.indexOf(':');
    if (current && i > 0) current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
const HEADER_RULES = loadHeaders();

function headersFor(pathname) {
  const out = {};
  for (const r of HEADER_RULES) {
    const re = new RegExp('^' + r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    if (re.test(pathname)) Object.assign(out, r.headers);
  }
  return out;
}

function send(res, status, body, type, pathname = '') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': type.startsWith('text/html') ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600',
    ...headersFor(pathname),
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(u.pathname);

  /* funcţii Pages (aproximare pentru dezvoltare) */
  if (p.startsWith('/api/')) {
    const fn = join(ROOT, 'functions', p.replace(/^\//, '') + '.js');
    if (!existsSync(fn)) return send(res, 404, '{"error":"not found"}', TYPES['.json']);
    try {
      const mod = await import(pathToFileURL(fn).href + '?t=' + Date.now());
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const request = new Request('http://localhost' + req.url, {
        method: req.method,
        headers: req.headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      });
      const handler = mod[`onRequest${req.method[0]}${req.method.slice(1).toLowerCase()}`] ?? mod.onRequest;
      if (!handler) return send(res, 405, '{"error":"method not allowed"}', TYPES['.json']);
      const out = await handler({ request, env: process.env, waitUntil: () => {} });
      const body = await out.text();
      res.writeHead(out.status, Object.fromEntries(out.headers));
      return res.end(body);
    } catch (e) {
      return send(res, 500, JSON.stringify({ error: String(e) }), TYPES['.json']);
    }
  }

  /* /pagina.html → 308 → /pagina  (ca pe Pages) */
  if (p.endsWith('.html')) {
    const clean = p === '/index.html' ? '/' : p.slice(0, -5);
    res.writeHead(308, { Location: clean });
    return res.end();
  }
  /* /pagina/ → 308 → /pagina */
  if (p.length > 1 && p.endsWith('/')) {
    res.writeHead(308, { Location: p.slice(0, -1) });
    return res.end();
  }

  const candidates = p === '/'
    ? ['index.html']
    : [p.replace(/^\//, ''), p.replace(/^\//, '') + '.html'];

  for (const c of candidates) {
    const file = join(DIST, c);
    if (existsSync(file) && statSync(file).isFile()) {
      return send(res, 200, readFileSync(file), TYPES[extname(file)] ?? 'application/octet-stream', p);
    }
  }

  const notFound = join(DIST, '404.html');
  if (existsSync(notFound)) return send(res, 404, readFileSync(notFound), TYPES['.html'], p);
  send(res, 404, 'Not found', TYPES['.txt']);
});

server.listen(PORT, () => {
  console.log(`dist/ servit pe http://localhost:${PORT}  (Ctrl+C pentru oprire)`);
});

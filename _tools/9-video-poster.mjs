#!/usr/bin/env node
/**
 * Scoate posterul (un cadru) din clipurile din assets/video/.
 *
 *   node _tools/9-video-poster.mjs
 *
 * De ce prin browser: decodarea H.264 cere un decodor, iar proiectul nu are
 * ffmpeg. Chrome are unul, deci încarc clipul într-o pagină, sar la o secundă
 * şi desenez cadrul pe un <canvas>.
 *
 * Confirmă în acelaşi drum că fişierul chiar se redă — util după rearanjarea
 * atomilor făcută de _tools/9-video.py.
 *
 * Posterul e ce se vede până porneşte clipul, deci trebuie să fie uşor:
 * îl scriu JPEG la calitate 72, redus la 540 px lăţime.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/img/video');
const VIDEOS = JSON.parse(readFileSync(join(ROOT, 'site/videos.json'), 'utf8'));

const POSTER_WIDTH = 540;
const AT_SECOND = 1;          // primul cadru e adesea negru; iau o secundă mai încolo

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

if (!CHROME) {
  console.log('  Chrome nu e instalat — posterele rămân neschimbate.');
  process.exit(0);
}

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  '--allow-file-access-from-files',
  '--remote-debugging-port=9360', 'about:blank',
]);
await new Promise((r) => setTimeout(r, 2500));

const version = await (await fetch('http://127.0.0.1:9360/json/version')).json();
const sock = new WebSocket(version.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res) => {
  const i = ++id;
  pending.set(i, res);
  sock.send(JSON.stringify({ id: i, method, params, sessionId }));
});
await new Promise((r) => sock.addEventListener('open', r));
sock.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});

/* Chrome refuză un file:// media încărcat dintr-o pagină about:blank, aşa că
   pun o pagină goală chiar lângă clipuri şi cer sursa cu cale relativă. */
const stage = join(ROOT, 'assets/video/_poster.html');
writeFileSync(stage, '<!doctype html><meta charset="utf-8"><title>poster</title>');

const { targetId } = await send('Target.createTarget', {
  url: 'file:///' + stage.replace(/\\/g, '/'),
});
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await new Promise((r) => setTimeout(r, 800));

mkdirSync(OUT, { recursive: true });
let problems = 0;

for (const [slug, meta] of Object.entries(VIDEOS)) {
  const file = `${slug}.mp4`;
  const height = Math.round((POSTER_WIDTH * meta.h) / meta.w);

  const script = `new Promise((done) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = '${file}';
    const fail = (why) => done(JSON.stringify({ ok: false, why }));
    v.onerror = () => fail('video.onerror: ' + (v.error && v.error.message));
    setTimeout(() => fail('timeout'), 20000);
    v.onloadeddata = () => { v.currentTime = Math.min(${AT_SECOND}, v.duration / 2); };
    v.onseeked = () => {
      const c = document.createElement('canvas');
      c.width = ${POSTER_WIDTH}; c.height = ${height};
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      done(JSON.stringify({
        ok: true, duration: v.duration,
        w: v.videoWidth, h: v.videoHeight,
        jpeg: c.toDataURL('image/jpeg', 0.72).split(',')[1],
      }));
    };
  })`;

  const { result } = await send('Runtime.evaluate',
    { expression: script, awaitPromise: true, returnByValue: true }, sessionId);
  const out = JSON.parse(result.value);

  if (!out.ok) {
    console.log(`  ✗ ${slug} — clipul nu s-a redat (${out.why})`);
    problems++;
    continue;
  }

  const jpeg = Buffer.from(out.jpeg, 'base64');
  writeFileSync(join(OUT, `${slug}.jpg`), jpeg);
  console.log(`  ${slug.padEnd(12)} poster ${POSTER_WIDTH}x${height} · ${(jpeg.length / 1024).toFixed(0)} KB`
    + `  (clip ${out.w}x${out.h}, ${out.duration.toFixed(2)}s — se redă corect)`);
}

rmSync(stage, { force: true });
proc.kill();
process.exit(problems ? 1 : 0);

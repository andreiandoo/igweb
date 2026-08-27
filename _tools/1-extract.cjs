const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', '_sursa');
const OUT = path.join(__dirname, '.out');
fs.mkdirSync(OUT, { recursive: true });

function splitRules(css) {
  const out = []; let i = 0, start = 0, depth = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = (e < 0 ? css.length : e + 2); continue; }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth--; i++; if (depth === 0) { out.push(css.slice(start, i)); start = i; } continue; }
    i++;
  }
  if (css.slice(start).trim()) out.push(css.slice(start));
  return out.map(s => s.trim()).filter(Boolean);
}
const selOf = r => { const b = r.indexOf('{'); return (b < 0 ? r : r.slice(0, b)).trim(); };
const bodyOf = r => r.slice(r.indexOf('{') + 1, r.lastIndexOf('}'));

const STRIP = [
  /^header\b/, /^\.nav\b/, /^\.nav-links\b/, /^\.nav-cta\b/, /^\.nlinks\b/, /^\.ncta\b/,
  /^\.logo\b/, /^\.burger\b/, /^\.mnav\b/, /^\.mnav-bd\b/, /^\.mnav-panel\b/,
  /^footer\b/, /^\.fgrid\b/, /^\.fbrand\b/, /^\.fcol\b/, /^\.fbot\b/, /^\.fsoc\b/,
  /^\.foot-/, /^\.dl-bridge\b/, /^\.fd-/, /^\.mcta\b/, /^\.mobile-cta\b/,
  /^\.btn\b/, /^\.btn-/, /^\.glow\b/, /^#progress\b/,
];
const shouldStrip = sel => {
  const parts = sel.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(p => STRIP.some(re => re.test(p)));
};
function filterCss(css) {
  const keep = [];
  for (const r of splitRules(css)) {
    const sel = selOf(r);
    if (/^@(media|supports)/i.test(sel)) {
      const inner = filterCss(bodyOf(r));
      if (inner.trim()) keep.push(sel + '{\n' + inner.trim() + '\n}');
      continue;
    }
    if (/^@(keyframes|-webkit-keyframes|font-face|import|charset)/i.test(sel)) { keep.push(r); continue; }
    if (shouldStrip(sel)) continue;
    keep.push(r);
  }
  return keep.join('\n');
}

const symbols = new Map();
function harvestSprite(html) {
  const re = /<svg[^>]*width="0"[^>]*>[\s\S]*?<\/svg>/g;
  let m;
  while ((m = re.exec(html))) {
    const sre = /<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g; let s;
    while ((s = sre.exec(m[0]))) if (!symbols.has(s[1])) symbols.set(s[1], s[0]);
  }
  return html.replace(re, '');
}

const PAGES = ['index', 'sportivi', 'parinti', 'cluburi', 'antrenori'];
const cssOf = {};
for (const p of PAGES) {
  let html = fs.readFileSync(path.join(SRC, p + '.html'), 'utf8');
  cssOf[p] = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
  html = html.replace(/<style>[\s\S]*?<\/style>/g, '');
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n\n');
  html = html.replace(/<script>[\s\S]*?<\/script>/g, '');
  html = harvestSprite(html);
  let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  body = body.replace(/<div id="progress"><\/div>/g, '');
  body = body.replace(/<!--\s*HEADER\s*-->/gi, '').replace(/<header>[\s\S]*?<\/header>/g, '\n<!--IG_HEADER-->\n');
  body = body.replace(/<!--\s*MOBILE NAV\s*-->/gi, '').replace(/<div class="mnav" id="mnav">[\s\S]*?\n<\/div>/, '\n<!--IG_MNAV-->\n');
  body = body.replace(/<!--\s*FOOTER\s*-->/gi, '').replace(/<footer>[\s\S]*?<\/footer>/g, '\n<!--IG_FOOTER-->\n');
  fs.writeFileSync(path.join(OUT, p + '.js'), js);
  fs.writeFileSync(path.join(OUT, p + '.body.html'), body.trim());
}

// theme = block 0 din parinti (identic in cluburi/antrenori)
const theme = filterCss(cssOf.parinti[0]);
fs.writeFileSync(path.join(OUT, 'theme.css'), theme);
fs.writeFileSync(path.join(OUT, 'page-index.css'), filterCss(cssOf.index.join('\n')));
fs.writeFileSync(path.join(OUT, 'page-sportivi.css'), filterCss(cssOf.sportivi.join('\n')));
fs.writeFileSync(path.join(OUT, 'page-parinti.css'), filterCss(cssOf.parinti.slice(1).join('\n')));
fs.writeFileSync(path.join(OUT, 'page-cluburi.css'), filterCss(cssOf.cluburi.slice(1).join('\n')));
fs.writeFileSync(path.join(OUT, 'page-antrenori.css'), filterCss(cssOf.antrenori.slice(1).join('\n')));

const ICON = [...symbols.keys()].filter(id => id === 'growie-mark' || !/^(growie|scene-)/.test(id));
const BIG = [...symbols.keys()].filter(id => id !== 'growie-mark' && /^(growie|scene-)/.test(id));
fs.writeFileSync(path.join(OUT, 'sprite.icons.svg'), ICON.map(id => '  ' + symbols.get(id)).join('\n'));
fs.writeFileSync(path.join(OUT, 'sprite.mascots.svg'), BIG.map(id => '  ' + symbols.get(id)).join('\n'));

for (const f of fs.readdirSync(OUT)) {
  console.log(f.padEnd(26), (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1) + ' KB');
}

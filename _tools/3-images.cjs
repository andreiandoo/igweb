/* Genereaza PNG-urile de brand (OG, favicon PNG, icon) fara dependinte.
   Encoder PNG minimal + rasterizare cu supersampling 2x. */
const fs = require('fs');
const zlib = require('zlib');

const path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'img');
fs.mkdirSync(OUT + '/og', { recursive: true });

/* ---------------- PNG encoder ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- canvas ---------------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function Canvas(w, h) {
  this.w = w; this.h = h;
  this.d = new Float32Array(w * h * 3);
}
Canvas.prototype.px = function (x, y, c, a) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
  const i = (y * this.w + x) * 3;
  this.d[i] += (c[0] - this.d[i]) * a;
  this.d[i + 1] += (c[1] - this.d[i + 1]) * a;
  this.d[i + 2] += (c[2] - this.d[i + 2]) * a;
};
Canvas.prototype.each = function (fn) {
  for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) fn(x, y);
};
/** elipsa (optional rotita) */
Canvas.prototype.ellipse = function (cx, cy, rx, ry, color, alpha, rot) {
  alpha = alpha === undefined ? 1 : alpha;
  rot = rot || 0;
  const c = Array.isArray(color) ? color : hex(color);
  const cs = Math.cos(-rot), sn = Math.sin(-rot);
  const r = Math.max(rx, ry) + 2;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      const u = dx * cs - dy * sn, v = dx * sn + dy * cs;
      const q = (u * u) / (rx * rx) + (v * v) / (ry * ry);
      if (q <= 1) this.px(x, y, c, alpha);
    }
  }
};
/** elipsa taiata sub o linie orizontala (pentru gura) */
Canvas.prototype.ellipseBelow = function (cx, cy, rx, ry, color, yCut) {
  const c = hex(color);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    if (y < yCut) continue;
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const q = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry);
      if (q <= 1) this.px(x, y, c, 1);
    }
  }
};
Canvas.prototype.linearGradient = function (a, b, angle) {
  const ca = hex(a), cb = hex(b);
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const len = Math.abs(this.w * ux) + Math.abs(this.h * uy);
  this.each((x, y) => {
    let t = (x * ux + y * uy) / len;
    t = Math.max(0, Math.min(1, t));
    const i = (y * this.w + x) * 3;
    this.d[i] = ca[0] + (cb[0] - ca[0]) * t;
    this.d[i + 1] = ca[1] + (cb[1] - ca[1]) * t;
    this.d[i + 2] = ca[2] + (cb[2] - ca[2]) * t;
  });
};
Canvas.prototype.radialGlow = function (cx, cy, r, color, maxAlpha) {
  const c = hex(color);
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(this.h - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(this.w - 1, Math.ceil(cx + r)); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d > 1) continue;
      this.px(x, y, c, maxAlpha * Math.pow(1 - d, 2));
    }
  }
};
Canvas.prototype.roundRect = function (x0, y0, w, h, r, color, alpha) {
  const c = hex(color);
  for (let y = Math.floor(y0); y < y0 + h; y++) {
    for (let x = Math.floor(x0); x < x0 + w; x++) {
      const dx = Math.max(x0 + r - x, 0, x - (x0 + w - r));
      const dy = Math.max(y0 + r - y, 0, y - (y0 + h - r));
      if (dx * dx + dy * dy <= r * r) this.px(x, y, c, alpha === undefined ? 1 : alpha);
    }
  }
};
Canvas.prototype.downscale = function (factor) {
  const w = this.w / factor, h = this.h / factor;
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < factor; j++) {
        for (let i = 0; i < factor; i++) {
          const k = ((y * factor + j) * this.w + (x * factor + i)) * 3;
          r += this.d[k]; g += this.d[k + 1]; b += this.d[k + 2];
        }
      }
      const n = factor * factor, o = (y * w + x) * 3;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n);
    }
  }
  return { w, h, buf: out };
};

/* ---------------- mascota Growie (versiune simplificata, geometrica) ---------------- */
function drawGrowie(cv, cx, cy, R) {
  const s = R / 36; // scala fata de logomark-ul 100x100 (r=36)

  // tulpina + frunze
  cv.ellipse(cx - 11 * s, cy - 40 * s, 11 * s, 6.5 * s, '#43c98a', 1, -0.5);
  cv.ellipse(cx + 11 * s, cy - 39 * s, 11 * s, 6.5 * s, '#5fd79c', 1, 0.5);
  cv.ellipse(cx, cy - 42 * s, 2.4 * s, 12 * s, '#1f9d5f');

  // corp
  cv.ellipse(cx, cy, R, R, '#2FB673');
  // fata
  cv.ellipse(cx, cy + 8 * s, 20 * s, 22 * s, '#FFE7C2');
  // obraji
  cv.ellipse(cx - 19 * s, cy + 7 * s, 5 * s, 5 * s, '#ff9db3', 0.55);
  cv.ellipse(cx + 19 * s, cy + 7 * s, 5 * s, 5 * s, '#ff9db3', 0.55);
  // ochi
  cv.ellipse(cx - 11 * s, cy - 6 * s, 10.4 * s, 11.6 * s, '#ffffff');
  cv.ellipse(cx + 11 * s, cy - 6 * s, 10.4 * s, 11.6 * s, '#ffffff');
  cv.ellipse(cx - 8 * s, cy - 3 * s, 6 * s, 6 * s, '#16233f');
  cv.ellipse(cx + 8 * s, cy - 3 * s, 6 * s, 6 * s, '#16233f');
  cv.ellipse(cx - 5.5 * s, cy - 5.5 * s, 2 * s, 2 * s, '#ffffff');
  cv.ellipse(cx + 10.5 * s, cy - 5.5 * s, 2 * s, 2 * s, '#ffffff');
  // gura
  cv.ellipseBelow(cx, cy + 8 * s, 9 * s, 9 * s, '#8a2b4a', cy + 8 * s);
  cv.ellipse(cx, cy + 15 * s, 4 * s, 2.5 * s, '#ff7a9c');
}

/* ---------------- OG images ---------------- */
const OG = {
  default:   { a: '#2FB673', b: '#0E2A5C' },
  acasa:     { a: '#2FB673', b: '#0E2A5C' },
  parinti:   { a: '#ff5d8f', b: '#0E2A5C' },
  sportivi:  { a: '#38b6ff', b: '#0E2A5C' },
  cluburi:   { a: '#5B4BD6', b: '#0E2A5C' },
  antrenori: { a: '#FFB020', b: '#0E2A5C' },
};

const SS = 2; // supersampling
for (const [name, col] of Object.entries(OG)) {
  const W = 1200 * SS, H = 630 * SS;
  const cv = new Canvas(W, H);
  cv.linearGradient('#123a7a', '#081a3c', Math.PI / 5);
  cv.radialGlow(W * 0.14, H * 0.18, H * 0.85, col.a, 0.42);
  cv.radialGlow(W * 0.92, H * 0.9, H * 0.7, col.b, 0.35);
  cv.radialGlow(W * 0.78, H * 0.12, H * 0.55, '#5B4BD6', 0.22);

  // bara de accent jos
  cv.roundRect(0, H - 14 * SS, W, 14 * SS, 0, col.a, 0.95);

  // inele decorative in jurul mascotei
  const cx = W / 2, cy = H * 0.47;
  for (let i = 3; i >= 1; i--) {
    cv.ellipse(cx, cy, H * (0.3 + i * 0.08), H * (0.3 + i * 0.08), '#ffffff', 0.04);
  }

  // mascota
  drawGrowie(cv, cx, cy, H * 0.27);

  const { w, h, buf } = cv.downscale(SS);
  fs.writeFileSync(`${OUT}/og/${name}.png`, encodePNG(w, h, buf));
  console.log('og/' + name + '.png', w + 'x' + h);
}

/* ---------------- iconite ---------------- */
function icon(size, file, bg) {
  const S = 3;
  const cv = new Canvas(size * S, size * S);
  cv.linearGradient(bg[0], bg[1], Math.PI / 4);
  drawGrowie(cv, size * S / 2, size * S * 0.54, size * S * 0.33);
  const { w, h, buf } = cv.downscale(S);
  fs.writeFileSync(`${OUT}/${file}`, encodePNG(w, h, buf));
  console.log(file, w + 'x' + h);
}
icon(180, 'apple-touch-icon.png', ['#f4f7fc', '#e7f7ef']);
icon(512, 'icon-512.png', ['#f4f7fc', '#e7f7ef']);
icon(192, 'icon-192.png', ['#f4f7fc', '#e7f7ef']);

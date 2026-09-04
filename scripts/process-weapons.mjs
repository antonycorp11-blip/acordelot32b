/**
 * Armas isoladas (fundo magenta) — chroma key + trim. Sem sombra, sem sheet.
 * Movimento é 100% por código (sistema de arma flutuante).
 * Uso: node scripts/process-weapons.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src/weapons');
const OUT = path.resolve('public/assets/weapons');
fs.mkdirSync(OUT, { recursive: true });

const FILES = [
  { file: 'acordelamina_t2.png', name: 'acordelamina_t2', target: 420 },
  { file: 'acordelamina_t2_energized.png', name: 'acordelamina_t2_energized', target: 420 },
];

const A = (d, w, x, y) => d[(y * w + x) * 4 + 3];

function chroma(png) {
  const { width, height, data } = png;
  const s = [[3, 3], [width - 4, 3], [3, height - 4], [width - 4, height - 4], [width >> 1, 3], [3, height >> 1]];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of s) { const i = (y * width + x) * 4; br += data[i]; bg += data[i + 1]; bb += data[i + 2]; }
  br /= s.length; bg /= s.length; bb /= s.length;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const mag = r > 150 && b > 120 && g < Math.min(r, b) - 30;
    if (d < 76 || mag) { data[i + 3] = 0; data[i] = data[i + 1] = data[i + 2] = 0; }
    else if (d < 150) { data[i + 3] = Math.round(255 * ((d - 76) / 74)); data[i] = Math.round(r * 0.6); data[i + 2] = Math.round(b * 0.6); }
  }
}
function despeckle(png) {
  const { width, height, data } = png;
  const src = Uint8Array.from(data);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = (y * width + x) * 4 + 3;
    if (src[i] === 0) continue;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      if (src[((y + dy) * width + (x + dx)) * 4 + 3] > 16) n++;
    if (n <= 2) data[i] = 0;
  }
}
function bbox(png) {
  const { width, height, data } = png;
  let mnX = width, mxX = 0, mnY = height, mxY = 0, f = false;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
    if (A(data, width, x, y) > 26) { f = true; if (x < mnX) mnX = x; if (x > mxX) mxX = x; if (y < mnY) mnY = y; if (y > mxY) mxY = y; }
  return f ? { mnX, mxX, mnY, mxY } : null;
}
function crop(png, b, target) {
  const fw = b.mxX - b.mnX + 1, fh = b.mxY - b.mnY + 1;
  const S = Math.min(target / fw, target / fh, 1);
  const dw = Math.max(1, Math.round(fw * S)), dh = Math.max(1, Math.round(fh * S));
  const out = new PNG({ width: dw, height: dh });
  const { width, data } = png;
  for (let dy = 0; dy < dh; dy++) {
    const sy = b.mnY + Math.min(fh - 1, Math.floor(dy / S));
    for (let dx = 0; dx < dw; dx++) {
      const sx = b.mnX + Math.min(fw - 1, Math.floor(dx / S));
      const si = (sy * width + sx) * 4, ti = (dy * dw + dx) * 4;
      out.data[ti] = data[si]; out.data[ti + 1] = data[si + 1]; out.data[ti + 2] = data[si + 2]; out.data[ti + 3] = data[si + 3];
    }
  }
  return out;
}

for (const cfg of FILES) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, cfg.file)));
  chroma(png); despeckle(png);
  const b = bbox(png);
  if (!b) { console.warn('vazio:', cfg.file); continue; }
  const img = crop(png, b, cfg.target);
  fs.writeFileSync(path.join(OUT, cfg.name + '.png'), PNG.sync.write(img));
  console.log(`✓ weapons/${cfg.name}.png (${img.width}x${img.height})`);
}

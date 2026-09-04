/**
 * Fatia as ferramentas do Akles (1448x1086, fundo magenta): cada imagem tem
 * 3 tiers lado a lado [madeira | ouro | cristal].
 * Saída:
 *   public/assets/tools/<kind>_<tier>.png   (madeira/ouro/cristal)
 *   kind = 'axe' (machado) | 'pick' (picareta)
 * Uso: node scripts/process-tools.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src/tools');
const OUT = path.resolve('public/assets/tools');
fs.mkdirSync(OUT, { recursive: true });

const SETS = [
  { file: 'axes.png', kind: 'axe' },
  { file: 'pickaxes.png', kind: 'pick' },
];
const TIERS = ['wood', 'gold', 'crystal'];

const A = (d, w, x, y) => d[(y * w + x) * 4 + 3];

function chroma(png) {
  const { width, height, data } = png;
  const s = [[3, 3], [width - 4, 3], [3, height - 4], [width - 4, height - 4]];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of s) {
    const i = (y * width + x) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= 4; bg /= 4; bb /= 4;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const mag = r > 150 && b > 120 && g < Math.min(r, b) - 30;
    if (d < 74 || mag) data[i + 3] = 0;
    else if (d < 150) data[i + 3] = Math.round(255 * ((d - 74) / 76));
  }
}
function despeckle(png) {
  const { width, height, data } = png;
  const src = Uint8Array.from(data);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4 + 3;
      if (src[i] === 0) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (src[((y + dy) * width + (x + dx)) * 4 + 3] > 16) n++;
      if (n <= 2) data[i] = 0;
    }
}
function bbox(png, x0, x1) {
  const { width, height, data } = png;
  let mnX = x1, mxX = x0, mnY = height, mxY = 0, f = false;
  for (let y = 0; y < height; y++)
    for (let x = x0; x <= x1; x++)
      if (A(data, width, x, y) > 26) {
        f = true;
        if (x < mnX) mnX = x;
        if (x > mxX) mxX = x;
        if (y < mnY) mnY = y;
        if (y > mxY) mxY = y;
      }
  return f ? { mnX, mxX, mnY, mxY } : null;
}
function crop(png, b, target) {
  const fw = b.mxX - b.mnX + 1;
  const fh = b.mxY - b.mnY + 1;
  const S = Math.min(target / fw, target / fh);
  const dw = Math.max(1, Math.round(fw * S));
  const dh = Math.max(1, Math.round(fh * S));
  const out = new PNG({ width: dw, height: dh });
  const { width, data } = png;
  for (let dy = 0; dy < dh; dy++) {
    const sy = b.mnY + Math.min(fh - 1, Math.floor(dy / S));
    for (let dx = 0; dx < dw; dx++) {
      const sx = b.mnX + Math.min(fw - 1, Math.floor(dx / S));
      const a = A(data, width, sx, sy);
      const si = (sy * width + sx) * 4;
      const ti = (dy * dw + dx) * 4;
      out.data[ti] = data[si];
      out.data[ti + 1] = data[si + 1];
      out.data[ti + 2] = data[si + 2];
      out.data[ti + 3] = a;
    }
  }
  return out;
}

for (const set of SETS) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, set.file)));
  chroma(png);
  despeckle(png);
  const { width } = png;
  const third = width / 3;
  const segs = [
    [0, Math.round(third) - 1],
    [Math.round(third), Math.round(2 * third) - 1],
    [Math.round(2 * third), width - 1],
  ];
  segs.forEach(([x0, x1], i) => {
    const b = bbox(png, x0, x1);
    if (!b) { console.warn(`[${set.kind}] tier ${TIERS[i]} vazio`); return; }
    const img = crop(png, b, 112);
    const name = `${set.kind}_${TIERS[i]}.png`;
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(img));
    console.log(`✓ tools/${name} (${img.width}x${img.height})`);
  });
}

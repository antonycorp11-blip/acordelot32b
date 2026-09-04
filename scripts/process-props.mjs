/**
 * Fatia os 6 conjuntos de props (1448x1086, fundo magenta): cada imagem tem
 * [spot | forma bruta | forma refinada]. Chroma key + trim de cada terço.
 * Saída:
 *   public/assets/props/<name>_spot.png     (mundo — nó coletável)
 *   public/assets/items/props/<name>_raw.png (ícone item bruto)
 *   public/assets/items/props/<name>_refined.png (ícone item refinado)
 * Uso: node scripts/process-props.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src/props');
const OUT_PROP = path.resolve('public/assets/props');
const OUT_ITEM = path.resolve('public/assets/items/props');
fs.mkdirSync(OUT_PROP, { recursive: true });
fs.mkdirSync(OUT_ITEM, { recursive: true });

const SETS = [
  { file: 'crystal_blue.png', name: 'crystal_blue' },
  { file: 'set2.png', name: 'eco_essence' },
  { file: 'set3.png', name: 'mineral' },
  { file: 'set4.png', name: 'crystal_red' },
  { file: 'set5.png', name: 'gold' },
  { file: 'set6.png', name: 'wood2' },
];

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
    [Math.round(0), Math.round(third) - 1],
    [Math.round(third), Math.round(2 * third) - 1],
    [Math.round(2 * third), width - 1],
  ];
  const outs = ['spot', 'raw', 'refined'];
  segs.forEach(([x0, x1], i) => {
    const b = bbox(png, x0, x1);
    if (!b) {
      console.warn(`[${set.name}] segmento ${i} vazio`);
      return;
    }
    if (i === 0) {
      const img = crop(png, b, 128);
      fs.writeFileSync(path.join(OUT_PROP, `${set.name}_spot.png`), PNG.sync.write(img));
      console.log(`✓ props/${set.name}_spot.png (${img.width}x${img.height})`);
    } else {
      const img = crop(png, b, 96);
      fs.writeFileSync(path.join(OUT_ITEM, `${set.name}_${outs[i]}.png`), PNG.sync.write(img));
      console.log(`✓ items/props/${set.name}_${outs[i]}.png (${img.width}x${img.height})`);
    }
  });
}

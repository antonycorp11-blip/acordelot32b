/**
 * Processa os 12 Ecos musicais (spritesheets 1000x1000, grade 5x4, fundo transparente).
 * Saída: public/assets/ecos/<nota>.png em grade limpa 5x4 [idle, walk, hurt, ...death].
 * Uso: node scripts/process-ecos.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src');
const OUT = path.resolve('public/assets/ecos');
fs.mkdirSync(OUT, { recursive: true });

const NOTES = ['do', 'do_s', 're', 're_s', 'mi', 'fa', 'fa_s', 'sol', 'sol_s', 'la', 'la_s', 'si'];
const COLS = 5;
const ROWS = 4;
const CELL = [96, 108];

const A = (data, w, x, y) => data[(y * w + x) * 4 + 3];

function bbox(png, x0, x1, y0, y1) {
  const { width, data } = png;
  let minX = x1, maxX = x0, minY = y1, maxY = y0, found = false;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (A(data, width, x, y) > 24) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return found ? { minX, maxX, minY, maxY } : null;
}

for (const note of NOTES) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, `eco_${note}.png`)));
  const { width, height, data } = png;
  const scw = width / COLS;
  const sch = height / ROWS;
  const [cw, ch] = CELL;
  const baseline = ch - 3;
  const out = new PNG({ width: cw * COLS, height: ch * ROWS });

  const boxes = [];
  let maxFh = 1, maxFw = 1;
  for (let r = 0; r < ROWS; r++) {
    boxes[r] = [];
    for (let c = 0; c < COLS; c++) {
      const b = bbox(
        png,
        Math.round(c * scw),
        Math.round((c + 1) * scw) - 1,
        Math.round(r * sch),
        Math.round((r + 1) * sch) - 1
      );
      boxes[r][c] = b;
      if (b) {
        maxFh = Math.max(maxFh, b.maxY - b.minY + 1);
        maxFw = Math.max(maxFw, b.maxX - b.minX + 1);
      }
    }
  }
  const S = Math.min((ch - 4) / maxFh, (cw - 2) / maxFw);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const box = boxes[r][c];
      if (!box) continue;
      const fw = box.maxX - box.minX + 1;
      const fh = box.maxY - box.minY + 1;
      const dw = Math.max(1, Math.round(fw * S));
      const dh = Math.max(1, Math.round(fh * S));
      const ox = c * cw + Math.round((cw - dw) / 2);
      const oy = r * ch + baseline - dh;
      for (let dy = 0; dy < dh; dy++) {
        const sy = box.minY + Math.min(fh - 1, Math.floor(dy / S));
        const ty = oy + dy;
        if (ty < r * ch || ty >= (r + 1) * ch) continue;
        for (let dx = 0; dx < dw; dx++) {
          const sx = box.minX + Math.min(fw - 1, Math.floor(dx / S));
          const a = A(data, width, sx, sy);
          if (a === 0) continue;
          const si = (sy * width + sx) * 4;
          const ti = (ty * out.width + ox + dx) * 4;
          out.data[ti] = data[si];
          out.data[ti + 1] = data[si + 1];
          out.data[ti + 2] = data[si + 2];
          out.data[ti + 3] = a;
        }
      }
    }

  fs.writeFileSync(path.join(OUT, note + '.png'), PNG.sync.write(out));
  console.log(`✓ eco ${note}.png (${out.width}x${out.height}, escala ${S.toFixed(3)})`);
}

/**
 * Processa spritesheets de monstros (fundo já transparente, grade 5x4).
 * Reempacota em folhas limpas 5x4 [idle, walk, hurt, death] com âncora nos pés.
 * Uso: node scripts/process-monsters.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('public/assets/monsters');
const OUT = SRC;

const SHEETS = [
  { file: 'eco_azul.png', name: 'eco_azul', cols: 5, rows: 4, cell: [110, 120] },
  { file: 'aranha.png', name: 'aranha', cols: 5, rows: 4, cell: [128, 108] },
  { file: 'nocturno.png', name: 'nocturno', cols: 5, rows: 4, cell: [120, 128] },
];

const A = (data, w, x, y) => data[(y * w + x) * 4 + 3];

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

function bbox(png, x0, x1, y0, y1) {
  const { width, data } = png;
  let minX = x1, maxX = x0, minY = y1, maxY = y0, found = false;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (A(data, width, x, y) > 22) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return found ? { minX, maxX, minY, maxY } : null;
}

for (const cfg of SHEETS) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, cfg.file)));
  despeckle(png);
  const { width, height, data } = png;
  const srcCW = width / cfg.cols;
  const srcCH = height / cfg.rows;
  const [cw, ch] = cfg.cell;
  const baseline = ch - 3;
  const out = new PNG({ width: cw * cfg.cols, height: ch * cfg.rows });

  // passe 1: bboxes
  const boxes = [];
  let maxFh = 1, maxFw = 1;
  for (let r = 0; r < cfg.rows; r++) {
    boxes[r] = [];
    for (let c = 0; c < cfg.cols; c++) {
      const b = bbox(
        png,
        Math.round(c * srcCW),
        Math.round((c + 1) * srcCW) - 1,
        Math.round(r * srcCH),
        Math.round((r + 1) * srcCH) - 1
      );
      boxes[r][c] = b;
      if (b) {
        maxFh = Math.max(maxFh, b.maxY - b.minY + 1);
        maxFw = Math.max(maxFw, b.maxX - b.minX + 1);
      }
    }
  }
  const S = Math.min((ch - 4) / maxFh, (cw - 2) / maxFw);

  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
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
  }

  fs.writeFileSync(path.join(OUT, cfg.name + '.png'), PNG.sync.write(out));
  console.log(`✓ ${cfg.name}.png (${out.width}x${out.height}, ${cfg.cols}x${cfg.rows}, escala ${S.toFixed(3)})`);
}

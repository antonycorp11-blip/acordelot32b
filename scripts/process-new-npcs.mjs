/**
 * Normaliza as folhas 1280x960 entregues para NPCs. As imagens possuem
 * quatro linhas de poses paradas e quatro linhas de caminhada, com fundo
 * branco e quantidades diferentes de quadros. A saída é sempre 10x4,
 * 96x148 por célula, na ordem [baixo, esquerda, cima, direita].
 *
 * Antes de executar, converta os JPEGs para PNG em art_src/new_npcs.
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src/new_npcs');
const OUT = path.resolve('public/assets/characters/npcs');
fs.mkdirSync(OUT, { recursive: true });

const SHEETS = [
  ['guard_male', 'guard_male.png', 8, 11],
  ['guard_female', 'guard_female.png', 8, 11],
  ['villager_lina', 'villager_lina.png', 8, 11],
  ['traveler_tomas', 'traveler_tomas.png', 9, 11],
  ['herbalist_flora', 'herbalist_flora.png', 9, 11],
];
const CW = 96, CH = 148, COLS = 10;
const alphaAt = (p, x, y) => p.data[(y * p.width + x) * 4 + 3];

function removeConnectedWhite(png) {
  const { width: w, height: h, data } = png;
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const eligible = (idx) => {
    const i = idx * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) > 242 && Math.max(r, g, b) - Math.min(r, g, b) < 25;
  };
  const push = (idx) => {
    if (!seen[idx] && eligible(idx)) { seen[idx] = 1; queue[tail++] = idx; }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const idx = queue[head++], x = idx % w, y = Math.floor(idx / w);
    if (x > 0) push(idx - 1);
    if (x + 1 < w) push(idx + 1);
    if (y > 0) push(idx - w);
    if (y + 1 < h) push(idx + w);
  }
  for (let idx = 0; idx < seen.length; idx++) if (seen[idx]) data[idx * 4 + 3] = 0;

  // Suaviza somente a borda conectada ao fundo, preservando branco interno.
  const src = Uint8Array.from(data);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const idx = y * w + x, ai = idx * 4 + 3;
    if (!src[ai]) continue;
    let transparentNeighbor = false;
    for (let dy = -1; dy <= 1 && !transparentNeighbor; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (!src[((y + dy) * w + x + dx) * 4 + 3]) { transparentNeighbor = true; break; }
    if (transparentNeighbor) {
      const r = data[ai - 3], g = data[ai - 2], b = data[ai - 1];
      const whiteness = Math.min(r, g, b);
      if (whiteness > 235) data[ai] = Math.min(data[ai], Math.max(0, (252 - whiteness) * 14));
    }
  }
}

function segments(values, threshold, minLength, bridge = 0) {
  const raw = [];
  let start = -1;
  for (let i = 0; i <= values.length; i++) {
    if (i < values.length && values[i] > threshold) { if (start < 0) start = i; }
    else if (start >= 0) { if (i - start >= minLength) raw.push([start, i - 1]); start = -1; }
  }
  const merged = [];
  for (const seg of raw) {
    const prev = merged.at(-1);
    if (prev && seg[0] - prev[1] - 1 <= bridge) prev[1] = seg[1];
    else merged.push(seg);
  }
  return merged;
}

function bbox(png, x0, x1, y0, y1) {
  let minX = x1, maxX = x0, minY = y1, maxY = y0, found = false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (alphaAt(png, x, y) > 24) {
      found = true; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return found ? { minX, maxX, minY, maxY } : null;
}

function detectRows(png) {
  const counts = Array(png.height).fill(0);
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) if (alphaAt(png, x, y) > 24) counts[y]++;
  // As linhas não têm exatamente a mesma altura. Procura o vale de pixels
  // próximo de cada oitavo, isto é, o espaço branco real entre duas poses.
  const bounds = [0];
  for (let i = 1; i < 8; i++) {
    const target = Math.round(i * png.height / 8);
    const lo = Math.max(bounds.at(-1) + 55, target - 62);
    const hi = Math.min(png.height - 1, target + 62);
    let best = lo;
    for (let y = lo + 1; y <= hi; y++) {
      if (counts[y] < counts[best] || (counts[y] === counts[best] && Math.abs(y - target) < Math.abs(best - target))) best = y;
    }
    bounds.push(best);
  }
  bounds.push(png.height);
  return Array.from({ length: 8 }, (_, i) => [bounds[i], bounds[i + 1] - 1]);
}

function detectFrames(png, row, frameCount) {
  const pad = 5, y0 = Math.max(0, row[0] - pad), y1 = Math.min(png.height - 1, row[1] + pad);
  const counts = Array(png.width).fill(0);
  for (let x = 0; x < png.width; x++)
    for (let y = y0; y <= y1; y++) if (alphaAt(png, x, y) > 24) counts[x]++;
  const first = counts.findIndex((v) => v > 1);
  let last = counts.length - 1; while (last > first && counts[last] <= 1) last--;
  return Array.from({ length: frameCount }, (_, i) => [
    Math.round(first + i * (last - first + 1) / frameCount),
    Math.round(first + (i + 1) * (last - first + 1) / frameCount) - 1,
  ]);
}

function renderSheet(png, rows, frameCount, outputName) {
  const out = new PNG({ width: CW * COLS, height: CH * 4 });
  // Fontes: baixo, esquerda, direita, cima. Saída canônica: baixo, esquerda, cima, direita.
  const rowMap = [0, 1, 3, 2];
  const source = rowMap.map((i) => {
    const row = rows[i];
    return detectFrames(png, row, frameCount).map(([x0, x1]) => bbox(png, x0, x1, Math.max(0, row[0]), Math.min(png.height - 1, row[1]))).filter(Boolean);
  });
  const all = source.flat();
  const maxW = Math.max(...all.map((b) => b.maxX - b.minX + 1));
  const maxH = Math.max(...all.map((b) => b.maxY - b.minY + 1));
  const scale = Math.min((CW - 8) / maxW, (CH - 5) / maxH);

  source.forEach((frames, row) => {
    for (let col = 0; col < COLS; col++) {
      const sourceIndex = frames.length === 1 ? 0 : Math.round(col * (frames.length - 1) / (COLS - 1));
      const b = frames[sourceIndex];
      if (!b) continue;
      const fw = b.maxX - b.minX + 1, fh = b.maxY - b.minY + 1;
      const dw = Math.max(1, Math.round(fw * scale)), dh = Math.max(1, Math.round(fh * scale));
      const ox = col * CW + Math.round((CW - dw) / 2), oy = row * CH + CH - 4 - dh;
      for (let dy = 0; dy < dh; dy++) for (let dx = 0; dx < dw; dx++) {
        const sx = b.minX + Math.min(fw - 1, Math.floor(dx / scale));
        const sy = b.minY + Math.min(fh - 1, Math.floor(dy / scale));
        const si = (sy * png.width + sx) * 4, ti = ((oy + dy) * out.width + ox + dx) * 4;
        if (!png.data[si + 3]) continue;
        out.data[ti] = png.data[si]; out.data[ti + 1] = png.data[si + 1];
        out.data[ti + 2] = png.data[si + 2]; out.data[ti + 3] = png.data[si + 3];
      }
    }
  });
  fs.writeFileSync(path.join(OUT, outputName), PNG.sync.write(out));
  console.log(`✓ ${outputName}: ${source.map((r) => r.length).join('/')} quadros detectados`);
}

for (const [name, file, idleCols, walkCols] of SHEETS) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, file)));
  removeConnectedWhite(png);
  const rows = detectRows(png);
  renderSheet(png, rows.slice(0, 4), idleCols, `${name}_idle.png`);
  renderSheet(png, rows.slice(4, 8), walkCols, `${name}_walk.png`);
}

/**
 * Processa as sprite sheets do herói "Akles" (arte gerada com fundo magenta):
 *  1. Remove o fundo magenta (chroma key) com leve feathering nas bordas.
 *  2. Detecta as 4 linhas de direção e as N colunas de frame por conteúdo.
 *  3. Recorta cada frame, escala por um fator global (proporção consistente)
 *     e ancora os pés no rodapé de uma célula de tamanho fixo.
 *  4. Empacota em spritesheets limpas em public/assets/characters/npcs/.
 *
 * Uso: node scripts/process-npcs.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src');
const OUT = path.resolve('public/assets/characters/npcs');
fs.mkdirSync(OUT, { recursive: true });

// NPCs: folhas 10x4 (linha 0=frente, andando; ordem canônica [down,left,up,right])
const SHEETS = [
  { file: 'npc_cadencia.png', name: 'cadencia', cols: 10, cell: [96, 148], rowMap: [0, 1, 2, 3] },
  { file: 'npc_tonico.png', name: 'tonico', cols: 10, cell: [96, 148], rowMap: [0, 1, 2, 3] },
  { file: 'npc_setimo.png', name: 'setimo', cols: 10, cell: [96, 148], rowMap: [0, 1, 2, 3] },
  { file: 'npc_seminima.png', name: 'seminima', cols: 10, cell: [96, 148], rowMap: [0, 1, 2, 3] },
  { file: 'npc_diapasao.png', name: 'diapasao', cols: 10, cell: [96, 148], rowMap: [0, 1, 2, 3] },
];

const load = (f) => PNG.sync.read(fs.readFileSync(path.join(SRC, f)));
const A = (data, w, x, y) => data[(y * w + x) * 4 + 3];

function chromaKey(png) {
  const { width, height, data } = png;
  const corners = [
    [3, 3], [width - 4, 3], [3, height - 4], [width - 4, height - 4],
    [width >> 1, 2], [2, height >> 1],
  ];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= corners.length; bg /= corners.length; bb /= corners.length;

  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const magentaish = r > 140 && b > 120 && g < Math.min(r, b) - 30;
    if (dist < 70 || magentaish) {
      data[i + 3] = 0;
    } else if (dist < 150) {
      data[i + 3] = Math.round(255 * ((dist - 70) / 80));
    }
  }
}

// Remove pixels "orfãos" (ruído do chroma key) por vizinhança
function despeckle(png) {
  const { width, height, data } = png;
  const src = Uint8Array.from(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4 + 3;
      if (src[i] === 0) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (src[((y + dy) * width + (x + dx)) * 4 + 3] > 20) n++;
      if (n <= 2) data[i] = 0;
    }
  }
}

function segments1D(counts, thresh, minLen) {
  const out = [];
  let start = -1;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > thresh) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start >= minLen) out.push([start, i - 1]);
      start = -1;
    }
  }
  if (start >= 0 && counts.length - start >= minLen) out.push([start, counts.length - 1]);
  return out;
}

function bbox(png, x0, x1, y0, y1) {
  const { width, data } = png;
  let minX = x1, maxX = x0, minY = y1, maxY = y0, found = false;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (A(data, width, x, y) > 24) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return found ? { minX, maxX, minY, maxY } : null;
}

function processSheet(cfg) {
  const png = load(cfg.file);
  chromaKey(png);
  despeckle(png);
  const { width, height, data } = png;

  // Linhas de direção via projeção horizontal
  const rowCounts = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let c = 0;
    for (let x = 0; x < width; x++) if (A(data, width, x, y) > 24) c++;
    rowCounts[y] = c;
  }
  let rows = segments1D(rowCounts, 6, 24);
  // funde bandas muito próximas e mantém as 4 maiores
  rows.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  rows = rows.slice(0, 4).sort((a, b) => a[0] - b[0]);
  if (rows.length !== 4) {
    console.warn(`[${cfg.file}] detectou ${rows.length} linhas (esperado 4) — usando divisão uniforme`);
    rows = [0, 1, 2, 3].map((r) => [Math.round((r * height) / 4), Math.round(((r + 1) * height) / 4) - 1]);
  }

  const rowH = rows.reduce((s, r) => s + (r[1] - r[0]), 0) / rows.length;

  const [cw, ch] = cfg.cell;
  const baseline = ch - 4;
  const out = new PNG({ width: cw * cfg.cols, height: ch * 4 });

  // ordem de saída canônica: [down, left, up, right]
  const rowMap = cfg.rowMap || [0, 1, 2, 3];
  const mirrorRows = new Set(cfg.mirrorRows || []);

  // ---- PASSE 1: recorta os bboxes de todos os frames ----
  const rowData = rowMap.map((srcRi, ri) => {
    const row = rows[srcRi];
    const prevMid = srcRi > 0 ? Math.round((rows[srcRi - 1][1] + row[0]) / 2) : 0;
    const nextMid =
      srcRi < rows.length - 1 ? Math.round((row[1] + rows[srcRi + 1][0]) / 2) : height - 1;
    const y0 = Math.max(prevMid, row[0] - 40);
    const y1 = Math.min(nextMid, row[1] + 20);

    const colCounts = new Array(width).fill(0);
    for (let x = 0; x < width; x++) {
      let c = 0;
      for (let y = y0; y <= y1; y++) if (A(data, width, x, y) > 24) c++;
      colCounts[x] = c;
    }
    let cells = segments1D(colCounts, 2, 10);
    if (cells.length !== cfg.cols) {
      const first = colCounts.findIndex((c) => c > 1);
      let last = width - 1;
      while (last > 0 && colCounts[last] <= 1) last--;
      const span = (last - first) / cfg.cols;
      cells = Array.from({ length: cfg.cols }, (_, i) => [
        Math.round(first + i * span),
        Math.round(first + (i + 1) * span) - 1,
      ]);
      console.warn(`[${cfg.file}] linha ${srcRi}: ${cfg.cols} col. uniformes (detectou outra qtd)`);
    }

    return {
      ri,
      mirror: mirrorRows.has(ri),
      boxes: cells.map((cell) => bbox(png, cell[0], cell[1], y0, y1)),
    };
  });

  // ---- Escala ÚNICA da folha (sem reescala por frame = sem "tranco") ----
  const bodyScale = 108 / rowH;
  let maxFh = 1;
  let maxFw = 1;
  for (const rd of rowData)
    for (const b of rd.boxes)
      if (b) {
        maxFh = Math.max(maxFh, b.maxY - b.minY + 1);
        maxFw = Math.max(maxFw, b.maxX - b.minX + 1);
      }
  const S = Math.min(bodyScale, (ch - 4) / maxFh, (cw + 6) / maxFw);

  // ---- PASSE 2: rasteriza cada frame com a mesma escala e âncora nos pés ----
  for (const rd of rowData) {
    const { ri, mirror } = rd;
    rd.boxes.forEach((box, ci) => {
      if (!box) return;
      const fw = box.maxX - box.minX + 1;
      const fh = box.maxY - box.minY + 1;
      const dw = Math.max(1, Math.round(fw * S));
      const dh = Math.max(1, Math.round(fh * S));
      const destCellX = ci * cw;
      const destCellY = ri * ch;

      // Âncora horizontal: centróide dos pés (parte de baixo do frame), estável.
      const footY0 = Math.max(box.minY, box.maxY - Math.round(fh * 0.22));
      let sumX = 0;
      let cnt = 0;
      for (let y = footY0; y <= box.maxY; y++)
        for (let x = box.minX; x <= box.maxX; x++)
          if (A(data, width, x, y) > 40) {
            sumX += x;
            cnt++;
          }
      const footCx = cnt > 0 ? sumX / cnt : (box.minX + box.maxX) / 2;
      let footCxLocal = (footCx - box.minX) * S;
      if (mirror) footCxLocal = dw - footCxLocal;

      let ox = Math.round(destCellX + cw / 2 - footCxLocal);
      const oy = destCellY + baseline - dh;
      ox = Math.max(destCellX - 10, Math.min(destCellX + cw + 10 - dw, ox));

      for (let dy = 0; dy < dh; dy++) {
        const sy = box.minY + Math.min(fh - 1, Math.floor(dy / S));
        const ty = oy + dy;
        if (ty < destCellY - 8 || ty >= destCellY + ch) continue;
        for (let dx = 0; dx < dw; dx++) {
          const srcDx = mirror ? dw - 1 - dx : dx;
          const sx = box.minX + Math.min(fw - 1, Math.floor(srcDx / S));
          const a = A(data, width, sx, sy);
          if (a === 0) continue;
          const tx = ox + dx;
          if (tx < 0 || tx >= out.width) continue;
          const si = (sy * width + sx) * 4;
          const ti = (ty * out.width + tx) * 4;
          out.data[ti] = data[si];
          out.data[ti + 1] = data[si + 1];
          out.data[ti + 2] = data[si + 2];
          out.data[ti + 3] = a;
        }
      }
    });
  }

  fs.writeFileSync(path.join(OUT, cfg.name + '.png'), PNG.sync.write(out));
  console.log(`✓ ${cfg.name}.png  (${out.width}x${out.height}, ${cfg.cols}x4, escala ${S.toFixed(3)})`);
}

for (const cfg of SHEETS) processSheet(cfg);
console.log('\nConcluído. Saída em', OUT);

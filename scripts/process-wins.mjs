/**
 * Wins/Huans — sheets de 9 ou 10 colunas x 4 linhas, fundo magenta.
 * Ordem visual das linhas: 0=frente(down) 1=esquerda(left) 2=direita(right)
 * 3=costas(up). Detecta as quatro linhas e os 9/10 quadros pela faixa das
 * cabeças, preserva cabelo/capas, normaliza a escala e ancora pelos pés.
 * Uso: node scripts/process-wins.mjs <caminho-da-imagem-fonte> [pasta] [margem] [idle|walk|run]
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = process.argv[2];
const CHAR_DIR = process.argv[3] || 'wins';
// pula os N px do topo de cada célula ao calcular o bbox — evita capturar
// sobra (capa/cabelo) que vaza da linha de cima quando o grid de origem
// não é perfeitamente uniforme.
const TOP_MARGIN = parseInt(process.argv[4] || '0', 10);
// idle / walk / run — cada um vira um arquivo de saída separado (3 folhas
// de origem distintas, não a mesma reaproveitada 3x).
const STATE = process.argv[5] || 'move';
if (!SRC) {
  console.error('uso: node scripts/process-wins.mjs <caminho-da-imagem-fonte> [pasta-do-personagem] [margem-topo-px] [idle|walk|run]');
  process.exit(1);
}
const OUT_DIR = path.resolve(`public/assets/characters/${CHAR_DIR}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_COLS = 10;
const ROWS = 4;
const ROW_NAMES = ['down', 'left', 'right', 'up'];

function chromaKey(png) {
  const { width, height, data } = png;
  const samples = [
    [3, 3], [width - 4, 3], [3, height - 4], [width - 4, height - 4],
  ];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of samples) {
    const i = (y * width + x) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= samples.length; bg /= samples.length; bb /= samples.length;
  // banda de transição + DESCONTAMINAÇÃO de cor (remove o magenta que vazou
  // pro pixel semi-transparente por causa do anti-aliasing da arte fonte —
  // sem isso sobra uma franja/halo rosada em volta do cabelo/roupa).
  const LOW = 70;
  const HIGH = 175;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const magentaish = r > 140 && b > 110 && g < Math.min(r, b) - 25;
    if (d < LOW || magentaish) {
      data[i + 3] = 0;
      data[i] = data[i + 1] = data[i + 2] = 0;
      continue;
    }
    if (d < HIGH) {
      const a = (d - LOW) / (HIGH - LOW); // 0..1
      const safeA = Math.max(a, 0.12);
      const dr = (r - (1 - a) * br) / safeA;
      const dg = (g - (1 - a) * bg) / safeA;
      const db = (b - (1 - a) * bb) / safeA;
      data[i] = Math.max(0, Math.min(255, Math.round(dr)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(dg)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(db)));
      data[i + 3] = Math.round(255 * a);
    }
  }
}
function despeckle(png) {
  const { width, height, data } = png;
  const src = Uint8Array.from(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4 + 3;
      if (src[i] === 0) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (src[((y + dy) * width + (x + dx)) * 4 + 3] > 16) n++;
        }
      }
      if (n <= 2) data[i] = 0;
    }
  }
}
// Encolhe a silhueta em 1px (erosão morfológica no alpha) — corta o aro que
// ainda sobra contaminado mesmo depois da descontaminação de cor. No
// tamanho final em jogo (~80px) 1px de origem é imperceptível.
function erodeAlpha(png, passes = 1) {
  const { width, height } = png;
  for (let pass = 0; pass < passes; pass++) {
    const src = Uint8Array.from(png.data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4 + 3;
        if (src[i] === 0) continue;
        let minA = src[i];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            const na = nx < 0 || ny < 0 || nx >= width || ny >= height ? 0 : src[(ny * width + nx) * 4 + 3];
            if (na < minA) minA = na;
          }
        }
        png.data[i] = minA;
      }
    }
  }
}

// Numa célula (frame) isolada, mantém só o MAIOR blob de pixels opacos
// conectados e apaga o resto — remove sobras de capa/cabelo que vazaram da
// célula vizinha (ficam desconectadas do personagem de verdade) sem cortar
// nada do personagem em si, ao contrário de uma margem fixa por linha.
function keepLargestComponent(png, x0, y0, w, h) {
  const { width, data } = png;
  const inside = (x, y) => data[((y0 + y) * width + (x0 + x)) * 4 + 3] > 24;
  const visited = new Uint8Array(w * h);
  let best = null;
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const sIdx = sy * w + sx;
      if (visited[sIdx] || !inside(sx, sy)) continue;
      const stack = [[sx, sy]];
      visited[sIdx] = 1;
      const pixels = [[sx, sy]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (visited[nIdx] || !inside(nx, ny)) continue;
          visited[nIdx] = 1;
          stack.push([nx, ny]);
          pixels.push([nx, ny]);
        }
      }
      if (!best || pixels.length > best.length) best = pixels;
    }
  }
  if (!best) return;
  const keep = new Uint8Array(w * h);
  for (const [x, y] of best) keep[y * w + x] = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!keep[y * w + x] && inside(x, y)) {
        data[((y0 + y) * width + (x0 + x)) * 4 + 3] = 0;
      }
    }
  }
}

const raw = PNG.sync.read(fs.readFileSync(SRC));
chromaKey(raw);
despeckle(raw);
erodeAlpha(raw, 1);

const A = (x, y) => raw.data[(y * raw.width + x) * 4 + 3];
const CW = 156;
const CH = 340;
const TARGET_BODY_H = 224;
const MAX_BODY_W = CW - 10;

function detectRowBands() {
  const counts = new Array(raw.height).fill(0);
  for (let y = 0; y < raw.height; y++)
    for (let x = 0; x < raw.width; x++) if (A(x, y) > 24) counts[y]++;
  const bands = [];
  let start = -1;
  for (let y = 0; y <= raw.height; y++) {
    const filled = y < raw.height && counts[y] > 8;
    if (filled && start < 0) start = y;
    if (!filled && start >= 0) {
      if (y - start > 20) bands.push([start, y]);
      start = -1;
    }
  }
  while (bands.length > ROWS) {
    let closest = 0;
    for (let i = 1; i < bands.length - 1; i++)
      if (bands[i + 1][0] - bands[i][1] < bands[closest + 1][0] - bands[closest][1]) closest = i;
    bands.splice(closest, 2, [bands[closest][0], bands[closest + 1][1]]);
  }
  if (bands.length !== ROWS)
    throw new Error(`${path.basename(SRC)}: detectou ${bands.length} linhas; esperado ${ROWS}`);
  return bands;
}

function rowFramesFromHeads(y0, y1) {
  // Cabeças/cabelos ficam na faixa superior e nunca se encostam entre
  // quadros, mesmo quando as capas da corrida se sobrepõem mais abaixo.
  const headBottom = y0 + Math.round((y1 - y0) * 0.48);
  const density = new Array(raw.width).fill(0);
  for (let x = 0; x < raw.width; x++) {
    let n = 0;
    for (let y = y0; y < headBottom; y++) if (A(x, y) > 24) n++;
    for (let dx = -4; dx <= 4; dx++) {
      const tx = x + dx;
      if (tx >= 0 && tx < raw.width) density[tx] += n;
    }
  }
  const minDistance = Math.round((raw.width / MAX_COLS) * 0.62);
  const candidates = density.map((score, x) => ({ x, score })).sort((a, b) => b.score - a.score);
  const centers = [];
  for (const candidate of candidates) {
    if (candidate.score <= 0) break;
    if (centers.every((x) => Math.abs(x - candidate.x) >= minDistance)) centers.push(candidate.x);
    if (centers.length === MAX_COLS) break;
  }
  centers.sort((a, b) => a - b);
  if (centers.length < 2)
    throw new Error(`${path.basename(SRC)}: não foi possível detectar os quadros da linha`);

  const bounds = [0];
  for (let i = 0; i < centers.length - 1; i++) bounds.push(Math.round((centers[i] + centers[i + 1]) / 2));
  bounds.push(raw.width);
  return centers.map((_, i) => {
    const x0 = bounds[i], x1 = bounds[i + 1] - 1;
    keepLargestComponent(raw, x0, y0, x1 - x0 + 1, y1 - y0);
    let minX = x1, maxX = -1, minY = y1, maxY = -1, pixels = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x <= x1; x++) {
      if (A(x, y) <= 24) continue;
      pixels++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY, pixels };
  });
}

const frames = [];
let maxW = 1, maxH = 1;
const rowBands = detectRowBands();
let detectedCols = 0;
for (let r = 0; r < ROWS; r++) {
  const [y0, y1] = rowBands[r];
  const row = rowFramesFromHeads(y0, y1);
  if (r === 0) detectedCols = row.length;
  else if (row.length !== detectedCols)
    throw new Error(`${path.basename(SRC)}: linha ${r} tem ${row.length} quadros; esperado ${detectedCols}`);
  for (const b of row) {
    if (!b) continue;
    maxW = Math.max(maxW, b.maxX - b.minX + 1);
    maxH = Math.max(maxH, b.maxY - b.minY + 1);
  }
  frames.push(row);
}

// Uma escala por folha, nunca por frame: o corpo não pulsa de tamanho.
// Todos os personagens terminam com a mesma altura visual do Akles.
const scale = Math.min(TARGET_BODY_H / maxH, MAX_BODY_W / maxW);
const sheet = new PNG({ width: CW * detectedCols, height: CH * ROWS });
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < detectedCols; c++) {
    const b = frames[r][c];
    if (!b) throw new Error(`${path.basename(SRC)} quadro ${r},${c} vazio`);
    const fw = b.maxX - b.minX + 1;
    const fh = b.maxY - b.minY + 1;
    const dw = Math.max(1, Math.round(fw * scale));
    const dh = Math.max(1, Math.round(fh * scale));
    const dstX = c * CW + Math.floor((CW - dw) / 2);
    const dstY = r * CH + CH - 2 - dh;

    for (let dy = 0; dy < dh; dy++) {
      const sy = b.minY + Math.min(fh - 1, Math.floor(dy / scale));
      for (let dx = 0; dx < dw; dx++) {
        const sx = b.minX + Math.min(fw - 1, Math.floor(dx / scale));
        const si = (sy * raw.width + sx) * 4;
        if (raw.data[si + 3] === 0) continue;
        const ti = ((dstY + dy) * sheet.width + dstX + dx) * 4;
        sheet.data[ti] = raw.data[si];
        sheet.data[ti + 1] = raw.data[si + 1];
        sheet.data[ti + 2] = raw.data[si + 2];
        sheet.data[ti + 3] = raw.data[si + 3];
      }
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, `${CHAR_DIR}_${STATE}.png`), PNG.sync.write(sheet));
console.log(`✓ ${CHAR_DIR}_${STATE}.png ${sheet.width}x${sheet.height} (${detectedCols}x${ROWS}, célula ${CW}x${CH}, escala ${scale.toFixed(3)}, ordem: ${ROW_NAMES.join(',')})`);

// Retrato quadrado (cabeça + torso) para o botão de troca. Copiar a célula
// alta inteira deixava o personagem no rodapé e o object-cover mostrava só
// transparência dentro do círculo do HUD.
let iconMinX = CW, iconMaxX = -1, iconMinY = CH, iconMaxY = -1;
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
  if (sheet.data[(y * sheet.width + x) * 4 + 3] <= 24) continue;
  iconMinX = Math.min(iconMinX, x); iconMaxX = Math.max(iconMaxX, x);
  iconMinY = Math.min(iconMinY, y); iconMaxY = Math.max(iconMaxY, y);
}
if (iconMaxX < 0) throw new Error(`${path.basename(SRC)}: retrato vazio`);
const bodyH = iconMaxY - iconMinY + 1;
const cropSize = Math.min(CW, Math.max(80, Math.round(bodyH * 0.56)));
const iconCenterX = Math.round((iconMinX + iconMaxX) / 2);
const cropX = Math.max(0, Math.min(CW - cropSize, iconCenterX - Math.floor(cropSize / 2)));
const cropY = Math.max(0, Math.min(CH - cropSize, iconMinY - Math.round(cropSize * 0.08)));
const icon = new PNG({ width: CW, height: CW });
for (let y = 0; y < CW; y++) {
  for (let x = 0; x < CW; x++) {
    const sx = cropX + Math.min(cropSize - 1, Math.floor(x * cropSize / CW));
    const sy = cropY + Math.min(cropSize - 1, Math.floor(y * cropSize / CW));
    const si = (sy * sheet.width + sx) * 4;
    const ti = (y * CW + x) * 4;
    icon.data[ti] = sheet.data[si];
    icon.data[ti + 1] = sheet.data[si + 1];
    icon.data[ti + 2] = sheet.data[si + 2];
    icon.data[ti + 3] = sheet.data[si + 3];
  }
}
fs.writeFileSync(path.join(OUT_DIR, `${CHAR_DIR}_icon.png`), PNG.sync.write(icon));
console.log(`✓ ${CHAR_DIR}_icon.png ${icon.width}x${icon.height}`);

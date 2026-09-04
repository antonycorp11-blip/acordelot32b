/**
 * Wins (classe da Voz) — sheet de corrida 10 col x 4 lin, fundo magenta.
 * Ordem visual das linhas: 0=frente(down) 1=esquerda(left) 2=direita(right)
 * 3=costas(up). Chroma-key + despeckle na imagem inteira, depois recorta
 * cada linha no bbox UNIÃO das 10 colunas (mantém os frames alinhados),
 * e monta tudo numa única sheet com célula compartilhada (maior bbox das
 * 4 linhas), ancorada embaixo/centralizada — igual ao formato que o motor
 * já usa pro Akles (col*cw, linha*ch).
 * Uso: node scripts/process-wins.mjs <caminho-da-imagem-fonte>
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
if (!SRC) {
  console.error('uso: node scripts/process-wins.mjs <caminho-da-imagem-fonte> [pasta-do-personagem] [margem-topo-px]');
  process.exit(1);
}
const OUT_DIR = path.resolve(`public/assets/characters/${CHAR_DIR}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const COLS = 10;
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
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const mag = r > 150 && b > 120 && g < Math.min(r, b) - 30;
    if (d < 76 || mag) {
      data[i + 3] = 0; data[i] = data[i + 1] = data[i + 2] = 0;
    } else if (d < 150) {
      data[i + 3] = Math.round(255 * ((d - 76) / 74));
      data[i] = Math.round(r * 0.6);
      data[i + 2] = Math.round(b * 0.6);
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

const raw = PNG.sync.read(fs.readFileSync(SRC));
chromaKey(raw);
despeckle(raw);

const cellW = Math.floor(raw.width / COLS);
const cellH = Math.floor(raw.height / ROWS);
const A = (x, y) => raw.data[(y * raw.width + x) * 4 + 3];

function rowBBox(row) {
  let mnX = cellW, mxX = 0, mnY = cellH, mxY = 0, found = false;
  for (let c = 0; c < COLS; c++) {
    const ox = c * cellW, oy = row * cellH;
    for (let y = TOP_MARGIN; y < cellH - TOP_MARGIN; y++) {
      for (let x = 0; x < cellW; x++) {
        if (A(ox + x, oy + y) > 24) {
          found = true;
          if (x < mnX) mnX = x;
          if (x > mxX) mxX = x;
          if (y < mnY) mnY = y;
          if (y > mxY) mxY = y;
        }
      }
    }
  }
  return found ? { mnX, mxX, mnY, mxY } : { mnX: 0, mxX: cellW - 1, mnY: 0, mxY: cellH - 1 };
}

const rowBoxes = [];
for (let r = 0; r < ROWS; r++) rowBoxes.push(rowBBox(r));

const cw = Math.max(...rowBoxes.map((b) => b.mxX - b.mnX + 1));
const ch = Math.max(...rowBoxes.map((b) => b.mxY - b.mnY + 1));

const sheet = new PNG({ width: cw * COLS, height: ch * ROWS });

for (let r = 0; r < ROWS; r++) {
  const b = rowBoxes[r];
  const fw = b.mxX - b.mnX + 1;
  const fh = b.mxY - b.mnY + 1;
  const padX = Math.floor((cw - fw) / 2); // centralizado
  const padY = ch - fh; // ancorado embaixo (pés na base da célula)
  for (let c = 0; c < COLS; c++) {
    const srcOx = c * cellW + b.mnX;
    const srcOy = r * cellH + b.mnY;
    const dstOx = c * cw + padX;
    const dstOy = r * ch + padY;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const si = ((srcOy + y) * raw.width + (srcOx + x)) * 4;
        const ti = ((dstOy + y) * sheet.width + (dstOx + x)) * 4;
        sheet.data[ti] = raw.data[si];
        sheet.data[ti + 1] = raw.data[si + 1];
        sheet.data[ti + 2] = raw.data[si + 2];
        sheet.data[ti + 3] = raw.data[si + 3];
      }
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, `${CHAR_DIR}_move.png`), PNG.sync.write(sheet));
console.log(`✓ ${CHAR_DIR}_move.png ${sheet.width}x${sheet.height} (célula ${cw}x${ch}, ordem: ${ROW_NAMES.join(',')})`);

// ícone (frame 0 da linha "down") pra botão de troca de personagem
const icon = new PNG({ width: cw, height: ch });
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const si = (y * sheet.width + x) * 4;
    const ti = (y * cw + x) * 4;
    icon.data[ti] = sheet.data[si];
    icon.data[ti + 1] = sheet.data[si + 1];
    icon.data[ti + 2] = sheet.data[si + 2];
    icon.data[ti + 3] = sheet.data[si + 3];
  }
}
fs.writeFileSync(path.join(OUT_DIR, `${CHAR_DIR}_icon.png`), PNG.sync.write(icon));
console.log(`✓ ${CHAR_DIR}_icon.png ${icon.width}x${icon.height}`);

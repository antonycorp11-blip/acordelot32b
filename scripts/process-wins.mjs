/**
 * Wins (classe da Voz) — sheet de corrida 10 col x 4 lin, fundo magenta.
 * Ordem visual das linhas: 0=frente(down) 1=esquerda(left) 2=direita(right)
 * 3=costas(up). Chroma-key + despeckle na imagem inteira, depois recorta
 * cada linha no bbox UNIÃO das 10 colunas (mantém os frames alinhados),
 * e monta tudo numa única sheet com célula compartilhada (maior bbox das
 * 4 linhas), ancorada embaixo/centralizada — igual ao formato que o motor
 * já usa pro Akles (col*cw, linha*ch).
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
    if (d < LOW || (magentaish && d < HIGH)) {
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
erodeAlpha(raw, 2);

const cellH = Math.floor(raw.height / ROWS);
const A = (x, y) => raw.data[(y * raw.width + x) * 4 + 3];

// O grid de origem nem sempre tem as 10 colunas com a MESMA largura, e em
// poses dinâmicas (corrida) cabelo/capa de um frame às vezes encosta no
// frame vizinho — não sobra nem um gap limpo pra separar por "zona vazia".
// Em vez de exigir um gap perfeito, ancora cada fronteira na posição
// uniforme esperada e desliza pra ACHAR O PONTO MAIS FINO (menos conteúdo)
// numa janela ao redor — sempre devolve exatamente COLS bandas.
function colBands(y0, y1) {
  const counts = new Array(raw.width).fill(0);
  for (let x = 0; x < raw.width; x++) {
    let c = 0;
    for (let y = y0; y < y1; y++) if (A(x, y) > 24) c++;
    counts[x] = c;
  }
  const cellW = raw.width / COLS;
  const search = Math.round(cellW * 0.12);
  const bounds = [0];
  for (let i = 1; i < COLS; i++) {
    const guess = Math.round(i * cellW);
    let best = guess;
    let bestCount = Infinity;
    for (let dx = -search; dx <= search; dx++) {
      const x = guess + dx;
      if (x < 1 || x >= raw.width - 1) continue;
      if (counts[x] < bestCount) {
        bestCount = counts[x];
        best = x;
      }
    }
    bounds.push(best);
  }
  bounds.push(raw.width);
  const bands = [];
  for (let i = 0; i < COLS; i++) bands.push([bounds[i], bounds[i + 1] - 1]);
  return bands;
}

// bbox de UM frame isolado (célula bruta) — já filtrado pelo maior blob
// conectado, então não precisa de margem: qualquer coisa que sobrou ali É o
// personagem. Recorte por frame individual (não por linha inteira) evita o
// "meio quadro" que dava quando o grid de origem não é perfeitamente
// uniforme entre colunas. `buf` é opcional — lê de um snapshot alternativo
// em vez de raw.data (usado pra comparar ANTES de mutar nada).
function frameBBox(x0, y0, w, h, buf) {
  const data = buf || raw.data;
  const alphaAt = (x, y) => data[(y * raw.width + x) * 4 + 3];
  let mnX = w, mxX = -1, mnY = h, mxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x0 + x, y0 + y) > 24) {
        if (x < mnX) mnX = x;
        if (x > mxX) mxX = x;
        if (y < mnY) mnY = y;
        if (y > mxY) mxY = y;
      }
    }
  }
  return mxX >= 0 ? { mnX, mxX, mnY, mxY } : null;
}

// snapshot pré-filtro-de-componente (keepLargestComponent muta raw.data
// destrutivamente) — usado só pra COMPARAR se a banda detectada realmente
// captura o personagem inteiro antes de aplicar o filtro de verdade.
const cleanSnapshot = Buffer.from(raw.data);

const rowBands = [];
const frames = [];
for (let r = 0; r < ROWS; r++) {
  const y0 = r * cellH, y1 = (r + 1) * cellH;
  const uniformCellW = raw.width / COLS;
  const uniformBands = Array.from({ length: COLS }, (_, i) => [Math.round(i * uniformCellW), Math.round((i + 1) * uniformCellW) - 1]);
  const detected = colBands(y0, y1);
  const bands = [];
  for (let c = 0; c < COLS; c++) {
    let [bx0, bx1] = detected[c] || uniformBands[c];
    const [ux0, ux1] = uniformBands[c];
    const detBox = frameBBox(bx0, y0, bx1 - bx0 + 1, cellH, cleanSnapshot);
    const uniBox = frameBBox(ux0, y0, ux1 - ux0 + 1, cellH, cleanSnapshot);
    const detW = detBox ? detBox.mxX - detBox.mnX + 1 : 0;
    const uniW = uniBox ? uniBox.mxX - uniBox.mnX + 1 : 0;
    // a banda "detectada" (fronteira mais fina) pode ter cortado o
    // personagem ao meio numa pose sem gap nenhum entre frames (corrida) —
    // se ela rendeu bem menos conteúdo que a divisão uniforme pra esse
    // frame específico, usa a uniforme só pra ele (nunca frame vazio/cortado).
    if (uniW > 0 && detW < uniW * 0.65) {
      [bx0, bx1] = [ux0, ux1];
    }
    bands.push([bx0, bx1]);
  }
  rowBands.push(bands);
  const row = [];
  for (const [bx0, bx1] of bands) {
    keepLargestComponent(raw, bx0, y0, bx1 - bx0 + 1, cellH);
    row.push(frameBBox(bx0, y0, bx1 - bx0 + 1, cellH));
  }
  frames.push(row);
}
// pé comum da linha = pé mais "no chão" entre os 10 frames (o outro pé, no
// ar durante o passo, fica acima dele naturalmente — sem isso o personagem
// "bobbing" ficava ainda mais estranho, ancorado individualmente por frame).
const rowFootY = frames.map((row) => Math.max(...row.filter(Boolean).map((b) => b.mxY)));

let cw = 1, ch = 1;
for (let r = 0; r < ROWS; r++) {
  for (const b of frames[r]) {
    if (!b) continue;
    cw = Math.max(cw, b.mxX - b.mnX + 1);
    ch = Math.max(ch, rowFootY[r] - b.mnY + 1);
  }
}

const sheet = new PNG({ width: cw * COLS, height: ch * ROWS });
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const b = frames[r][c];
    if (!b) continue;
    const fw = b.mxX - b.mnX + 1;
    const fh = b.mxY - b.mnY + 1;
    const padX = Math.floor((cw - fw) / 2); // centralizado — por frame, não por linha
    const destFootY = r * ch + ch - 1; // pé comum da linha = rodapé da célula
    const dstOy = destFootY - (rowFootY[r] - b.mnY);
    const srcOx = rowBands[r][c][0] + b.mnX;
    const srcOy = r * cellH + b.mnY;
    const dstOx = c * cw + padX;
    for (let y = 0; y < fh; y++) {
      const ty = dstOy + y;
      if (ty < r * ch || ty >= (r + 1) * ch) continue;
      for (let x = 0; x < fw; x++) {
        const tx = dstOx + x;
        if (tx < c * cw || tx >= (c + 1) * cw) continue;
        const si = ((srcOy + y) * raw.width + (srcOx + x)) * 4;
        const ti = (ty * sheet.width + tx) * 4;
        sheet.data[ti] = raw.data[si];
        sheet.data[ti + 1] = raw.data[si + 1];
        sheet.data[ti + 2] = raw.data[si + 2];
        sheet.data[ti + 3] = raw.data[si + 3];
      }
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, `${CHAR_DIR}_${STATE}.png`), PNG.sync.write(sheet));
console.log(`✓ ${CHAR_DIR}_${STATE}.png ${sheet.width}x${sheet.height} (célula ${cw}x${ch}, ordem: ${ROW_NAMES.join(',')})`);

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

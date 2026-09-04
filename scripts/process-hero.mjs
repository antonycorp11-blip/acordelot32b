/**
 * Processa as 3 sprite sheets grandes do herói Akles (idle / walk / run).
 * Cada folha: fundo magenta, GRADE LIMPA de 10 colunas x 4 linhas.
 * Linhas na fonte: [frente, esquerda, direita, costas].
 * Saída (o que a engine espera): [frente(down), esquerda, costas(up), direita].
 *
 * Mantém a arte sem reescala, remove o fundo magenta, reordena as linhas
 * e ancora o pé sólido de cada quadro no mesmo rodapé.
 *
 * Uso: node scripts/process-hero.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src');
const OUT = path.resolve('public/assets/characters/akles');
fs.mkdirSync(OUT, { recursive: true });

const SHEETS = [
  { file: 'hero_idle.png', name: 'akles_idle' },
  { file: 'hero_walk.png', name: 'akles_walk' },
  { file: 'hero_run.png', name: 'akles_run' },
];
const ROWS = 4;
const COLS = 10;
// saída[i] = índice da linha na FONTE  (down, left, up/costas, right)
const ROW_MAP = [0, 1, 3, 2];

function chroma(png) {
  const { width, height, data } = png;
  const s = [
    [3, 3], [width - 4, 3], [3, height - 4], [width - 4, height - 4],
    [width >> 1, 3], [3, height >> 1], [width - 4, height >> 1],
  ];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of s) {
    const i = (y * width + x) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= s.length; bg /= s.length; bb /= s.length;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const mag = r > 135 && b > 115 && g < Math.min(r, b) - 26;
    if (dist < 66 || mag) {
      data[i + 3] = 0;
      data[i] = data[i + 1] = data[i + 2] = 0; // sem magenta fantasma
    } else if (dist < 140) {
      data[i + 3] = Math.round(255 * ((dist - 66) / 74));
      // puxa a cor da borda para longe do magenta (mata o halo rosa)
      data[i] = Math.round(r * 0.6);
      data[i + 2] = Math.round(b * 0.6);
    }
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
          if (src[((y + dy) * width + (x + dx)) * 4 + 3] > 20) n++;
      if (n <= 2) data[i] = 0;
    }
}

for (const cfg of SHEETS) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, cfg.file)));
  chroma(png);
  despeckle(png);
  const { width, height, data } = png;
  const exact = height / ROWS;
  const bounds = Array.from({ length: ROWS + 1 }, (_, i) => Math.round(i * exact));

  // Célula de saída FIXA em todas as folhas. GUTTER transparente entre frames
  // (senão o filtro bilinear "vaza" o frame vizinho — meio de um, meio do outro).
  const CW = 156;
  const CH = 340; // folga extra no topo (evita cortar a cabeça em qualquer pose)
  const A = (x, y) => data[(y * width + x) * 4 + 3];

  // colunas de cada linha-fonte via projeção vertical
  function colBands(y0, y1) {
    const counts = new Array(width).fill(0);
    for (let x = 0; x < width; x++) {
      let c = 0;
      for (let y = y0; y < y1; y++) if (A(x, y) > 40) c++;
      counts[x] = c;
    }
    const bands = [];
    let s = -1;
    for (let x = 0; x < width; x++) {
      if (counts[x] > 2) { if (s < 0) s = x; }
      else if (s >= 0) { if (x - s >= 10) bands.push([s, x - 1]); s = -1; }
    }
    if (s >= 0 && width - s >= 10) bands.push([s, width - 1]);
    return bands;
  }

  const out = new PNG({ width: CW * COLS, height: CH * ROWS });
  for (let ri = 0; ri < ROWS; ri++) {
    const sr = ROW_MAP[ri];
    const ry0 = bounds[sr];
    const ry1 = bounds[sr + 1];
    let bands = colBands(ry0, ry1);
    if (bands.length !== COLS) {
      // fallback: divisão uniforme
      const cw0 = width / COLS;
      bands = Array.from({ length: COLS }, (_, i) => [
        Math.round(i * cw0), Math.round((i + 1) * cw0) - 1,
      ]);
    }
    for (let ci = 0; ci < COLS; ci++) {
      const [bx0, bx1] = bands[ci];
      // bbox real do frame dentro da banda
      let mnX = bx1, mxX = bx0, mnY = ry1, mxY = ry0, f = false;
      for (let y = ry0; y < ry1; y++)
        for (let x = bx0; x <= bx1; x++)
          if (A(x, y) > 30) { f = true; if (x < mnX) mnX = x; if (x > mxX) mxX = x; if (y < mnY) mnY = y; if (y > mxY) mxY = y; }
      if (!f) continue;
      const fw = mxX - mnX + 1;
      // Pé real DESTE quadro. Usar o pé mais baixo da linha inteira deixava
      // quadros laterais 15–25 px acima do chão quando outro quadro tinha
      // capa/ruído mais baixo — era o “Akles flutuando” ao ir para a direita.
      let frameFoot = mnY;
      for (let y = mnY; y <= mxY; y++) {
        let solid = 0;
        for (let x = mnX; x <= mxX; x++) if (A(x, y) > 170) solid++;
        if (solid >= 6) frameFoot = y;
      }
      const destCx = ci * CW + Math.round(CW / 2);
      const frameCx = (mnX + mxX) / 2;
      // âncora vertical: o pé real deste quadro vai para o rodapé da célula
      const destFoot = ri * CH + CH - 3;
      // não copia o esfumaçado abaixo da linha sólida dos pés
      const yBottom = Math.min(mxY, frameFoot + 1);
      for (let y = mnY; y <= yBottom; y++) {
        const ty = destFoot - (frameFoot - y);
        if (ty < ri * CH || ty >= (ri + 1) * CH) continue;
        for (let x = mnX; x <= mxX; x++) {
          if (A(x, y) === 0) continue;
          const tx = destCx + (x - Math.round(frameCx));
          if (tx < ci * CW || tx >= (ci + 1) * CW) continue;
          const si = (y * width + x) * 4;
          const ti = (ty * out.width + tx) * 4;
          out.data[ti] = data[si];
          out.data[ti + 1] = data[si + 1];
          out.data[ti + 2] = data[si + 2];
          out.data[ti + 3] = data[si + 3];
        }
      }
    }
  }
  fs.writeFileSync(path.join(OUT, cfg.name + '.png'), PNG.sync.write(out));
  console.log(`✓ ${cfg.name}.png  (${out.width}x${out.height}, ${COLS}x${ROWS}, célula ${CW}x${CH})`);
}
console.log('\nConcluído. Saída em', OUT);

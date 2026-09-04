/**
 * Processa as 3 sprite sheets grandes do herói Akles (idle / walk / run).
 * Cada folha: fundo magenta, GRADE LIMPA de 10 colunas x 4 linhas.
 * Linhas na fonte: [frente, esquerda, direita, costas].
 * Saída (o que a engine espera): [frente(down), esquerda, costas(up), direita].
 *
 * Mantém a arte EXATAMENTE como está — só remove o fundo magenta e
 * reordena as linhas. Sem reescala, sem reancoragem, sem recorte por frame
 * (o artista já alinhou os pés na grade).
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

  // linha dos pés de cada linha-fonte (maior y opaco entre os 10 frames)
  const footY = bounds.slice(0, ROWS).map((y0, r) => {
    const y1 = bounds[r + 1];
    let lo = y1;
    for (let y = y0; y < y1; y++) {
      let any = false;
      for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 40) { any = true; break; }
      if (any) lo = y;
    }
    return lo; // último y com conteúdo
  });
  // topo de cada linha-fonte
  const topY = bounds.slice(0, ROWS).map((y0, r) => {
    const y1 = bounds[r + 1];
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 40) return y;
    }
    return y0;
  });

  // célula de saída FIXA em todas as folhas (idle/walk/run) — pés a 5px do rodapé
  const cellH = 296;
  const FOOT_MARGIN = 5;

  const out = new PNG({ width, height: cellH * ROWS });
  for (let ri = 0; ri < ROWS; ri++) {
    const sr = ROW_MAP[ri];
    const s0 = topY[sr];
    const s1 = footY[sr];
    // desloca a linha inteira p/ alinhar os pés
    const destFoot = ri * cellH + cellH - FOOT_MARGIN;
    const destTop = destFoot - (s1 - s0);
    for (let y = s0; y <= s1; y++) {
      const ty = destTop + (y - s0);
      if (ty < 0 || ty >= out.height) continue;
      data.copy(out.data, ty * width * 4, y * width * 4, (y + 1) * width * 4);
    }
  }
  fs.writeFileSync(path.join(OUT, cfg.name + '.png'), PNG.sync.write(out));
  console.log(`✓ ${cfg.name}.png  (${out.width}x${out.height}, 10x4, célula ${Math.round(width / 10)}x${cellH})`);
}
console.log('\nConcluído. Saída em', OUT);

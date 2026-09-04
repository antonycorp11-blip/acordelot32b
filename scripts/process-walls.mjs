/**
 * Muralhas/torres da cidade (fundo magenta, várias peças soltas na mesma
 * imagem). Chroma key + detecção de componentes conexos (flood fill) para
 * separar cada peça automaticamente, sem grade fixa.
 * Uso: node scripts/process-walls.mjs
 */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('art_src/walls');
const OUT = path.resolve('public/assets/props');
fs.mkdirSync(OUT, { recursive: true });

const JOBS = [
  { file: 'wall_set.png', prefix: 'wall_musical', target: 260 },
  { file: 'city_gate.png', prefix: 'wall_gate', target: 420, single: true },
];

const A = (d, w, x, y) => d[(y * w + x) * 4 + 3];

function chroma(png) {
  const { width, height, data } = png;
  const s = [[3, 3], [width - 4, 3], [3, height - 4], [width - 4, height - 4], [width >> 1, 3], [3, height >> 1]];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of s) { const i = (y * width + x) * 4; br += data[i]; bg += data[i + 1]; bb += data[i + 2]; }
  br /= s.length; bg /= s.length; bb /= s.length;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const mag = r > 150 && b > 120 && g < Math.min(r, b) - 30;
    if (d < 78 || mag) { data[i + 3] = 0; data[i] = data[i + 1] = data[i + 2] = 0; }
    else if (d < 155) { data[i + 3] = Math.round(255 * ((d - 78) / 77)); data[i] = Math.round(r * 0.6); data[i + 2] = Math.round(b * 0.6); }
  }
}
function despeckle(png) {
  const { width, height, data } = png;
  const src = Uint8Array.from(data);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = (y * width + x) * 4 + 3;
    if (src[i] === 0) continue;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      if (src[((y + dy) * width + (x + dx)) * 4 + 3] > 16) n++;
    if (n <= 2) data[i] = 0;
  }
}

function components(png, minArea) {
  const { width, height, data } = png;
  const seen = new Uint8Array(width * height);
  const comps = [];
  const stack = new Int32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (seen[idx] || A(data, width, x, y) <= 24) continue;
      let sp = 0;
      stack[sp++] = idx;
      seen[idx] = 1;
      let mnX = x, mxX = x, mnY = y, mxY = y, area = 0;
      while (sp > 0) {
        const cur = stack[--sp];
        const cx = cur % width, cy = (cur / width) | 0;
        area++;
        if (cx < mnX) mnX = cx; if (cx > mxX) mxX = cx;
        if (cy < mnY) mnY = cy; if (cy > mxY) mxY = cy;
        // 8-vizinhos, com folga de 4px pra unir antialiasing próximo
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (seen[nIdx] || A(data, width, nx, ny) <= 24) continue;
          seen[nIdx] = 1;
          stack[sp++] = nIdx;
        }
      }
      if (area >= minArea) comps.push({ mnX, mxX, mnY, mxY, area });
    }
  }
  return comps;
}

function crop(png, b, target) {
  const fw = b.mxX - b.mnX + 1, fh = b.mxY - b.mnY + 1;
  const S = Math.min(target / fw, target / fh, 1);
  const dw = Math.max(1, Math.round(fw * S)), dh = Math.max(1, Math.round(fh * S));
  const out = new PNG({ width: dw, height: dh });
  const { width, data } = png;
  for (let dy = 0; dy < dh; dy++) {
    const sy = b.mnY + Math.min(fh - 1, Math.floor(dy / S));
    for (let dx = 0; dx < dw; dx++) {
      const sx = b.mnX + Math.min(fw - 1, Math.floor(dx / S));
      const si = (sy * width + sx) * 4, ti = (dy * dw + dx) * 4;
      out.data[ti] = data[si]; out.data[ti + 1] = data[si + 1]; out.data[ti + 2] = data[si + 2]; out.data[ti + 3] = data[si + 3];
    }
  }
  return out;
}

for (const job of JOBS) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, job.file)));
  chroma(png);
  despeckle(png);
  if (job.single) {
    const comps = components(png, 400);
    // funde tudo (é uma peça única, o gate)
    let mnX = png.width, mxX = 0, mnY = png.height, mxY = 0;
    for (const c of comps) {
      mnX = Math.min(mnX, c.mnX); mxX = Math.max(mxX, c.mxX);
      mnY = Math.min(mnY, c.mnY); mxY = Math.max(mxY, c.mxY);
    }
    const img = crop(png, { mnX, mxX, mnY, mxY }, job.target);
    fs.writeFileSync(path.join(OUT, job.prefix + '.png'), PNG.sync.write(img));
    console.log(`✓ props/${job.prefix}.png (${img.width}x${img.height})`);
    continue;
  }
  const comps = components(png, 600).sort((a, b) => a.mnY - b.mnY || a.mnX - b.mnX);
  comps.forEach((c, i) => {
    const img = crop(png, c, job.target);
    const name = `${job.prefix}_${i + 1}`;
    fs.writeFileSync(path.join(OUT, name + '.png'), PNG.sync.write(img));
    console.log(`✓ props/${name}.png (${img.width}x${img.height})`);
  });
}

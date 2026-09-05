import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [,, input, outputDir] = process.argv;
if (!input || !outputDir) throw new Error('Uso: node extract-arena-props.mjs atlas.png pasta-saida');

const src = PNG.sync.read(fs.readFileSync(input));
const names = ['organ_gate', 'grand_piano', 'crystal_obelisk', 'corrupted_piano'];
fs.mkdirSync(outputDir, { recursive: true });

for (let q = 0; q < 4; q++) {
  const sx = (q % 2) * Math.floor(src.width / 2);
  const sy = Math.floor(q / 2) * Math.floor(src.height / 2);
  const width = Math.floor(src.width / 2);
  const height = Math.floor(src.height / 2);
  const out = new PNG({ width, height });
  PNG.bitblt(src, out, sx, sy, width, height, 0, 0);

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const canRemove = (idx) => {
    const p = idx * 4;
    const r = out.data[p], g = out.data[p + 1], b = out.data[p + 2];
    return Math.max(r, g, b) < 148;
  };
  const seed = (idx) => {
    if (!visited[idx] && canRemove(idx)) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width, y = Math.floor(idx / width);
    if (x > 0) seed(idx - 1);
    if (x + 1 < width) seed(idx + 1);
    if (y > 0) seed(idx - width);
    if (y + 1 < height) seed(idx + width);
  }
  for (let i = 0; i < tail; i++) {
    const p = queue[i] * 4;
    const peak = Math.max(out.data[p], out.data[p + 1], out.data[p + 2]);
    const alpha = peak <= 72 ? 0 : Math.round(((peak - 72) / 76) * 150);
    out.data[p + 3] = Math.min(out.data[p + 3], alpha);
    if (alpha === 0) out.data[p] = out.data[p + 1] = out.data[p + 2] = 0;
  }
  fs.writeFileSync(path.join(outputDir, `${names[q]}.png`), PNG.sync.write(out, { colorType: 6 }));
}

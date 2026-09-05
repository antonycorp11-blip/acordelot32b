import fs from 'node:fs';
import { PNG } from 'pngjs';

const [, , ...files] = process.argv;
if (!files.length) throw new Error('Informe ao menos um PNG.');

for (const file of files) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;

  const isBackground = (idx) => {
    const p = idx * 4;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    return Math.min(r, g, b) >= 208 && Math.max(r, g, b) - Math.min(r, g, b) <= 22;
  };
  const seed = (idx) => {
    if (!visited[idx] && isBackground(idx)) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) seed(idx - 1);
    if (x + 1 < width) seed(idx + 1);
    if (y > 0) seed(idx - width);
    if (y + 1 < height) seed(idx + width);
  }
  // Zera também o RGB oculto. Além de evitar halos no canvas, isso permite
  // que o PNG comprima toda a área transparente como uma única cor.
  for (let i = 0; i < tail; i++) {
    const p = queue[i] * 4;
    data[p] = 0;
    data[p + 1] = 0;
    data[p + 2] = 0;
    data[p + 3] = 0;
  }
  fs.writeFileSync(file, PNG.sync.write(png, { colorType: 6 }));
}

/** Separa a folha 4x4 gerada para o HUD em PNGs transparentes 128x128. */
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const src = process.argv[2] || 'public/assets/hud/hud_icons_atlas.png';
const outDir = path.resolve('public/assets/hud');
const names = [
  'backpack', 'synthesis', 'partitura', 'weapon',
  'catalog', 'quests', 'potion-heal', 'potion-buff',
  'attack', 'collect', 'resonance', 'cast',
  'amplify', 'party', 'locked', 'settings',
];
const atlas = PNG.sync.read(fs.readFileSync(src));
const cellW = Math.floor(atlas.width / 4);
const cellH = Math.floor(atlas.height / 4);
fs.mkdirSync(outDir, { recursive: true });

for (let index = 0; index < names.length; index++) {
  const col = index % 4, row = Math.floor(index / 4);
  const sx0 = col * cellW, sy0 = row * cellH;
  let minX = cellW, maxX = -1, minY = cellH, maxY = -1;
  for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
    const a = atlas.data[((sy0 + y) * atlas.width + sx0 + x) * 4 + 3];
    if (a < 8) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (maxX < 0) throw new Error(`célula vazia: ${names[index]}`);
  const sw = maxX - minX + 1, sh = maxY - minY + 1;
  const scale = Math.min(112 / sw, 112 / sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const dx0 = Math.floor((128 - dw) / 2), dy0 = Math.floor((128 - dh) / 2);
  const out = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx = sx0 + minX + Math.min(sw - 1, Math.floor(x / scale));
    const sy = sy0 + minY + Math.min(sh - 1, Math.floor(y / scale));
    const si = (sy * atlas.width + sx) * 4;
    const ti = ((dy0 + y) * out.width + dx0 + x) * 4;
    out.data[ti] = atlas.data[si]; out.data[ti + 1] = atlas.data[si + 1];
    out.data[ti + 2] = atlas.data[si + 2]; out.data[ti + 3] = atlas.data[si + 3];
  }
  fs.writeFileSync(path.join(outDir, `${names[index]}.png`), PNG.sync.write(out));
}
console.log(`✓ ${names.length} ícones HUD em ${outDir}`);

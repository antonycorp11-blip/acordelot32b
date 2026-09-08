/** Separa o atlas 4x4 gerado para o Mercado em ícones transparentes 128x128. */
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const source = process.argv[2] || 'art_src/generated/market_icons_atlas.png';
const src = PNG.sync.read(fs.readFileSync(source));
const outDir = path.resolve('public/assets/items/market');
fs.mkdirSync(outDir, { recursive: true });
const names = [
  'potion_heal', 'potion_basic', 'potion_shield', 'potion_farm',
  'bag_expansion', 'wood', 'stone', 'fragment_pack',
  'bread', 'berry', 'partitura_bronze', 'eco_dust',
  'gold_raw', 'gold_refined', 'crystal_blue_raw', 'tuning_kit',
];
const sw = Math.floor(src.width / 4), sh = Math.floor(src.height / 4);

for (let index = 0; index < names.length; index++) {
  const col = index % 4, row = Math.floor(index / 4);
  const cell = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const sx = Math.min(src.width - 1, col * sw + Math.floor((x + .5) * sw / 128));
    const sy = Math.min(src.height - 1, row * sh + Math.floor((y + .5) * sh / 128));
    const si = (sy * src.width + sx) * 4, di = (y * 128 + x) * 4;
    cell.data[di] = src.data[si]; cell.data[di + 1] = src.data[si + 1];
    cell.data[di + 2] = src.data[si + 2]; cell.data[di + 3] = src.data[si + 3];
  }
  fs.writeFileSync(path.join(outDir, `${names[index]}.png`), PNG.sync.write(cell));
}
console.log(`✓ ${names.length} ícones criados em ${outDir}`);

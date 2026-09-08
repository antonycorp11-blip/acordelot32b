/**
 * DG instanciada "Cristal Profundo" — as 8 câmaras portadas do antigo
 * easternRegions.ts para um grid próprio. Escura (lighting: 'cave').
 * Chega-se aqui pelo portal "Fenda Profunda" no bioma Cavernas de Cristal.
 */
import type { MapGrid } from '../mapData';
import { TERRAIN_TILES as TT, TILE_SIZE } from '../mapData';
import type { Rect, WorldProp, NPC } from '../types';
import { CRYSTAL_ROOMS, dungeonChestId } from '../crystalDungeon';
import { makeRng, ellipse, path, type Painter } from './paint';
import { portal } from './portalProp';

const COLS = 440;
const ROWS = 220;
const T = TILE_SIZE;

export function buildDgCristalProfundo(): MapGrid {
  const ground: number[][] = [];
  const props: WorldProp[] = [];
  const solids: Rect[] = [];
  const npcs: NPC[] = [];
  const p: Painter = { ground, props, solids, cols: COLS, rows: ROWS, rng: makeRng(0xc7157a1) };

  // tudo é vazio até as salas/corredores serem escavados
  for (let r = 0; r < ROWS; r++) ground[r] = new Array(COLS).fill(TT.DUNGEON_VOID);

  CRYSTAL_ROOMS.forEach((room) => ellipse(p, room.col, room.row, room.rx, room.ry, TT.CRYSTAL_FLOOR, 0.16));
  // corredor de chegada + corredores entre salas
  path(p, [[340, 46], [354, 46]], 3.5, TT.CRYSTAL_FLOOR);
  for (let i = 1; i < CRYSTAL_ROOMS.length; i++) {
    const a = CRYSTAL_ROOMS[i - 1];
    const b = CRYSTAL_ROOMS[i];
    const elbow = [(a.col + b.col) / 2, (a.row + b.row) / 2];
    path(p, [[a.col, a.row], elbow, [b.col, b.row]], 3.5, TT.CRYSTAL_FLOOR);
  }

  const prop = (id: string, type: string, c: number, r: number, w: number, h: number) => {
    const x = c * T - w / 2;
    const y = r * T - h;
    props.push({ id, type, x, y, w, h, sortY: y + h - 4 });
  };

  // silhuetas de penhasco atrás das bordas norte das salas
  for (let r = 3; r < ROWS - 2; r++)
    for (let c = 6; c < COLS - 4; c += 4) {
      if (ground[r][c] === TT.CRYSTAL_FLOOR && ground[r - 1]?.[c] === TT.DUNGEON_VOID)
        prop(`dg_cliff_${c}_${r}`, 'caveRim', c, r - 1, 164, 113);
    }

  CRYSTAL_ROOMS.forEach((room, index) => {
    for (let i = 0; i < 8; i++) {
      const a = i * (Math.PI / 4) + 0.3;
      prop(
        `dg_resource_${index}_${i}`,
        i % 4 === 0 ? 'spot_gold' : i % 3 === 0 ? 'spot_crystal_red' : 'spot_crystal_blue',
        Math.round(room.col + Math.cos(a) * room.rx * 0.73),
        Math.round(room.row + Math.sin(a) * room.ry * 0.73),
        64, 70,
      );
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 1.25 + 0.6;
      prop(
        `dg_pillar_${index}_${i}`,
        index % 2 ? 'organColumn' : 'crystalPillar',
        Math.round(room.col + Math.cos(a) * (room.rx - 4)),
        Math.round(room.row + Math.sin(a) * (room.ry - 3)),
        index % 2 ? 88 : 110, index % 2 ? 140 : 160,
      );
    }
    prop(`dg_ruin_${index}`, 'musicalRuin', room.col, room.row - 1, 165, 156);
    prop(dungeonChestId(index), 'dungeonChest', room.col + 4, room.row + 8, 96, 84);
  });

  // vazio impassável: runs horizontais
  for (let r = 0; r < ROWS; r++) {
    let start = -1;
    for (let c = 0; c <= COLS; c++) {
      const blocked = c < COLS && ground[r][c] === TT.DUNGEON_VOID;
      if (blocked && start < 0) start = c;
      if (!blocked && start >= 0) {
        solids.push({ x: start * T, y: r * T, w: (c - start) * T, h: T });
        start = -1;
      }
    }
  }

  // portal de saída → volta pro bioma Cavernas de Cristal
  props.push(
    portal('dg_exit', CRYSTAL_ROOMS[0].col - 10, CRYSTAL_ROOMS[0].row, {
      to: 'cavernas_cristal', spawn: { col: 214, row: 84 }, label: 'Sair da Fenda', kind: 'walk',
    }),
  );

  return { ground, solidColliders: solids, props, npcs };
}

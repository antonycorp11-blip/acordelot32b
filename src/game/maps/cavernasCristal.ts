/**
 * Cavernas de Cristal — BIOMA iluminado e caminhável (não é DG). Hub de onde se
 * acessa DGs instanciadas. Piso de cristal claro, formações de ametista,
 * piscinas de água de verdade. Enxuto nesta sessão; build-out grande depois.
 */
import type { MapGrid } from '../mapData';
import { TERRAIN_TILES as TT, TILE_SIZE } from '../mapData';
import type { Rect, WorldProp, NPC } from '../types';
import {
  makeRng, fillGround, ellipse, path, featherOverlap, worldEdgeColliders, type Painter,
} from './paint';
import { portal } from './portalProp';

const COLS = 280;
const ROWS = 200;
const T = TILE_SIZE;

const ENTRANCE = { c: 140, r: 176 };
const HALL = { c: 140, r: 100 };
const MIRROR = { c: 66, r: 120 };
const RIFT = { c: 214, r: 78 };

export function buildCavernasCristal(): MapGrid {
  const ground: number[][] = [];
  const props: WorldProp[] = [];
  const solids: Rect[] = [];
  const npcs: NPC[] = [];
  const rng = makeRng(0xc4ee7a);
  const p: Painter = { ground, props, solids, cols: COLS, rows: ROWS, rng };

  // base: piso de cristal claro em toda parte caminhável, borda vira void
  fillGround(p, TT.CRYSTAL_FLOOR);
  // recorta a silhueta da caverna (bordas irregulares de void)
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const nx = c / COLS - 0.5;
      const ny = r / ROWS - 0.5;
      const edge =
        0.46 +
        0.05 * Math.sin(c * 0.09 + r * 0.05) +
        0.04 * Math.cos(c * 0.03 - r * 0.11);
      if (nx * nx + ny * ny * 1.15 > edge * edge) ground[r][c] = TT.DUNGEON_VOID;
    }

  // regiões internas
  ellipse(p, HALL.c, HALL.r, 40, 34, TT.ECHO_PATH, 0.18); // Salão das Gemas — plaza clara
  ellipse(p, ENTRANCE.c, ENTRANCE.r, 26, 18, TT.ECHO_PATH, 0.2);
  ellipse(p, RIFT.c, RIFT.r, 24, 20, TT.FRONTIER_GROUND, 0.18);

  // Espelho d'Água — piscina de verdade
  ellipse(p, MIRROR.c, MIRROR.r, 26, 20, TT.WATER_SHALLOW, 0.12);
  ellipse(p, MIRROR.c, MIRROR.r, 19, 14, TT.WATER_DEEP, 0.1);

  // trilhas
  path(p, [[ENTRANCE.c, ENTRANCE.r - 16], [140, 140], [HALL.c, HALL.r + 30]], 3.5, TT.ECHO_PATH);
  path(p, [[HALL.c - 34, HALL.r], [100, 118], [MIRROR.c + 22, MIRROR.r]], 3.2, TT.ECHO_PATH);
  path(p, [[HALL.c + 32, HALL.r - 8], [180, 90], [RIFT.c - 20, RIFT.r + 6]], 3.2, TT.ECHO_PATH);

  featherOverlap(p, TT.DUNGEON_VOID, TT.CRYSTAL_FLOOR, 3);
  featherOverlap(p, TT.ECHO_PATH, TT.CRYSTAL_FLOOR, 3);
  featherOverlap(p, TT.WATER_SHALLOW, TT.CRYSTAL_FLOOR, 2);

  const prop = (id: string, type: string, c: number, r: number, w: number, h: number) => {
    const x = c * T - w / 2;
    const y = r * T - h;
    props.push({ id, type, x, y, w, h, sortY: y + h - 4 });
  };
  const scatter = (ids: string, type: string, cx: number, cy: number, rx: number, ry: number, count: number, w: number, h: number, avoid = 0) => {
    let n = 0;
    for (let tries = 0; tries < count * 12 && n < count; tries++) {
      const a = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng());
      const c = Math.round(cx + Math.cos(a) * rx * rad);
      const r = Math.round(cy + Math.sin(a) * ry * rad);
      if (c < 3 || c >= COLS - 3 || r < 3 || r >= ROWS - 3) continue;
      if (ground[r][c] === TT.DUNGEON_VOID || ground[r][c] === TT.WATER_DEEP) continue;
      if (avoid && Math.hypot(c - cx, r - cy) < avoid) continue;
      prop(`${ids}_${n}`, type, c, r, w, h);
      n++;
    }
  };

  // formações de ametista/cristal por TODO o bioma iluminado
  scatter('cc_pillar', 'crystalPillar', COLS / 2, ROWS / 2, 120, 90, 46, 110, 160, 14);
  scatter('cc_pillar2', 'organColumn', COLS / 2, ROWS / 2, 118, 88, 22, 88, 140, 14);
  scatter('cc_crystal_b', 'spot_crystal_blue', COLS / 2, ROWS / 2, 128, 96, 90, 56, 60, 6);
  scatter('cc_crystal_r', 'spot_crystal_red', COLS / 2, ROWS / 2, 128, 96, 38, 56, 60, 6);
  scatter('cc_ice', 'dark_icecrystal', COLS / 2, ROWS / 2, 126, 94, 30, 52, 58, 6);
  scatter('cc_gold', 'spot_gold', COLS / 2, ROWS / 2, 120, 88, 18, 60, 44, 6);
  scatter('cc_ruin', 'musicalRuin', COLS / 2, ROWS / 2, 110, 80, 6, 165, 156, 30);
  // silhuetas de rocha na borda interna (some o recorte reto do void)
  for (let r = 4; r < ROWS - 4; r += 3)
    for (let c = 4; c < COLS - 4; c += 3) {
      if (ground[r]?.[c] === TT.DUNGEON_VOID && ground[r]?.[c + 3] !== TT.DUNGEON_VOID)
        prop(`cc_rim_${c}_${r}`, 'caveRim', c + 2, r, 164, 113);
    }

  // construções: posto avançado + santuário menor
  prop('cc_outpost', 'bldgLodgeEast', HALL.c - 30, HALL.r - 26, 116, 124);
  prop('cc_shrine', 'echoSteles', HALL.c + 26, HALL.r - 18, 120, 115);

  // portais
  props.push(
    portal('cc_portal_overworld', ENTRANCE.c, ENTRANCE.r + 4, {
      to: 'overworld', spawn: { col: 60, row: 172 }, label: 'Floresta Sombria', kind: 'walk',
    }),
  );
  props.push(
    portal('cc_portal_dg', RIFT.c, RIFT.r - 2, {
      to: 'dg_cristal_profundo', spawn: { col: 354, row: 46 }, label: 'Fenda Profunda', kind: 'screen',
    }),
  );

  solids.push(...worldEdgeColliders(p));
  // void interno = impassável (runs horizontais)
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

  return { ground, solidColliders: solids, props, npcs };
}

export const CAVERNAS_SPAWNS = { entrance: ENTRANCE, hall: HALL, rift: RIFT };

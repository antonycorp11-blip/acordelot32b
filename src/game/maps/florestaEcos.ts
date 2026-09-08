/**
 * Floresta dos Ecos — bioma gigante (300x220). Cinco sub-regiões ligadas por
 * trilhas: Clareira do Santuário (centro), Bosque Cantante (norte), Ruínas do
 * Conservatório (leste), Lago das Ressonâncias (sudoeste), Fronteira Pétrea
 * (sudeste, com portal pras Cavernas de Cristal).
 */
import type { MapGrid } from '../mapData';
import { TERRAIN_TILES as TT, TILE_SIZE } from '../mapData';
import type { Rect, WorldProp, NPC } from '../types';
import {
  makeRng,
  fillGround,
  ellipse,
  path,
  paintTile,
  featherOverlap,
  worldEdgeColliders,
  type Painter,
} from './paint';
import { portal } from './portalProp';

const COLS = 300;
const ROWS = 220;
const T = TILE_SIZE;

// âncoras das sub-regiões (tiles)
const SANCTUARY = { c: 150, r: 118 };
const WOODS = { c: 150, r: 44 };
const RUINS = { c: 242, r: 120 };
const LAKE = { c: 66, r: 168 };
const PETREA = { c: 244, r: 192 };

export function buildFlorestaEcos(): MapGrid {
  const ground: number[][] = [];
  const props: WorldProp[] = [];
  const solids: Rect[] = [];
  const npcs: NPC[] = [];
  const rng = makeRng(0x5eed3c0);
  const p: Painter = { ground, props, solids, cols: COLS, rows: ROWS, rng };

  fillGround(p, TT.GRASS_BASE);

  // ---------- terreno das sub-regiões ----------
  // Clareira do Santuário — gramado azulado grande (sem praça de pedra: o
  // gramado vai até o altar, que já tem base própria na arte)
  ellipse(p, SANCTUARY.c, SANCTUARY.r, 62, 48, TT.ECHO_MEADOW, 0.16);

  // Bosque Cantante — faixa norte
  for (let r = 4; r < 82; r++)
    for (let c = 4; c < COLS - 4; c++) {
      const n = Math.sin(c * 0.17 + r * 0.11) + Math.cos(c * 0.07 - r * 0.19);
      if (r < 74 || n > 0) paintTile(p, c, r, TT.SINGING_WOODS);
    }

  // Ruínas do Conservatório — chão de pedra clara
  ellipse(p, RUINS.c, RUINS.r, 34, 30, TT.CRYSTAL_FLOOR, 0.18);
  ellipse(p, RUINS.c, RUINS.r, 22, 19, TT.ECHO_PATH, 0.22);

  // Fronteira Pétrea — terra negra e rocha
  ellipse(p, PETREA.c, PETREA.r, 40, 26, TT.FRONTIER_GROUND, 0.2);

  // Lago das Ressonâncias — água de verdade + ilhota
  ellipse(p, LAKE.c, LAKE.r, 34, 26, TT.WATER_DEEP, 0.1);
  ellipse(p, LAKE.c, LAKE.r, 40, 31, TT.WATER_SHALLOW, 0.14);
  // re-pinta o miolo fundo por cima do raso
  ellipse(p, LAKE.c, LAKE.r, 30, 22, TT.WATER_DEEP, 0.1);
  ellipse(p, LAKE.c, LAKE.r, 8, 6, TT.ECHO_MEADOW, 0.25); // ilhota

  // ---------- trilhas ligando tudo (banda estreita) ----------
  path(p, [[SANCTUARY.c, SANCTUARY.r - 40], [150, 96], [WOODS.c, 70]], 2.2, TT.ECHO_PATH, TT.SINGING_WOODS);
  path(p, [[SANCTUARY.c + 46, SANCTUARY.r], [206, 118], [RUINS.c - 20, RUINS.r]], 2.2, TT.ECHO_PATH, TT.GRASS_BASE);
  path(p, [[SANCTUARY.c - 48, SANCTUARY.r + 8], [110, 150], [LAKE.c + 26, LAKE.r - 8]], 2.2, TT.ECHO_PATH, TT.GRASS_BASE);
  path(p, [[SANCTUARY.c + 24, SANCTUARY.r + 44], [200, 168], [PETREA.c - 24, PETREA.r - 10]], 2.2, TT.ECHO_PATH, TT.GRASS_BASE);
  path(p, [[RUINS.c, RUINS.r + 26], [244, 160], [PETREA.c, PETREA.r - 24]], 2.0, TT.ECHO_PATH, TT.FRONTIER_GROUND);

  // ---------- degradê entre biomas (dá material pro feather) ----------
  featherOverlap(p, TT.ECHO_MEADOW, TT.GRASS_BASE, 3);
  featherOverlap(p, TT.SINGING_WOODS, TT.GRASS_BASE, 3);
  featherOverlap(p, TT.FRONTIER_GROUND, TT.GRASS_BASE, 3);
  featherOverlap(p, TT.GRASS_BASE, TT.SINGING_WOODS, 2);
  featherOverlap(p, TT.WATER_SHALLOW, TT.GRASS_BASE, 2);

  // ---------- props: helper ----------
  const prop = (id: string, type: string, c: number, r: number, w: number, h: number) => {
    const x = c * T - w / 2;
    const y = r * T - h;
    props.push({ id, type, x, y, w, h, sortY: y + h - 4 });
  };
  const scatter = (
    ids: string,
    type: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    count: number,
    w: number,
    h: number,
    avoid = 0,
  ) => {
    let n = 0;
    for (let tries = 0; tries < count * 12 && n < count; tries++) {
      const a = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng());
      const c = Math.round(cx + Math.cos(a) * rx * rad);
      const r = Math.round(cy + Math.sin(a) * ry * rad);
      if (c < 3 || c >= COLS - 3 || r < 3 || r >= ROWS - 3) continue;
      if (avoid && Math.hypot(c - cx, r - cy) < avoid) continue;
      prop(`${ids}_${n}`, type, c, r, w, h);
      n++;
    }
  };

  // Santuário: altar + arco + estelas em anel
  prop('region_echo_sanctuary', 'echoAltar', SANCTUARY.c, SANCTUARY.r - 2, 176, 138);
  prop('fe_echo_arch', 'echoArch', SANCTUARY.c - 2, SANCTUARY.r + 22, 180, 172);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    prop(`fe_stele_${i}`, i % 2 ? 'echoSteles' : 'spot_crystal_blue',
      Math.round(SANCTUARY.c + Math.cos(a) * 17),
      Math.round(SANCTUARY.r + Math.sin(a) * 13),
      i % 2 ? 118 : 58, i % 2 ? 112 : 62);
  }

  // Bosque Cantante: floresta DENSA em grade (norte), rareando perto da clareira
  for (let r = 5; r < 82; r += 2) {
    for (let c = 5; c < COLS - 5; c += 2) {
      // rareia perto da Clareira do Santuário e nas trilhas
      const distClearing = Math.hypot(c - SANCTUARY.c, r - SANCTUARY.r);
      if (distClearing < 52) continue;
      const n = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5) % 1;
      const density = r < 70 ? 0.62 : 0.34;
      if (n > density) {
        if (n > 0.9 && rng() < 0.4) {
          const q = rng();
          prop(
            `fe_song_spot_${c}_${r}`,
            q < 0.5 ? 'spot_crystal_blue' : q < 0.8 ? 'spot_crystal_red' : 'spot_gold',
            c + (rng() - 0.5), r + (rng() - 0.5), q < 0.8 ? 56 : 60, q < 0.8 ? 60 : 44,
          );
        }
        continue;
      }
      const q = rng();
      const jc = c + Math.round((rng() - 0.5) * 1.4);
      const jr = r + Math.round((rng() - 0.5) * 1.4);
      if (q < 0.5) prop(`fe_song_tree_${c}_${r}`, 'singingTree', jc, jr, 150, 156);
      else if (q < 0.82) prop(`fe_song_pine_${c}_${r}`, 'dark_bigpine', jc, jr, 52, 74);
      else if (q < 0.93) prop(`fe_song_dead_${c}_${r}`, 'dark_deadtree', jc, jr, 34, 74);
      else prop(`fe_song_thorn_${c}_${r}`, 'dark_thorn', jc, jr, 30, 24);
    }
  }
  scatter('fe_song_rock', 'dark_bigrock', WOODS.c, WOODS.r + 4, 130, 32, 20, 60, 46, 0);

  // Ruínas do Conservatório
  prop('fe_ruin_main', 'musicalRuin', RUINS.c, RUINS.r - 4, 165, 156);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    prop(`fe_ruin_col_${i}`, i % 2 ? 'organColumn' : 'crystalPillar',
      Math.round(RUINS.c + Math.cos(a) * 22),
      Math.round(RUINS.r + Math.sin(a) * 18),
      i % 2 ? 88 : 110, i % 2 ? 140 : 160);
  }
  prop('fe_ruin_gold', 'spot_gold', RUINS.c, RUINS.r + 4, 60, 44);

  // Lago: ponte atravessando + juncos (via props de árvore pequenos)
  props.push({
    id: 'fe_lake_bridge', type: 'frontierBridge',
    x: (LAKE.c - 8) * T, y: (LAKE.r - 4) * T, w: 512, h: 232, sortY: (LAKE.r - 4) * T + 8,
  });
  prop('fe_lake_islet_crystal', 'spot_crystal_blue', LAKE.c, LAKE.r, 56, 60);

  // Fronteira Pétrea: rochas + portal pras Cavernas
  scatter('fe_petrea_rock', 'dark_bigrock', PETREA.c, PETREA.r, 34, 20, 22, 60, 46, 6);
  scatter('fe_petrea_ice', 'dark_icecrystal', PETREA.c, PETREA.r, 30, 16, 8, 52, 58, 6);

  // ---------- construções ----------
  prop('fe_bldg_guardians', 'bldgLodgeEast', SANCTUARY.c - 46, SANCTUARY.r - 30, 116, 124);
  prop('fe_bldg_luthier', 'bldgHerbalistWest', SANCTUARY.c + 44, SANCTUARY.r - 26, 116, 120);

  // ---------- portais ----------
  props.push(
    portal('fe_portal_overworld', SANCTUARY.c, SANCTUARY.r + 30, {
      to: 'overworld', spawn: { col: 37, row: 8 }, label: 'Acordelot', kind: 'walk',
    }),
  );
  props.push(
    portal('fe_portal_cavernas', PETREA.c, PETREA.r + 4, {
      to: 'cavernas_cristal', spawn: { col: 140, row: 182 }, label: 'Cavernas de Cristal', kind: 'walk',
    }),
  );

  // ---------- cinta de árvores densas na borda (some o recorte reto) ----------
  {
    const edge = (c: number, r: number, type: string, w: number, h: number) => {
      const x = c * T + Math.round((rng() - 0.5) * 22);
      const y = r * T + Math.round((rng() - 0.5) * 22);
      props.push({ id: `fe_edge_${c}_${r}`, type, x, y, w, h, sortY: y + h - 4 });
    };
    for (let c = 2; c < COLS - 2; c += 2) {
      for (let d = 0; d < 2 + Math.floor(rng() * 2); d++) if (rng() < 0.7) edge(c, 2 + d, 'singingTree', 150, 156);
      for (let d = 0; d < 2 + Math.floor(rng() * 2); d++) if (rng() < 0.7) edge(c, ROWS - 3 - d, 'dark_bigpine', 52, 74);
    }
    for (let r = 4; r < ROWS - 4; r += 2) {
      for (let d = 0; d < 2 + Math.floor(rng() * 2); d++) if (rng() < 0.7) edge(2 + d, r, 'dark_bigpine', 52, 74);
      for (let d = 0; d < 2 + Math.floor(rng() * 2); d++) if (rng() < 0.7) edge(COLS - 3 - d, r, 'singingTree', 150, 156);
    }
  }

  solids.push(...worldEdgeColliders(p));
  return { ground, solidColliders: solids, props, npcs };
}

/** onde os inimigos/Ecos nascem (consumido pelo engine). */
export const FLORESTA_ECOS_SPAWNS = {
  sanctuary: SANCTUARY,
  woods: WOODS,
  ruins: RUINS,
};

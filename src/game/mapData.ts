/**
 * Map Data & Layout — Vila Encantada de Acordelot (72x54, tiles de 32px)
 *
 * Planta top-down real:
 *  - Avenida Central vertical (N-S) e Avenida Central horizontal (L-O) cruzando
 *    numa Praça da Fonte.
 *  - Casas alinhadas rente às calçadas, de frente para a rua:
 *      * lado norte da avenida horizontal -> fachadas frontais
 *      * lado sul -> vistas traseiras autênticas
 *      * flancos da avenida vertical -> perspectivas laterais / diagonais
 *  - Bosques preenchendo os quatro quadrantes + cinturão de floresta na borda.
 *  - Distrito da pedreira ao nordeste.
 */
import { Rect, WorldProp, NPC } from './types';

// Mapa 4x maior — muita floresta e rios em volta da vila.
export const MAP_COLS = 144;
export const MAP_ROWS = 108;
export const TILE_SIZE = 32;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE; // 4608px
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE; // 3456px

/** Tile IDs do tileset Terrain2 (36 colunas) + sentinelas de água. */
export const TERRAIN_TILES = {
  GRASS_BASE: 56,
  GRASS_FLOWER1: 92,
  GRASS_FLOWER2: 128,
  GRASS_DARK: 128,
  SAND_BANK: 344,
  STONE_CENTER: 344,
  STONE_CENTER_VAR: 380,
  STONE_TOP: 308,
  STONE_BOTTOM: 416,
  STONE_LEFT: 343,
  STONE_RIGHT: 345,
  STONE_TL: 307,
  STONE_TR: 309,
  STONE_BL: 415,
  STONE_BR: 417,
  // sentinelas (renderizados como água animada, fora do tileset)
  WATER_DEEP: 9000,
  WATER_SHALLOW: 9001,
};

export interface MapGrid {
  ground: number[][];
  solidColliders: Rect[];
  props: WorldProp[];
  npcs: NPC[];
}

/** Dimensões base de cada sprite de construção (batem com EDITABLE_PROP_METAS). */
const BUILDING_DIMS: Record<string, [number, number, number]> = {
  // tipo: [largura, altura, sortYOffset]
  bldgTownHall: [122, 128, 124],
  bldgBakeryFront: [110, 116, 112],
  blacksmithFront: [120, 120, 116],
  residentialFront: [118, 118, 114],
  apothecaryFront: [120, 118, 114],
  townHallDiag: [124, 132, 128],
  bakeryDiag: [118, 122, 118],
  bldgLodgeEast: [116, 124, 120],
  lodgeWest: [116, 124, 120],
  bldgHerbalistWest: [116, 120, 116],
  herbalistEast: [116, 120, 116],
  townHallBack: [132, 112, 108],
  bakeryBack: [114, 116, 112],
  houseBackCottage: [130, 92, 88],
  houseBackBlueWoodshed: [108, 124, 120],
  houseBackTavernMossy: [132, 126, 122],
  houseBackBlueCellar: [110, 128, 124],
  townHallSide: [104, 128, 124],
  bakerySide: [96, 116, 112],
  stoneQuarry: [140, 140, 136],
  limestoneBoulders: [88, 86, 82],
  villageWell: [56, 75, 72],
  streetLantern: [46, 62, 58],
  wagonCart: [64, 48, 44],
  marketStall: [64, 64, 60],
  hayBaleStack: [48, 36, 32],
  barrelStack: [40, 36, 32],
  woodenBench: [32, 24, 22],
  woodenBenchRustic: [36, 24, 22],
  bulletinBoard: [30, 34, 30],
};

export function buildMap(): MapGrid {
  const ground: number[][] = [];
  const solidColliders: Rect[] = [];
  const props: WorldProp[] = [];
  const npcs: NPC[] = [];

  // 1. Grama base com variações suaves
  for (let r = 0; r < MAP_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const noise = (Math.sin(c * 0.35 + r * 0.25) + Math.cos(c * 0.65 - r * 0.55)) / 2;
      if (noise > 0.55) row.push(TERRAIN_TILES.GRASS_FLOWER1);
      else if (noise < -0.55) row.push(TERRAIN_TILES.GRASS_FLOWER2);
      else row.push(TERRAIN_TILES.GRASS_BASE);
    }
    ground.push(row);
  }

  const paveTile = (c: number, r: number) =>
    (c + r) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
  const pave = (c0: number, c1: number, r0: number, r1: number) => {
    for (let r = Math.max(0, r0); r <= Math.min(MAP_ROWS - 1, r1); r++)
      for (let c = Math.max(0, c0); c <= Math.min(MAP_COLS - 1, c1); c++)
        ground[r][c] = paveTile(c, r);
  };

  // 2. RUAS PRINCIPAIS
  // Avenida Central Vertical (N-S) — cols 33..38
  pave(33, 38, 0, MAP_ROWS - 1);
  // Avenida Central Horizontal (L-O) — rows 24..29
  pave(0, MAP_COLS - 1, 24, 29);
  // Praça da Fonte (cantos chanfrados)
  pave(26, 45, 20, 33);
  for (const [cc, rr] of [
    [26, 20],
    [45, 20],
    [26, 33],
    [45, 33],
  ] as const) {
    ground[rr][cc] = TERRAIN_TILES.GRASS_BASE;
  }
  // Praça do Santuário ao norte
  pave(31, 40, 3, 8);

  // 3. Colisores das bordas do mundo
  solidColliders.push({ x: 0, y: 0, w: WORLD_WIDTH, h: 24 });
  solidColliders.push({ x: 0, y: WORLD_HEIGHT - 24, w: WORLD_WIDTH, h: 24 });
  solidColliders.push({ x: 0, y: 0, w: 24, h: WORLD_HEIGHT });
  solidColliders.push({ x: WORLD_WIDTH - 24, y: 0, w: 24, h: WORLD_HEIGHT });

  // 4. HELPERS DE CONSTRUÇÃO
  // Ancora a base (rodapé) do sprite na linha `baseRow`; `edgeCol`/`side`
  // encostam o sprite na calçada.
  const addBuilding = (
    id: string,
    type: string,
    opts: { col?: number; rightCol?: number; leftCol?: number; baseRow: number }
  ) => {
    const [w, h, sortOff] = BUILDING_DIMS[type] || [96, 96, 92];
    let x: number;
    if (opts.rightCol !== undefined) x = opts.rightCol * TILE_SIZE - w;
    else if (opts.leftCol !== undefined) x = opts.leftCol * TILE_SIZE;
    else x = (opts.col ?? 0) * TILE_SIZE;
    const y = opts.baseRow * TILE_SIZE - h;
    props.push({ id, type, x, y, w, h, sortY: y + sortOff });
  };

  const addDecor = (id: string, type: string, col: number, baseRow: number) => {
    const [w, h, sortOff] = BUILDING_DIMS[type] || [32, 32, 28];
    const x = col * TILE_SIZE;
    const y = baseRow * TILE_SIZE - h;
    props.push({ id, type, x, y, w, h, sortY: y + sortOff });
  };

  // 5. FONTE SAGRADA (coração da praça)
  const shrineX = 35 * TILE_SIZE + 16 - 80;
  const shrineY = 26 * TILE_SIZE - 64;
  props.push({
    id: 'shrine_fountain',
    type: 'shrine',
    x: shrineX,
    y: shrineY,
    w: 160,
    h: 128,
    sortY: shrineY + 116,
    // colisor enxuto: deixa faixas de passagem dos dois lados da avenida
    collider: { x: shrineX + 46, y: shrineY + 66, w: 68, h: 44 },
    animated: { totalFrames: 8, frameWidth: 160, frameHeight: 128, frameDuration: 120 },
  });
  solidColliders.push({ x: shrineX + 46, y: shrineY + 66, w: 68, h: 44 });

  // Cálice de Espíritos no santuário norte
  const chaliceX = 35 * TILE_SIZE + 16 - 32;
  const chaliceY = 5 * TILE_SIZE - 32;
  props.push({
    id: 'chalice_spirits',
    type: 'chalice',
    x: chaliceX,
    y: chaliceY,
    w: 64,
    h: 64,
    sortY: chaliceY + 56,
    animated: { totalFrames: 8, frameWidth: 64, frameHeight: 64, frameDuration: 110 },
  });

  // Pilares (atlas) nas entradas
  const addPillar = (id: string, col: number, row: number) => {
    const px = col * TILE_SIZE;
    const py = row * TILE_SIZE;
    props.push({
      id,
      type: 'atlas',
      x: px,
      y: py,
      w: 32,
      h: 64,
      sortY: py + 60,
      crop: { sx: 256, sy: 0, sw: 31, sh: 63 },
      collider: { x: px + 8, y: py + 48, w: 16, h: 12 },
    });
    solidColliders.push({ x: px + 8, y: py + 48, w: 16, h: 12 });
  };
  addPillar('pillar_shrine_w', 31, 3);
  addPillar('pillar_shrine_e', 40, 3);
  addPillar('pillar_plaza_nw', 27, 20);
  addPillar('pillar_plaza_ne', 44, 20);
  addPillar('pillar_plaza_sw', 27, 33);
  addPillar('pillar_plaza_se', 44, 33);

  // 6. CASAS RENTE ÀS RUAS
  // 6a. Fila NORTE da avenida horizontal — fachadas frontais (base linha 23)
  addBuilding('b_residential', 'residentialFront', { col: 5, baseRow: 23 });
  addBuilding('b_blacksmith', 'blacksmithFront', { col: 14, baseRow: 23 });
  addBuilding('b_town_hall', 'bldgTownHall', { col: 23, baseRow: 23 });
  addBuilding('b_bakery_front', 'bldgBakeryFront', { col: 41, baseRow: 23 });
  addBuilding('b_apothecary', 'apothecaryFront', { col: 50, baseRow: 23 });
  addBuilding('b_bakery_diag', 'bakeryDiag', { col: 59, baseRow: 23 });

  // 6b. Fila SUL da avenida horizontal — vistas traseiras (base linha 35)
  addBuilding('b_back_woodshed', 'houseBackBlueWoodshed', { col: 6, baseRow: 35 });
  addBuilding('b_back_cottage', 'houseBackCottage', { col: 15, baseRow: 34 });
  addBuilding('b_back_townhall', 'townHallBack', { col: 24, baseRow: 34 });
  addBuilding('b_back_bakery', 'bakeryBack', { col: 41, baseRow: 35 });
  addBuilding('b_back_cellar', 'houseBackBlueCellar', { col: 50, baseRow: 35 });
  addBuilding('b_back_tavern', 'houseBackTavernMossy', { col: 58, baseRow: 35 });

  // 6c. Flanco OESTE da avenida vertical (fachadas viradas para leste)
  addBuilding('b_lodge_west', 'lodgeWest', { rightCol: 33, baseRow: 12 });
  addBuilding('b_herbalist_west', 'bldgHerbalistWest', { rightCol: 33, baseRow: 20 });
  addBuilding('b_bakery_side', 'bakerySide', { rightCol: 33, baseRow: 41 });
  addBuilding('b_townhall_diag', 'townHallDiag', { rightCol: 33, baseRow: 49 });

  // 6d. Flanco LESTE da avenida vertical (fachadas viradas para oeste)
  addBuilding('b_herbalist_east', 'herbalistEast', { leftCol: 38, baseRow: 12 });
  addBuilding('b_townhall_side', 'townHallSide', { leftCol: 38, baseRow: 20 });
  addBuilding('b_lodge_east', 'bldgLodgeEast', { leftCol: 38, baseRow: 41 });
  addBuilding('b_herbalist_east2', 'bldgHerbalistWest', { leftCol: 38, baseRow: 49 });

  // 7. DISTRITO DA PEDREIRA (nordeste)
  addDecor('quarry_main', 'stoneQuarry', 60, 13);
  addDecor('boulders_1', 'limestoneBoulders', 54, 9);
  addDecor('boulders_2', 'limestoneBoulders', 64, 14);
  props.push({
    id: 'rock_cluster_1',
    type: 'rockCluster',
    x: 57 * TILE_SIZE,
    y: 11 * TILE_SIZE,
    w: 32,
    h: 26,
    sortY: 11 * TILE_SIZE + 24,
  });
  props.push({
    id: 'rock_pair_1',
    type: 'rockPair',
    x: 66 * TILE_SIZE,
    y: 8 * TILE_SIZE,
    w: 28,
    h: 22,
    sortY: 8 * TILE_SIZE + 20,
  });
  props.push({
    id: 'rock_monolith_1',
    type: 'rockMonolith',
    x: 52 * TILE_SIZE,
    y: 6 * TILE_SIZE,
    w: 24,
    h: 40,
    sortY: 6 * TILE_SIZE + 38,
  });
  props.push({
    id: 'rock_flat_slab_1',
    type: 'rockFlatSlab',
    x: 62 * TILE_SIZE,
    y: 6 * TILE_SIZE,
    w: 36,
    h: 18,
    sortY: 6 * TILE_SIZE + 16,
  });

  // 8. MOBILIÁRIO URBANO NA PRAÇA
  addDecor('well_plaza', 'villageWell', 29, 32);
  addDecor('market_stall_1', 'marketStall', 40, 32);
  addDecor('wagon_cart_1', 'wagonCart', 27, 24);
  addDecor('hay_bale_1', 'hayBaleStack', 42, 24);
  addDecor('barrel_stack_1', 'barrelStack', 30, 22);
  addDecor('bench_plaza_1', 'woodenBench', 32, 33);
  addDecor('bench_plaza_2', 'woodenBench', 39, 33);
  addDecor('bulletin_1', 'bulletinBoard', 44, 24);

  // Lanternas ao longo das ruas
  const lanternSpots: Array<[number, number]> = [
    [27, 20], [44, 20], [27, 33], [44, 33],
    [34, 10], [39, 10], [34, 17], [39, 17],
    [34, 37], [39, 37], [34, 45], [39, 45],
    [12, 23], [21, 23], [49, 23], [58, 23],
    [12, 31], [21, 31], [49, 31], [58, 31],
  ];
  lanternSpots.forEach(([c, r], i) => addDecor(`lantern_${i}`, 'streetLantern', c, r));

  // 9. VEGETAÇÃO
  // Árvores: o colisor do tronco fica só em prop.collider (a engine já o
  // considera e o remove quando a árvore é derrubada).
  const addOak = (id: string, x: number, y: number) => {
    props.push({
      id,
      type: 'oak',
      x,
      y,
      w: 64,
      h: 80,
      sortY: y + 74,
      collider: { x: x + 25, y: y + 66, w: 14, h: 8 },
    });
  };
  const addPine = (id: string, x: number, y: number) => {
    props.push({
      id,
      type: 'pine',
      x,
      y,
      w: 40,
      h: 80,
      sortY: y + 74,
      collider: { x: x + 14, y: y + 66, w: 12, h: 8 },
    });
  };
  const addBlossom = (id: string, x: number, y: number) => {
    props.push({
      id,
      type: 'blossomTree',
      x,
      y,
      w: 60,
      h: 76,
      sortY: y + 72,
      collider: { x: x + 23, y: y + 64, w: 14, h: 8 },
    });
  };
  const addBush = (id: string, x: number, y: number) => {
    props.push({ id, type: 'bush', x, y, w: 28, h: 24, sortY: y + 22 });
  };

  let t = 0;
  const grove = (
    coords: Array<[number, number]>,
    kind: 'oak' | 'pine' | 'blossom' | 'mixed'
  ) => {
    for (const [c, r] of coords) {
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      if (kind === 'oak') addOak(`oak_${t++}`, x, y);
      else if (kind === 'pine') addPine(`pine_${t++}`, x, y);
      else if (kind === 'blossom') addBlossom(`bls_${t++}`, x, y);
      else (t % 2 === 0 ? addPine : addOak)(`tr_${t++}`, x, y);
      addBush(`bush_${t++}`, x + 30, y + 40);
    }
  };

  // Quadrante NOROESTE (acima da fila norte de casas)
  grove(
    [
      [4, 3], [9, 4], [14, 3], [19, 5], [24, 3], [29, 4],
      [5, 9], [11, 10], [17, 9], [23, 10], [29, 9],
      [7, 16], [13, 17], [19, 16], [25, 17], [30, 15],
    ],
    'oak'
  );
  // Quadrante NORDESTE (entre casas leste e pedreira)
  grove(
    [
      [41, 3], [46, 4], [51, 3],
      [42, 9], [47, 10],
      [41, 16], [47, 17], [52, 16],
    ],
    'pine'
  );
  // Quadrante SUDOESTE (abaixo da fila sul)
  grove(
    [
      [4, 38], [9, 39], [14, 38], [19, 40], [24, 38], [29, 39],
      [5, 44], [11, 45], [17, 44], [23, 45], [29, 44],
      [6, 49], [13, 50], [20, 49], [27, 50],
    ],
    'blossom'
  );
  // Quadrante SUDESTE
  grove(
    [
      [41, 38], [46, 39], [51, 38], [56, 40], [61, 38], [65, 39],
      [42, 44], [48, 45], [54, 44], [60, 45], [65, 44],
      [43, 49], [50, 50], [57, 49], [64, 50],
    ],
    'mixed'
  );

  // =====================================================================
  //  MUNDO SELVAGEM: rios, riachos e florestas densas (procedural)
  // =====================================================================
  // PRNG determinístico simples
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const fnoise = (x: number, y: number) =>
    (Math.sin(x * 0.14 + y * 0.09) +
      Math.cos(x * 0.06 - y * 0.13) +
      Math.sin((x + y) * 0.045) * 1.2) /
    3.2;

  // reserva da vila (nada de rio/floresta densa aqui dentro)
  const inTown = (c: number, r: number) => c >= 1 && c <= 69 && r >= 1 && r <= 53;
  const isRoad = (c: number, r: number) =>
    (c >= 33 && c <= 38) || (r >= 24 && r <= 29) || (c >= 26 && c <= 45 && r >= 20 && r <= 33);
  const isWater = (c: number, r: number) =>
    ground[r]?.[c] === TERRAIN_TILES.WATER_DEEP || ground[r]?.[c] === TERRAIN_TILES.WATER_SHALLOW;

  // --- RIOS: caminhos sinuosos atravessando o mapa ---
  const carveRiver = (
    startCol: number,
    vertical: boolean,
    width: number,
    wiggle: number,
    shallow = false
  ) => {
    const len = vertical ? MAP_ROWS : MAP_COLS;
    for (let i = 0; i < len; i++) {
      const center =
        startCol + Math.sin(i * 0.045) * wiggle + Math.sin(i * 0.13 + 1) * wiggle * 0.35;
      const cc = Math.round(center);
      for (let d = -width; d <= width; d++) {
        const c = vertical ? cc + d : i;
        const r = vertical ? i : cc + d;
        if (c < 1 || c >= MAP_COLS - 1 || r < 1 || r >= MAP_ROWS - 1) continue;
        if (inTown(c, r)) continue; // rio contorna a vila
        const edge = Math.abs(d) >= width;
        if (edge) {
          if (ground[r][c] !== TERRAIN_TILES.WATER_DEEP)
            ground[r][c] = TERRAIN_TILES.SAND_BANK;
        } else {
          ground[r][c] = shallow ? TERRAIN_TILES.WATER_SHALLOW : TERRAIN_TILES.WATER_DEEP;
        }
      }
    }
  };

  carveRiver(96, true, 3, 8); // grande rio a leste
  carveRiver(20, true, 2, 6); // rio a oeste
  carveRiver(74, false, 2, 7); // rio ao sul
  carveRiver(110, true, 1, 5, true); // riacho raso (atravessável)
  carveRiver(48, false, 1, 4, true); // riacho raso

  // --- PONTES nos cruzamentos estrada x rio ---
  const deck = new Set<string>();
  let bridgeId = 0;
  // ponte da estrada VERTICAL (deck N-S) sobre o rio
  const bridgeOverVertRoad = () => {
    const cA = 33,
      cB = 38;
    let r = 4;
    while (r < MAP_ROWS - 4) {
      let waterHere = false;
      for (let c = cA; c <= cB; c++) if (ground[r]?.[c] === TERRAIN_TILES.WATER_DEEP) waterHere = true;
      if (waterHere) {
        let r1 = r;
        while (r1 < MAP_ROWS - 2) {
          let w2 = false;
          for (let c = cA; c <= cB; c++)
            if (ground[r1 + 1]?.[c] === TERRAIN_TILES.WATER_DEEP) w2 = true;
          if (!w2) break;
          r1++;
        }
        const r0 = r - 1;
        r1 = r1 + 1;
        for (let rr = r0; rr <= r1; rr++) for (let c = cA; c <= cB; c++) deck.add(`${c},${rr}`);
        props.push({
          id: `bridge_${bridgeId++}`,
          type: 'bridge',
          x: cA * TILE_SIZE,
          y: r0 * TILE_SIZE,
          w: (cB - cA + 1) * TILE_SIZE,
          h: (r1 - r0 + 1) * TILE_SIZE,
          sortY: r0 * TILE_SIZE + 6,
          data: { axis: 'ns' },
        });
        r = r1 + 3;
      } else r++;
    }
  };
  // ponte da estrada HORIZONTAL (deck L-O) sobre o rio
  const bridgeOverHorizRoad = () => {
    const rA = 24,
      rB = 29;
    let c = 4;
    while (c < MAP_COLS - 4) {
      let waterHere = false;
      for (let rr = rA; rr <= rB; rr++) if (ground[rr]?.[c] === TERRAIN_TILES.WATER_DEEP) waterHere = true;
      if (waterHere) {
        let c1 = c;
        while (c1 < MAP_COLS - 2) {
          let w2 = false;
          for (let rr = rA; rr <= rB; rr++) if (ground[rr]?.[c1 + 1] === TERRAIN_TILES.WATER_DEEP) w2 = true;
          if (!w2) break;
          c1++;
        }
        const c0 = c - 1;
        c1 = c1 + 1;
        for (let cc = c0; cc <= c1; cc++) for (let rr = rA; rr <= rB; rr++) deck.add(`${cc},${rr}`);
        props.push({
          id: `bridge_${bridgeId++}`,
          type: 'bridge',
          x: c0 * TILE_SIZE,
          y: rA * TILE_SIZE,
          w: (c1 - c0 + 1) * TILE_SIZE,
          h: (rB - rA + 1) * TILE_SIZE,
          sortY: rA * TILE_SIZE + 6,
          data: { axis: 'ew' },
        });
        c = c1 + 3;
      } else c++;
    }
  };
  bridgeOverVertRoad();
  bridgeOverHorizRoad();

  // colisores da água FUNDA — coalescidos em faixas por linha (pula o deck das pontes)
  for (let r = 1; r < MAP_ROWS - 1; r++) {
    let runStart = -1;
    for (let c = 1; c <= MAP_COLS - 1; c++) {
      const deep =
        c < MAP_COLS - 1 &&
        ground[r][c] === TERRAIN_TILES.WATER_DEEP &&
        !deck.has(`${c},${r}`);
      if (deep && runStart < 0) runStart = c;
      else if (!deep && runStart >= 0) {
        solidColliders.push({
          x: runStart * TILE_SIZE + 4,
          y: r * TILE_SIZE + 4,
          w: (c - runStart) * TILE_SIZE - 8,
          h: TILE_SIZE - 8,
        });
        runStart = -1;
      }
    }
  }

  // --- FLORESTAS DENSAS PROCEDURAIS (com teto de perf) ---
  let fid = 0;
  const MAX_FOREST = 1500;
  for (let r = 2; r < MAP_ROWS - 2 && fid < MAX_FOREST; r++) {
    for (let c = 2; c < MAP_COLS - 2 && fid < MAX_FOREST; c++) {
      if (isRoad(c, r) || isWater(c, r) || inTown(c, r) || deck.has(`${c},${r}`)) continue;

      const n = fnoise(c, r);
      const nearWater =
        isWater(c - 2, r) || isWater(c + 2, r) || isWater(c, r - 2) || isWater(c, r + 2);
      const density = n > 0.4 ? 0.5 : n > 0.05 ? 0.2 : 0.05;
      if (rnd() > density) continue;

      const x = c * TILE_SIZE + Math.round((rnd() - 0.5) * 14);
      const y = r * TILE_SIZE + Math.round((rnd() - 0.5) * 14);
      const pick = rnd();
      if (nearWater && pick < 0.5) addBlossom(`f_b${fid++}`, x, y);
      else if (n > 0.3)
        pick < 0.62 ? addPine(`f_p${fid++}`, x, y) : addOak(`f_o${fid++}`, x, y);
      else pick < 0.5 ? addOak(`f_o${fid++}`, x, y) : addPine(`f_p${fid++}`, x, y);

      if (rnd() < 0.16) addBush(`f_s${fid++}`, x + 18, y + 34);
    }
  }

  // Cinturão de floresta bem fechado nas 4 bordas
  for (let c = 2; c < MAP_COLS - 2; c += 3) {
    addPine(`bN_${t++}`, c * TILE_SIZE + (t % 2) * 12, (1 + (t % 2)) * TILE_SIZE);
    addOak(`bS_${t++}`, c * TILE_SIZE, (MAP_ROWS - 3 - (t % 2)) * TILE_SIZE);
  }
  for (let r = 3; r < MAP_ROWS - 3; r += 3) {
    addOak(`bW_${t++}`, (1 + (t % 2)) * TILE_SIZE, r * TILE_SIZE);
    addPine(`bE_${t++}`, (MAP_COLS - 3 - (t % 2)) * TILE_SIZE, r * TILE_SIZE);
  }

  // 10. MERCADOR GILDOR (lado leste da praça)
  const mX = 42 * TILE_SIZE;
  const mY = 27 * TILE_SIZE;
  npcs.push({
    id: 'merchant_ruins',
    name: 'Gildor, o Mercador Místico',
    title: 'Mercador da Vila Encantada',
    spriteType: 'merchant',
    x: mX,
    y: mY,
    vx: 0,
    vy: 0,
    direction: 'down',
    frame: 0,
    isMoving: false,
    stepTimer: 0,
    width: 64,
    height: 72,
    homeX: mX,
    homeY: mY,
    patrolRadius: 0,
    wanderTimer: 0,
    idleTimer: 0,
    wanderTarget: null,
    speed: 0,
    collider: { offsetX: 16, offsetY: 44, w: 32, h: 20 },
    dialogue: [
      'Que a luz da Vila Encantada guie seus passos, viajante.',
      'A praça da Fonte é o coração de Acordelot — daqui partem as duas grandes avenidas.',
      'Passe nas lojas: a ferraria ao norte, a padaria a leste, e a taverna mais ao sul.',
    ],
  });
  solidColliders.push({ x: mX + 16, y: mY + 44, w: 32, h: 20 });

  // 11. NPCs COM ROTA (tema musical de Acordelot)
  const T = TILE_SIZE;
  const addNpc = (o: {
    id: string;
    name: string;
    title: string;
    sprite: NPC['spriteType'];
    accent: string;
    speed: number;
    route: Array<[number, number]>;
    dialogue: string[];
  }) => {
    const route = o.route.map(([c, r]) => ({ x: c * T, y: r * T }));
    npcs.push({
      id: o.id,
      name: o.name,
      title: o.title,
      spriteType: o.sprite,
      accent: o.accent,
      x: route[0].x,
      y: route[0].y,
      vx: 0,
      vy: 0,
      direction: 'down',
      frame: 0,
      isMoving: false,
      stepTimer: Math.random() * 4,
      width: 28,
      height: 40,
      homeX: route[0].x,
      homeY: route[0].y,
      patrolRadius: 0,
      wanderTimer: 0,
      idleTimer: 0,
      wanderTarget: null,
      speed: o.speed,
      collider: { offsetX: 8, offsetY: 28, w: 12, h: 10 },
      dialogue: o.dialogue,
      route,
      routeIdx: 1 % route.length,
      routePause: Math.random() * 2,
    });
  };

  addNpc({
    id: 'npc_cadencia',
    name: 'Maestrina Cadença',
    title: 'Regente do Coral da Vila',
    sprite: 'cadencia',
    accent: '#6366f1',
    speed: 42,
    route: [
      [26, 25], [26, 28], [32, 28], [32, 25],
    ],
    dialogue: [
      'Silêncio... escute a Vila respirar em compasso quaternário.',
      'Cada fragmento que você recolhe é meia frase de uma melodia esquecida.',
      'Trinta fragmentos afinam uma nota inteira. Doze notas, e Acordelot volta a cantar.',
    ],
  });

  addNpc({
    id: 'npc_tonico',
    name: 'Seu Tônico',
    title: 'Lavrador e Guardião da Tônica',
    sprite: 'tonico',
    accent: '#22c55e',
    speed: 40,
    route: [
      [10, 44], [10, 50], [20, 50], [20, 44],
    ],
    dialogue: [
      'Toda escala começa e termina em casa, moço. Isso é a tônica.',
      'Plantei fá sustenido no canteiro do fundo. Ainda não brotou.',
      'Se achar um fragmento verde por aí, é meu — mas pode ficar. A terra dá mais.',
    ],
  });

  addNpc({
    id: 'npc_setimo',
    name: 'Sétimo, o Errante',
    title: 'Bardo das Sete Estradas',
    sprite: 'setimo',
    accent: '#a855f7',
    speed: 48,
    route: [
      [37, 11], [37, 23], [46, 26], [37, 44], [37, 23],
    ],
    dialogue: [
      'Ah! Um rosto novo — e que timing dramático você tem!',
      'Sou o intervalo que nunca resolve. Tensão pura, do primeiro ao último acorde.',
      'Junte as doze notas e eu componho a sua lenda. Cobro em aplausos.',
    ],
  });

  addNpc({
    id: 'npc_seminima',
    name: 'Semínima',
    title: 'Aprendiz de Compasso',
    sprite: 'seminima',
    accent: '#f59e0b',
    speed: 58,
    route: [
      [44, 25], [52, 25], [52, 28], [44, 28],
    ],
    dialogue: [
      'Você TAMBÉM tá catando os brilhozinhos coloridos?! Achei seis!',
      'O Mestre Diapasão diz que eu ando rápido demais. Semínima é rápida, oras!',
      'Se eu montar a nota Lá primeiro, eu ganho, combinado?',
    ],
  });

  addNpc({
    id: 'npc_diapasao',
    name: 'Mestre Diapasão',
    title: 'Afinador de Almas',
    sprite: 'diapasao',
    accent: '#06b6d4',
    speed: 28,
    route: [
      [39, 25], [39, 29], [43, 29], [43, 25],
    ],
    dialogue: [
      'Bata-me contra a pedra e eu te dou o Lá — 432 vibrações de verdade.',
      'Os fragmentos são joias comutativas: a ordem em que os soma não altera a nota.',
      'Abra a Síntese quando tiver trinta de uma cor. O resto é paciência e ouvido.',
    ],
  });

  return { ground, solidColliders, props, npcs };
}

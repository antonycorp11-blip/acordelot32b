/**
 * Map Data & Layout Definition - Ancient Ruins Town Master Plan (72x54)
 * Urban Layout with Stone Streets, Sidewalks, Defined Building Plots,
 * Central Sacred Fountain, Majestic Trees (Grand Oaks, Alpine Pines, Blossom Trees),
 * and Zero Brown Patches/Inconsistencies.
 */
import { Rect, WorldProp, NPC } from './types';

export const MAP_COLS = 72;
export const MAP_ROWS = 54;
export const TILE_SIZE = 32;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE; // 2304px
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE; // 1728px

/**
 * Tile IDs for Terrain2 tileset (36 columns x 14 rows)
 */
export const TERRAIN_TILES = {
  // Pure emerald green grass (no brown shade tiles)
  GRASS_BASE: 56,        // R1 C20 (100% solid lush emerald grass)
  GRASS_FLOWER1: 92,     // R2 C20 (subtle wildflower accent)
  GRASS_FLOWER2: 128,    // R3 C20 (field grass texture)

  // Stone tiles for paved streets, plazas and sidewalks
  STONE_CENTER: 344,     // R9 C20
  STONE_CENTER_VAR: 380, // R10 C20
  STONE_TOP: 308,        // R8 C20
  STONE_BOTTOM: 416,     // R11 C20
  STONE_LEFT: 343,       // R9 C19
  STONE_RIGHT: 345,      // R9 C21
  STONE_TL: 307,         // R8 C19
  STONE_TR: 309,         // R8 C21
  STONE_BL: 415,         // R11 C19
  STONE_BR: 417,         // R11 C21
};

export interface MapGrid {
  ground: number[][];
  solidColliders: Rect[];
  props: WorldProp[];
  npcs: NPC[];
}

export function buildMap(): MapGrid {
  const ground: number[][] = [];
  const solidColliders: Rect[] = [];
  const props: WorldProp[] = [];
  const npcs: NPC[] = [];

  // 1. Initialize Ground with 100% Pure Lush Emerald Grass (Zero Brown Spots)
  for (let r = 0; r < MAP_ROWS; r++) {
    const groundRow: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const n1 = Math.sin(c * 0.35 + r * 0.25);
      const n2 = Math.cos(c * 0.65 - r * 0.55);
      const noise = (n1 + n2) / 2;

      // Only vibrant green variations and soft wildflower dots
      if (noise > 0.5) {
        groundRow.push(TERRAIN_TILES.GRASS_FLOWER1);
      } else if (noise < -0.5) {
        groundRow.push(TERRAIN_TILES.GRASS_FLOWER2);
      } else {
        groundRow.push(TERRAIN_TILES.GRASS_BASE);
      }
    }
    ground.push(groundRow);
  }

  // 2. URBAN PLAN: STREETS, SQUARES & SIDEWALKS (Planta de Cidade)

  // A. PRAÇA CENTRAL DA FONTE (Cols 29 to 43, Rows 21 to 33)
  for (let r = 21; r <= 33; r++) {
    for (let c = 29; c <= 43; c++) {
      const dx = (c - 36) / 7.2;
      const dy = (r - 27) / 5.6;
      if (dx * dx + dy * dy <= 1.05) {
        ground[r][c] = (c + r) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
      }
    }
  }

  // B. AVENIDA NORTE (Cols 34 to 38, Rows 9 to 21) - 4 tiles de largura
  for (let r = 9; r <= 21; r++) {
    for (let c = 34; c <= 38; c++) {
      ground[r][c] = (r + c) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // C. AVENIDA SUL (Cols 34 to 38, Rows 33 to 48) - 4 tiles de largura
  for (let r = 33; r <= 48; r++) {
    for (let c = 34; c <= 38; c++) {
      ground[r][c] = (r + c) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // D. RUA OESTE (Rows 26 to 28, Cols 14 to 30) - 3 tiles de largura
  for (let r = 26; r <= 28; r++) {
    for (let c = 14; c <= 30; c++) {
      ground[r][c] = (r + c) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // E. RUA LESTE (Rows 26 to 28, Cols 42 to 58) - 3 tiles de largura
  for (let r = 26; r <= 28; r++) {
    for (let c = 42; c <= 58; c++) {
      ground[r][c] = (r + c) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // F. CALÇADAS E RUAS DE CONTORNO DAS QUADRAS / LOTES URBANOS
  // 1. Quadra Noroeste (Lote 1 & 2 - Espaço para Prefeitura / Grande Mansão)
  // Rua transversal norte da quadra (Rows 13-14, Cols 17 to 34)
  for (let r = 13; r <= 14; r++) {
    for (let c = 17; c <= 34; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }
  // Rua transversal oeste da quadra (Cols 16-17, Rows 14 to 26)
  for (let r = 14; r <= 26; r++) {
    for (let c = 16; c <= 17; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // 2. Quadra Nordeste (Lote 3 & 4 - Espaço para Academia / Biblioteca Mística)
  // Rua transversal norte da quadra (Rows 13-14, Cols 38 to 55)
  for (let r = 13; r <= 14; r++) {
    for (let c = 38; c <= 55; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }
  // Rua transversal leste da quadra (Cols 54-55, Rows 14 to 26)
  for (let r = 14; r <= 26; r++) {
    for (let c = 54; c <= 55; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // 3. Quadra Sudoeste (Lote 5 & 6 - Espaço para Casas Residenciais & Ferraria)
  // Rua transversal sul da quadra (Rows 39-40, Cols 17 to 34)
  for (let r = 39; r <= 40; r++) {
    for (let c = 17; c <= 34; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }
  // Rua transversal oeste da quadra (Cols 16-17, Rows 28 to 39)
  for (let r = 28; r <= 39; r++) {
    for (let c = 16; c <= 17; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // 4. Quadra Sudeste (Lote 7 & 8 - Espaço para Taverna & Mercado dos Viajantes)
  // Rua transversal sul da quadra (Rows 39-40, Cols 38 to 55)
  for (let r = 39; r <= 40; r++) {
    for (let c = 38; c <= 55; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }
  // Rua transversal leste da quadra (Cols 54-55, Rows 28 to 39)
  for (let r = 28; r <= 39; r++) {
    for (let c = 54; c <= 55; c++) {
      ground[r][c] = TERRAIN_TILES.STONE_CENTER_VAR;
    }
  }

  // G. DISTRITO DO TEMPLO / SANTUÁRIO DO NORTE (Cols 30 to 42, Rows 6 to 10)
  for (let r = 6; r <= 10; r++) {
    for (let c = 30; c <= 42; c++) {
      const dx = (c - 36) / 5.5;
      const dy = (r - 8) / 2.5;
      if (dx * dx + dy * dy <= 1.0) {
        ground[r][c] = (c + r) % 2 === 0 ? TERRAIN_TILES.STONE_CENTER : TERRAIN_TILES.STONE_CENTER_VAR;
      }
    }
  }

  // 3. World Bounds Colliders (Bordas Externas)
  solidColliders.push({ x: 0, y: 0, w: WORLD_WIDTH, h: 32 }); // Top
  solidColliders.push({ x: 0, y: WORLD_HEIGHT - 32, w: WORLD_WIDTH, h: 32 }); // Bottom
  solidColliders.push({ x: 0, y: 0, w: 32, h: WORLD_HEIGHT }); // Left
  solidColliders.push({ x: WORLD_WIDTH - 32, y: 0, w: 32, h: WORLD_HEIGHT }); // Right

  // 4. ESTRUTURAS CENTRAIS
  // A. A FONTE SAGRADA (O Coração da Cidade na Praça Central) - 160x128px
  const shrineX = 36 * TILE_SIZE - 80;
  const shrineY = 27 * TILE_SIZE - 64;
  props.push({
    id: 'shrine_fountain',
    type: 'shrine',
    x: shrineX,
    y: shrineY,
    w: 160,
    h: 128,
    sortY: shrineY + 116,
    collider: {
      x: shrineX + 28,
      y: shrineY + 56,
      w: 104,
      h: 56,
    },
    animated: {
      totalFrames: 8,
      frameWidth: 160,
      frameHeight: 128,
      frameDuration: 120,
    },
  });
  solidColliders.push({
    x: shrineX + 28,
    y: shrineY + 56,
    w: 104,
    h: 56,
  });

  // B. CÁLICE DE ESPÍRITOS (No Santuário do Norte) - 64x64px
  const chaliceX = 36 * TILE_SIZE - 32;
  const chaliceY = 8 * TILE_SIZE - 32;
  props.push({
    id: 'chalice_spirits',
    type: 'chalice',
    x: chaliceX,
    y: chaliceY,
    w: 64,
    h: 64,
    sortY: chaliceY + 56,
    animated: {
      totalFrames: 8,
      frameWidth: 64,
      frameHeight: 64,
      frameDuration: 110,
    },
  });

  // C. PILARES DECORATIVOS NAS RUAS (Atlas Props)
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

  // Pilares do Santuário Norte
  addPillar('pillar_n1', 32, 6);
  addPillar('pillar_n2', 40, 6);

  // Pilares de Entrada da Praça Central
  addPillar('pillar_sq_nw', 31, 22);
  addPillar('pillar_sq_ne', 41, 22);
  addPillar('pillar_sq_sw', 31, 32);
  addPillar('pillar_sq_se', 41, 32);

  // D. CONSTRUÇÕES EM MÚLTIPLAS PERSPECTIVAS (Sprites em Alta Definição)
  // 1. Prefeitura / Mansão dos Sábios (VISTA FRONTAL DIRETA - Sul, 122x128 px)
  const h1X = 20 * TILE_SIZE;
  const h1Y = 15 * TILE_SIZE;
  props.push({
    id: 'bldg_town_hall',
    type: 'bldgTownHall',
    x: h1X,
    y: h1Y,
    w: 122,
    h: 128,
    sortY: h1Y + 124,
    collider: { x: h1X + 12, y: h1Y + 96, w: 98, h: 28 },
  });
  solidColliders.push({ x: h1X + 12, y: h1Y + 96, w: 98, h: 28 });

  // 2. Estalagem & Taverna dos Aventureiros (PERSPECTIVA LESTE - Direita, 116x124 px)
  const h2X = 43 * TILE_SIZE;
  const h2Y = 15 * TILE_SIZE;
  props.push({
    id: 'bldg_lodge_east',
    type: 'bldgLodgeEast',
    x: h2X,
    y: h2Y,
    w: 116,
    h: 124,
    sortY: h2Y + 120,
    collider: { x: h2X + 12, y: h2Y + 92, w: 92, h: 28 },
  });
  solidColliders.push({ x: h2X + 12, y: h2Y + 92, w: 92, h: 28 });

  // 3. Casa do Botânico & Alquimista (PERSPECTIVA OESTE - Esquerda, 116x120 px)
  const h3X = 19 * TILE_SIZE;
  const h3Y = 30 * TILE_SIZE;
  props.push({
    id: 'bldg_herbalist_west',
    type: 'bldgHerbalistWest',
    x: h3X,
    y: h3Y,
    w: 116,
    h: 120,
    sortY: h3Y + 116,
    collider: { x: h3X + 12, y: h3Y + 88, w: 92, h: 28 },
  });
  solidColliders.push({ x: h3X + 12, y: h3Y + 88, w: 92, h: 28 });

  // 4. Padaria da Vila & Mercado (VISTA FRONTAL DIRETA - Sul, 110x116 px)
  const h4X = 43 * TILE_SIZE;
  const h4Y = 30 * TILE_SIZE;
  props.push({
    id: 'bldg_bakery_front',
    type: 'bldgBakeryFront',
    x: h4X,
    y: h4Y,
    w: 110,
    h: 116,
    sortY: h4Y + 112,
    collider: { x: h4X + 10, y: h4Y + 86, w: 90, h: 26 },
  });
  solidColliders.push({ x: h4X + 10, y: h4Y + 86, w: 90, h: 26 });

  // E. DISTRITO DA PEDREIRA ANCESTRAL & ROCHEDOS (Nordeste Alto)
  // 1. A Grande Pedreira de Mineração (140x140 px)
  const qX = 52 * TILE_SIZE;
  const qY = 4 * TILE_SIZE;
  props.push({
    id: 'bldg_quarry_main',
    type: 'stoneQuarry',
    x: qX,
    y: qY,
    w: 140,
    h: 140,
    sortY: qY + 136,
  });

  // 2. Grandes Rochedos de Calcário e Pedras
  props.push({
    id: 'rock_boulder_1',
    type: 'limestoneBoulders',
    x: 60 * TILE_SIZE,
    y: 9 * TILE_SIZE,
    w: 88,
    h: 86,
    sortY: 9 * TILE_SIZE + 82,
  });

  props.push({
    id: 'rock_boulder_2',
    type: 'limestoneBoulders',
    x: 47 * TILE_SIZE,
    y: 6 * TILE_SIZE,
    w: 88,
    h: 86,
    sortY: 6 * TILE_SIZE + 82,
  });

  props.push({
    id: 'rock_cluster_1',
    type: 'rockCluster',
    x: 49 * TILE_SIZE,
    y: 10 * TILE_SIZE,
    w: 32,
    h: 26,
    sortY: 10 * TILE_SIZE + 24,
  });

  props.push({
    id: 'rock_pair_1',
    type: 'rockPair',
    x: 58 * TILE_SIZE,
    y: 5 * TILE_SIZE,
    w: 28,
    h: 22,
    sortY: 5 * TILE_SIZE + 20,
  });

  props.push({
    id: 'rock_monolith_1',
    type: 'rockMonolith',
    x: 64 * TILE_SIZE,
    y: 6 * TILE_SIZE,
    w: 24,
    h: 40,
    sortY: 6 * TILE_SIZE + 38,
  });

  props.push({
    id: 'rock_flat_slab_1',
    type: 'rockFlatSlab',
    x: 54 * TILE_SIZE,
    y: 11 * TILE_SIZE,
    w: 36,
    h: 18,
    sortY: 11 * TILE_SIZE + 16,
  });

  // F. NOVAS CONSTRUÇÕES DA VILA NOS ÂNGULOS CORRETOS
  // 1. Poço Sagrado da Vila (Praça Central Noroeste)
  props.push({
    id: 'bldg_well_plaza',
    type: 'villageWell',
    x: 30 * TILE_SIZE,
    y: 20 * TILE_SIZE,
    w: 56,
    h: 75,
    sortY: 20 * TILE_SIZE + 72,
  });

  // 2. Ferraria da Vila com Forja e Bigorna (Ângulo Frontal)
  props.push({
    id: 'bldg_blacksmith_main',
    type: 'blacksmithFront',
    x: 12 * TILE_SIZE,
    y: 15 * TILE_SIZE,
    w: 120,
    h: 120,
    sortY: 15 * TILE_SIZE + 116,
  });

  // 3. Casa Residencial Enxaimel com Flores (Ângulo Frontal)
  props.push({
    id: 'bldg_residential_main',
    type: 'residentialFront',
    x: 27 * TILE_SIZE,
    y: 15 * TILE_SIZE,
    w: 118,
    h: 118,
    sortY: 15 * TILE_SIZE + 114,
  });

  // 4. Casas de Costas para nós (Rua Sul - Perfeitas para a parte de baixo)
  props.push({
    id: 'bldg_townhall_back_1',
    type: 'townHallBack',
    x: 24 * TILE_SIZE,
    y: 35 * TILE_SIZE,
    w: 122,
    h: 128,
    sortY: 35 * TILE_SIZE + 124,
  });

  props.push({
    id: 'bldg_bakery_back_1',
    type: 'bakeryBack',
    x: 42 * TILE_SIZE,
    y: 35 * TILE_SIZE,
    w: 110,
    h: 116,
    sortY: 35 * TILE_SIZE + 112,
  });

  // 5. Casas de Perfil Lateral (Ruas Leste e Oeste)
  props.push({
    id: 'bldg_townhall_side_1',
    type: 'townHallSide',
    x: 52 * TILE_SIZE,
    y: 17 * TILE_SIZE,
    w: 104,
    h: 128,
    sortY: 17 * TILE_SIZE + 124,
  });

  props.push({
    id: 'bldg_bakery_side_1',
    type: 'bakerySide',
    x: 8 * TILE_SIZE,
    y: 17 * TILE_SIZE,
    w: 96,
    h: 116,
    sortY: 17 * TILE_SIZE + 112,
  });

  // 6. Postes de Iluminação com Lanternas (Shader de Luz) e Bancos
  props.push({
    id: 'lantern_plaza_1',
    type: 'streetLantern',
    x: 32 * TILE_SIZE,
    y: 21 * TILE_SIZE,
    w: 46,
    h: 62,
    sortY: 21 * TILE_SIZE + 58,
  });

  props.push({
    id: 'lantern_plaza_2',
    type: 'streetLantern',
    x: 43 * TILE_SIZE,
    y: 21 * TILE_SIZE,
    w: 46,
    h: 62,
    sortY: 21 * TILE_SIZE + 58,
  });

  props.push({
    id: 'lantern_south_1',
    type: 'streetLantern',
    x: 36 * TILE_SIZE,
    y: 33 * TILE_SIZE,
    w: 46,
    h: 62,
    sortY: 33 * TILE_SIZE + 58,
  });

  props.push({
    id: 'lantern_east_1',
    type: 'streetLantern',
    x: 50 * TILE_SIZE,
    y: 23 * TILE_SIZE,
    w: 46,
    h: 62,
    sortY: 23 * TILE_SIZE + 58,
  });

  props.push({
    id: 'bench_plaza_1',
    type: 'woodenBench',
    x: 39 * TILE_SIZE,
    y: 22 * TILE_SIZE,
    w: 32,
    h: 24,
    sortY: 22 * TILE_SIZE + 22,
  });

  // 5. SISTEMA DE VEGETAÇÃO MAJESTOSA (Novos Modelos de Grande Porte)
  // Carvalho Real (64x80 px) - Colisão cirúrgica na base do tronco (14x8px)
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
    solidColliders.push({ x: x + 25, y: y + 66, w: 14, h: 8 });
  };

  // Pinheiro Alpino (40x80 px) - Colisão na base do tronco (12x8px)
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
    solidColliders.push({ x: x + 14, y: y + 66, w: 12, h: 8 });
  };

  // Cerejeira Encantada (60x76 px) - Colisão na base do tronco (14x8px)
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
    solidColliders.push({ x: x + 23, y: y + 64, w: 14, h: 8 });
  };

  // Arbusto com Frutas (28x24 px) - Sem colisão para permitir caminhada suave
  const addBush = (id: string, x: number, y: number) => {
    props.push({
      id,
      type: 'bush',
      x,
      y,
      w: 28,
      h: 24,
      sortY: y + 22,
    });
  };

  let treeId = 0;

  // A. BOSQUE NORDESTE E NORTE (Pinheiros Alpinos Majestosos)
  const alpinePines = [
    [48, 5], [54, 4], [60, 6], [65, 5],
    [46, 9], [51, 8], [57, 10], [63, 8], [67, 11],
    [48, 17], [53, 16], [59, 18], [64, 15],
  ];
  for (const [col, row] of alpinePines) {
    addPine(`pine_${treeId++}`, col * TILE_SIZE, row * TILE_SIZE);
    addBush(`bush_${treeId++}`, (col + 1) * TILE_SIZE + 4, (row + 1) * TILE_SIZE + 8);
  }

  // B. BOSQUE NOROESTE (Carvalhos Reais Ancestrais)
  const royalOaks = [
    [6, 5], [11, 4], [8, 10], [13, 8],
    [5, 16], [10, 15], [5, 21], [11, 20],
  ];
  for (const [col, row] of royalOaks) {
    addOak(`oak_${treeId++}`, col * TILE_SIZE, row * TILE_SIZE);
    addBush(`bush_${treeId++}`, (col + 1) * TILE_SIZE, (row + 1) * TILE_SIZE + 4);
  }

  // C. ALAMEDA E BOSQUE SUDOESTE (Cerejeiras Místicas Floridas)
  const blossomGrove = [
    [6, 33], [11, 32], [5, 38], [10, 39],
    [7, 44], [12, 43], [6, 48], [11, 47],
    [21, 43], [27, 44], [31, 43],
  ];
  for (const [col, row] of blossomGrove) {
    addBlossom(`blossom_${treeId++}`, col * TILE_SIZE, row * TILE_SIZE);
    addBush(`bush_${treeId++}`, (col + 1) * TILE_SIZE, (row + 1) * TILE_SIZE);
  }

  // D. BOSQUE SUDESTE (Floresta dos Pinheiros e Carvalhos)
  const seForest = [
    [58, 32], [63, 33], [57, 37], [64, 38],
    [58, 43], [63, 44], [57, 48], [64, 47],
    [41, 43], [46, 44],
  ];
  for (const [col, row] of seForest) {
    if (treeId % 2 === 0) {
      addPine(`pine_${treeId++}`, col * TILE_SIZE, row * TILE_SIZE);
    } else {
      addOak(`oak_${treeId++}`, col * TILE_SIZE, row * TILE_SIZE);
    }
    addBush(`bush_${treeId++}`, col * TILE_SIZE - 8, row * TILE_SIZE + 10);
  }

  // E. ARBORIZAÇÃO URBANA NAS CALÇADAS E ESQUINAS DA PRAÇA
  addOak('oak_corner_nw', 28 * TILE_SIZE, 19 * TILE_SIZE);
  addOak('oak_corner_ne', 43 * TILE_SIZE, 19 * TILE_SIZE);
  addBlossom('blossom_corner_sw', 28 * TILE_SIZE, 33 * TILE_SIZE);
  addBlossom('blossom_corner_se', 43 * TILE_SIZE, 33 * TILE_SIZE);

  // Arbustos ornamentais nas esquinas dos lotes
  const urbanBushes = [
    [33, 19], [39, 19], [33, 33], [39, 33],
    [28, 25], [28, 29], [44, 25], [44, 29],
    [24, 15], [48, 15], [24, 38], [48, 38],
  ];
  for (const [c, r] of urbanBushes) {
    addBush(`urban_bush_${treeId++}`, c * TILE_SIZE + 2, r * TILE_SIZE + 4);
  }

  // F. CINTURÃO NATURAL DE BORDA (Densa barreira de floresta em toda a volta)
  // Borda Norte (Linhas 1-2)
  for (let c = 2; c < MAP_COLS - 2; c += 4) {
    addPine(`border_n_${treeId++}`, c * TILE_SIZE, 1 * TILE_SIZE);
  }
  // Borda Sul (Linhas 50-51)
  for (let c = 2; c < MAP_COLS - 2; c += 4) {
    addOak(`border_s_${treeId++}`, c * TILE_SIZE, 50 * TILE_SIZE);
  }
  // Borda Oeste (Colunas 1-2)
  for (let r = 4; r < MAP_ROWS - 4; r += 4) {
    addOak(`border_w_${treeId++}`, 1 * TILE_SIZE, r * TILE_SIZE);
  }
  // Borda Leste (Colunas 68-69)
  for (let r = 4; r < MAP_ROWS - 4; r += 4) {
    addPine(`border_e_${treeId++}`, 68 * TILE_SIZE, r * TILE_SIZE);
  }

  // 6. O MERCADOR DAS RUÍNAS (Gildor)
  // Posicionado na borda leste da Praça Central, perto da Rua dos Mercadores
  npcs.push({
    id: 'merchant_ruins',
    name: 'Gildor, o Mercador Místico',
    title: 'Mercador da Vila Encantada',
    spriteType: 'merchant',
    x: 42 * TILE_SIZE,
    y: 25 * TILE_SIZE,
    vx: 0,
    vy: 0,
    direction: 'down',
    frame: 0,
    isMoving: false,
    stepTimer: 0,
    width: 64,
    height: 72,
    homeX: 42 * TILE_SIZE,
    homeY: 25 * TILE_SIZE,
    patrolRadius: 0,
    wanderTimer: 0,
    idleTimer: 0,
    wanderTarget: null,
    speed: 0,
    collider: {
      offsetX: 16,
      offsetY: 44,
      w: 32,
      h: 20,
    },
    dialogue: [
      'Que a luz da Vila Encantada guie seus passos, viajante.',
      'Veja como a praça central e as avenidas de pedra ganharam vida ao redor da Fonte Sagrada!',
      'As quadras demarcadas logo acolherão as primeiras construções dos nossos sábios e artesãos.',
    ],
  });
  solidColliders.push({
    x: 42 * TILE_SIZE + 16,
    y: 25 * TILE_SIZE + 44,
    w: 32,
    h: 20,
  });

  return {
    ground,
    solidColliders,
    props,
    npcs,
  };
}

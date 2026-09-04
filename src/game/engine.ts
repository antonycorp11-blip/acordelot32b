/**
 * 2D Top-Down Game Engine - Ancient Ruins Town Master Plan (72x54)
 * Architecture, Lighting & Character Animation Engine:
 * - Animated Hero with user-provided 32-bit Knight sprite:
 *   * Idle (Breathing bob)
 *   * Walk (4 Directions: Down, Up/Costas, Left/Side, Right/Side)
 *   * Coleta de Árvores (Woodcutting Axe swing with wood chips)
 *   * Coleta de Pedras (Mining Pickaxe strike with sparks)
 * - Town Hall & Bakery in all 4 perspectives: Frontal, Diagonal 3/4, Costas (Rear), and Lateral (Side)
 * - Lodge & Herbalist in East & West diagonal perspectives
 * - 32-bit Village Elements: Wagon Cart, Market Stall, Hay Bales, Barrel Stack, Rustic Benches
 * - Dynamic Day / Sunset / Night Lighting Shader with soft radial light cutouts
 * - Street Lanterns with exact lamp coordinates, warm flicker, and light cones
 * - 100% Automatic Foot-Level Collision Calculation
 * - Safe LocalStorage Persistence with automatic merging and visual save indicator
 */
import {
  Direction,
  CharacterState,
  NPC,
  CompanionState,
  WorldProp,
  Particle,
  Butterfly,
  Rect,
  HarvestState,
  Enemy,
  LightBeam,
  ToolTier,
} from './types';
import {
  buildMap,
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  DARK_START,
  FADE_ROWS,
} from './mapData';
import { loadGameAssets, LoadedAssets } from './assetLoader';
import { generateCharacterSprites, generateTrees, generateHouses } from './pixelArt';
import initialCustomMap from './customMapLayout.json';
import {
  WEAPON_DEFS,
  WeaponDef,
  comboTrajectory,
  amplifyTrajectory,
  DIR_ANGLE_DEG,
} from './weapons';
import { PASSIVE_DEFS } from './passives';
export { WEAPON_DEFS } from './weapons';
export { PASSIVE_DEFS, PASSIVE_ORDER } from './passives';
export type { WeaponDef, WeaponTier } from './weapons';
export type { PassiveDef, PassiveGroup } from './passives';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type AklesAction = 'chop' | 'mine' | 'attack' | 'spin' | 'cast';

// Geometria das sprite sheets do Akles (geradas por scripts/process-akles.mjs)
interface AklesAnimMeta {
  sheet: keyof LoadedAssets;
  cw: number;
  ch: number;
  cols: number;
  fps: number;
  loop: boolean;
  disp?: number; // escala de exibição própria (senão usa AKLES_DISP_SCALE)
  feetFrac?: number; // fração da altura da célula onde ficam os pés (default (ch-4)/ch)
}

// cw/ch = tamanho da célula na sheet (alta resolução; desenhado com dispScale).
// idle/walk/run: folhas grandes novas (10 col x 4 lin, 145x271) — arte detalhada,
// capa/cabelo ao vento. As folhas de combate seguem as antigas.
const HERO_DISP = 0.24;
const AKLES_ANIM: Record<'idle' | 'walk' | 'run' | AklesAction, AklesAnimMeta> = {
  idle: { sheet: 'aklesIdle', cw: 156, ch: 340, cols: 10, fps: 7, loop: true, disp: HERO_DISP, feetFrac: 1 },
  walk: { sheet: 'aklesWalk', cw: 156, ch: 340, cols: 10, fps: 12, loop: true, disp: HERO_DISP, feetFrac: 1 },
  run: { sheet: 'aklesRun', cw: 156, ch: 340, cols: 10, fps: 16, loop: true, disp: HERO_DISP, feetFrac: 1 },
  chop: { sheet: 'aklesSlash', cw: 192, ch: 192, cols: 6, fps: 13, loop: false, disp: 0.44 },
  mine: { sheet: 'aklesThrust', cw: 192, ch: 192, cols: 6, fps: 13, loop: false, disp: 0.44 },
  attack: { sheet: 'aklesSlash', cw: 192, ch: 192, cols: 6, fps: 15, loop: false, disp: 0.44 },
  spin: { sheet: 'aklesSpin', cw: 192, ch: 192, cols: 6, fps: 13, loop: false, disp: 0.44 },
  cast: { sheet: 'aklesCast', cw: 256, ch: 192, cols: 6, fps: 11, loop: false, disp: 0.44 },
};
const AKLES_DISP_SCALE = 0.35;

// Linhas canônicas das folhas: 0=down, 1=left, 2=up, 3=right
const AKLES_DIR_ROW: Record<Direction, number> = { down: 0, left: 1, up: 2, right: 3 };

// ---- RECURSOS COLETÁVEIS (árvores e pedras) ----
export interface ItemMeta {
  name: string;
  icon: string;
  weight: number; // peso por unidade
  heal?: number; // cura de vida
  xp?: number; // XP concedido ao usar (partituras)
  img?: string; // ícone em arquivo (opcional)
  desc?: string; // descrição (tooltip)
}

// Partituras: usadas para SUBIR DE NÍVEL. 3 tiers, cada um dá um tanto de XP.
// Sintetizadas na Síntese de Partituras a partir de claves (+ fragmentos nos tiers altos).
export type PartituraTier = 'bronze' | 'prata' | 'ouro';
export const PARTITURA_TIERS: PartituraTier[] = ['bronze', 'prata', 'ouro'];
export const PARTITURA_DEFS: Record<
  PartituraTier,
  { key: string; name: string; xp: number; claves: number; frags: number }
> = {
  bronze: { key: 'partitura_bronze', name: 'Partitura de Bronze', xp: 45, claves: 20, frags: 0 },
  prata: { key: 'partitura_prata', name: 'Partitura de Prata', xp: 140, claves: 55, frags: 15 },
  ouro: { key: 'partitura_ouro', name: 'Partitura de Ouro', xp: 420, claves: 140, frags: 40 },
};

// notas cromáticas (Dó..Si) — nomes, cores e chaves de arquivo
export const NOTE_NAMES = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
export const NOTE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#a3e635', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];
export const NOTE_KEY = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b'];
const FRAG_FILE = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
export const FRAGMENTS_PER_NOTE = 30;

export const ITEM_META: Record<string, ItemMeta> = {
  wood: { name: 'Madeira', icon: '🪵', weight: 1.0, desc: 'Madeira bruta cortada de árvores.' },
  stone: { name: 'Pedra', icon: '🪨', weight: 1.6, desc: 'Rocha bruta extraída de pedreiras.' },
  ore: { name: 'Minério', icon: '🪙', weight: 2.2, desc: 'Minério bruto com veios ressonantes.' },
  berry: { name: 'Frutinha', icon: '🍓', weight: 0.2, heal: 8, desc: 'Colhida de arbustos. Restaura um pouco de vida.' },
  clave: {
    name: 'Clave Musical',
    icon: '🎼',
    weight: 0,
    img: '/assets/items/clave.png',
    desc: 'Moeda de combate. Cai dos monstros dissonantes.',
  },
  eco_dust: {
    name: 'Poeira de Eco',
    icon: '✨',
    weight: 0.05,
    img: '/assets/items/props/eco_essence_raw.png',
    desc: 'Resíduo cintilante de um Eco dissipado. Usada para invocar novos Ecos.',
  },
  partitura_bronze: {
    name: 'Partitura de Bronze',
    icon: '🎵',
    weight: 0,
    xp: PARTITURA_DEFS.bronze.xp,
    img: '/assets/items/notes/note_c.png',
    desc: `Partitura simples. Usada na ficha para subir de nível (+${PARTITURA_DEFS.bronze.xp} XP).`,
  },
  partitura_prata: {
    name: 'Partitura de Prata',
    icon: '🎶',
    weight: 0,
    xp: PARTITURA_DEFS.prata.xp,
    img: '/assets/items/notes/note_g.png',
    desc: `Partitura elaborada. Subir de nível na ficha (+${PARTITURA_DEFS.prata.xp} XP).`,
  },
  partitura_ouro: {
    name: 'Partitura de Ouro',
    icon: '🏅',
    weight: 0,
    xp: PARTITURA_DEFS.ouro.xp,
    img: '/assets/items/notes/note_a.png',
    desc: `Obra-prima. Subir de nível na ficha (+${PARTITURA_DEFS.ouro.xp} XP).`,
  },
};
// pares bruto/refinado dos nós de extração
const REFINE_PAIRS: Array<[string, string, string, number, string, string]> = [
  ['wood2', 'Tora Melódica', 'Prancha Afinada', 0.8, 'Madeira nobre que ressoa ao toque.', 'Madeira polida e afinada, pronta para luteria.'],
  ['mineral', 'Minério Ressonante', 'Lingote Ressonante', 1.8, 'Rocha com veios que vibram numa nota.', 'Lingote fundido com timbre puro.'],
  ['gold', 'Ouro Bruto', 'Barra de Ouro', 2.5, 'Pepitas e moedas antigas.', 'Barra refinada — reserva de valor da Vila.'],
  ['crystal_blue', 'Cristal de Eco Bruto', 'Cristal de Eco Lapidado', 0.6, 'Fragmento cristalino carregado de eco.', 'Cristal lapidado que amplifica melodias.'],
  ['crystal_red', 'Cristal Dissonante Bruto', 'Relíquia Dissonante', 0.7, 'Cristal instável de energia dissonante.', 'Relíquia contida — poder canalizado.'],
  ['eco_essence', 'Poeira de Eco', 'Essência de Eco', 0.1, 'Pó luminoso de um Eco.', 'Essência destilada, guardada em frasco.'],
];
for (const [key, rn, refn, w, rd, refd] of REFINE_PAIRS) {
  if (!ITEM_META[key + '_raw'])
    ITEM_META[key + '_raw'] = {
      name: rn,
      icon: '◈',
      weight: w,
      img: `/assets/items/props/${key}_raw.png`,
      desc: rd,
    };
  ITEM_META[key + '_refined'] = {
    name: refn,
    icon: '◆',
    weight: w * 0.9,
    img: `/assets/items/props/${key}_refined.png`,
    desc: refd,
  };
}
NOTE_KEY.forEach((k, i) => {
  ITEM_META['frag_' + k] = {
    name: 'Fragmento de ' + NOTE_NAMES[i],
    icon: '◆',
    weight: 0.08,
    img: `/assets/items/fragments/${FRAG_FILE[i]}.png`,
    desc: `Joia comutativa da nota ${NOTE_NAMES[i]}. ${FRAGMENTS_PER_NOTE} montam uma nota inteira na Síntese.`,
  };
});

// Peso máximo que o Akles carrega
export const MAX_CARRY_WEIGHT = 40;

export interface PlayerStats {
  name: string;
  className: string;
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  maxHp: number;
  attrPoints: number;
  forca: number;
  agilidade: number;
  vitalidade: number;
  inteligencia: number;
  sorte: number;
}

export type AttrKey = 'forca' | 'agilidade' | 'vitalidade' | 'inteligencia' | 'sorte';

export function inventoryWeight(inv: Record<string, number>): number {
  let w = 0;
  for (const [item, qty] of Object.entries(inv)) w += (ITEM_META[item]?.weight ?? 1) * qty;
  return Math.round(w * 10) / 10;
}

interface HarvestDef {
  kind: 'tree' | 'rock';
  maxHp: number;
  drop: string;
  dropMin: number;
  dropMax: number;
  respawnSecs: number;
}
export interface FragmentPickup {
  id: string;
  x: number;
  y: number;
  note: number;
  bob: number;
  respawnAt: number;
}

const NPC_ANIM = { cw: 96, ch: 148, cols: 10, fps: 9 };
const NPC_SHEET: Record<string, keyof LoadedAssets> = {
  cadencia: 'npcCadencia',
  tonico: 'npcTonico',
  setimo: 'npcSetimo',
  seminima: 'npcSeminima',
  diapasao: 'npcDiapasao',
};

export const HARVEST_DEFS: Record<string, HarvestDef> = {
  oak: { kind: 'tree', maxHp: 4, drop: 'wood', dropMin: 2, dropMax: 4, respawnSecs: 22 },
  pine: { kind: 'tree', maxHp: 3, drop: 'wood', dropMin: 2, dropMax: 3, respawnSecs: 20 },
  blossomTree: { kind: 'tree', maxHp: 3, drop: 'wood', dropMin: 2, dropMax: 3, respawnSecs: 24 },
  bush: { kind: 'tree', maxHp: 2, drop: 'berry', dropMin: 1, dropMax: 3, respawnSecs: 14 },
  stoneQuarry: { kind: 'rock', maxHp: 8, drop: 'ore', dropMin: 4, dropMax: 7, respawnSecs: 45 },
  limestoneBoulders: { kind: 'rock', maxHp: 5, drop: 'stone', dropMin: 3, dropMax: 5, respawnSecs: 32 },
  rockCluster: { kind: 'rock', maxHp: 3, drop: 'stone', dropMin: 2, dropMax: 3, respawnSecs: 24 },
  rockPair: { kind: 'rock', maxHp: 3, drop: 'stone', dropMin: 2, dropMax: 3, respawnSecs: 24 },
  rockMonolith: { kind: 'rock', maxHp: 4, drop: 'stone', dropMin: 2, dropMax: 4, respawnSecs: 28 },
  rockFlatSlab: { kind: 'rock', maxHp: 2, drop: 'stone', dropMin: 1, dropMax: 2, respawnSecs: 18 },
  spot_wood: { kind: 'tree', maxHp: 4, drop: 'wood2_raw', dropMin: 2, dropMax: 4, respawnSecs: 40 },
  spot_mineral: { kind: 'rock', maxHp: 6, drop: 'mineral_raw', dropMin: 2, dropMax: 4, respawnSecs: 45 },
  spot_gold: { kind: 'rock', maxHp: 7, drop: 'gold_raw', dropMin: 1, dropMax: 3, respawnSecs: 55 },
  spot_crystal_blue: { kind: 'rock', maxHp: 6, drop: 'crystal_blue_raw', dropMin: 1, dropMax: 3, respawnSecs: 50 },
  spot_crystal_red: { kind: 'rock', maxHp: 8, drop: 'crystal_red_raw', dropMin: 1, dropMax: 2, respawnSecs: 60 },
  spot_eco_essence: { kind: 'rock', maxHp: 5, drop: 'eco_dust', dropMin: 2, dropMax: 4, respawnSecs: 40 },
  dark_icecrystal: { kind: 'rock', maxHp: 5, drop: 'crystal_blue_raw', dropMin: 1, dropMax: 3, respawnSecs: 45 },
  dark_bigrock: { kind: 'rock', maxHp: 6, drop: 'stone', dropMin: 3, dropMax: 5, respawnSecs: 35 },
  dark_deadtree: { kind: 'tree', maxHp: 3, drop: 'wood', dropMin: 1, dropMax: 3, respawnSecs: 25 },
};

// ---- MONSTROS DISSONANTES + ECOS MUSICAIS ----
interface EnemyDef {
  sheet: keyof LoadedAssets;
  name: string;
  hostile: boolean;
  note?: number; // ecos: nota que dropam
  cols: number;
  cw: number;
  ch: number;
  disp: number;
  hp: number;
  speed: number;
  aggro: number;
  attackRange: number;
  touchDamage: number;
  attackCd: number;
  xp: number;
  claveMin: number;
  claveMax: number;
  fragMin: number;
  fragMax: number;
  respawnSecs: number;
}
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  aranha: {
    sheet: 'monAranha', name: 'Aranha da Pauta', hostile: true, cols: 5, cw: 128, ch: 108, disp: 0.5,
    hp: 30, speed: 62, aggro: 200, attackRange: 34, touchDamage: 12, attackCd: 1.3,
    xp: 22, claveMin: 1, claveMax: 2, fragMin: 2, fragMax: 4, respawnSecs: 45,
  },
  nocturno: {
    sheet: 'monNocturno', name: 'Nocturno Alado', hostile: true, cols: 5, cw: 120, ch: 128, disp: 0.52,
    hp: 46, speed: 78, aggro: 240, attackRange: 30, touchDamage: 16, attackCd: 1.0,
    xp: 38, claveMin: 2, claveMax: 3, fragMin: 3, fragMax: 5, respawnSecs: 60,
  },
  maestro: {
    sheet: 'monMaestro', name: 'Maestro Esqueleto', hostile: true, cols: 5, cw: 118, ch: 132, disp: 0.56,
    hp: 70, speed: 54, aggro: 260, attackRange: 40, touchDamage: 22, attackCd: 1.4,
    xp: 60, claveMin: 3, claveMax: 5, fragMin: 4, fragMax: 7, respawnSecs: 80,
  },
  colosso: {
    sheet: 'monColosso', name: 'Colosso Dissonante', hostile: true, cols: 5, cw: 150, ch: 150, disp: 0.62,
    hp: 140, speed: 40, aggro: 240, attackRange: 46, touchDamage: 30, attackCd: 1.8,
    xp: 120, claveMin: 5, claveMax: 9, fragMin: 5, fragMax: 9, respawnSecs: 110,
  },
  dama: {
    sheet: 'monDama', name: 'Dama do Silêncio', hostile: true, cols: 5, cw: 120, ch: 140, disp: 0.56,
    hp: 55, speed: 68, aggro: 300, attackRange: 36, touchDamage: 18, attackCd: 1.1,
    xp: 55, claveMin: 3, claveMax: 5, fragMin: 3, fragMax: 6, respawnSecs: 70,
  },
};

// Ecos: 12 notas cromáticas. Não são hostis — vagueiam no nordeste do mapa
// e ao serem "dissipados" soltam fragmentos da sua nota + poeira de eco.
const ECO_SHEETS: (keyof LoadedAssets)[] = [
  'ecoDo', 'ecoDoS', 'ecoRe', 'ecoReS', 'ecoMi', 'ecoFa',
  'ecoFaS', 'ecoSol', 'ecoSolS', 'ecoLa', 'ecoLaS', 'ecoSi',
];
for (let i = 0; i < 12; i++) {
  ENEMY_DEFS['eco_' + NOTE_KEY[i]] = {
    sheet: ECO_SHEETS[i],
    name: 'Eco de ' + NOTE_NAMES[i],
    hostile: false,
    note: i,
    cols: 5,
    cw: 96,
    ch: 108,
    disp: 0.44,
    hp: 6,
    speed: 34,
    aggro: 0,
    attackRange: 0,
    touchDamage: 0,
    attackCd: 0,
    xp: 5,
    claveMin: 0,
    claveMax: 0,
    fragMin: 2,
    fragMax: 4,
    respawnSecs: 35,
  };
}

// linhas da folha 5x4: 0=idle, 1=walk, 2=hurt/attack, 3=death
const ENEMY_ROW = { idle: 0, walk: 1, hurt: 2, attack: 2, death: 3, chase: 1 };

export interface InteractionNpc {
  id: string;
  name: string;
  title?: string;
  accent: string;
  dialogue: string[];
  isMerchant: boolean;
}
export interface InteractionState {
  nearNpc?: InteractionNpc;
  isTalking: boolean;
  npc?: InteractionNpc;
  // compat
  nearMerchant?: boolean;
  merchantName?: string;
  merchantTitle?: string;
  dialogue?: string[];
}

export interface Firefly {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  color: string;
  phase: number;
  speed: number;
  radius: number;
}

export interface SelectedPropInfo {
  id: string;
  type: string;
  category: 'building' | 'tree' | 'bush' | 'quarry' | 'rock' | 'street';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  canDelete: boolean;
  canDuplicate: boolean;
}

export const EDITABLE_PROP_METAS: Record<
  string,
  {
    category: 'building' | 'tree' | 'bush' | 'quarry' | 'rock' | 'street';
    name: string;
    baseW: number;
    baseH: number;
    colOffXRatio?: number;
    colOffYRatio?: number;
    colWRatio?: number;
    colHRatio?: number;
    sortYOffset: number;
    canDelete: boolean;
    canDuplicate: boolean;
  }
> = {
  // 1. CONSTRUÇÕES FRONTAIS
  bldgTownHall: {
    category: 'building',
    name: 'Mansão dos Sábios (Frente)',
    baseW: 122,
    baseH: 128,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 124,
    canDelete: true,
    canDuplicate: true,
  },
  bldgBakeryFront: {
    category: 'building',
    name: 'Padaria & Mercado (Frente)',
    baseW: 110,
    baseH: 116,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 112,
    canDelete: true,
    canDuplicate: true,
  },
  blacksmithFront: {
    category: 'building',
    name: 'Ferraria & Forja da Vila (Frente)',
    baseW: 120,
    baseH: 120,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 116,
    canDelete: true,
    canDuplicate: true,
  },
  residentialFront: {
    category: 'building',
    name: 'Casa com Flores (Frente)',
    baseW: 118,
    baseH: 118,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 114,
    canDelete: true,
    canDuplicate: true,
  },
  apothecaryFront: {
    category: 'building',
    name: 'Alquimia & Biblioteca (Frente)',
    baseW: 120,
    baseH: 118,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 114,
    canDelete: true,
    canDuplicate: true,
  },

  // 2. CONSTRUÇÕES DIAGONAIS (3/4 Isométrica)
  townHallDiag: {
    category: 'building',
    name: 'Mansão dos Sábios (Diagonal)',
    baseW: 124,
    baseH: 132,
    colOffXRatio: 0.12,
    colOffYRatio: 0.72,
    colWRatio: 0.76,
    colHRatio: 0.24,
    sortYOffset: 128,
    canDelete: true,
    canDuplicate: true,
  },
  bakeryDiag: {
    category: 'building',
    name: 'Padaria & Mercado (Diagonal)',
    baseW: 118,
    baseH: 122,
    colOffXRatio: 0.12,
    colOffYRatio: 0.72,
    colWRatio: 0.76,
    colHRatio: 0.24,
    sortYOffset: 118,
    canDelete: true,
    canDuplicate: true,
  },
  bldgLodgeEast: {
    category: 'building',
    name: 'Taverna do Viajante (Diagonal Leste)',
    baseW: 116,
    baseH: 124,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 120,
    canDelete: true,
    canDuplicate: true,
  },
  lodgeWest: {
    category: 'building',
    name: 'Taverna do Viajante (Diagonal Oeste)',
    baseW: 116,
    baseH: 124,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 120,
    canDelete: true,
    canDuplicate: true,
  },
  bldgHerbalistWest: {
    category: 'building',
    name: 'Cabana do Botânico (Diagonal Oeste)',
    baseW: 116,
    baseH: 120,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 116,
    canDelete: true,
    canDuplicate: true,
  },
  herbalistEast: {
    category: 'building',
    name: 'Cabana do Botânico (Diagonal Leste)',
    baseW: 116,
    baseH: 120,
    colOffXRatio: 0.1,
    colOffYRatio: 0.72,
    colWRatio: 0.8,
    colHRatio: 0.22,
    sortYOffset: 116,
    canDelete: true,
    canDuplicate: true,
  },

  // 3. AS 6 CONSTRUÇÕES DE COSTAS AUTÊNTICAS (Ruas ao Sul)
  townHallBack: {
    category: 'building',
    name: 'Mansão com Mansardas (Costas)',
    baseW: 132,
    baseH: 112,
    colOffXRatio: 0.08,
    colOffYRatio: 0.68,
    colWRatio: 0.84,
    colHRatio: 0.28,
    sortYOffset: 108,
    canDelete: true,
    canDuplicate: true,
  },
  bakeryBack: {
    category: 'building',
    name: 'Padaria & Mercado com Toldo (Costas)',
    baseW: 114,
    baseH: 116,
    colOffXRatio: 0.08,
    colOffYRatio: 0.68,
    colWRatio: 0.84,
    colHRatio: 0.28,
    sortYOffset: 112,
    canDelete: true,
    canDuplicate: true,
  },
  houseBackCottage: {
    category: 'building',
    name: 'Chalé Terracota com Frontão (Costas)',
    baseW: 130,
    baseH: 92,
    colOffXRatio: 0.08,
    colOffYRatio: 0.65,
    colWRatio: 0.84,
    colHRatio: 0.3,
    sortYOffset: 88,
    canDelete: true,
    canDuplicate: true,
  },
  houseBackBlueWoodshed: {
    category: 'building',
    name: 'Casa Azul com Depósito de Lenha (Costas)',
    baseW: 108,
    baseH: 124,
    colOffXRatio: 0.08,
    colOffYRatio: 0.7,
    colWRatio: 0.84,
    colHRatio: 0.26,
    sortYOffset: 120,
    canDelete: true,
    canDuplicate: true,
  },
  houseBackTavernMossy: {
    category: 'building',
    name: 'Grande Taverna com Musgo (Costas)',
    baseW: 132,
    baseH: 126,
    colOffXRatio: 0.08,
    colOffYRatio: 0.7,
    colWRatio: 0.84,
    colHRatio: 0.26,
    sortYOffset: 122,
    canDelete: true,
    canDuplicate: true,
  },
  houseBackBlueCellar: {
    category: 'building',
    name: 'Casa Azul com Alçapão & Barril (Costas)',
    baseW: 110,
    baseH: 128,
    colOffXRatio: 0.08,
    colOffYRatio: 0.7,
    colWRatio: 0.84,
    colHRatio: 0.26,
    sortYOffset: 124,
    canDelete: true,
    canDuplicate: true,
  },

  // 4. CONSTRUÇÕES EM PERFIL LATERAL (Ruas Leste e Oeste)
  townHallSide: {
    category: 'building',
    name: 'Mansão dos Sábios (Lateral)',
    baseW: 104,
    baseH: 128,
    colOffXRatio: 0.15,
    colOffYRatio: 0.75,
    colWRatio: 0.7,
    colHRatio: 0.22,
    sortYOffset: 124,
    canDelete: true,
    canDuplicate: true,
  },
  bakerySide: {
    category: 'building',
    name: 'Padaria & Mercado (Lateral)',
    baseW: 96,
    baseH: 116,
    colOffXRatio: 0.15,
    colOffYRatio: 0.75,
    colWRatio: 0.7,
    colHRatio: 0.22,
    sortYOffset: 112,
    canDelete: true,
    canDuplicate: true,
  },

  // 5. ELEMENTOS DA VILA (32-bit Village Elements)
  wagonCart: {
    category: 'street',
    name: 'Carroça de Madeira com Feno',
    baseW: 64,
    baseH: 48,
    colOffXRatio: 0.1,
    colOffYRatio: 0.45,
    colWRatio: 0.8,
    colHRatio: 0.45,
    sortYOffset: 44,
    canDelete: true,
    canDuplicate: true,
  },
  marketStall: {
    category: 'street',
    name: 'Barraca de Mercado com Toldo',
    baseW: 64,
    baseH: 64,
    colOffXRatio: 0.1,
    colOffYRatio: 0.6,
    colWRatio: 0.8,
    colHRatio: 0.35,
    sortYOffset: 60,
    canDelete: true,
    canDuplicate: true,
  },
  hayBaleStack: {
    category: 'street',
    name: 'Pilha de Fardos de Feno',
    baseW: 48,
    baseH: 36,
    colOffXRatio: 0.08,
    colOffYRatio: 0.4,
    colWRatio: 0.84,
    colHRatio: 0.55,
    sortYOffset: 32,
    canDelete: true,
    canDuplicate: true,
  },
  barrelStack: {
    category: 'street',
    name: 'Pilha de Barris de Carvalho',
    baseW: 40,
    baseH: 36,
    colOffXRatio: 0.1,
    colOffYRatio: 0.4,
    colWRatio: 0.8,
    colHRatio: 0.55,
    sortYOffset: 32,
    canDelete: true,
    canDuplicate: true,
  },
  woodenBenchRustic: {
    category: 'street',
    name: 'Banco Rústico da Praça',
    baseW: 36,
    baseH: 24,
    colOffXRatio: 0.1,
    colOffYRatio: 0.5,
    colWRatio: 0.8,
    colHRatio: 0.45,
    sortYOffset: 22,
    canDelete: true,
    canDuplicate: true,
  },
  villageWell: {
    category: 'street',
    name: 'Poço Sagrado de Água da Vila',
    baseW: 56,
    baseH: 75,
    colOffXRatio: 0.15,
    colOffYRatio: 0.55,
    colWRatio: 0.7,
    colHRatio: 0.4,
    sortYOffset: 72,
    canDelete: true,
    canDuplicate: true,
  },
  streetLantern: {
    category: 'street',
    name: 'Poste de Rua com Lanterna Dourada',
    baseW: 46,
    baseH: 62,
    colOffXRatio: 0.35,
    colOffYRatio: 0.85,
    colWRatio: 0.3,
    colHRatio: 0.14,
    sortYOffset: 58,
    canDelete: true,
    canDuplicate: true,
  },

  // 6. PEDREIRA E ROCHAS
  stoneQuarry: {
    category: 'quarry',
    name: 'A Grande Pedreira Ancestral',
    baseW: 140,
    baseH: 140,
    colOffXRatio: 0.08,
    colOffYRatio: 0.45,
    colWRatio: 0.84,
    colHRatio: 0.5,
    sortYOffset: 136,
    canDelete: true,
    canDuplicate: true,
  },
  limestoneBoulders: {
    category: 'rock',
    name: 'Rochedos de Calcário com Musgo',
    baseW: 88,
    baseH: 86,
    colOffXRatio: 0.12,
    colOffYRatio: 0.38,
    colWRatio: 0.76,
    colHRatio: 0.52,
    sortYOffset: 82,
    canDelete: true,
    canDuplicate: true,
  },
  rockCluster: {
    category: 'rock',
    name: 'Grupo de Pedras',
    baseW: 32,
    baseH: 26,
    colOffXRatio: 0.1,
    colOffYRatio: 0.4,
    colWRatio: 0.8,
    colHRatio: 0.5,
    sortYOffset: 24,
    canDelete: true,
    canDuplicate: true,
  },
  rockPair: {
    category: 'rock',
    name: 'Par de Rochas',
    baseW: 28,
    baseH: 22,
    colOffXRatio: 0.1,
    colOffYRatio: 0.4,
    colWRatio: 0.8,
    colHRatio: 0.5,
    sortYOffset: 20,
    canDelete: true,
    canDuplicate: true,
  },
  rockMonolith: {
    category: 'rock',
    name: 'Menir / Obelisco de Pedra Alto',
    baseW: 24,
    baseH: 40,
    colOffXRatio: 0.2,
    colOffYRatio: 0.65,
    colWRatio: 0.6,
    colHRatio: 0.3,
    sortYOffset: 38,
    canDelete: true,
    canDuplicate: true,
  },
  rockFlatSlab: {
    category: 'rock',
    name: 'Laje de Pedra Rasteira',
    baseW: 36,
    baseH: 18,
    sortYOffset: 16,
    canDelete: true,
    canDuplicate: true,
  },

  // 7. VEGETAÇÃO
  oak: {
    category: 'tree',
    name: 'Carvalho Real Ancestral',
    baseW: 64,
    baseH: 80,
    colOffXRatio: 0.38,
    colOffYRatio: 0.82,
    colWRatio: 0.24,
    colHRatio: 0.12,
    sortYOffset: 74,
    canDelete: true,
    canDuplicate: true,
  },
  pine: {
    category: 'tree',
    name: 'Pinheiro Alpino',
    baseW: 40,
    baseH: 80,
    colOffXRatio: 0.35,
    colOffYRatio: 0.82,
    colWRatio: 0.3,
    colHRatio: 0.12,
    sortYOffset: 74,
    canDelete: true,
    canDuplicate: true,
  },
  blossomTree: {
    category: 'tree',
    name: 'Cerejeira Encantada',
    baseW: 60,
    baseH: 76,
    colOffXRatio: 0.38,
    colOffYRatio: 0.82,
    colWRatio: 0.24,
    colHRatio: 0.12,
    sortYOffset: 72,
    canDelete: true,
    canDuplicate: true,
  },
  bush: {
    category: 'bush',
    name: 'Arbusto com Frutas',
    baseW: 28,
    baseH: 24,
    sortYOffset: 22,
    canDelete: true,
    canDuplicate: true,
  },

  // 8. NÓS DE EXTRAÇÃO (spots — coletáveis, movíveis no editor)
  spot_wood: { category: 'rock', name: 'Toco Melódico (Madeira)', baseW: 60, baseH: 52, colOffXRatio: 0.18, colOffYRatio: 0.5, colWRatio: 0.64, colHRatio: 0.4, sortYOffset: 48, canDelete: true, canDuplicate: true },
  spot_mineral: { category: 'rock', name: 'Veio Ressonante (Minério)', baseW: 62, baseH: 52, colOffXRatio: 0.18, colOffYRatio: 0.5, colWRatio: 0.64, colHRatio: 0.4, sortYOffset: 48, canDelete: true, canDuplicate: true },
  spot_gold: { category: 'rock', name: 'Filão Dourado', baseW: 60, baseH: 44, colOffXRatio: 0.18, colOffYRatio: 0.4, colWRatio: 0.64, colHRatio: 0.5, sortYOffset: 40, canDelete: true, canDuplicate: true },
  spot_crystal_blue: { category: 'rock', name: 'Cristal de Eco Azul', baseW: 56, baseH: 60, colOffXRatio: 0.22, colOffYRatio: 0.62, colWRatio: 0.56, colHRatio: 0.32, sortYOffset: 56, canDelete: true, canDuplicate: true },
  spot_crystal_red: { category: 'rock', name: 'Cristal Dissonante', baseW: 56, baseH: 60, colOffXRatio: 0.22, colOffYRatio: 0.62, colWRatio: 0.56, colHRatio: 0.32, sortYOffset: 56, canDelete: true, canDuplicate: true },
  spot_eco_essence: { category: 'rock', name: 'Nascente de Eco', baseW: 62, baseH: 46, colOffXRatio: 0.15, colOffYRatio: 0.45, colWRatio: 0.7, colHRatio: 0.45, sortYOffset: 42, canDelete: true, canDuplicate: true },

  // 9. FLORESTA SOMBRIA
  dark_deadtree: { category: 'tree', name: 'Árvore Morta', baseW: 34, baseH: 74, colOffXRatio: 0.36, colOffYRatio: 0.86, colWRatio: 0.28, colHRatio: 0.1, sortYOffset: 70, canDelete: true, canDuplicate: true },
  dark_bigpine: { category: 'tree', name: 'Pinheiro Sombrio', baseW: 52, baseH: 74, colOffXRatio: 0.4, colOffYRatio: 0.85, colWRatio: 0.2, colHRatio: 0.12, sortYOffset: 70, canDelete: true, canDuplicate: true },
  dark_thorn: { category: 'bush', name: 'Espinheiro', baseW: 30, baseH: 24, sortYOffset: 22, canDelete: true, canDuplicate: true },
  dark_bigrock: { category: 'rock', name: 'Rochedo Sombrio', baseW: 60, baseH: 46, colOffXRatio: 0.12, colOffYRatio: 0.4, colWRatio: 0.76, colHRatio: 0.5, sortYOffset: 42, canDelete: true, canDuplicate: true },
  dark_icecrystal: { category: 'rock', name: 'Cristal Gélido', baseW: 52, baseH: 58, colOffXRatio: 0.2, colOffYRatio: 0.6, colWRatio: 0.6, colHRatio: 0.34, sortYOffset: 54, canDelete: true, canDuplicate: true },

  // 10. MURALHAS MUSICAIS (para construir os muros da cidade)
  wallMusical1: { category: 'building', name: 'Muralha com Torreão', baseW: 117, baseH: 108, colOffXRatio: 0.04, colOffYRatio: 0.42, colWRatio: 0.92, colHRatio: 0.5, sortYOffset: 104, canDelete: true, canDuplicate: true },
  wallMusical2: { category: 'building', name: 'Muralha Longa', baseW: 117, baseH: 86, colOffXRatio: 0.02, colOffYRatio: 0.4, colWRatio: 0.96, colHRatio: 0.55, sortYOffset: 82, canDelete: true, canDuplicate: true },
  wallMusical3: { category: 'building', name: 'Muralha Baixa', baseW: 117, baseH: 50, colOffXRatio: 0.02, colOffYRatio: 0.3, colWRatio: 0.96, colHRatio: 0.65, sortYOffset: 46, canDelete: true, canDuplicate: true },
  wallMusical4: { category: 'building', name: 'Torre de Vigia', baseW: 39, baseH: 156, colOffXRatio: 0.1, colOffYRatio: 0.82, colWRatio: 0.8, colHRatio: 0.16, sortYOffset: 150, canDelete: true, canDuplicate: true },
  wallMusical5: { category: 'building', name: 'Muralha com Pilar', baseW: 117, baseH: 101, colOffXRatio: 0.04, colOffYRatio: 0.4, colWRatio: 0.92, colHRatio: 0.5, sortYOffset: 97, canDelete: true, canDuplicate: true },
  wallMusical6: { category: 'building', name: 'Muralha com Esquina', baseW: 117, baseH: 107, colOffXRatio: 0.04, colOffYRatio: 0.42, colWRatio: 0.92, colHRatio: 0.5, sortYOffset: 103, canDelete: true, canDuplicate: true },
  wallMusical7: { category: 'building', name: 'Portal com Estandarte', baseW: 104, baseH: 117, colOffXRatio: 0.06, colOffYRatio: 0.75, colWRatio: 0.88, colHRatio: 0.2, sortYOffset: 112, canDelete: true, canDuplicate: true },
  wallMusical8: { category: 'building', name: 'Muralha Curta', baseW: 117, baseH: 56, colOffXRatio: 0.02, colOffYRatio: 0.35, colWRatio: 0.96, colHRatio: 0.58, sortYOffset: 52, canDelete: true, canDuplicate: true },
  // sem colisor: é um portão — o vão central deve ficar andável (as muralhas
  // vizinhas é que bloqueiam)
  wallGate: { category: 'building', name: 'Portão da Cidade', baseW: 152, baseH: 168, sortYOffset: 162, canDelete: true, canDuplicate: true },
};

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  lightCanvas: HTMLCanvasElement;
  lightCtx: CanvasRenderingContext2D;

  // Ciclo de dia/noite automático. dayClock: 0=meia-noite, 0.25=amanhecer,
  // 0.5=meio-dia, 0.75=anoitecer. Uma volta completa = DAY_LENGTH segundos.
  dayClock = 0.33;
  autoDayCycle = true;
  static readonly DAY_LENGTH = 600; // 10 min de jogo por dia completo
  onDayClockChange?: (clock: number) => void;

  get timeOfDay(): TimeOfDay {
    const n = this.nightAmount;
    if (n > 0.62) return 'night';
    if (n > 0.18) return 'sunset';
    return 'day';
  }
  // altura do "sol": -1 meia-noite, +1 meio-dia
  get sunAltitude() {
    return -Math.cos(this.dayClock * Math.PI * 2);
  }
  // 0 = dia pleno, 1 = noite fechada (transição suave no crepúsculo)
  get nightAmount() {
    const a = this.sunAltitude;
    const t = (0.16 - a) / 0.52;
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * (3 - 2 * c);
  }
  // true na subida do sol (para tingir o crepúsculo de laranja dos dois lados)
  get isDawn() {
    return this.dayClock < 0.5;
  }

  assets: LoadedAssets | null = null;
  assetsLoaded: boolean = false;
  heroSprites: ReturnType<typeof generateCharacterSprites>;
  trees: ReturnType<typeof generateTrees>;
  houses: ReturnType<typeof generateHouses>;

  ground: number[][];
  staticColliders: Rect[] = [];
  props: WorldProp[];
  npcs: NPC[];

  player: CharacterState;
  companion: CompanionState;

  shrineTimer: number = 0;
  shrineFrame: number = 0;
  chaliceTimer: number = 0;
  chaliceFrame: number = 0;
  merchantTimer: number = 0;
  merchantFrame: number = 0;

  isNearMerchant: boolean = false;
  isTalkingToMerchant: boolean = false;
  nearestNpcId: string | null = null;
  talkingNpcId: string | null = null;
  onInteractionChange?: (state: InteractionState) => void;

  // Balões de fala aleatórios (aproximação) — NPC ensina música, Akles reage
  private bubbles: Array<{
    who: 'npc' | 'akles';
    npcId?: string;
    text: string;
    born: number;
    ttl: number;
  }> = [];
  private npcBarkCd: Record<string, number> = {};
  private barkNpcInRange: string | null = null;

  // Números de dano flutuantes (causado = amarelo, sofrido = vermelho)
  private damageTexts: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    text: string;
    color: string;
    life: number;
    ttl: number;
    big: boolean;
  }> = [];
  addDamageText(x: number, y: number, text: string, color: string, big = false) {
    this.damageTexts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 26,
      vy: -58 - Math.random() * 20,
      text,
      color,
      life: 0,
      ttl: big ? 1.0 : 0.8,
      big,
    });
    if (this.damageTexts.length > 60) this.damageTexts.splice(0, this.damageTexts.length - 60);
  }
  private updateDamageTexts(dt: number) {
    for (const t of this.damageTexts) {
      t.life += dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 120 * dt; // desacelera a subida e cai um pouco
    }
    this.damageTexts = this.damageTexts.filter((t) => t.life < t.ttl);
  }
  private renderDamageTexts(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    if (!this.damageTexts.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.damageTexts) {
      const p = t.life / t.ttl;
      const alpha = p < 0.15 ? p / 0.15 : p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.4) : 1;
      const sx = Math.round(t.x - camX);
      const sy = Math.round(t.y - camY - p * 6);
      if (sx < -40 || sx > this.viewportW + 40 || sy < -30 || sy > this.viewportH + 30) continue;
      ctx.font = `900 ${t.big ? 17 : 13}px system-ui, sans-serif`;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(8,10,16,0.9)';
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  private pendingAklesReply: { text: string; at: number } | null = null;
  private static AKLES_BARKS = [
    'Um-dois-três-quatro... tô contando o compasso.',
    'A tônica é o "dó de casa". Peguei.',
    'Ainda me perco nas pausas.',
    'Minha espada tem ritmo — falta afinação.',
    'Dó, ré, mi... e vem o fá, né?',
    'Doze notas e a Vila volta a cantar.',
    'Sétima pede resolução. Igual eu peço descanso.',
    'Preciso treinar o ouvido, não só o braço.',
  ];

  // Fragmentos de notas
  fragments: number[] = new Array(12).fill(0);
  notesBuilt: number[] = new Array(12).fill(0);
  fragmentPickups: FragmentPickup[] = [];
  onFragmentsChange?: (data: { fragments: number[]; built: number[] }) => void;

  // Combate: monstros, moeda PvE, projéteis
  enemies: Enemy[] = [];
  lightBeams: LightBeam[] = [];
  coins = 0; // claves musicais
  onCoinsChange?: (n: number) => void;
  playerHurtFlash = 0;
  playerInvuln = 0;
  spawnPoint = { x: 36 * TILE_SIZE, y: 29 * TILE_SIZE };

  // Inventário / coleta de recursos
  inventory: Record<string, number> = {};
  onInventoryChange?: (inv: Record<string, number>) => void;
  onHarvestPopup?: (text: string, worldX: number, worldY: number) => void;
  private actionHitDone = false;

  // Ferramentas de coleta (Akles NÃO segura na mão — a ferramenta aparece ao
  // lado dele e bate no alvo durante a coleta; ele fica parado).
  static readonly TOOL_TIERS: ToolTier[] = ['wood', 'gold', 'crystal'];
  ownedAxes: ToolTier[] = ['wood', 'gold', 'crystal'];
  ownedPicks: ToolTier[] = ['wood', 'gold', 'crystal'];
  equippedAxe: ToolTier = 'crystal';
  equippedPick: ToolTier = 'crystal';
  onToolsChange?: (t: { axe: ToolTier; pick: ToolTier }) => void;
  // alvo da coleta atual (para a ferramenta apontar/bater no lugar certo)
  private harvestFxNode: WorldProp | null = null;

  // ---- SISTEMA DE ARMA FLUTUANTE + SKILLS DE AKLES ----
  // A arma é 100% separada do personagem: nunca fica nas sheets dele. Trocar
  // de arma não exige trocar animação nenhuma — só o config visual muda.
  equippedWeaponKey = 'acordelamina_t2';
  weaponLevel = 1;
  onWeaponChange?: () => void;
  get weaponDef(): WeaponDef {
    return WEAPON_DEFS[this.equippedWeaponKey];
  }
  get weaponAtk(): number {
    const d = this.weaponDef;
    return d.baseAtk + d.atkPerLevel * (this.weaponLevel - 1);
  }
  canUpgradeWeapon(): boolean {
    const d = this.weaponDef;
    if (this.weaponLevel >= d.maxLevel) return false;
    const cost = d.upgradeCost(this.weaponLevel);
    return Object.entries(cost).every(([k, n]) => (this.inventory[k] || 0) >= n);
  }
  upgradeWeapon(): boolean {
    if (!this.canUpgradeWeapon()) return false;
    const cost = this.weaponDef.upgradeCost(this.weaponLevel);
    for (const [k, n] of Object.entries(cost)) {
      this.inventory[k] = Math.max(0, (this.inventory[k] || 0) - n);
      if (this.inventory[k] === 0) delete this.inventory[k];
    }
    this.weaponLevel++;
    this.onInventoryChange?.({ ...this.inventory });
    this.onWeaponChange?.();
    this.onHarvestPopup?.(
      `⚔ ${this.weaponDef.name} +${this.weaponLevel}!`,
      this.player.x,
      this.player.y - 20,
    );
    return true;
  }

  // Ataque básico — Compasso da Lâmina (combo de 4 golpes, cada um com
  // trajetória própria feita por código).
  comboIndex = 0;
  private lastAttackAt = -999;
  comboStacks = 0; // Ritmo Crescente (máx. 5)
  private critCounter = 0;

  // Skill 1 — Ressonância (buff + troca visual da arma p/ energizada)
  resonanceActive = false;
  resonanceT = 0;
  resonanceCdT = 0;
  static readonly RESONANCE_DURATION = 6;
  static readonly RESONANCE_COOLDOWN = 14;

  // Skill 2 — Amplificação usa a ação 'spin' (mesma pose, arma escala por código)
  // Skill 3 — Pulso Harmônico usa a ação 'cast' (já existente)
  pulseCdT = 0;
  static readonly PULSE_COOLDOWN = 3.5;

  // Passivas (todas Nível 1 por padrão — sem sistema de pontos ainda)
  passiveLevels: Record<string, number> = Object.fromEntries(
    Object.keys(PASSIVE_DEFS).map((k) => [k, 1]),
  );
  getPassiveLevel(id: string): number {
    return this.passiveLevels[id] ?? 0;
  }
  passiveValue(id: string): number {
    const lvl = this.getPassiveLevel(id);
    const def = PASSIVE_DEFS[id];
    if (!def || lvl <= 0) return 0;
    return def.values[Math.min(4, lvl - 1)];
  }
  setPassiveLevel(id: string, level: number) {
    if (!PASSIVE_DEFS[id]) return;
    this.passiveLevels[id] = Math.max(0, Math.min(5, Math.round(level)));
  }

  // ---- multiplicadores derivados das passivas ----
  get basicAtkMul() {
    return (
      1 +
      this.passiveValue('afinacaoPermanente') +
      this.passiveValue('forcaRessonante') +
      this.passiveValue('maestriaDaLamina')
    );
  }
  get skillDmgMul() {
    return 1 + this.passiveValue('canalizacao') + this.passiveValue('ressonanciaInterior');
  }
  get critChanceBonus() {
    return this.passiveValue('ouvidoAbsoluto');
  }
  get moveSpeedMul() {
    return 1 + this.passiveValue('corpoEmCompasso');
  }
  get maxHpPassiveMul() {
    return 1 + this.passiveValue('harmoniaVital') + this.passiveValue('forcaRessonante');
  }
  get meleeAreaMul() {
    return 1 + this.passiveValue('expansao');
  }
  get cooldownMul() {
    return Math.max(0.3, 1 - this.passiveValue('fluxoSonoro'));
  }

  // Ficha do personagem
  stats: PlayerStats = {
    name: 'Akles',
    className: 'Cavaleiro Errante',
    level: 1,
    xp: 0,
    xpNext: 100,
    hp: 120,
    maxHp: 120,
    attrPoints: 0,
    forca: 9,
    agilidade: 7,
    vitalidade: 10,
    inteligencia: 5,
    sorte: 6,
  };
  onStatsChange?: (s: PlayerStats) => void;

  get combatPower(): number {
    const s = this.stats;
    return Math.round(
      (s.forca * 2.4 +
        s.agilidade * 1.8 +
        s.vitalidade * 2.0 +
        s.inteligencia * 1.5 +
        s.sorte * 1.1 +
        s.level * 6 +
        s.maxHp * 0.25 +
        this.weaponAtk * 3) *
        this.basicAtkMul,
    );
  }

  gainXp(n: number) {
    // XP de kills é um trílho pequeno; o grosso vem das PARTITURAS (ficha).
    this.stats.xp += n;
    if (this.stats.xp >= this.stats.xpNext) this.stats.xp = this.stats.xpNext;
    this.onStatsChange?.({ ...this.stats });
  }

  get canLevelUp() {
    // subir de nível SÓ com partituras (kills dão claves, não XP direto)
    return this.partituraXpAvailable > 0;
  }

  // Botão "Subir de Nível" da ficha: usa o XP + as partituras do inventário.
  levelUp(): boolean {
    const before = this.stats.level;
    this.levelUpWithPartituras();
    return this.stats.level > before;
  }

  spendAttrPoint(attr: AttrKey): boolean {
    const s = this.stats;
    if (s.attrPoints <= 0) return false;
    s[attr] += 1;
    s.attrPoints -= 1;
    if (attr === 'vitalidade') {
      s.maxHp += 5;
      s.hp += 5;
    }
    this.onStatsChange?.({ ...s });
    return true;
  }

  camX: number = 0;
  camY: number = 0;
  viewportW: number = 480;
  viewportH: number = 320;
  baseViewportW: number = 480;
  baseViewportH: number = 320;
  cameraZoom: number = 1.0;
  onZoomChange?: (zoom: number) => void;

  keys: Record<string, boolean> = {};
  touchVector: { x: number; y: number } = { x: 0, y: 0 };

  particles: Particle[] = [];
  butterflies: Butterfly[] = [];
  fireflies: Firefly[] = [];
  footstepTimer: number = 0;
  timeElapsed: number = 0;

  // Clima e vento
  weather: 'clear' | 'rain' = 'clear';
  windX: number = 10;
  rain: Array<{ x: number; y: number; len: number; speed: number }> = [];

  isEditMode: boolean = false;
  selectedPropId: string | null = null;
  hoveredPropId: string | null = null;
  isDragging: boolean = false;
  dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  // Seleção múltipla no editor
  multiSel: Set<string> = new Set();
  marquee: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private groupDragAnchor: { x: number; y: number } | null = null;
  private groupDragStart: Map<string, { x: number; y: number }> = new Map();
  onGroupChange?: (ids: string[]) => void;
  propScales: Record<string, number> = {};

  onSelectedPropChange?: (prop: SelectedPropInfo | null) => void;
  onMapSaveNotification?: () => void;

  isRunning: boolean = false;
  heroRunning = false; // Akles correndo (sprint) — troca walk->run
  lastTime: number = 0;
  animFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = this.viewportW;
    this.lightCanvas.height = this.viewportH;
    this.lightCtx = this.lightCanvas.getContext('2d')!;

    this.heroSprites = generateCharacterSprites();
    this.trees = generateTrees();
    this.houses = generateHouses();

    const map = buildMap();
    this.ground = map.ground;
    this.props = map.props;
    this.npcs = map.npcs;

    this.staticColliders = map.solidColliders.filter(
      (col) => !map.props.some((p) => p.collider === col)
    );

    for (const p of this.props) {
      this.propScales[p.id] = 1.0;
      this.syncPropAutoCollider(p);
    }

    this.loadMapFromStorage();
    this.rebuildColliderGrid();
    this.initHarvestables();
    this.initFragments();
    this.initEnemies();
    this.loadTools();

    // Passivas permanentes de HP (Harmonia Vital / Força Ressonante)
    this.stats.maxHp = Math.round(this.stats.maxHp * this.maxHpPassiveMul);
    this.stats.hp = this.stats.maxHp;

    // Player with 32-bit Knight character
    this.player = {
      x: 36 * TILE_SIZE,
      y: 29 * TILE_SIZE,
      vx: 0,
      vy: 0,
      direction: 'down',
      frame: 0,
      isMoving: false,
      stepTimer: 0,
      width: 24,
      height: 32,
      actionState: 'idle',
      actionTimer: 0,
      collider: {
        offsetX: 6,
        offsetY: 20,
        w: 12,
        h: 10,
      },
    };

    this.companion = {
      x: 35 * TILE_SIZE,
      y: 29 * TILE_SIZE,
      vx: 0,
      vy: 0,
      frame: 0,
      isMoving: false,
      stepTimer: 0,
      targetX: 35 * TILE_SIZE,
      targetY: 29 * TILE_SIZE,
      facingLeft: false,
    };

    this.camX = this.player.x + 12 - this.viewportW / 2;
    this.camY = this.player.y + 16 - this.viewportH / 2;
    this.clampCamera();

    // Borboletas (dia)
    const butterflyColors = ['#38bdf8', '#f59e0b', '#f43f5e', '#4ade80', '#c084fc', '#f1f5f9'];
    for (let i = 0; i < 40; i++) {
      const bx = (6 + Math.random() * (MAP_COLS - 12)) * TILE_SIZE;
      const by = (6 + Math.random() * (MAP_ROWS - 12)) * TILE_SIZE;
      this.butterflies.push({
        x: bx,
        y: by,
        targetX: bx + (Math.random() - 0.5) * 100,
        targetY: by + (Math.random() - 0.5) * 100,
        color: butterflyColors[i % butterflyColors.length],
        wingAngle: Math.random() * Math.PI,
        speed: 25 + Math.random() * 20,
      });
    }

    // Vagalumes (noite) — enchem o mapa
    for (let i = 0; i < 650; i++) {
      const fx = (5 + Math.random() * (MAP_COLS - 10)) * TILE_SIZE;
      const fy = (5 + Math.random() * (MAP_ROWS - 10)) * TILE_SIZE;
      this.fireflies.push({
        x: fx,
        y: fy,
        baseX: fx,
        baseY: fy,
        color: i % 3 === 0 ? '#a3e635' : '#fde68a',
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.9,
        radius: 14 + Math.random() * 26,
      });
    }

    loadGameAssets()
      .then((assets) => {
        this.assets = assets;
        this.assetsLoaded = true;
      })
      .catch((err) => {
        console.error('Failed to load assets:', err);
      });

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
  }

  unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);

    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  private pinchDist = 0;
  private touchGap(e: TouchEvent) {
    return Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
  onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) this.pinchDist = this.touchGap(e);
  };
  onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = this.touchGap(e);
      if (this.pinchDist > 0) {
        this.setCameraZoom(this.cameraZoom * (d / this.pinchDist));
      }
      this.pinchDist = d;
    }
  };
  onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) this.pinchDist = 0;
  };

  onBlur = () => {
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };
    if (this.player) {
      this.player.isMoving = false;
      this.player.vx = 0;
      this.player.vy = 0;
    }
  };

  onKeyDown = (e: KeyboardEvent) => {
    // Zoom hotkeys
    if (e.key === '+' || e.key === '=') {
      this.zoomCamera(0.1);
      return;
    } else if (e.key === '-' || e.key === '_') {
      this.zoomCamera(-0.1);
      return;
    } else if (e.key === '0') {
      this.resetCameraZoom();
      return;
    }

    // Action Key: F or Space (Contextual Woodcut or Mining)
    if (!this.isEditMode && (e.code === 'KeyF' || e.code === 'Space')) {
      const nearTree = this.findNearbyProp(['oak', 'pine', 'blossomTree', 'bush'], 55);
      const nearRock = this.findNearbyProp(['stoneQuarry', 'limestoneBoulders', 'rockCluster', 'rockPair', 'rockMonolith'], 55);

      if (nearTree) {
        this.triggerAction('chop');
        return;
      } else if (nearRock) {
        this.triggerAction('mine');
        return;
      } else {
        this.triggerAction('chop');
        return;
      }
    }

    // Direct Action Hotkeys: 1 (Chop), 2 (Mine)
    if (!this.isEditMode && e.code === 'Digit1') {
      this.triggerAction('chop');
      return;
    }
    if (!this.isEditMode && e.code === 'Digit2') {
      this.triggerAction('mine');
      return;
    }

    // Combate do Akles: J = espada, K = giro, L = magia
    if (!this.isEditMode && e.code === 'KeyJ') {
      this.triggerAction('attack');
      return;
    }
    if (!this.isEditMode && e.code === 'KeyK') {
      this.triggerAction('spin');
      return;
    }
    if (!this.isEditMode && e.code === 'KeyL') {
      this.triggerAction('cast');
      return;
    }
    if (!this.isEditMode && e.code === 'KeyQ') {
      this.useHealingItem();
      return;
    }
    if (!this.isEditMode && e.code === 'KeyH') {
      this.activateResonance(); // Skill 1 — Ressonância
      return;
    }

    // Editor: apagar seleção (múltipla ou única)
    if (this.isEditMode && (e.code === 'Delete' || e.code === 'Backspace')) {
      if (this.multiSel.size > 0) {
        this.deleteSelection();
        return;
      }
      if (this.selectedPropId) {
        this.deleteProp(this.selectedPropId);
        return;
      }
    }
    if (this.isEditMode && e.code === 'Escape') {
      this.clearSelection();
      return;
    }

    // Editor: duplicar seleção com 'D'
    if (this.isEditMode && (e.code === 'KeyD' || (e.ctrlKey && e.code === 'KeyD'))) {
      if (this.multiSel.size > 0) {
        e.preventDefault();
        this.duplicateSelection();
        return;
      }
      if (this.selectedPropId) {
        e.preventDefault();
        this.duplicateProp(this.selectedPropId);
        return;
      }
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys[e.code] = true;
    if (e.key) {
      this.keys[e.key.toLowerCase()] = true;
    }

    // Merchant dialogue key
    if (!this.isEditMode && e.code === 'KeyE') {
      this.handleInteract();
    }
  };

  onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
    if (e.key) {
      this.keys[e.key.toLowerCase()] = false;
    }
  };

  setTouchVector(x: number, y: number) {
    this.touchVector = { x, y };
  }

  // Dispara animações de ação (coleta, ataque, giro, magia)
  triggerAction(action: AklesAction) {
    const busy: Array<CharacterState['actionState']> = ['chop', 'mine', 'attack', 'spin', 'cast'];
    if (busy.includes(this.player.actionState)) return;
    if (action === 'attack') {
      // Compasso da Lâmina: encadeia o combo se apertado logo em seguida
      if (this.timeElapsed - this.lastAttackAt < 1.0) this.comboIndex = (this.comboIndex + 1) % 4;
      else this.comboIndex = 0;
      this.lastAttackAt = this.timeElapsed;
    }
    this.player.actionState = action;
    this.player.actionTimer = 0;
    this.player.frame = 0;
    this.actionHitDone = false;
  }

  findNearbyProp(types: string[], maxDist: number): WorldProp | null {
    const px = this.player.x + 12;
    const py = this.player.y + 24;

    for (const p of this.props) {
      if (!types.includes(p.type)) continue;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      if (Math.hypot(px - cx, py - cy) <= maxDist) {
        return p;
      }
    }
    return null;
  }

  // Botão de dev (só desktop): pula o relógio, o ciclo automático segue daí.
  setTimeOfDay(time: TimeOfDay) {
    this.dayClock = time === 'night' ? 0.86 : time === 'sunset' ? 0.76 : 0.34;
    this.onDayClockChange?.(this.dayClock);
  }

  setWeather(w: 'clear' | 'rain') {
    this.weather = w;
    if (w === 'rain' && this.rain.length === 0) {
      for (let i = 0; i < 260; i++) {
        this.rain.push({
          x: Math.random() * (this.viewportW + 200) - 100,
          y: Math.random() * this.viewportH,
          len: 8 + Math.random() * 10,
          speed: 620 + Math.random() * 320,
        });
      }
    }
  }

  // A Floresta Sombria é sempre noite e quase sempre chuva.
  // darkT: 0 = mapa normal, 1 = fundo da floresta. Faixa de transição suave.
  get darkT() {
    const y0 = (DARK_START - FADE_ROWS) * TILE_SIZE;
    const y1 = (DARK_START + 6) * TILE_SIZE;
    const t = (this.player.y - y0) / (y1 - y0);
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * (3 - 2 * c); // smoothstep
  }
  get inDarkForest() {
    return this.darkT > 0.5;
  }
  effTime(): TimeOfDay {
    return this.darkT > 0.6 ? 'night' : this.timeOfDay;
  }
  effWeather(): 'clear' | 'rain' {
    if (this.darkT > 0.35) return 'rain';
    return this.weather;
  }

  updateWeatherAndWind(dt: number) {
    // vento suave que oscila
    this.windX = 12 + Math.sin(this.timeElapsed * 0.13) * 16 + Math.sin(this.timeElapsed * 0.9) * 3;

    const raining = this.effWeather() === 'rain';
    if (!raining) {
      if (this.rain.length) this.rain.length = 0;
      return;
    }
    if (this.rain.length === 0) {
      for (let i = 0; i < 260; i++) {
        this.rain.push({
          x: Math.random() * (this.viewportW + 200) - 100,
          y: Math.random() * this.viewportH,
          len: 8 + Math.random() * 10,
          speed: 620 + Math.random() * 320,
        });
      }
    }
    const angle = this.windX * 0.9;
    for (const d of this.rain) {
      d.y += d.speed * dt;
      d.x += angle * dt * 3;
      if (d.y > this.viewportH + 20) {
        d.y = -20 - Math.random() * 40;
        d.x = Math.random() * (this.viewportW + 200) - 100;
      }
      if (d.x > this.viewportW + 60) d.x -= this.viewportW + 120;
    }
    // respingos ocasionais nos pés do herói
    if (Math.random() < 0.4) this.addFootstepDust(this.player.x + 12, this.player.y + 30);
  }

  renderRain(ctx: CanvasRenderingContext2D) {
    if (this.effWeather() !== 'rain') return;
    const w = this.viewportW;
    const h = this.viewportH;
    // intensidade: chuva do clima = cheia; chuva da Floresta Sombria entra pela faixa
    const intensity = Math.max(this.weather === 'rain' ? 1 : 0, Math.min(1, this.darkT / 0.6));
    // leve escurecida / azulado de tempestade
    ctx.fillStyle = `rgba(30, 41, 66, ${0.16 * intensity})`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = `rgba(190, 214, 240, ${0.5 * intensity})`;
    ctx.lineWidth = 1;
    const ax = this.windX * 0.04;
    ctx.beginPath();
    for (const d of this.rain) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - ax * d.len, d.y + d.len);
    }
    ctx.stroke();
    ctx.restore();
  }

  setViewportSize(w: number, h: number) {
    this.baseViewportW = w;
    this.baseViewportH = h;
    this.updateViewportDimensions();
  }

  setCameraZoom(zoom: number) {
    this.cameraZoom = Math.max(0.3, Math.min(2.6, Math.round(zoom * 100) / 100));
    this.updateViewportDimensions();
    this.clampCamera();
    if (this.onZoomChange) {
      this.onZoomChange(this.cameraZoom);
    }
  }

  zoomCamera(delta: number) {
    this.setCameraZoom(this.cameraZoom + delta);
  }

  resetCameraZoom() {
    this.setCameraZoom(1.0);
  }

  // Super-amostragem: renderiza a 2x a resolução lógica e deixa o CSS reduzir.
  // Deixa personagem/artes detalhadas bem mais nítidos sem mudar o campo de visão.
  readonly renderScale = 2;

  updateViewportDimensions() {
    this.viewportW = Math.round(this.baseViewportW / this.cameraZoom);
    this.viewportH = Math.round(this.baseViewportH / this.cameraZoom);
    const rs = this.renderScale;
    this.canvas.width = this.viewportW * rs;
    this.canvas.height = this.viewportH * rs;
    this.ctx.setTransform(rs, 0, 0, rs, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    this.lightCanvas.width = this.viewportW * rs;
    this.lightCanvas.height = this.viewportH * rs;
    this.lightCtx.setTransform(rs, 0, 0, rs, 0, 0);
  }

  private npcToInteraction(n: NPC): InteractionNpc {
    return {
      id: n.id,
      name: n.name,
      title: n.title,
      accent: n.accent ?? '#f59e0b',
      dialogue: n.dialogue ?? ['...'],
      isMerchant: n.spriteType === 'merchant',
    };
  }

  emitInteraction() {
    if (!this.onInteractionChange) return;
    const near = this.npcs.find((n) => n.id === this.nearestNpcId) || null;
    const talking = this.npcs.find((n) => n.id === this.talkingNpcId) || null;
    const info = near ? this.npcToInteraction(near) : undefined;
    this.onInteractionChange({
      nearNpc: info,
      isTalking: !!talking,
      npc: talking ? this.npcToInteraction(talking) : undefined,
      // compat
      nearMerchant: near?.spriteType === 'merchant',
      merchantName: talking?.name,
      merchantTitle: talking?.title,
      dialogue: talking?.dialogue,
    });
  }

  handleInteract() {
    if (this.talkingNpcId) {
      this.talkingNpcId = null;
      this.isTalkingToMerchant = false;
      this.emitInteraction();
      return;
    }
    if (this.nearestNpcId) {
      this.talkingNpcId = this.nearestNpcId;
      this.isTalkingToMerchant = this.isNearMerchant;
      this.emitInteraction();
    }
  }

  closeDialogue() {
    this.talkingNpcId = null;
    this.isTalkingToMerchant = false;
    this.emitInteraction();
  }

  // Drag logic for Map Editor
  getWorldPosFromEvent(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    // canvas.width é físico (renderScale x lógico) — normaliza p/ coords lógicas
    const scaleX = this.canvas.width / rect.width / this.renderScale;
    const scaleY = this.canvas.height / rect.height / this.renderScale;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    return {
      x: canvasX + this.camX,
      y: canvasY + this.camY,
    };
  }

  onMouseDown = (e: MouseEvent) => {
    if (!this.isEditMode || e.button !== 0) return;
    const worldPos = this.getWorldPosFromEvent(e);
    if (!worldPos) return;

    let hitProp: WorldProp | null = null;
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      if (!EDITABLE_PROP_METAS[p.type]) continue;
      if (
        worldPos.x >= p.x &&
        worldPos.x <= p.x + p.w &&
        worldPos.y >= p.y &&
        worldPos.y <= p.y + p.h
      ) {
        hitProp = p;
        break;
      }
    }

    if (hitProp) {
      if (e.shiftKey) {
        // shift+clique: adiciona/remove da seleção
        if (this.multiSel.has(hitProp.id)) this.multiSel.delete(hitProp.id);
        else this.multiSel.add(hitProp.id);
        this.selectedPropId = this.multiSel.size === 1 ? [...this.multiSel][0] : null;
        this.emitGroup();
        this.onSelectedPropChange?.(
          this.selectedPropId ? this.getSelectedPropInfo(this.selectedPropId) : null
        );
        return;
      }

      if (this.multiSel.has(hitProp.id) && this.multiSel.size > 1) {
        // arrasta o grupo inteiro
        this.groupDragAnchor = { x: worldPos.x, y: worldPos.y };
        this.groupDragStart.clear();
        for (const id of this.multiSel) {
          const p = this.props.find((pp) => pp.id === id);
          if (p) this.groupDragStart.set(id, { x: p.x, y: p.y });
        }
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      this.multiSel = new Set([hitProp.id]);
      this.selectedPropId = hitProp.id;
      this.isDragging = true;
      this.dragOffset = { x: worldPos.x - hitProp.x, y: worldPos.y - hitProp.y };
      this.canvas.style.cursor = 'grabbing';
      this.emitGroup();
      this.onSelectedPropChange?.(this.getSelectedPropInfo(hitProp.id));
    } else {
      if (!e.shiftKey) {
        this.multiSel.clear();
        this.selectedPropId = null;
        this.emitGroup();
        this.onSelectedPropChange?.(null);
      }
      // inicia retângulo de seleção
      this.marquee = { x0: worldPos.x, y0: worldPos.y, x1: worldPos.x, y1: worldPos.y };
    }
  };

  private emitGroup() {
    this.onGroupChange?.([...this.multiSel]);
  }

  onMouseMove = (e: MouseEvent) => {
    if (!this.isEditMode) return;
    const worldPos = this.getWorldPosFromEvent(e);
    if (!worldPos) return;

    if (this.marquee) {
      this.marquee.x1 = worldPos.x;
      this.marquee.y1 = worldPos.y;
      return;
    }

    if (this.isDragging && this.groupDragAnchor) {
      const dx = worldPos.x - this.groupDragAnchor.x;
      const dy = worldPos.y - this.groupDragAnchor.y;
      for (const [id, start] of this.groupDragStart) {
        const p = this.props.find((pp) => pp.id === id);
        if (!p) continue;
        p.x = Math.round(Math.max(32, Math.min(WORLD_WIDTH - p.w - 32, start.x + dx)));
        p.y = Math.round(Math.max(32, Math.min(WORLD_HEIGHT - p.h - 32, start.y + dy)));
        this.syncPropAutoCollider(p);
      }
      return;
    }

    if (this.isDragging && this.selectedPropId) {
      const prop = this.props.find((p) => p.id === this.selectedPropId);
      if (prop) {
        prop.x = Math.round(worldPos.x - this.dragOffset.x);
        prop.y = Math.round(worldPos.y - this.dragOffset.y);

        prop.x = Math.max(32, Math.min(WORLD_WIDTH - prop.w - 32, prop.x));
        prop.y = Math.max(32, Math.min(WORLD_HEIGHT - prop.h - 32, prop.y));

        this.syncPropAutoCollider(prop);

        if (this.onSelectedPropChange) {
          this.onSelectedPropChange(this.getSelectedPropInfo(this.selectedPropId));
        }
      }
    } else {
      let hovered: string | null = null;
      for (let i = this.props.length - 1; i >= 0; i--) {
        const p = this.props[i];
        if (!EDITABLE_PROP_METAS[p.type]) continue;
        if (
          worldPos.x >= p.x &&
          worldPos.x <= p.x + p.w &&
          worldPos.y >= p.y &&
          worldPos.y <= p.y + p.h
        ) {
          hovered = p.id;
          break;
        }
      }
      this.hoveredPropId = hovered;
      this.canvas.style.cursor = hovered ? 'grab' : 'default';
    }
  };

  onMouseUp = () => {
    if (!this.isEditMode) return;

    if (this.marquee) {
      const { x0, y0, x1, y1 } = this.marquee;
      const rx = Math.min(x0, x1);
      const ry = Math.min(y0, y1);
      const rw = Math.abs(x1 - x0);
      const rh = Math.abs(y1 - y0);
      if (rw > 6 || rh > 6) {
        for (const p of this.props) {
          if (!EDITABLE_PROP_METAS[p.type]) continue;
          if (p.x + p.w > rx && p.x < rx + rw && p.y + p.h > ry && p.y < ry + rh) {
            this.multiSel.add(p.id);
          }
        }
        this.selectedPropId = this.multiSel.size === 1 ? [...this.multiSel][0] : null;
        this.emitGroup();
        this.onSelectedPropChange?.(
          this.selectedPropId ? this.getSelectedPropInfo(this.selectedPropId) : null
        );
      }
      this.marquee = null;
    }

    if (this.isDragging) {
      this.isDragging = false;
      this.groupDragAnchor = null;
      this.groupDragStart.clear();
      this.canvas.style.cursor = 'grab';
      this.saveMapToStorage();
    }
  };

  // Ações de grupo (chamadas pela UI)
  duplicateSelection() {
    if (this.multiSel.size === 0) return;
    const newIds: string[] = [];
    for (const id of [...this.multiSel]) {
      const nid = this.duplicateProp(id);
      if (nid) newIds.push(nid);
    }
    if (newIds.length) {
      this.multiSel = new Set(newIds);
      this.selectedPropId = newIds.length === 1 ? newIds[0] : null;
      this.emitGroup();
      this.saveMapToStorage();
    }
  }

  deleteSelection() {
    if (this.multiSel.size === 0) return;
    for (const id of [...this.multiSel]) this.deleteProp(id);
    this.multiSel.clear();
    this.selectedPropId = null;
    this.emitGroup();
    this.onSelectedPropChange?.(null);
    this.saveMapToStorage();
  }

  clearSelection() {
    this.multiSel.clear();
    this.selectedPropId = null;
    this.marquee = null;
    this.emitGroup();
    this.onSelectedPropChange?.(null);
  }

  onWheel = (e: WheelEvent) => {
    e.preventDefault();

    if (this.isEditMode && e.shiftKey) {
      const targetId = this.hoveredPropId || this.selectedPropId;
      if (targetId) {
        const currentScale = this.propScales[targetId] || 1.0;
        const step = e.deltaY < 0 ? 0.05 : -0.05;
        const newScale = Math.max(0.4, Math.min(2.5, Math.round((currentScale + step) * 100) / 100));
        this.setPropScale(targetId, newScale);
        return;
      }
    }

    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    this.zoomCamera(zoomDelta);
  };

  syncPropAutoCollider(prop: WorldProp) {
    this.gridDirty = true;
    const meta = EDITABLE_PROP_METAS[prop.type];
    if (!meta) return;

    prop.sortY = Math.round(prop.y + prop.h - 4);

    if (
      meta.colOffXRatio !== undefined &&
      meta.colOffYRatio !== undefined &&
      meta.colWRatio &&
      meta.colHRatio
    ) {
      prop.collider = {
        x: Math.round(prop.x + prop.w * meta.colOffXRatio),
        y: Math.round(prop.y + prop.h * meta.colOffYRatio),
        w: Math.round(prop.w * meta.colWRatio),
        h: Math.round(prop.h * meta.colHRatio),
      };
    } else {
      prop.collider = undefined;
    }
  }

  setEditMode(active: boolean) {
    this.isEditMode = active;
    if (!active) {
      this.selectedPropId = null;
      this.hoveredPropId = null;
      this.isDragging = false;
      this.multiSel.clear();
      this.marquee = null;
      this.emitGroup();
      this.canvas.style.cursor = 'default';
      if (this.onSelectedPropChange) {
        this.onSelectedPropChange(null);
      }
    } else {
      this.canvas.style.cursor = 'grab';
    }
  }

  selectProp(id: string | null) {
    this.selectedPropId = id;
    if (this.onSelectedPropChange) {
      this.onSelectedPropChange(id ? this.getSelectedPropInfo(id) : null);
    }
    if (id) {
      this.centerCameraOnProp(id);
    }
  }

  setPropScale(id: string, scale: number) {
    const prop = this.props.find((p) => p.id === id);
    const meta = prop ? EDITABLE_PROP_METAS[prop.type] : null;
    if (!prop || !meta) return;

    const clampedScale = Math.max(0.4, Math.min(2.5, Math.round(scale * 100) / 100));
    this.propScales[id] = clampedScale;

    prop.w = Math.round(meta.baseW * clampedScale);
    prop.h = Math.round(meta.baseH * clampedScale);
    this.syncPropAutoCollider(prop);

    this.saveMapToStorage();
    if (this.onSelectedPropChange) {
      this.onSelectedPropChange(this.getSelectedPropInfo(id));
    }
  }

  duplicateProp(id: string): string | null {
    const source = this.props.find((p) => p.id === id);
    const meta = source ? EDITABLE_PROP_METAS[source.type] : null;
    if (!source || !meta || !meta.canDuplicate) return null;

    const newId = `${source.type}_copy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const scale = this.propScales[source.id] || 1.0;
    this.propScales[newId] = scale;

    const newX = Math.min(WORLD_WIDTH - source.w - 32, source.x + 24);
    const newY = Math.min(WORLD_HEIGHT - source.h - 32, source.y + 24);

    const newProp: WorldProp = {
      id: newId,
      type: source.type,
      x: newX,
      y: newY,
      w: source.w,
      h: source.h,
      sortY: source.sortY + 24,
    };

    this.syncPropAutoCollider(newProp);
    this.attachHarvestData(newProp);
    this.props.push(newProp);
    this.selectProp(newId);
    this.saveMapToStorage();

    return newId;
  }

  spawnProp(type: string): string {
    const meta = EDITABLE_PROP_METAS[type];
    if (!meta) return '';

    const spawnX = Math.round(this.camX + this.viewportW / 2 - meta.baseW / 2);
    const spawnY = Math.round(this.camY + this.viewportH / 2 - meta.baseH / 2);
    return this.spawnPropAtWorldPos(type, spawnX, spawnY);
  }

  spawnPropAtWorldPos(type: string, worldX: number, worldY: number): string {
    const meta = EDITABLE_PROP_METAS[type];
    if (!meta) return '';

    const newId = `${type}_spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.propScales[newId] = 1.0;

    const clampedX = Math.max(32, Math.min(WORLD_WIDTH - meta.baseW - 32, worldX));
    const clampedY = Math.max(32, Math.min(WORLD_HEIGHT - meta.baseH - 32, worldY));

    const newProp: WorldProp = {
      id: newId,
      type,
      x: clampedX,
      y: clampedY,
      w: meta.baseW,
      h: meta.baseH,
      sortY: clampedY + meta.sortYOffset,
    };

    this.syncPropAutoCollider(newProp);
    this.attachHarvestData(newProp);
    this.props.push(newProp);
    this.selectProp(newId);
    this.saveMapToStorage();

    return newId;
  }

  deleteProp(id: string): boolean {
    const index = this.props.findIndex((p) => p.id === id);
    if (index === -1) return false;

    const prop = this.props[index];
    const meta = EDITABLE_PROP_METAS[prop.type];
    if (!meta || !meta.canDelete) return false;

    this.props.splice(index, 1);
    delete this.propScales[id];

    if (this.selectedPropId === id) {
      this.selectProp(null);
    }

    this.saveMapToStorage();
    return true;
  }

  centerCameraOnProp(id: string) {
    const prop = this.props.find((p) => p.id === id);
    if (!prop) return;

    this.camX = prop.x + prop.w / 2 - this.viewportW / 2;
    this.camY = prop.y + prop.h / 2 - this.viewportH / 2;
    this.clampCamera();
  }

  getSelectedPropInfo(id: string): SelectedPropInfo | null {
    const prop = this.props.find((p) => p.id === id);
    const meta = prop ? EDITABLE_PROP_METAS[prop.type] : null;
    if (!prop || !meta) return null;

    return {
      id: prop.id,
      type: prop.type,
      category: meta.category,
      name: meta.name,
      x: prop.x,
      y: prop.y,
      w: prop.w,
      h: prop.h,
      scale: this.propScales[prop.id] || 1.0,
      canDelete: meta.canDelete,
      canDuplicate: meta.canDuplicate,
    };
  }

  // Layout editável do mapa (usado no localStorage e ao publicar no código)
  serializeMap() {
    return this.props
      .filter((p) => EDITABLE_PROP_METAS[p.type])
      .map((p) => ({
        id: p.id,
        type: p.type,
        x: p.x,
        y: p.y,
        scale: this.propScales[p.id] || 1.0,
      }));
  }

  saveMapToStorage() {
    try {
      const savedProps = this.serializeMap();

      // 1. Instant local persistence
      localStorage.setItem('acordelot_map_v3', JSON.stringify(savedProps));

      // 2. Direct Code Persistence on Disk (src/game/customMapLayout.json) via Vite endpoint
      fetch('/api/save-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedProps),
      }).catch((err) => {
        console.warn('Vite save-map endpoint notification:', err);
      });

      if (this.onMapSaveNotification) {
        this.onMapSaveNotification();
      }
    } catch (err) {
      console.warn('Failed to save map transforms to localStorage:', err);
    }
  }

  loadMapFromStorage() {
    try {
      let parsed: Array<{ id: string; type: string; x: number; y: number; scale: number }> | null = null;
      const data = localStorage.getItem('acordelot_map_v3');
      if (data) {
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          console.warn('Failed to parse localStorage map:', e);
        }
      }

      // Sem edições do usuário: usa o customMapLayout.json versionado se ele
      // tiver conteúdo; caso contrário mantém o layout padrão de buildMap().
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        const initial = initialCustomMap as Array<{
          id: string;
          type: string;
          x: number;
          y: number;
          scale: number;
        }>;
        if (!Array.isArray(initial) || initial.length === 0) return;
        parsed = initial;
      }

      if (!Array.isArray(parsed)) return;

      const staticProps = this.props.filter((p) => !EDITABLE_PROP_METAS[p.type]);
      const rebuiltProps: WorldProp[] = [...staticProps];
      const savedIds = new Set<string>();

      // Props procedurais da Floresta Sombria (buildMap). O snapshot salvo pelo
      // usuário foi criado antes dessa região existir, então nunca contém props
      // abaixo de DARK_START. Guardamos os originais para reanexar depois — a menos
      // que o snapshot já traga aquele id (usuário editou/moveu/apagou a sombria).
      const darkLine = DARK_START * TILE_SIZE;
      const darkProceduralProps = this.props.filter(
        (p) => EDITABLE_PROP_METAS[p.type] && p.y >= darkLine,
      );

      for (const item of parsed) {
        const meta = EDITABLE_PROP_METAS[item.type];
        if (!meta) continue;
        // O antigo cinturão sul (bS_*) foi congelado no snapshot na borda do mapa
        // pré-expansão (linha ~105) e agora forma uma "fila de árvores" no meio do
        // caminho para a Floresta Sombria. Descarta — buildMap recria a borda sul
        // (irregular) já na nova extremidade.
        if (item.id.startsWith('bS_')) continue;

        savedIds.add(item.id);
        const scale = Math.max(0.4, Math.min(2.5, item.scale || 1.0));
        this.propScales[item.id] = scale;

        const w = Math.round(meta.baseW * scale);
        const h = Math.round(meta.baseH * scale);
        const sortY = item.y + Math.round(meta.sortYOffset * scale);

        const prop: WorldProp = {
          id: item.id,
          type: item.type,
          x: item.x,
          y: item.y,
          w,
          h,
          sortY,
        };

        this.syncPropAutoCollider(prop);
        rebuiltProps.push(prop);
      }

      // Reanexa a Floresta Sombria procedural que o snapshot não cobre.
      for (const dp of darkProceduralProps) {
        if (savedIds.has(dp.id)) continue;
        this.syncPropAutoCollider(dp);
        rebuiltProps.push(dp);
      }

      this.props = rebuiltProps;
    } catch (err) {
      console.warn('Failed to load custom map from storage:', err);
    }
  }

  resetMapToDefault() {
    try {
      localStorage.removeItem('acordelot_map_v3');
      localStorage.removeItem('vila_encantada_buildings_v1');
    } catch (e) {}

    const map = buildMap();
    this.ground = map.ground;
    this.props = map.props;
    this.npcs = map.npcs;

    this.staticColliders = map.solidColliders.filter(
      (col) => !map.props.some((p) => p.collider === col)
    );

    this.propScales = {};
    for (const p of this.props) {
      this.propScales[p.id] = 1.0;
      this.syncPropAutoCollider(p);
    }

    // Load straight from customMapLayout.json
    this.loadMapFromStorage();
    this.rebuildColliderGrid();
    this.initHarvestables();
    this.initFragments();
    this.initEnemies();
    this.selectProp(null);
    this.saveMapToStorage();
  }

  // ---- COLETA DE RECURSOS ----
  attachHarvestData(p: WorldProp) {
    const def = HARVEST_DEFS[p.type];
    if (!def) return;
    p.harvest = {
      kind: def.kind,
      hp: def.maxHp,
      maxHp: def.maxHp,
      drop: def.drop,
      dropMin: def.dropMin,
      dropMax: def.dropMax,
      respawnSecs: def.respawnSecs,
      downUntil: 0,
      hitFlash: 0,
      shake: 0,
    };
  }

  initHarvestables() {
    for (const p of this.props) this.attachHarvestData(p);
  }

  // ---- FRAGMENTOS DE NOTAS ----
  initFragments() {
    this.fragmentPickups = [];
    // 5 por nota espalhados por trilhas/clareiras acessíveis
    for (let note = 0; note < 12; note++) {
      for (let k = 0; k < 5; k++) {
        this.fragmentPickups.push(this.makeFragment(`frag_${note}_${k}`, note));
      }
    }
  }

  private makeFragment(id: string, note: number): FragmentPickup {
    // procura um tile de grama longe de água
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries++) {
      const c = 4 + Math.floor(Math.random() * (MAP_COLS - 8));
      const r = 4 + Math.floor(Math.random() * (MAP_ROWS - 8));
      const g = this.ground[r]?.[c];
      if (g !== undefined && g < 9000) {
        x = c * TILE_SIZE + 16;
        y = r * TILE_SIZE + 16;
        if (!this.checkSolidCollision({ x: x - 8, y: y - 8, w: 16, h: 16 })) break;
      }
    }
    return { id, x, y, note, bob: Math.random() * Math.PI * 2, respawnAt: 0 };
  }

  addFragment(note: number, qty = 1) {
    this.fragments[note] += qty;
    this.addToInventory('frag_' + NOTE_KEY[note], qty);
    while (this.fragments[note] >= FRAGMENTS_PER_NOTE) {
      this.fragments[note] -= FRAGMENTS_PER_NOTE;
      this.notesBuilt[note] += 1;
      // consome os fragmentos do inventário ao montar a nota
      const key = 'frag_' + NOTE_KEY[note];
      this.inventory[key] = Math.max(0, (this.inventory[key] || 0) - FRAGMENTS_PER_NOTE);
      this.onInventoryChange?.({ ...this.inventory });
      this.onHarvestPopup?.(`♪ Nota ${NOTE_NAMES[note]} montada!`, this.player.x, this.player.y - 24);
    }
    this.onFragmentsChange?.({ fragments: [...this.fragments], built: [...this.notesBuilt] });
  }

  addCoins(n: number) {
    if (n <= 0) return;
    this.coins += n;
    // claves aparecem também como item no inventário (peso 0)
    this.inventory['clave'] = (this.inventory['clave'] || 0) + n;
    this.onInventoryChange?.({ ...this.inventory });
    this.onCoinsChange?.(this.coins);
  }

  private spendCoins(n: number) {
    this.coins = Math.max(0, this.coins - n);
    this.inventory['clave'] = Math.max(0, (this.inventory['clave'] || 0) - n);
    if (this.inventory['clave'] === 0) delete this.inventory['clave'];
    this.onCoinsChange?.(this.coins);
  }

  get totalFragments(): number {
    return this.fragments.reduce((a, b) => a + b, 0);
  }

  // Consome fragmentos soltos (dos montes maiores primeiro) — não mexe nas notas prontas
  private spendFragments(n: number): boolean {
    if (this.totalFragments < n) return false;
    let left = n;
    const order = this.fragments
      .map((v, i) => [v, i] as [number, number])
      .sort((a, b) => b[0] - a[0]);
    for (const [, i] of order) {
      if (left <= 0) break;
      const take = Math.min(this.fragments[i], left);
      this.fragments[i] -= take;
      const key = 'frag_' + NOTE_KEY[i];
      this.inventory[key] = Math.max(0, (this.inventory[key] || 0) - take);
      if (this.inventory[key] === 0) delete this.inventory[key];
      left -= take;
    }
    this.onFragmentsChange?.({ fragments: [...this.fragments], built: [...this.notesBuilt] });
    this.onInventoryChange?.({ ...this.inventory });
    return true;
  }

  // ---- PARTITURAS ----
  canSynthPartitura(tier: PartituraTier): boolean {
    const d = PARTITURA_DEFS[tier];
    return this.coins >= d.claves && this.totalFragments >= d.frags;
  }

  synthPartitura(tier: PartituraTier): boolean {
    const d = PARTITURA_DEFS[tier];
    if (!this.canSynthPartitura(tier)) return false;
    this.spendCoins(d.claves);
    if (d.frags > 0) this.spendFragments(d.frags);
    this.inventory[d.key] = (this.inventory[d.key] || 0) + 1;
    this.onInventoryChange?.({ ...this.inventory });
    this.onHarvestPopup?.(`♪ ${d.name} composta!`, this.player.x, this.player.y - 24);
    return true;
  }

  get partituraXpAvailable(): number {
    return PARTITURA_TIERS.reduce(
      (s, t) => s + (this.inventory[PARTITURA_DEFS[t].key] || 0) * PARTITURA_DEFS[t].xp,
      0,
    );
  }

  // "Subir de Nível" na ficha: SÓ sobe consumindo partituras do inventário —
  // nunca de graça, mesmo que XP acumulado (trilho de coleta) já esteja cheio.
  levelUpWithPartituras(): number {
    let levels = 0;
    let guard = 0;
    while (guard++ < 200) {
      const s = this.stats;
      // consome a menor partitura disponível
      const tier = PARTITURA_TIERS.find((t) => (this.inventory[PARTITURA_DEFS[t].key] || 0) > 0);
      if (!tier) break;
      const d = PARTITURA_DEFS[tier];
      this.inventory[d.key] -= 1;
      if (this.inventory[d.key] <= 0) delete this.inventory[d.key];
      s.xp += d.xp;
      if (s.xp >= s.xpNext) {
        this.applyLevelUp();
        levels++;
      }
    }
    this.onInventoryChange?.({ ...this.inventory });
    this.onStatsChange?.({ ...this.stats });
    if (levels > 0)
      this.onHarvestPopup?.(
        `Nível ${this.stats.level}! +${levels * 3} pontos`,
        this.player.x,
        this.player.y - 20,
      );
    return levels;
  }

  private applyLevelUp() {
    const s = this.stats;
    s.xp -= s.xpNext;
    s.level += 1;
    s.xpNext = Math.round(s.xpNext * 1.45);
    s.maxHp += 12;
    s.hp = s.maxHp;
    s.attrPoints += 3;
  }

  updateFragments(dt: number) {
    const px = this.player.x + 12;
    const py = this.player.y + 20;
    for (const f of this.fragmentPickups) {
      if (f.respawnAt > 0) {
        if (this.timeElapsed >= f.respawnAt) {
          Object.assign(f, this.makeFragment(f.id, f.note), { respawnAt: 0 });
        }
        continue;
      }
      f.bob += dt * 3;
      if (Math.hypot(px - f.x, py - f.y) < 26) {
        this.addFragment(f.note);
        this.onHarvestPopup?.(`+1 fragmento ${NOTE_NAMES[f.note]}`, f.x, f.y);
        for (let i = 0; i < 8; i++) this.addMiningSpark(f.x, f.y - 6);
        f.respawnAt = this.timeElapsed + 55 + Math.random() * 30;
      }
    }
  }

  // ---- MONSTROS / COMBATE ----
  private spawnEnemy(kind: string, c: number, r: number, id: number, level = 1): boolean {
    const g = this.ground[r]?.[c];
    if (g === undefined || g === 9000 || g === 9001) return false;
    const x = c * TILE_SIZE + 8;
    const y = r * TILE_SIZE + 8;
    if (this.checkSolidCollision({ x, y, w: 16, h: 12 })) return false;
    const def = ENEMY_DEFS[kind];
    const lvl = Math.max(1, Math.round(level));
    const hpMul = 1 + (lvl - 1) * 0.3;
    const dmgMul = 1 + (lvl - 1) * 0.25;
    const hp = Math.round(def.hp * hpMul);
    this.enemies.push({
      id: `enemy_${id}`,
      kind,
      hostile: def.hostile,
      note: def.note,
      x,
      y,
      homeX: x,
      homeY: y,
      hp,
      maxHp: hp,
      level: lvl,
      dmgMul,
      facingLeft: Math.random() < 0.5,
      state: 'idle',
      frame: 0,
      animTimer: Math.random() * 2,
      stateTimer: 0,
      attackCd: 0,
      hurtFlash: 0,
      knockX: 0,
      knockY: 0,
      wanderTarget: null,
      wanderTimer: Math.random() * 3,
      respawnAt: 0,
      hitBy: -1,
    });
    return true;
  }

  initEnemies() {
    this.enemies = [];
    let id = 0;
    // Monstros hostis em clusters de floresta longe da vila
    const hostiles = ['aranha', 'nocturno', 'maestro'];
    const clusters = [
      [12, 14], [22, 88], [10, 62], [40, 100], [64, 98],
      [128, 96], [124, 60], [90, 100],
    ];
    for (const [cc, rr] of clusters) {
      const kind = hostiles[Math.floor(Math.random() * hostiles.length)];
      const n = 2 + Math.floor(Math.random() * 3);
      // nível cresce com a distância da vila (spawn ~ col 36, row 29)
      const distTiles = Math.hypot(cc - 36, rr - 29);
      const baseLvl = 1 + Math.floor(distTiles / 26);
      for (let k = 0; k < n; k++) {
        this.spawnEnemy(
          kind,
          cc + Math.round((Math.random() - 0.5) * 8),
          rr + Math.round((Math.random() - 0.5) * 8),
          id++,
          baseLvl + Math.floor(Math.random() * 2)
        );
      }
    }
    // 12 Ecos no NORDESTE (parte superior direita do mapa)
    for (let i = 0; i < 12; i++) {
      for (let tries = 0; tries < 20; tries++) {
        const c = 92 + Math.floor(Math.random() * 46);
        const r = 4 + Math.floor(Math.random() * 34);
        if (this.spawnEnemy('eco_' + NOTE_KEY[i], c, r, id++)) break;
      }
    }

    // FLORESTA SOMBRIA — MUITOS monstros espalhados por toda a região
    const darkStartRow = DARK_START + 3;
    const darkEndRow = MAP_ROWS - 4;
    const darkKinds = ['aranha', 'nocturno', 'maestro', 'dama', 'colosso'];
    let placed = 0;
    for (let tries = 0; tries < 900 && placed < 130; tries++) {
      const c = 3 + Math.floor(Math.random() * (MAP_COLS - 6));
      const r = darkStartRow + Math.floor(Math.random() * (darkEndRow - darkStartRow));
      // colosso é raro (chefe)
      const roll = Math.random();
      const kind =
        roll < 0.06 ? 'colosso' : darkKinds[Math.floor(Math.random() * 4)];
      // nível base da Floresta Sombria: começa alto e cresce com a profundidade
      const depthLvl = 6 + Math.floor((r - DARK_START) / 7) + Math.floor(Math.random() * 3);
      const lvl = kind === 'colosso' ? depthLvl + 4 : depthLvl;
      if (this.spawnEnemy(kind, c, r, id++, lvl)) placed++;
    }
  }

  damagePlayer(n: number) {
    if (this.playerInvuln > 0) return;
    const s = this.stats;
    n = Math.max(1, Math.round(n));
    s.hp = Math.max(0, s.hp - n);
    this.playerHurtFlash = 0.35;
    this.playerInvuln = 0.7;
    this.addDamageText(this.player.x + 12, this.player.y - 4, `-${n}`, '#f87171', true);
    this.onStatsChange?.({ ...s });
    if (s.hp <= 0) {
      // renasce na vila
      s.hp = s.maxHp;
      this.player.x = this.spawnPoint.x;
      this.player.y = this.spawnPoint.y;
      this.player.actionState = 'idle';
      this.playerInvuln = 1.6;
      this.onStatsChange?.({ ...s });
      this.onHarvestPopup?.('Você tombou... de volta à Vila', this.spawnPoint.x, this.spawnPoint.y);
    }
  }

  tempDmgBuffT = 0; // Eco Final nv.5: pequeno bônus de dano temporário pós-kill

  damageEnemy(
    e: Enemy,
    dmg: number,
    fromX: number,
    fromY: number,
    opts: { crit?: boolean; isPulse?: boolean } = {},
  ) {
    if (e.state === 'dead') return;
    // Impacto Harmônico (Amplificação) — inimigo "com a DEF reduzida"
    if (e.harmonicDebuffT && e.harmonicDebuffT > 0) dmg *= 1 + (e.harmonicDebuffPct || 0);
    // Reverberação (Pulso Harmônico) — marca consumida pelo próximo golpe básico
    if (!opts.isPulse && e.reverbMarkHits && e.reverbMarkHits > 0) {
      dmg *= 1 + (e.reverbMarkPct || 0);
      e.reverbMarkHits -= 1;
    }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.hurtFlash = 0.2;
    this.addDamageText(
      e.x + 8,
      e.y - 12,
      (opts.crit ? '✦' : '') + String(dmg),
      opts.crit ? '#f472b6' : '#fde047',
      opts.crit,
    );
    const kd = Math.atan2(e.y - fromY, e.x - fromX);
    e.knockX = Math.cos(kd) * 90;
    e.knockY = Math.sin(kd) * 90;
    for (let i = 0; i < 6; i++) this.addMiningSpark(e.x + 8, e.y);
    if (e.hp <= 0) {
      e.state = 'dead';
      e.frame = 0;
      e.stateTimer = 0;
      const def = ENEMY_DEFS[e.kind];
      const lvlBonus = Math.floor((e.level - 1) / 2);
      const claves = def.claveMin + lvlBonus + Math.floor(Math.random() * (def.claveMax - def.claveMin + 1));
      const frags = def.fragMin + Math.floor(Math.random() * (def.fragMax - def.fragMin + 1));
      // dropa no CHÃO — não vai direto pro inventário (igual madeira/pedra)
      if (claves > 0) this.spawnDropScattered(e.x + 8, e.y, 'clave', claves);
      if (!e.hostile && e.note !== undefined) {
        // Eco dissipado: fragmentos DA SUA nota + poeira de eco
        this.spawnDropScattered(e.x + 8, e.y, 'frag_' + NOTE_KEY[e.note], frags, e.note);
        if (Math.random() < 0.5) this.spawnDrop(e.x + 8, e.y, 'eco_dust', 1 + Math.floor(Math.random() * 2));
      } else {
        for (let i = 0; i < frags; i++) {
          const n = Math.floor(Math.random() * 12);
          this.spawnDrop(e.x + 8, e.y, 'frag_' + NOTE_KEY[n], 1, n);
        }
      }
      // sem XP direto de kill — o XP vem das partituras (compostas de claves)
      e.respawnAt = this.timeElapsed + def.respawnSecs;
      // Eco Final — Pulso Harmônico derrotando um inimigo recupera cooldown
      // e (nv.5) concede um pequeno bônus de dano temporário
      if (opts.isPulse) {
        const restore = this.passiveValue('ecoFinal');
        if (restore > 0) this.resonanceCdT = Math.max(0, this.resonanceCdT - GameEngine.RESONANCE_COOLDOWN * restore);
        if (this.getPassiveLevel('ecoFinal') >= 5) this.tempDmgBuffT = 4;
      }
    } else {
      e.state = 'hurt';
      e.stateTimer = 0;
      e.frame = 0;
      // marca de Reverberação (só aplica em golpes do Pulso Harmônico)
      if (opts.isPulse) {
        const pct = this.passiveValue('reverberacao');
        if (pct > 0) {
          e.reverbMarkPct = pct;
          e.reverbMarkHits = this.getPassiveLevel('reverberacao') >= 5 ? 2 : 1;
        }
      }
    }
  }

  // Golpe corpo-a-corpo (chop/attack/spin) — cone à frente do herói
  applyMeleeHit(dmg: number, reach: number, opts: { crit?: boolean } = {}) {
    const cx = this.player.x + 12;
    const cy = this.player.y + 18;
    const dir = this.player.direction;
    const dvec =
      dir === 'left' ? [-1, 0] : dir === 'right' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
    reach *= this.meleeAreaMul;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (e.hitBy === this.timeElapsed) continue;
      const ex = e.x + 8;
      const ey = e.y;
      const d = Math.hypot(ex - cx, ey - cy);
      if (d > reach) continue;
      const dot = ((ex - cx) * dvec[0] + (ey - cy) * dvec[1]) / (d || 1);
      if (dot < 0.25 && d > 20) continue; // fora do cone
      e.hitBy = this.timeElapsed;
      this.damageEnemy(e, dmg, cx, cy, opts);
    }
  }

  // Dano do ataque básico (combo) — soma arma + stats + passivas + Ritmo Crescente
  basicAttackDamage(): number {
    const s = this.stats;
    let d = 8 + s.forca * 1.6 + s.level + this.weaponAtk;
    d *= this.basicAtkMul;
    if (this.comboStacks > 0) d *= 1 + this.comboStacks * this.passiveValue('ritmoCrescente');
    if (this.resonanceActive) d *= 1.35;
    if (this.tempDmgBuffT > 0) d *= 1.15;
    return d;
  }

  private rollCrit(): boolean {
    this.critCounter++;
    const lvl = this.getPassiveLevel('notaPerfeita');
    const need = lvl > 0 ? PASSIVE_DEFS.notaPerfeita.values[lvl - 1] : Infinity;
    if (this.critCounter >= need) {
      this.critCounter = 0;
      return true;
    }
    return Math.random() < 0.05 + this.critChanceBonus;
  }

  private onComboHitLanded() {
    this.comboStacks = Math.min(5, this.comboStacks + 1);
    if (this.comboStacks >= 5 && this.getPassiveLevel('ritmoCrescente') >= 5) {
      this.triggerHarmonicBurst();
      this.comboStacks = 0;
    }
    if (this.resonanceActive && this.getPassiveLevel('pulsoAcelerado') >= 5) {
      this.resonanceCdT = Math.max(0, this.resonanceCdT - 0.15);
    }
  }

  // Ritmo Crescente nv.5: pequena explosão harmônica ao 5º acúmulo
  private triggerHarmonicBurst() {
    const cx = this.player.x + 12;
    const cy = this.player.y + 18;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (Math.hypot(e.x + 8 - cx, e.y - cy) < 70) {
        this.damageEnemy(e, this.basicAttackDamage() * 0.6, cx, cy);
      }
    }
    for (let i = 0; i < 14; i++)
      this.addMiningSpark(cx + (Math.random() - 0.5) * 50, cy + (Math.random() - 0.5) * 50);
  }

  private applyImpactoHarmonico(e: Enemy) {
    const pct = this.passiveValue('impactoHarmonico');
    if (pct <= 0) return;
    e.harmonicDebuffPct = pct;
    e.harmonicDebuffT = this.getPassiveLevel('impactoHarmonico') >= 5 ? 5 : 3;
  }

  // Skill 2 — Amplificação: a arma cresce muito (visual por código) e golpeia
  // em área. Dano maior que o básico, atinge vários inimigos.
  amplifyAttack() {
    const cx = this.player.x + 12;
    const cy = this.player.y + 18;
    const dir = this.player.direction;
    const dvec =
      dir === 'left' ? [-1, 0] : dir === 'right' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
    const reach = 92 * this.meleeAreaMul;
    const hits: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.hitBy === this.timeElapsed) continue;
      const ex = e.x + 8;
      const ey = e.y;
      const d = Math.hypot(ex - cx, ey - cy);
      if (d > reach) continue;
      const dot = ((ex - cx) * dvec[0] + (ey - cy) * dvec[1]) / (d || 1);
      if (dot < 0.15 && d > 24) continue;
      hits.push(e);
    }
    let dmg =
      (12 + this.stats.forca * 2.2 + this.stats.level * 1.5 + this.weaponAtk * 1.3) *
      this.basicAtkMul *
      this.skillDmgMul;
    if (hits.length >= 2) dmg *= 1 + this.passiveValue('campoHarmonico');
    for (const e of hits) {
      e.hitBy = this.timeElapsed;
      this.damageEnemy(e, dmg, cx, cy);
      this.applyImpactoHarmonico(e);
    }
    if (hits.length >= 3 && this.getPassiveLevel('campoHarmonico') >= 5) {
      for (const e of hits) this.damageEnemy(e, dmg * 0.35, cx, cy);
    }
    for (let i = 0; i < 10; i++)
      this.addMiningSpark(cx + dvec[0] * 40 + (Math.random() - 0.5) * 20, cy + dvec[1] * 30);
  }

  private updateSkillTimers(dt: number) {
    if (this.resonanceActive) {
      this.resonanceT -= dt;
      if (this.resonanceT <= 0) {
        this.resonanceActive = false;
        this.resonanceT = 0;
      }
    }
    if (this.resonanceCdT > 0) this.resonanceCdT = Math.max(0, this.resonanceCdT - dt);
    if (this.pulseCdT > 0) this.pulseCdT = Math.max(0, this.pulseCdT - dt);
    if (this.tempDmgBuffT > 0) this.tempDmgBuffT = Math.max(0, this.tempDmgBuffT - dt);
    // combo quebra se ficar muito tempo sem atacar
    if (this.comboIndex !== 0 || this.comboStacks !== 0) {
      if (this.timeElapsed - this.lastAttackAt > 1.2) {
        this.comboIndex = 0;
        this.comboStacks = 0;
      }
    }
    // decai debuffs/marcas dos inimigos
    for (const e of this.enemies) {
      if (e.harmonicDebuffT && e.harmonicDebuffT > 0) {
        e.harmonicDebuffT -= dt;
        if (e.harmonicDebuffT <= 0) {
          e.harmonicDebuffT = 0;
          e.harmonicDebuffPct = 0;
        }
      }
    }
  }

  // Skill 1 — Ressonância: buff temporário (energiza a arma + acelera ataques)
  activateResonance(): boolean {
    if (this.resonanceCdT > 0 || this.resonanceActive) return false;
    this.resonanceActive = true;
    this.resonanceT = GameEngine.RESONANCE_DURATION;
    this.resonanceCdT = GameEngine.RESONANCE_COOLDOWN * this.cooldownMul;
    for (let i = 0; i < 12; i++)
      this.addMiningSpark(
        this.player.x + 12 + (Math.random() - 0.5) * 22,
        this.player.y + 4 + (Math.random() - 0.5) * 22,
      );
    return true;
  }

  fireLightCannon() {
    if (this.pulseCdT > 0) return;
    this.pulseCdT = GameEngine.PULSE_COOLDOWN * this.cooldownMul;
    const dir = this.player.direction;
    const dvec =
      dir === 'left' ? [-1, 0] : dir === 'right' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
    const dmg = (14 + this.stats.inteligencia * 2.5 + this.stats.level * 2) * this.skillDmgMul;
    const speed = 360;
    this.lightBeams.push({
      x: this.player.x + 12 + dvec[0] * 16,
      y: this.player.y + 12 + dvec[1] * 12,
      vx: dvec[0] * speed,
      vy: dvec[1] * speed,
      life: 0,
      maxLife: 1.3,
      dmg,
      hitIds: [],
    });
    // flash de disparo (partículas azuis)
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x + 12 + dvec[0] * 14,
        y: this.player.y + 12 + dvec[1] * 12,
        vx: dvec[0] * (40 + Math.random() * 60) + (Math.random() - 0.5) * 30,
        vy: dvec[1] * (40 + Math.random() * 60) + (Math.random() - 0.5) * 30,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 2,
        color: 'rgba(150, 220, 255, ',
        alpha: 1,
      });
    }
  }

  updateLightBeams(dt: number) {
    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const b = this.lightBeams[i];
      b.life += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // a luz atravessa a vegetação; só o tempo de vida e os inimigos a param
      let dead = b.life >= b.maxLife;
      for (const e of this.enemies) {
        if (e.state === 'dead' || b.hitIds.includes(e.id)) continue;
        if (Math.hypot(e.x + 8 - b.x, e.y - b.y) < 24) {
          b.hitIds.push(e.id);
          this.damageEnemy(e, b.dmg, b.x - b.vx * 0.1, b.y - b.vy * 0.1, { isPulse: true });
        }
      }
      if (dead) {
        // Fluxo Sonoro nv.5: acertar vários inimigos com o Pulso reduz o
        // próprio cooldown um pouco mais
        if (b.hitIds.length >= 2 && this.getPassiveLevel('fluxoSonoro') >= 5) {
          this.pulseCdT = Math.max(0, this.pulseCdT - 0.4);
        }
        this.lightBeams.splice(i, 1);
      }
    }
  }

  updateEnemies(dt: number) {
    if (this.playerHurtFlash > 0) this.playerHurtFlash = Math.max(0, this.playerHurtFlash - dt);
    if (this.playerInvuln > 0) this.playerInvuln = Math.max(0, this.playerInvuln - dt);
    const px = this.player.x + 12;
    const py = this.player.y + 18;

    for (const e of this.enemies) {
      const def = ENEMY_DEFS[e.kind];

      // Fora de vista: só conta respawn, congela IA (perf)
      const farSq = (px - e.x) ** 2 + (py - e.y) ** 2;
      if (farSq > 1100 * 1100) {
        if (e.state === 'dead' && e.respawnAt > 0 && this.timeElapsed >= e.respawnAt) {
          e.state = 'idle';
          e.hp = e.maxHp;
          e.x = e.homeX;
          e.y = e.homeY;
          e.respawnAt = 0;
          e.frame = 0;
        }
        continue;
      }

      e.animTimer += dt;
      if (e.hurtFlash > 0) e.hurtFlash = Math.max(0, e.hurtFlash - dt);

      // knockback residual
      if (Math.abs(e.knockX) > 1 || Math.abs(e.knockY) > 1) {
        const nx = e.x + e.knockX * dt;
        const ny = e.y + e.knockY * dt;
        if (!this.checkSolidCollision({ x: nx, y: ny, w: 16, h: 12 })) {
          e.x = nx;
          e.y = ny;
        }
        e.knockX *= 0.86;
        e.knockY *= 0.86;
      }

      if (e.state === 'dead') {
        e.stateTimer += dt;
        e.frame = Math.min(def.cols - 1, Math.floor(e.stateTimer * 8));
        if (e.respawnAt > 0 && this.timeElapsed >= e.respawnAt) {
          e.state = 'idle';
          e.hp = e.maxHp;
          e.x = e.homeX;
          e.y = e.homeY;
          e.respawnAt = 0;
          e.frame = 0;
        }
        continue;
      }

      if (e.state === 'hurt') {
        e.stateTimer += dt;
        e.frame = Math.min(def.cols - 1, Math.floor(e.stateTimer * 12));
        if (e.stateTimer > 0.3) e.state = 'chase';
        continue;
      }

      const dToPlayer = Math.hypot(px - (e.x + 8), py - e.y);

      if (e.state === 'attack') {
        e.stateTimer += dt;
        e.frame = Math.min(def.cols - 1, Math.floor(e.stateTimer * 10));
        if (e.stateTimer > 0.25 && e.stateTimer - dt <= 0.25) {
          if (dToPlayer < def.attackRange + 10)
            this.damagePlayer(Math.round(def.touchDamage * e.dmgMul));
        }
        if (e.stateTimer > 0.6) {
          e.state = 'chase';
          e.attackCd = def.attackCd;
        }
        continue;
      }

      if (e.attackCd > 0) e.attackCd -= dt;

      // aggro (só monstros hostis perseguem/atacam)
      if (def.hostile && dToPlayer < def.aggro) {
        if (dToPlayer <= def.attackRange && e.attackCd <= 0) {
          e.state = 'attack';
          e.stateTimer = 0;
          e.frame = 0;
          e.facingLeft = px < e.x;
          continue;
        }
        e.state = 'chase';
        const ang = Math.atan2(py - e.y, px - (e.x + 8));
        const sx = Math.cos(ang) * def.speed * dt;
        const sy = Math.sin(ang) * def.speed * dt;
        if (!this.checkSolidCollision({ x: e.x + sx, y: e.y + sy, w: 16, h: 12 })) {
          e.x += sx;
          e.y += sy;
        } else if (!this.checkSolidCollision({ x: e.x + sx, y: e.y, w: 16, h: 12 })) {
          e.x += sx;
        } else if (!this.checkSolidCollision({ x: e.x, y: e.y + sy, w: 16, h: 12 })) {
          e.y += sy;
        }
        e.facingLeft = Math.cos(ang) < 0;
        e.frame = Math.floor(e.animTimer * 9) % def.cols;
        // contato direto
        if (dToPlayer < 22 && e.attackCd <= 0) {
          this.damagePlayer(Math.round(def.touchDamage * 0.6 * e.dmgMul));
          e.attackCd = def.attackCd;
        }
      } else {
        // vagueia perto de casa
        e.wanderTimer -= dt;
        if (!e.wanderTarget || e.wanderTimer <= 0) {
          e.wanderTarget = {
            x: e.homeX + (Math.random() - 0.5) * 140,
            y: e.homeY + (Math.random() - 0.5) * 140,
          };
          e.wanderTimer = 2 + Math.random() * 3;
        }
        const wdx = e.wanderTarget.x - e.x;
        const wdy = e.wanderTarget.y - e.y;
        const wd = Math.hypot(wdx, wdy);
        if (wd > 6) {
          const sx = (wdx / wd) * def.speed * 0.4 * dt;
          const sy = (wdy / wd) * def.speed * 0.4 * dt;
          if (!this.checkSolidCollision({ x: e.x + sx, y: e.y + sy, w: 16, h: 12 })) {
            e.x += sx;
            e.y += sy;
          } else e.wanderTarget = null;
          e.facingLeft = wdx < 0;
          e.state = 'walk';
          e.frame = Math.floor(e.animTimer * 6) % def.cols;
        } else {
          e.state = 'idle';
          e.frame = Math.floor(e.animTimer * 4) % def.cols;
        }
      }
    }
  }

  // ---- NPCs COM ROTA ----
  private updateBubbles(_dt: number, px: number, py: number) {
    const now = this.timeElapsed;
    // expira balões
    this.bubbles = this.bubbles.filter((b) => now - b.born < b.ttl);

    // NPC mais próximo dentro do raio de "bark" (maior que o de conversa)
    let barkNpc: NPC | null = null;
    let bd = 128;
    for (const n of this.npcs) {
      if (n.spriteType === 'merchant' || !n.barks || !n.barks.length) continue;
      const d = Math.hypot(px - (n.x + n.width / 2), py - (n.y + n.height / 2));
      if (d < bd) {
        bd = d;
        barkNpc = n;
      }
    }
    const id = barkNpc?.id ?? null;
    if (id && id !== this.barkNpcInRange) {
      // acabou de entrar no raio deste NPC
      if (now >= (this.npcBarkCd[id] ?? 0) && !this.talkingNpcId) {
        const line = barkNpc!.barks![Math.floor(Math.random() * barkNpc!.barks!.length)];
        this.bubbles.push({ who: 'npc', npcId: id, text: line, born: now, ttl: 4.2 });
        this.npcBarkCd[id] = now + 18 + Math.random() * 10;
        // Akles às vezes responde
        if (Math.random() < 0.5) {
          const reply =
            GameEngine.AKLES_BARKS[Math.floor(Math.random() * GameEngine.AKLES_BARKS.length)];
          this.pendingAklesReply = { text: reply, at: now + 1.6 };
        }
      }
    }
    this.barkNpcInRange = id;

    if (this.pendingAklesReply && now >= this.pendingAklesReply.at) {
      this.bubbles.push({
        who: 'akles',
        text: this.pendingAklesReply.text,
        born: now,
        ttl: 3.6,
      });
      this.pendingAklesReply = null;
    }
  }

  updateNpcs(dt: number) {
    for (const npc of this.npcs) {
      if (npc.spriteType === 'merchant') continue;
      const talking = this.talkingNpcId === npc.id;
      const route = npc.route;
      if (talking || !route || route.length < 2) {
        npc.isMoving = false;
        npc.stepTimer += dt * 3;
        continue;
      }
      if ((npc.routePause ?? 0) > 0) {
        npc.routePause = (npc.routePause ?? 0) - dt;
        npc.isMoving = false;
        npc.stepTimer += dt * 3;
        continue;
      }
      const idx = npc.routeIdx ?? 0;
      const target = route[idx];
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        npc.routeIdx = (idx + 1) % route.length;
        npc.routePause = 0.6 + Math.random() * 2.2;
        npc.isMoving = false;
        continue;
      }
      const sp = npc.speed || 42;
      const nx = dx / dist;
      const ny = dy / dist;
      const stepX = nx * sp * dt;
      const stepY = ny * sp * dt;
      const col = npc.collider;
      const box = {
        x: npc.x + stepX + col.offsetX,
        y: npc.y + stepY + col.offsetY,
        w: col.w,
        h: col.h,
      };
      if (this.checkSolidCollision(box)) {
        npc.routeIdx = (idx + 1) % route.length;
        npc.routePause = 0.4;
      } else {
        npc.x += stepX;
        npc.y += stepY;
      }
      npc.isMoving = true;
      npc.direction =
        Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 'right' : 'left') : ny > 0 ? 'down' : 'up';
      npc.stepTimer += dt * 8;
    }
  }

  get carryWeight() {
    return inventoryWeight(this.inventory);
  }

  // Retorna quanto foi realmente adicionado (limitado pelo peso máximo)
  addToInventory(item: string, qty: number): number {
    if (qty <= 0) return 0;
    const unit = ITEM_META[item]?.weight ?? 1;
    const free = MAX_CARRY_WEIGHT - this.carryWeight;
    const fits = unit > 0 ? Math.floor((free + 1e-6) / unit) : qty;
    const add = Math.max(0, Math.min(qty, fits));
    if (add <= 0) {
      this.onHarvestPopup?.('Mochila cheia!', this.player.x, this.player.y);
      return 0;
    }
    this.inventory[item] = (this.inventory[item] || 0) + add;
    this.onInventoryChange?.({ ...this.inventory });
    return add;
  }

  // Botão de poção: usa automaticamente o item de cura mais "econômico" que
  // ainda ajude (frutinha etc.). Retorna true se curou.
  useHealingItem(): boolean {
    const s = this.stats;
    if (s.hp >= s.maxHp) {
      this.addDamageText(this.player.x + 12, this.player.y - 8, 'vida cheia', '#94a3b8');
      return false;
    }
    const missing = s.maxHp - s.hp;
    let bestKey: string | null = null;
    let bestHeal = Infinity;
    let anyKey: string | null = null;
    let anyHeal = 0;
    for (const [k, qty] of Object.entries(this.inventory)) {
      if (qty <= 0) continue;
      const heal = ITEM_META[k]?.heal;
      if (!heal || heal <= 0) continue;
      if (heal > anyHeal) { anyHeal = heal; anyKey = k; }
      if (heal >= missing && heal < bestHeal) { bestHeal = heal; bestKey = k; }
    }
    const key = bestKey ?? anyKey;
    if (!key) {
      this.addDamageText(this.player.x + 12, this.player.y - 8, 'sem cura', '#f59e0b');
      return false;
    }
    const heal = ITEM_META[key]!.heal!;
    this.inventory[key] -= 1;
    if (this.inventory[key] <= 0) delete this.inventory[key];
    s.hp = Math.min(s.maxHp, s.hp + heal);
    this.onInventoryChange?.({ ...this.inventory });
    this.onStatsChange?.({ ...s });
    this.addDamageText(this.player.x + 12, this.player.y - 10, `+${heal}`, '#4ade80');
    for (let i = 0; i < 10; i++) this.addMiningSpark(this.player.x + 12, this.player.y + 6);
    return true;
  }

  private harvestReach() {
    return 62;
  }

  findNearestHarvestable(kind: 'tree' | 'rock' | 'any'): WorldProp | null {
    const px = this.player.x + 12;
    const py = this.player.y + 24;
    let best: WorldProp | null = null;
    let bestD = this.harvestReach();
    for (const p of this.props) {
      const h = p.harvest;
      if (!h || h.downUntil > 0) continue;
      if (kind !== 'any' && h.kind !== kind) continue;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h * 0.75;
      const d = Math.hypot(px - cx, py - cy);
      if (d <= bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  // Botão único de coleta: escolhe machado/picareta pelo recurso mais próximo
  harvestAction() {
    if (['chop', 'mine', 'attack', 'spin', 'cast'].includes(this.player.actionState as string)) return;
    const tree = this.findNearestHarvestable('tree');
    const rock = this.findNearestHarvestable('rock');
    if (tree && !rock) return this.triggerAction('chop');
    if (rock && !tree) return this.triggerAction('mine');
    if (tree && rock) {
      const px = this.player.x + 12;
      const py = this.player.y + 24;
      const dt = Math.hypot(px - (tree.x + tree.w / 2), py - (tree.y + tree.h * 0.75));
      const dr = Math.hypot(px - (rock.x + rock.w / 2), py - (rock.y + rock.h * 0.75));
      return this.triggerAction(dt <= dr ? 'chop' : 'mine');
    }
    // nada por perto: ainda faz o gesto pra dar feedback
    this.triggerAction('chop');
  }

  // Durante 'chop'/'mine' a ferramenta (não o Akles) faz o movimento.
  get isToolHarvest() {
    return this.player.actionState === 'chop' || this.player.actionState === 'mine';
  }

  equipTool(kind: 'axe' | 'pick', tier: ToolTier) {
    const owned = kind === 'axe' ? this.ownedAxes : this.ownedPicks;
    if (!owned.includes(tier)) return;
    if (kind === 'axe') this.equippedAxe = tier;
    else this.equippedPick = tier;
    this.saveTools();
    this.onToolsChange?.({ axe: this.equippedAxe, pick: this.equippedPick });
  }

  private saveTools() {
    try {
      localStorage.setItem(
        'acordelot_tools_v1',
        JSON.stringify({ axe: this.equippedAxe, pick: this.equippedPick }),
      );
    } catch {}
  }

  loadTools() {
    try {
      const raw = localStorage.getItem('acordelot_tools_v1');
      if (!raw) return;
      const t = JSON.parse(raw);
      const tiers = GameEngine.TOOL_TIERS;
      if (tiers.includes(t.axe)) this.equippedAxe = t.axe;
      if (tiers.includes(t.pick)) this.equippedPick = t.pick;
    } catch {}
  }

  // ---- Drops no chão (claves, fragmentos, madeira, pedra...) — como o resto
  // dos jogos: o item cai no chão e o jogador anda por cima pra coletar. ----
  groundDrops: Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    item: string;
    qty: number;
    note?: number; // p/ drops de fragmento (índice da nota)
    bob: number;
    born: number;
  }> = [];
  private dropSeq = 0;

  spawnDrop(x: number, y: number, item: string, qty: number, note?: number) {
    if (qty <= 0) return;
    const ang = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 70;
    this.groundDrops.push({
      id: `drop_${this.dropSeq++}`,
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.6 - 20,
      item,
      qty,
      note,
      bob: Math.random() * 6.28,
      born: this.timeElapsed,
    });
  }

  // divide uma quantidade em 1-3 pilhas espalhadas (visual mais rico)
  private spawnDropScattered(x: number, y: number, item: string, qty: number, note?: number) {
    if (qty <= 0) return;
    const piles = qty > 4 ? 2 + Math.floor(Math.random() * 2) : 1;
    let left = qty;
    for (let i = 0; i < piles; i++) {
      const take = i === piles - 1 ? left : Math.max(1, Math.round(qty / piles));
      this.spawnDrop(x, y, item, Math.min(left, take), note);
      left -= take;
      if (left <= 0) break;
    }
  }

  private collectDrop(item: string, qty: number, note: number | undefined, x: number, y: number) {
    if (item === 'clave') this.addCoins(qty);
    else if (item.startsWith('frag_') && note !== undefined) this.addFragment(note, qty);
    else this.addToInventory(item, qty);
    for (let i = 0; i < 4; i++) this.addMiningSpark(x, y - 4);
  }

  private updateGroundDrops(dt: number) {
    if (!this.groundDrops.length) return;
    const px = this.player.x + 12;
    const py = this.player.y + 24;
    for (const d of this.groundDrops) {
      d.bob += dt * 4;
      const age = this.timeElapsed - d.born;
      // atrito nos primeiros instantes (o "salto" ao cair)
      if (age < 0.4) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx *= 1 - Math.min(1, dt * 6);
        d.vy *= 1 - Math.min(1, dt * 6);
      }
      // ímã: perto do jogador, puxa
      const dist = Math.hypot(px - d.x, py - d.y);
      if (age > 0.15 && dist < 62) {
        const pull = dist < 16 ? 900 : 320;
        const nx = (px - d.x) / (dist || 1);
        const ny = (py - d.y) / (dist || 1);
        d.x += nx * pull * dt;
        d.y += ny * pull * dt;
      }
    }
    // coleta
    this.groundDrops = this.groundDrops.filter((d) => {
      const dist = Math.hypot(px - d.x, py - d.y);
      if (dist < 15) {
        this.collectDrop(d.item, d.qty, d.note, d.x, d.y);
        return false;
      }
      return true;
    });
  }

  private renderGroundDrops(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const d of this.groundDrops) {
      const sx = d.x - camX;
      const sy = d.y - camY;
      if (sx < -30 || sx > this.viewportW + 30 || sy < -30 || sy > this.viewportH + 30) continue;
      const bobY = Math.sin(d.bob) * 2;
      const meta = ITEM_META[d.item];
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 7, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      const img = this.assets && meta?.img ? this.dropImgCache(meta.img) : null;
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, sx - 8, sy - 8 + bobY, 16, 16);
      } else {
        ctx.fillStyle = d.item === 'clave' ? '#fbbf24' : d.item.startsWith('frag_') ? '#a855f7' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(sx, sy + bobY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (d.qty > 1) {
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(String(d.qty), sx + 7, sy + 10 + bobY);
        ctx.fillText(String(d.qty), sx + 7, sy + 10 + bobY);
      }
      ctx.restore();
    }
  }

  private dropImgCacheMap: Record<string, HTMLImageElement> = {};
  private dropImgCache(src: string): HTMLImageElement {
    let img = this.dropImgCacheMap[src];
    if (!img) {
      img = new Image();
      img.src = src;
      this.dropImgCacheMap[src] = img;
    }
    return img;
  }

  private applyHarvestHit() {
    const kind: 'tree' | 'rock' = this.player.actionState === 'mine' ? 'rock' : 'tree';
    const node = this.findNearestHarvestable(kind);
    if (!node || !node.harvest) return;
    const h = node.harvest;

    h.hp -= 1;
    h.hitFlash = 0.16;
    h.shake = 0.32;

    // impacto visual
    const ix = node.x + node.w / 2;
    const iy = node.y + node.h * 0.55;
    if (h.kind === 'tree') {
      for (let i = 0; i < 5; i++) this.addForestLeaf(ix + (Math.random() - 0.5) * 20, iy);
    } else {
      this.addMiningSpark(ix, iy);
      this.addMiningSpark(ix + 4, iy - 4);
    }

    // golpe: derruba 1 unidade no chão (não vai direto pro inventário)
    this.spawnDropScattered(ix, iy, h.drop, 1);
    this.gainXp(3);

    if (h.hp <= 0) {
      const bonus = h.dropMin + Math.floor(Math.random() * (h.dropMax - h.dropMin + 1));
      this.spawnDropScattered(ix, iy, h.drop, bonus);
      this.gainXp(h.kind === 'rock' ? 14 : 9);
      h.downUntil = this.timeElapsed + h.respawnSecs;
      h.hp = 0;
      this.gridDirty = true;
      // poeira/folhas da queda
      for (let i = 0; i < 14; i++) {
        if (h.kind === 'tree') this.addForestLeaf(ix + (Math.random() - 0.5) * 40, iy - Math.random() * 20);
        else this.addFootstepDust(ix + (Math.random() - 0.5) * 30, node.y + node.h - 6);
      }
    }
  }

  updateHarvestables(dt: number) {
    for (const p of this.props) {
      const h = p.harvest;
      if (!h) continue;
      if (h.hitFlash > 0) h.hitFlash = Math.max(0, h.hitFlash - dt);
      if (h.shake > 0) h.shake = Math.max(0, h.shake - dt);
      if (h.downUntil > 0 && this.timeElapsed >= h.downUntil) {
        h.downUntil = 0;
        h.hp = h.maxHp;
        this.gridDirty = true;
        // brotinho de volta
        for (let i = 0; i < 6; i++)
          this.addForestLeaf(p.x + p.w / 2 + (Math.random() - 0.5) * 16, p.y + p.h * 0.6);
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.unbindEvents();
  }

  loop = (currentTime: number) => {
    if (!this.isRunning) return;
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    this.timeElapsed += dt;
    if (this.gridDirty) this.rebuildColliderGrid();

    // ciclo de dia/noite automático
    if (this.autoDayCycle) {
      const prev = this.dayClock;
      this.dayClock = (this.dayClock + dt / GameEngine.DAY_LENGTH) % 1;
      // notifica o HUD ~2x por segundo
      if (Math.floor(prev * 240) !== Math.floor(this.dayClock * 240)) {
        this.onDayClockChange?.(this.dayClock);
      }
    }

    this.shrineTimer += dt;
    if (this.shrineTimer > 0.11) {
      this.shrineTimer = 0;
      this.shrineFrame = (this.shrineFrame + 1) % 8;
    }

    this.chaliceTimer += dt;
    if (this.chaliceTimer > 0.1) {
      this.chaliceTimer = 0;
      this.chaliceFrame = (this.chaliceFrame + 1) % 8;
    }

    this.merchantTimer += dt;
    if (this.merchantTimer > 0.13) {
      this.merchantTimer = 0;
      this.merchantFrame = (this.merchantFrame + 1) % 8;
    }

    // Personagem em ação ativa (coleta, ataque, giro, magia)
    const act = this.player.actionState;
    const isBusy =
      act === 'chop' || act === 'mine' || act === 'attack' || act === 'spin' || act === 'cast';

    if (isBusy) {
      const meta = AKLES_ANIM[act as AklesAction];
      this.player.isMoving = false;
      this.player.vx = 0;
      this.player.vy = 0;
      // Pulso Acelerado: ataques básicos mais rápidos enquanto Ressonância ativa
      const atkSpeedMul =
        act === 'attack' && this.resonanceActive ? 1 + this.passiveValue('pulsoAcelerado') : 1;
      this.player.actionTimer = (this.player.actionTimer || 0) + dt * meta.fps * atkSpeedMul;
      this.player.frame = Math.min(meta.cols - 1, Math.floor(this.player.actionTimer));

      // Coleta: Akles NÃO se mexe — só a ferramenta bate. Guarda o alvo p/ a fx.
      if (act === 'chop' || act === 'mine') {
        this.harvestFxNode = this.findNearestHarvestable(act === 'mine' ? 'rock' : 'tree');
      }

      // Golpe conecta no frame de impacto (uma vez por ação)
      if (!this.actionHitDone && this.player.frame >= 2) {
        this.actionHitDone = true;
        if (act === 'chop' || act === 'mine') this.applyHarvestHit();
        if (act === 'chop') this.applyMeleeHit(8 + this.stats.forca * 1.6 + this.stats.level, 46);
        if (act === 'attack') {
          const crit = this.rollCrit();
          let dmg = this.basicAttackDamage();
          if (crit) dmg *= 1.6;
          this.applyMeleeHit(dmg, 46, { crit });
          this.onComboHitLanded();
        }
        if (act === 'spin') this.amplifyAttack(); // Skill 2 — Amplificação
        if (act === 'cast') this.fireLightCannon(); // Skill 3 — Pulso Harmônico
      }

      // Partículas de impacto nos frames centrais
      if ((this.player.frame === 2 || this.player.frame === 3) && Math.random() < 0.5) {
        if (act === 'chop') this.addForestLeaf(this.player.x + 16, this.player.y + 12);
        else if (act === 'mine') this.addMiningSpark(this.player.x + 18, this.player.y + 16);
        else if (act === 'cast') this.addMiningSpark(this.player.x + 20, this.player.y + 10);
      }

      if (this.player.actionTimer >= meta.cols) {
        this.player.actionState = 'idle';
        this.player.actionTimer = 0;
        this.player.frame = 0;
        this.harvestFxNode = null;
      }
    } else {
      // Normal Player Movement
      let moveX = 0;
      let moveY = 0;

      if (!this.isTalkingToMerchant) {
        if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w']) moveY -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s']) moveY += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d']) moveX += 1;

        if (Math.abs(this.touchVector.x) > 0.15) moveX = this.touchVector.x;
        if (Math.abs(this.touchVector.y) > 0.15) moveY = this.touchVector.y;
      }

      const len = Math.hypot(moveX, moveY);
      // corrida: Shift (teclado) ou analógico quase no talo (celular)
      const sprintKey =
        !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['shift']);
      const touchMag = Math.hypot(this.touchVector.x, this.touchVector.y);
      const sprintTouch = touchMag > 0.82;
      this.heroRunning = len > 0.05 && (sprintKey || sprintTouch);
      // base mais rápida + escala com Agilidade (pontos de habilidade)
      const speed =
        (150 + this.stats.agilidade * 7) * (this.heroRunning ? 1.7 : 1) * this.moveSpeedMul;

      if (len > 0.05) {
        this.player.isMoving = true;
        this.player.actionState = 'walk';
        const nx = moveX / len;
        const ny = moveY / len;
        this.player.vx = nx * speed;
        this.player.vy = ny * speed;

        if (Math.abs(moveX) > Math.abs(moveY)) {
          this.player.direction = moveX > 0 ? 'right' : 'left';
        } else {
          this.player.direction = moveY > 0 ? 'down' : 'up';
        }

        this.player.stepTimer += dt * (this.heroRunning ? 12 : 8);
        this.player.frame = Math.floor(this.player.stepTimer) % 4;

        this.footstepTimer += dt;
        if (this.footstepTimer > 0.22) {
          this.footstepTimer = 0;
          this.addFootstepDust(this.player.x + 12, this.player.y + 28);
        }
      } else {
        this.player.isMoving = false;
        this.player.actionState = 'idle';
        this.heroRunning = false;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.stepTimer += dt * 3.5;
        this.player.frame = Math.floor(this.player.stepTimer) % 4;
      }
    }

    this.moveCharacterWithCollision(this.player, dt);
    this.updateCompanion(dt);
    this.updateNpcs(dt);
    this.updateFragments(dt);
    this.updateEnemies(dt);
    this.updateLightBeams(dt);

    // Quem é o NPC mais próximo do herói?
    const px = this.player.x + 12;
    const py = this.player.y + 20;
    let near: NPC | null = null;
    let nearD = 74;
    for (const n of this.npcs) {
      const d = Math.hypot(px - (n.x + n.width / 2), py - (n.y + n.height / 2));
      if (d < nearD) {
        nearD = d;
        near = n;
      }
    }
    const nearId = near?.id ?? null;
    if (nearId !== this.nearestNpcId) {
      this.nearestNpcId = nearId;
      this.isNearMerchant = near?.spriteType === 'merchant';
      this.emitInteraction();
    }
    if (!near && this.talkingNpcId) {
      this.talkingNpcId = null;
      this.isTalkingToMerchant = false;
      this.emitInteraction();
    }

    this.updateBubbles(dt, px, py);

    // Camera follow
    if (!this.isDragging) {
      const targetCamX = this.player.x + 12 - this.viewportW / 2;
      const targetCamY = this.player.y + 16 - this.viewportH / 2;
      const lerpFactor = 1 - Math.exp(-dt * 6.5);
      this.camX += (targetCamX - this.camX) * lerpFactor;
      this.camY += (targetCamY - this.camY) * lerpFactor;
      this.clampCamera();
    }

    // Atmosphere
    this.updateParticles(dt);
    this.updateButterflies(dt);
    this.updateFireflies(dt);
    this.updateHarvestables(dt);
    this.updateWeatherAndWind(dt);
    this.updateDamageTexts(dt);
    this.updateGroundDrops(dt);
    this.updateSkillTimers(dt);

    if (Math.random() < 0.18) {
      this.addBlossomPetal(
        (8 + Math.random() * 24) * TILE_SIZE,
        (32 + Math.random() * 16) * TILE_SIZE
      );
    }
    if (Math.random() < 0.15) {
      this.addForestLeaf(
        (8 + Math.random() * 56) * TILE_SIZE,
        (6 + Math.random() * 42) * TILE_SIZE
      );
    }

    // Chimney smoke
    const bakery = this.props.find((p) => p.type === 'bldgBakeryFront');
    if (bakery && Math.random() < 0.08) {
      this.addChimneySmoke(bakery.x + 88, bakery.y + 8);
    }
    const blacksmith = this.props.find((p) => p.type === 'blacksmithFront');
    if (blacksmith && Math.random() < 0.12) {
      this.addChimneySmoke(blacksmith.x + 95, blacksmith.y + 12);
    }
  }

  updateCompanion(dt: number) {
    const comp = this.companion;
    const targetX = this.player.x - (this.player.direction === 'right' ? 24 : -24);
    const targetY = this.player.y + 4;

    const dx = targetX - comp.x;
    const dy = targetY - comp.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 35) {
      comp.isMoving = true;
      comp.facingLeft = dx < 0;
      const speed = dist > 100 ? 155 : 115;
      comp.vx = (dx / dist) * speed;
      comp.vy = (dy / dist) * speed;
      comp.x += comp.vx * dt;
      comp.y += comp.vy * dt;

      comp.stepTimer += dt * 9;
      comp.frame = Math.floor(comp.stepTimer) % 6;
    } else {
      comp.isMoving = false;
      comp.vx = 0;
      comp.vy = 0;
      comp.stepTimer += dt * 4;
      comp.frame = Math.floor(comp.stepTimer) % 4;
    }
  }

  clampCamera() {
    const maxX = Math.max(0, WORLD_WIDTH - this.viewportW);
    const maxY = Math.max(0, WORLD_HEIGHT - this.viewportH);
    this.camX = Math.max(0, Math.min(this.camX, maxX));
    this.camY = Math.max(0, Math.min(this.camY, maxY));
  }

  moveCharacterWithCollision(char: CharacterState, dt: number) {
    const col = char.collider;

    const newX = char.x + char.vx * dt;
    const testBoxX: Rect = {
      x: newX + col.offsetX,
      y: char.y + col.offsetY,
      w: col.w,
      h: col.h,
    };

    if (!this.checkSolidCollision(testBoxX)) {
      char.x = newX;
    } else {
      char.vx = 0;
    }

    const newY = char.y + char.vy * dt;
    const testBoxY: Rect = {
      x: char.x + col.offsetX,
      y: newY + col.offsetY,
      w: col.w,
      h: col.h,
    };

    if (!this.checkSolidCollision(testBoxY)) {
      char.y = newY;
    } else {
      char.vy = 0;
    }
  }

  // Grade espacial de colisores (128px) — evita varrer milhares de props
  private grid = new Map<string, Rect[]>();
  private static GC = 128;
  private gridKey(x: number, y: number) {
    return ((x / GameEngine.GC) | 0) + ',' + ((y / GameEngine.GC) | 0);
  }
  private addToGrid(rc: Rect) {
    const gc = GameEngine.GC;
    const gx0 = Math.floor(rc.x / gc);
    const gx1 = Math.floor((rc.x + rc.w) / gc);
    const gy0 = Math.floor(rc.y / gc);
    const gy1 = Math.floor((rc.y + rc.h) / gc);
    for (let gx = gx0; gx <= gx1; gx++)
      for (let gy = gy0; gy <= gy1; gy++) {
        const k = gx + ',' + gy;
        (this.grid.get(k) ?? this.grid.set(k, []).get(k)!).push(rc);
      }
  }
  gridDirty = true;
  rebuildColliderGrid() {
    this.grid.clear();
    for (const s of this.staticColliders) this.addToGrid(s);
    for (const p of this.props) {
      if (!p.collider) continue;
      if (p.harvest && p.harvest.downUntil > 0) continue; // derrubado = passável
      this.addToGrid(p.collider);
    }
    this.gridDirty = false;
  }

  checkSolidCollision(box: Rect): boolean {
    const gc = GameEngine.GC;
    const gx0 = Math.floor(box.x / gc);
    const gx1 = Math.floor((box.x + box.w) / gc);
    const gy0 = Math.floor(box.y / gc);
    const gy1 = Math.floor((box.y + box.h) / gc);
    for (let gx = gx0; gx <= gx1; gx++)
      for (let gy = gy0; gy <= gy1; gy++) {
        const cell = this.grid.get(gx + ',' + gy);
        if (!cell) continue;
        for (const s of cell) {
          if (
            box.x < s.x + s.w &&
            box.x + box.w > s.x &&
            box.y < s.y + s.h &&
            box.y + box.h > s.y
          )
            return true;
        }
      }
    // props derrubados são passáveis mesmo estando na grade (raro)
    return false;
  }

  addBlossomPetal(x: number, y: number) {
    this.particles.push({
      x,
      y,
      vx: 8 + Math.random() * 6,
      vy: 12 + Math.random() * 8,
      life: 0,
      maxLife: 3.8,
      size: 1.5,
      color: 'rgba(251, 182, 206, ',
      alpha: 0.9,
    });
  }

  addForestLeaf(x: number, y: number) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8 + 4,
      vy: 8 + Math.random() * 6,
      life: 0,
      maxLife: 3.5,
      size: 1.5,
      color: 'rgba(163, 230, 53, ',
      alpha: 0.8,
    });
  }

  addMiningSpark(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 16,
        vy: -8 - Math.random() * 8,
        life: 0,
        maxLife: 0.4,
        size: 2,
        color: 'rgba(255, 220, 80, ',
        alpha: 1.0,
      });
    }
  }

  addChimneySmoke(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 2,
      y,
      vx: (Math.random() - 0.5) * 3 + 1,
      vy: -12 - Math.random() * 6,
      life: 0,
      maxLife: 2.2 + Math.random() * 0.8,
      size: 2,
      color: 'rgba(235, 240, 245, ',
      alpha: 0.65,
    });
  }

  addFootstepDust(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 3 - 2,
      life: 0,
      maxLife: 0.35,
      size: 2,
      color: 'rgba(161, 122, 80, ',
      alpha: 0.6,
    });
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += (p.vx + this.windX) * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }
  }

  updateButterflies(dt: number) {
    for (const b of this.butterflies) {
      b.wingAngle += dt * 18;
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        b.targetX = b.x + (Math.random() - 0.5) * 110;
        b.targetY = b.y + (Math.random() - 0.5) * 110;
      } else {
        b.x += (dx / dist) * b.speed * dt + this.windX * 0.35 * dt;
        b.y += (dy / dist) * b.speed * dt + Math.sin(this.timeElapsed * 6) * 0.5;
      }
    }
  }

  updateFireflies(dt: number) {
    const wob = this.windX * 0.02;
    for (const f of this.fireflies) {
      f.phase += dt * f.speed;
      f.x = f.baseX + Math.cos(f.phase) * f.radius + Math.sin(this.timeElapsed * 0.7 + f.phase) * wob * 4;
      f.y = f.baseY + Math.sin(f.phase * 1.5) * (f.radius * 0.6);
    }
  }

  render() {
    const ctx = this.ctx;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);

    // garante a escala de super-amostragem (transform some se o canvas for redimensionado)
    ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    this.lightCtx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);

    ctx.fillStyle = '#1e4827';
    ctx.fillRect(0, 0, this.viewportW, this.viewportH);

    const terrainImg = this.assets?.terrain;

    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(MAP_COLS - 1, Math.ceil((camX + this.viewportW) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camY + this.viewportH) / TILE_SIZE));

    // 1. Ground Tiles (+ água "shader" para os sentinelas 9000/9001)
    const wt = this.timeElapsed;
    if (terrainImg && terrainImg.complete && terrainImg.naturalWidth > 0) {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const tileId = this.ground[r][c];
          const screenX = c * TILE_SIZE - camX;
          const screenY = r * TILE_SIZE - camY;

          if (tileId >= 9002 && tileId <= 9005) {
            // solo da Floresta Sombria — terra escura, plana (sem xadrez)
            ctx.fillStyle = tileId === 9004 ? '#37402d' : '#3b3226';
            ctx.fillRect(screenX, screenY, 32, 32);
            continue;
          }
          if (tileId >= 9000) {
            this.drawWaterTile(ctx, screenX, screenY, c, r, tileId === 9001, wt);
            continue;
          }
          const sx = (tileId % 36) * 32;
          const sy = Math.floor(tileId / 36) * 32;
          ctx.drawImage(terrainImg, sx, sy, 32, 32, screenX, screenY, 32, 32);
        }
      }
    }

    // 2. Y-Sorting: Props, Buildings, Rocks, Trees, NPCs, Companion, Player
    interface Renderable {
      sortY: number;
      draw: () => void;
    }

    const renderables: Renderable[] = [];

    for (const prop of this.props) {
      if (
        prop.x + prop.w >= camX &&
        prop.x <= camX + this.viewportW &&
        prop.y + prop.h >= camY &&
        prop.y <= camY + this.viewportH
      ) {
        renderables.push({
          sortY: prop.sortY,
          draw: () => this.drawProp(prop, camX, camY),
        });
      }
    }

    for (const npc of this.npcs) {
      if (
        npc.x + npc.width >= camX &&
        npc.x <= camX + this.viewportW &&
        npc.y + npc.height >= camY &&
        npc.y <= camY + this.viewportH
      ) {
        renderables.push({
          sortY: npc.y + npc.height,
          draw: () => this.drawNPC(npc, camX, camY),
        });
      }
    }

    for (const e of this.enemies) {
      if (
        e.x + 40 >= camX &&
        e.x - 40 <= camX + this.viewportW &&
        e.y + 40 >= camY &&
        e.y - 40 <= camY + this.viewportH
      ) {
        renderables.push({ sortY: e.y + 6, draw: () => this.drawEnemy(e, camX, camY) });
      }
    }

    renderables.push({
      sortY: this.companion.y + 36,
      draw: () => this.drawCompanion(camX, camY),
    });

    renderables.push({
      sortY: this.player.y + 30,
      draw: () => this.drawPlayer(camX, camY),
    });

    if (this.isToolHarvest) {
      renderables.push({
        sortY: this.player.y + 31,
        draw: () => this.drawHarvestTool(camX, camY),
      });
    } else {
      // arma flutuante (não durante coleta — a ferramenta assume o lugar).
      // Em repouso fica ATRÁS do Akles (sortY menor); golpeando, na FRENTE.
      const swinging = this.player.actionState === 'attack' || this.player.actionState === 'spin';
      renderables.push({
        sortY: this.player.y + (swinging ? 40 : 8),
        draw: () => this.drawWeapon(camX, camY),
      });
    }

    renderables.sort((a, b) => a.sortY - b.sortY);

    for (const item of renderables) {
      item.draw();
    }

    // 3. Atmosphere particles
    for (const p of this.particles) {
      const px = Math.round(p.x - camX);
      const py = Math.round(p.y - camY);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of this.butterflies) {
      const bx = Math.round(b.x - camX);
      const by = Math.round(b.y - camY);
      if (bx < -20 || bx > this.viewportW + 20 || by < -20 || by > this.viewportH + 20) continue;

      const flap = Math.abs(Math.cos(b.wingAngle));
      ctx.fillStyle = b.color;
      ctx.fillRect(bx - 3, by - 1, Math.max(1, flap * 3), 2);
      ctx.fillRect(bx + 1, by - 1, Math.max(1, flap * 3), 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, by - 1, 1, 3);
    }

    // Vagalumes: quase invisíveis de dia, brilhantes à noite/entardecer
    const fireflyVis = this.timeOfDay === 'night' ? 1 : this.timeOfDay === 'sunset' ? 0.5 : 0.12;
    for (const f of this.fireflies) {
      const fx = Math.round(f.x - camX);
      const fy = Math.round(f.y - camY);
      if (fx < -15 || fx > this.viewportW + 15 || fy < -15 || fy > this.viewportH + 15) continue;

      const glow = (0.45 + Math.sin(f.phase * 3.5) * 0.45) * fireflyVis;
      if (glow <= 0.02) continue;
      const rgb = f.color === '#a3e635' ? '163, 230, 53' : '253, 230, 138';
      ctx.fillStyle = `rgba(${rgb}, ${glow * 0.4})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, glow + 0.15)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3.4 Fragmentos de notas (joias flutuantes)
    for (const f of this.fragmentPickups) {
      if (f.respawnAt > 0) continue;
      const fx = Math.round(f.x - camX);
      const fy = Math.round(f.y - camY + Math.sin(f.bob) * 3);
      if (fx < -20 || fx > this.viewportW + 20 || fy < -20 || fy > this.viewportH + 20) continue;
      const color = NOTE_COLORS[f.note];
      // brilho
      const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 14);
      glow.addColorStop(0, color + 'cc');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, 14, 0, Math.PI * 2);
      ctx.fill();
      // sombra no chão
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(fx, Math.round(f.y - camY) + 8, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // joia (losango)
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-4, -4, 3, 3);
      ctx.restore();
    }

    // 3.42 Drops no chão (claves, fragmentos, madeira, pedra...)
    this.renderGroundDrops(ctx, camX, camY);

    // 3.45 Canhão de Luz — feixe grosso e brilhante do Akles
    for (const b of this.lightBeams) {
      const bx = Math.round(b.x - camX);
      const by = Math.round(b.y - camY);
      const ang = Math.atan2(b.vy, b.vx);
      const fade = Math.min(1, (1 - b.life / b.maxLife) * 1.4);
      const grow = Math.min(1, b.life * 6); // "cresce" ao sair
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      // rastro longo
      const tl = 64 * grow;
      const g = ctx.createLinearGradient(-tl, 0, 10, 0);
      g.addColorStop(0, 'rgba(90,170,255,0)');
      g.addColorStop(0.6, `rgba(150,215,255,${0.4 * fade})`);
      g.addColorStop(1, `rgba(230,245,255,${0.9 * fade})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-tl, 0);
      ctx.lineTo(6, -7 * grow);
      ctx.lineTo(10, 0);
      ctx.lineTo(6, 7 * grow);
      ctx.closePath();
      ctx.fill();
      // faíscas do rastro
      ctx.fillStyle = `rgba(255,255,255,${0.5 * fade})`;
      for (let i = 0; i < 4; i++) {
        const px = -tl * Math.random();
        ctx.fillRect(px, (Math.random() - 0.5) * 10 * grow, 2, 2);
      }
      // núcleo
      const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
      gl.addColorStop(0, `rgba(255,255,255,${fade})`);
      gl.addColorStop(0.4, `rgba(160,220,255,${0.75 * fade})`);
      gl.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3.5 Chuva (atrás do shader de luz)
    this.renderRain(ctx);

    // 4. Lighting Shader Pass
    this.renderLightingShader(ctx, camX, camY);

    // 5. Interaction Prompt
    if (!this.isEditMode && this.isNearMerchant && !this.isTalkingToMerchant) {
      const merchant = this.npcs.find((n) => n.spriteType === 'merchant');
      if (merchant) {
        const mx = Math.round(merchant.x + 32 - camX);
        const my = Math.round(merchant.y - 12 - camY + Math.sin(this.timeElapsed * 5) * 3);

        ctx.save();
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';

        const txt = ' [E] Conversar ';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(mx - tw / 2 - 4, my - 12, tw + 8, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.fillText(txt, mx, my);
        ctx.restore();
      }
    }

    // Balões de fala aleatórios (aproximação de NPC)
    if (!this.isEditMode) this.renderBubbles(ctx, camX, camY);
    this.renderDamageTexts(ctx, camX, camY);

    // Dano ao herói — vinheta vermelha
    if (this.playerHurtFlash > 0) {
      const a = Math.min(0.5, this.playerHurtFlash * 1.4);
      const vg = ctx.createRadialGradient(
        this.viewportW / 2,
        this.viewportH / 2,
        this.viewportH * 0.3,
        this.viewportW / 2,
        this.viewportH / 2,
        this.viewportH * 0.75
      );
      vg.addColorStop(0, 'rgba(220,30,30,0)');
      vg.addColorStop(1, `rgba(190,20,20,${a})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }

    // 6. Editor Gizmos
    if (this.isEditMode) {
      this.renderEditorGizmos(ctx, camX, camY);
    }
  }

  renderLightingShader(mainCtx: CanvasRenderingContext2D, camX: number, camY: number) {
    const dt = this.darkT;
    const dark = this.inDarkForest;
    // escuridão contínua: máx entre o relógio e a Floresta Sombria
    const night = Math.max(this.nightAmount, dt * 0.95);
    const w = this.viewportW;
    const h = this.viewportH;

    // crepúsculo: 1 quando o sol está no horizonte
    const twilight = Math.max(0, 1 - Math.abs(this.sunAltitude) / 0.4);

    if (night < 0.04 && dt < 0.02) {
      // dia pleno — leve calor + tom de amanhecer/entardecer se houver
      if (twilight > 0.02) {
        mainCtx.fillStyle = `rgba(${this.isDawn ? '255,180,120' : '245,150,90'}, ${0.16 * twilight})`;
        mainCtx.fillRect(0, 0, w, h);
      }
      mainCtx.fillStyle = 'rgba(255, 245, 200, 0.025)';
      mainCtx.fillRect(0, 0, w, h);
      return;
    }
    if (night < 0.12) {
      // dia no norte, mas o herói entrou na faixa da Floresta Sombria
      this.renderDarkForestVeil(mainCtx, camX, camY, dt);
      return;
    }

    const lCtx = this.lightCtx;
    lCtx.clearRect(0, 0, w, h);

    // tom quente de crepúsculo por baixo do véu (some ao virar noite fechada)
    if (twilight > 0.02 && night < 0.9) {
      mainCtx.fillStyle = `rgba(${this.isDawn ? '255,170,110' : '235,120,70'}, ${0.22 * twilight * (1 - night)})`;
      mainCtx.fillRect(0, 0, w, h);
      mainCtx.fillStyle = `rgba(80, 30, 120, ${0.06 * twilight})`;
      mainCtx.fillRect(0, 0, w, h);
    }

    // ===== VÉU noturno — escala suave com `night`. Floresta Sombria fecha um
    // pouco mais, mas NÃO ao ponto de cegar. =====
    const nightA = night * (0.68 + 0.05 * dt);
    lCtx.fillStyle = `rgba(9, 12, 24, ${nightA})`;
    lCtx.fillRect(0, 0, w, h);

    lCtx.save();
    lCtx.globalCompositeOperation = 'destination-out';

    // Luar ambiente (mais forte = mais visível)
    lCtx.fillStyle = `rgba(0, 0, 0, ${0.26 - 0.08 * dt})`;
    lCtx.fillRect(0, 0, w, h);

    // Halo do herói na floresta sombria (senão fica cego)
    if (dt > 0.05) {
      const hx = Math.round(this.player.x + 12 - camX);
      const hy = Math.round(this.player.y + 8 - camY);
      const hr = 110 + 46 * dt;
      const hg = lCtx.createRadialGradient(hx, hy, 6, hx, hy, hr);
      hg.addColorStop(0, 'rgba(0,0,0,0.82)');
      hg.addColorStop(0.6, 'rgba(0,0,0,0.36)');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = hg;
      lCtx.beginPath();
      lCtx.arc(hx, hy, hr, 0, Math.PI * 2);
      lCtx.fill();
    }

    // Cristais brilham como fontes de luz
    for (const prop of this.props) {
      if (
        prop.type !== 'spot_crystal_blue' &&
        prop.type !== 'spot_crystal_red' &&
        prop.type !== 'dark_icecrystal'
      )
        continue;
      const cx = Math.round(prop.x + prop.w / 2 - camX);
      const cy = Math.round(prop.y + prop.h * 0.55 - camY);
      if (cx < -80 || cx > w + 80 || cy < -80 || cy > h + 80) continue;
      const pulse = 0.7 + Math.sin(this.timeElapsed * 2.2 + prop.x * 0.05) * 0.3;
      const rad = 46 * pulse;
      const g = lCtx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      g.addColorStop(0, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = g;
      lCtx.beginPath();
      lCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      lCtx.fill();
    }

    // A. Postes — halo menor e mais discreto
    for (const prop of this.props) {
      if (prop.type !== 'streetLantern') continue;
      const lampX = Math.round(prop.x + prop.w * 0.49 - camX);
      const lampY = Math.round(prop.y + prop.h * 0.24 - camY);
      if (lampX < -120 || lampX > w + 120 || lampY < -120 || lampY > h + 120) continue;

      const flicker = Math.sin(this.timeElapsed * 7 + prop.x) * 3;
      const radius = Math.max(24, Math.round(58 + flicker));
      const g = lCtx.createRadialGradient(lampX, lampY, 2, lampX, lampY, radius);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = g;
      lCtx.beginPath();
      lCtx.arc(lampX, lampY, radius, 0, Math.PI * 2);
      lCtx.fill();
    }

    // B. Janelas quentes das casas
    for (const prop of this.props) {
      if (
        !(
          prop.type.startsWith('townHall') ||
          prop.type.startsWith('bakery') ||
          prop.type.startsWith('bldg') ||
          prop.type.startsWith('house') ||
          prop.type.startsWith('lodge') ||
          prop.type.startsWith('herbalist') ||
          prop.type === 'blacksmithFront' ||
          prop.type === 'residentialFront' ||
          prop.type === 'apothecaryFront'
        )
      )
        continue;
      const winX = Math.round(prop.x + prop.w * 0.5 - camX);
      const winY = Math.round(prop.y + prop.h * 0.62 - camY);
      if (winX < -150 || winX > w + 150 || winY < -150 || winY > h + 150) continue;
      const g = lCtx.createRadialGradient(winX, winY, 4, winX, winY, 56);
      g.addColorStop(0, 'rgba(0,0,0,0.8)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = g;
      lCtx.beginPath();
      lCtx.arc(winX, winY, 56, 0, Math.PI * 2);
      lCtx.fill();
    }

    // C. Aura da Fonte Sagrada
    const shrine = this.props.find((p) => p.type === 'shrine');
    const shrineX = shrine ? Math.round(shrine.x + shrine.w / 2 - camX) : -999;
    const shrineY = shrine ? Math.round(shrine.y + shrine.h / 2 - camY) : -999;
    if (shrine && shrineX > -180 && shrineX < w + 180 && shrineY > -180 && shrineY < h + 180) {
      const g = lCtx.createRadialGradient(shrineX, shrineY, 8, shrineX, shrineY, 100);
      g.addColorStop(0, 'rgba(0,0,0,0.75)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = g;
      lCtx.beginPath();
      lCtx.arc(shrineX, shrineY, 100, 0, Math.PI * 2);
      lCtx.fill();
    }

    // D. Vagalumes recortam pontinhos de luz
    for (const f of this.fireflies) {
      const fx = Math.round(f.x - camX);
      const fy = Math.round(f.y - camY);
      if (fx < -20 || fx > w + 20 || fy < -20 || fy > h + 20) continue;
      const g = lCtx.createRadialGradient(fx, fy, 1, fx, fy, 13);
      g.addColorStop(0, 'rgba(0,0,0,0.7)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = g;
      lCtx.beginPath();
      lCtx.arc(fx, fy, 13, 0, Math.PI * 2);
      lCtx.fill();
    }

    lCtx.restore();
    mainCtx.drawImage(this.lightCanvas, 0, 0, this.viewportW, this.viewportH);

    // Banho de luar frio (azul-prateado) por cima — escala com a noite
    mainCtx.save();
    const moon = mainCtx.createLinearGradient(0, 0, 0, h);
    moon.addColorStop(0, `rgba(130, 160, 225, ${0.12 * night})`);
    moon.addColorStop(1, `rgba(50, 70, 150, ${0.05 * night})`);
    mainCtx.fillStyle = moon;
    mainCtx.fillRect(0, 0, w, h);

    mainCtx.globalCompositeOperation = 'lighter';

    // Brilho dourado suave nas lâmpadas
    for (const prop of this.props) {
      if (prop.type !== 'streetLantern') continue;
      const lampX = Math.round(prop.x + prop.w * 0.49 - camX);
      const lampY = Math.round(prop.y + prop.h * 0.24 - camY);
      if (lampX < -120 || lampX > w + 120 || lampY < -120 || lampY > h + 120) continue;
      const flicker = Math.sin(this.timeElapsed * 7 + prop.x) * 0.04;
      mainCtx.fillStyle = `rgba(255,255,225,${0.75 + flicker})`;
      mainCtx.beginPath();
      mainCtx.arc(lampX, lampY, 2.4, 0, Math.PI * 2);
      mainCtx.fill();
      const flare = mainCtx.createRadialGradient(lampX, lampY, 2, lampX, lampY, 40);
      flare.addColorStop(0, `rgba(254,240,180,${0.32 + flicker})`);
      flare.addColorStop(0.4, `rgba(245,180,90,${0.12 + flicker})`);
      flare.addColorStop(1, 'rgba(217,119,6,0)');
      mainCtx.fillStyle = flare;
      mainCtx.beginPath();
      mainCtx.arc(lampX, lampY, 40, 0, Math.PI * 2);
      mainCtx.fill();
    }

    // Brilho ciano da fonte
    if (shrine && shrineX > -180 && shrineX < w + 180 && shrineY > -180 && shrineY < h + 180) {
      const g = mainCtx.createRadialGradient(shrineX, shrineY, 4, shrineX, shrineY, 80);
      g.addColorStop(0, 'rgba(56,189,248,0.32)');
      g.addColorStop(0.5, 'rgba(14,165,233,0.12)');
      g.addColorStop(1, 'rgba(14,165,233,0)');
      mainCtx.fillStyle = g;
      mainCtx.beginPath();
      mainCtx.arc(shrineX, shrineY, 80, 0, Math.PI * 2);
      mainCtx.fill();
    }

    mainCtx.restore();
  }

  // Escurecimento da Floresta Sombria quando o resto do mundo está de DIA.
  // Recorta halo do herói e brilho dos cristais para não cegar.
  renderDarkForestVeil(
    mainCtx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    dt: number,
  ) {
    const lCtx = this.lightCtx;
    const w = this.viewportW;
    const h = this.viewportH;
    lCtx.clearRect(0, 0, w, h);
    lCtx.fillStyle = `rgba(10, 13, 24, ${0.62 * dt})`;
    lCtx.fillRect(0, 0, w, h);

    lCtx.save();
    lCtx.globalCompositeOperation = 'destination-out';

    const hx = Math.round(this.player.x + 12 - camX);
    const hy = Math.round(this.player.y + 8 - camY);
    const hr = 130 + 40 * dt;
    const hg = lCtx.createRadialGradient(hx, hy, 8, hx, hy, hr);
    hg.addColorStop(0, 'rgba(0,0,0,0.85)');
    hg.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    lCtx.fillStyle = hg;
    lCtx.beginPath();
    lCtx.arc(hx, hy, hr, 0, Math.PI * 2);
    lCtx.fill();

    for (const prop of this.props) {
      if (
        prop.type !== 'spot_crystal_blue' &&
        prop.type !== 'spot_crystal_red' &&
        prop.type !== 'dark_icecrystal'
      )
        continue;
      const cx = Math.round(prop.x + prop.w / 2 - camX);
      const cy = Math.round(prop.y + prop.h * 0.55 - camY);
      if (cx < -80 || cx > w + 80 || cy < -80 || cy > h + 80) continue;
      const pulse = 0.7 + Math.sin(this.timeElapsed * 2.2 + prop.x * 0.05) * 0.3;
      const rad = 44 * pulse;
      const g = lCtx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      g.addColorStop(0, 'rgba(0,0,0,0.8)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lCtx.fillStyle = g;
      lCtx.beginPath();
      lCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      lCtx.fill();
    }

    lCtx.restore();
    mainCtx.drawImage(this.lightCanvas, 0, 0, this.viewportW, this.viewportH);
  }

  private renderBubbles(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    if (!this.bubbles.length) return;
    const now = this.timeElapsed;
    ctx.save();
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'top';

    for (const b of this.bubbles) {
      let ax: number;
      let ay: number;
      let accent = '#e2e8f0';
      if (b.who === 'akles') {
        ax = this.player.x + 12 - camX;
        ay = this.player.y - 20 - camY;
        accent = '#7dd3fc';
      } else {
        const npc = this.npcs.find((n) => n.id === b.npcId);
        if (!npc) continue;
        ax = npc.x + npc.width / 2 - camX;
        ay = npc.y - 16 - camY;
        accent = npc.accent ?? '#e2e8f0';
      }
      // fora da tela? pula
      if (ax < -60 || ax > this.viewportW + 60 || ay < -40 || ay > this.viewportH + 40) continue;

      // fade in/out
      const age = now - b.born;
      const alpha =
        age < 0.2 ? age / 0.2 : age > b.ttl - 0.5 ? Math.max(0, (b.ttl - age) / 0.5) : 1;

      // quebra de linha (~22 chars)
      const words = b.text.split(' ');
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > 24) {
          lines.push(cur.trim());
          cur = w;
        } else cur = (cur + ' ' + w).trim();
      }
      if (cur) lines.push(cur);

      const padX = 7;
      const lineH = 13;
      let maxW = 0;
      for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
      const bw = maxW + padX * 2;
      const bh = lines.length * lineH + 8;
      const bx = Math.round(ax - bw / 2);
      const by = Math.round(ay - bh - 6);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();
      // rabinho
      ctx.beginPath();
      ctx.moveTo(ax - 5, by + bh - 1);
      ctx.lineTo(ax + 5, by + bh - 1);
      ctx.lineTo(ax, by + bh + 6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();

      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, ax, by + 4 + i * lineH));
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  renderEditorGizmos(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    ctx.save();

    for (const prop of this.props) {
      const meta = EDITABLE_PROP_METAS[prop.type];
      if (!meta) continue;

      const px = Math.round(prop.x - camX);
      const py = Math.round(prop.y - camY);

      if (
        px + prop.w < -20 ||
        px > this.viewportW + 20 ||
        py + prop.h < -20 ||
        py > this.viewportH + 20
      ) {
        continue;
      }

      const isSelected = this.selectedPropId === prop.id;
      const isHovered = this.hoveredPropId === prop.id;
      const inGroup = this.multiSel.has(prop.id);

      if (inGroup && !isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(px - 1, py - 1, prop.w + 2, prop.h + 2);
        ctx.fillStyle = 'rgba(56,189,248,0.12)';
        ctx.fillRect(px, py, prop.w, prop.h);
      }

      if (isSelected) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(px - 1, py - 1, prop.w + 2, prop.h + 2);

        ctx.fillStyle = '#facc15';
        const hs = 4;
        ctx.fillRect(px - hs, py - hs, hs * 2, hs * 2);
        ctx.fillRect(px + prop.w - hs, py - hs, hs * 2, hs * 2);
        ctx.fillRect(px - hs, py + prop.h - hs, hs * 2, hs * 2);
        ctx.fillRect(px + prop.w - hs, py + prop.h - hs, hs * 2, hs * 2);

        if (prop.collider) {
          const cx = Math.round(prop.collider.x - camX);
          const cy = Math.round(prop.collider.y - camY);
          ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
          ctx.fillRect(cx, cy, prop.collider.w, prop.collider.h);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, prop.collider.w, prop.collider.h);
        }

        const scalePct = Math.round((this.propScales[prop.id] || 1.0) * 100);
        const tag = `${meta.name} (${scalePct}%)`;
        ctx.font = 'bold 9px sans-serif';
        const tw = ctx.measureText(tag).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(px + prop.w / 2 - tw / 2 - 4, py - 16, tw + 8, 14);
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(tag, px + prop.w / 2, py - 6);
      } else if (isHovered) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(px, py, prop.w, prop.h);
      }
    }

    // Retângulo de seleção (marquee)
    if (this.marquee) {
      const mx = Math.round(Math.min(this.marquee.x0, this.marquee.x1) - camX);
      const my = Math.round(Math.min(this.marquee.y0, this.marquee.y1) - camY);
      const mw = Math.round(Math.abs(this.marquee.x1 - this.marquee.x0));
      const mh = Math.round(Math.abs(this.marquee.y1 - this.marquee.y0));
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mw, mh);
      ctx.fillStyle = 'rgba(56,189,248,0.10)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  drawProp(prop: WorldProp, camX: number, camY: number) {
    const ctx = this.ctx;
    let px = Math.round(prop.x - camX);
    const py = Math.round(prop.y - camY);

    // Recurso coletável derrubado: toco / entulho + progresso de renascimento
    const hv = prop.harvest;
    if (hv && hv.downUntil > 0) {
      const bx = px + prop.w / 2;
      const by = py + prop.h - 6;
      ctx.save();
      ctx.fillStyle = hv.kind === 'tree' ? 'rgba(90,63,38,0.95)' : 'rgba(120,120,128,0.9)';
      ctx.beginPath();
      ctx.ellipse(bx, by, hv.kind === 'tree' ? 9 : 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (hv.kind === 'tree' && prop.h > 40) {
        ctx.fillStyle = 'rgba(122,88,54,0.95)';
        ctx.fillRect(bx - 6, by - 8, 12, 8);
      }
      // barrinha de renascimento
      const total = hv.respawnSecs;
      const left = Math.max(0, hv.downUntil - this.timeElapsed);
      const prog = 1 - left / total;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 12, by - 18, 24, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(bx - 12, by - 18, 24 * prog, 3);
      ctx.restore();
      return;
    }

    // Tremor ao levar golpe
    let shakeX = 0;
    if (hv && hv.shake > 0) {
      shakeX = Math.round(Math.sin(this.timeElapsed * 60) * hv.shake * 9);
      px += shakeX;
    }

    // 0. Ponte de madeira (procedural)
    if (prop.type === 'bridge') {
      const axis = (prop.data?.axis as string) ?? 'ns';
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(px + 3, py + 4, prop.w, prop.h);
      // deck
      ctx.fillStyle = '#8a5a34';
      ctx.fillRect(px, py, prop.w, prop.h);
      ctx.fillStyle = 'rgba(255,225,180,0.10)';
      ctx.fillRect(px, py, prop.w, prop.h);

      if (axis === 'ns') {
        ctx.fillStyle = '#6f4527';
        for (let yy = 0; yy < prop.h; yy += 7) ctx.fillRect(px, py + yy, prop.w, 1);
        ctx.fillStyle = '#5a381f';
        ctx.fillRect(px + 5, py, 3, prop.h);
        ctx.fillRect(px + prop.w - 8, py, 3, prop.h);
        // guarda-corpo
        ctx.fillStyle = '#7a4e2c';
        ctx.fillRect(px - 3, py, 4, prop.h);
        ctx.fillRect(px + prop.w - 1, py, 4, prop.h);
        ctx.fillStyle = '#432c17';
        for (let yy = 3; yy < prop.h - 2; yy += 15) {
          ctx.fillRect(px - 4, py + yy, 6, 5);
          ctx.fillRect(px + prop.w - 2, py + yy, 6, 5);
        }
      } else {
        ctx.fillStyle = '#6f4527';
        for (let xx = 0; xx < prop.w; xx += 7) ctx.fillRect(px + xx, py, 1, prop.h);
        ctx.fillStyle = '#5a381f';
        ctx.fillRect(px, py + 5, prop.w, 3);
        ctx.fillRect(px, py + prop.h - 8, prop.w, 3);
        ctx.fillStyle = '#7a4e2c';
        ctx.fillRect(px, py - 3, prop.w, 4);
        ctx.fillRect(px, py + prop.h - 1, prop.w, 4);
        ctx.fillStyle = '#432c17';
        for (let xx = 3; xx < prop.w - 2; xx += 15) {
          ctx.fillRect(px + xx, py - 4, 5, 6);
          ctx.fillRect(px + xx, py + prop.h - 2, 5, 6);
        }
      }
      ctx.restore();
      return;
    }

    // 1. Trees & Vegetation
    if (prop.type === 'oak') {
      ctx.drawImage(this.trees.oak, px, py, prop.w, prop.h);
    } else if (prop.type === 'pine') {
      ctx.drawImage(this.trees.pine, px, py, prop.w, prop.h);
    } else if (prop.type === 'blossomTree') {
      ctx.drawImage(this.trees.blossomTree, px, py, prop.w, prop.h);
    } else if (prop.type === 'bush') {
      ctx.drawImage(this.trees.bush, px, py, prop.w, prop.h);
    }
    // 2. Ancient Ruins Centerpieces
    else if (prop.type === 'shrine' && this.assets?.shrine) {
      const frameWidth = 160;
      const frameHeight = 128;
      const sx = this.shrineFrame * frameWidth;
      ctx.drawImage(this.assets.shrine, sx, 0, frameWidth, frameHeight, px, py, prop.w, prop.h);
    } else if (prop.type === 'chalice' && this.assets?.chalice) {
      const frameWidth = 64;
      const frameHeight = 64;
      const sx = this.chaliceFrame * frameWidth;
      ctx.drawImage(this.assets.chalice, sx, 0, frameWidth, frameHeight, px, py, prop.w, prop.h);
    } else if (prop.type === 'atlas' && prop.crop && this.assets?.propsAtlas) {
      ctx.drawImage(
        this.assets.propsAtlas,
        prop.crop.sx,
        prop.crop.sy,
        prop.crop.sw,
        prop.crop.sh,
        px,
        py,
        prop.w,
        prop.h
      );
    }
    // 3. Multi-Angle Town Buildings
    else if (prop.type === 'bldgTownHall' && this.assets?.townHallFront) {
      ctx.drawImage(this.assets.townHallFront, px, py, prop.w, prop.h);
    } else if (prop.type === 'townHallDiag' && this.assets?.townHallDiag) {
      ctx.drawImage(this.assets.townHallDiag, px, py, prop.w, prop.h);
    } else if (prop.type === 'townHallBack' && this.assets?.townHallBack) {
      ctx.drawImage(this.assets.townHallBack, px, py, prop.w, prop.h);
    } else if (prop.type === 'bakeryBack' && this.assets?.bakeryBack) {
      ctx.drawImage(this.assets.bakeryBack, px, py, prop.w, prop.h);
    } else if (prop.type === 'houseBackCottage' && this.assets?.houseBackCottage) {
      ctx.drawImage(this.assets.houseBackCottage, px, py, prop.w, prop.h);
    } else if (prop.type === 'houseBackBlueWoodshed' && this.assets?.houseBackBlueWoodshed) {
      ctx.drawImage(this.assets.houseBackBlueWoodshed, px, py, prop.w, prop.h);
    } else if (prop.type === 'houseBackTavernMossy' && this.assets?.houseBackTavernMossy) {
      ctx.drawImage(this.assets.houseBackTavernMossy, px, py, prop.w, prop.h);
    } else if (prop.type === 'houseBackBlueCellar' && this.assets?.houseBackBlueCellar) {
      ctx.drawImage(this.assets.houseBackBlueCellar, px, py, prop.w, prop.h);
    } else if (prop.type === 'townHallSide' && this.assets?.townHallSide) {
      ctx.drawImage(this.assets.townHallSide, px, py, prop.w, prop.h);
    } else if (prop.type === 'bldgBakeryFront' && this.assets?.bakeryFront) {
      ctx.drawImage(this.assets.bakeryFront, px, py, prop.w, prop.h);
    } else if (prop.type === 'bakeryDiag' && this.assets?.bakeryDiag) {
      ctx.drawImage(this.assets.bakeryDiag, px, py, prop.w, prop.h);
    } else if (prop.type === 'bakerySide' && this.assets?.bakerySide) {
      ctx.drawImage(this.assets.bakerySide, px, py, prop.w, prop.h);
    } else if (prop.type === 'bldgLodgeEast' && this.assets?.lodgeEast) {
      ctx.drawImage(this.assets.lodgeEast, px, py, prop.w, prop.h);
    } else if (prop.type === 'lodgeWest' && this.assets?.lodgeWest) {
      ctx.drawImage(this.assets.lodgeWest, px, py, prop.w, prop.h);
    } else if (prop.type === 'bldgHerbalistWest' && this.assets?.herbalistWest) {
      ctx.drawImage(this.assets.herbalistWest, px, py, prop.w, prop.h);
    } else if (prop.type === 'herbalistEast' && this.assets?.herbalistEast) {
      ctx.drawImage(this.assets.herbalistEast, px, py, prop.w, prop.h);
    } else if (prop.type === 'blacksmithFront' && this.assets?.blacksmithFront) {
      ctx.drawImage(this.assets.blacksmithFront, px, py, prop.w, prop.h);
    } else if (prop.type === 'residentialFront' && this.assets?.residentialFront) {
      ctx.drawImage(this.assets.residentialFront, px, py, prop.w, prop.h);
    } else if (prop.type === 'apothecaryFront' && this.assets?.apothecaryFront) {
      ctx.drawImage(this.assets.apothecaryFront, px, py, prop.w, prop.h);
    }
    // 4. 32-bit Village Elements
    else if (prop.type === 'wagonCart' && this.assets?.wagonCart) {
      ctx.drawImage(this.assets.wagonCart, px, py, prop.w, prop.h);
    } else if (prop.type === 'marketStall' && this.assets?.marketStall) {
      ctx.drawImage(this.assets.marketStall, px, py, prop.w, prop.h);
    } else if (prop.type === 'hayBaleStack' && this.assets?.hayBaleStack) {
      ctx.drawImage(this.assets.hayBaleStack, px, py, prop.w, prop.h);
    } else if (prop.type === 'barrelStack' && this.assets?.barrelStack) {
      ctx.drawImage(this.assets.barrelStack, px, py, prop.w, prop.h);
    } else if (prop.type === 'woodenBenchRustic' && this.assets?.woodenBenchRustic) {
      ctx.drawImage(this.assets.woodenBenchRustic, px, py, prop.w, prop.h);
    } else if (prop.type === 'villageWell' && this.assets?.villageWell) {
      ctx.drawImage(this.assets.villageWell, px, py, prop.w, prop.h);
    } else if (prop.type === 'streetLantern' && this.assets?.streetLantern) {
      ctx.drawImage(this.assets.streetLantern, px, py, prop.w, prop.h);
    } else if (prop.type === 'woodenBench' && this.assets?.woodenBench) {
      ctx.drawImage(this.assets.woodenBench, px, py, prop.w, prop.h);
    } else if (prop.type === 'bulletinBoard' && this.assets?.bulletinBoard) {
      ctx.drawImage(this.assets.bulletinBoard, px, py, prop.w, prop.h);
    }
    // 5. Quarry & Rocks
    else if (prop.type === 'stoneQuarry' && this.assets?.stoneQuarry) {
      ctx.drawImage(this.assets.stoneQuarry, px, py, prop.w, prop.h);
    } else if (prop.type === 'limestoneBoulders' && this.assets?.limestoneBoulders) {
      ctx.drawImage(this.assets.limestoneBoulders, px, py, prop.w, prop.h);
    } else if (prop.type === 'rockCluster' && this.assets?.rockCluster) {
      ctx.drawImage(this.assets.rockCluster, px, py, prop.w, prop.h);
    } else if (prop.type === 'rockPair' && this.assets?.rockPair) {
      ctx.drawImage(this.assets.rockPair, px, py, prop.w, prop.h);
    } else if (prop.type === 'rockMonolith' && this.assets?.rockMonolith) {
      ctx.drawImage(this.assets.rockMonolith, px, py, prop.w, prop.h);
    } else if (prop.type === 'rockFlatSlab' && this.assets?.rockFlatSlab) {
      ctx.drawImage(this.assets.rockFlatSlab, px, py, prop.w, prop.h);
    }
    // 6. Nós de extração (spots)
    else if (prop.type === 'spot_wood' && this.assets?.spotWood) {
      ctx.drawImage(this.assets.spotWood, px, py, prop.w, prop.h);
    } else if (prop.type === 'spot_mineral' && this.assets?.spotMineral) {
      ctx.drawImage(this.assets.spotMineral, px, py, prop.w, prop.h);
    } else if (prop.type === 'spot_gold' && this.assets?.spotGold) {
      ctx.drawImage(this.assets.spotGold, px, py, prop.w, prop.h);
    } else if (prop.type === 'spot_crystal_blue' && this.assets?.spotCrystalBlue) {
      ctx.drawImage(this.assets.spotCrystalBlue, px, py, prop.w, prop.h);
    } else if (prop.type === 'spot_crystal_red' && this.assets?.spotCrystalRed) {
      ctx.drawImage(this.assets.spotCrystalRed, px, py, prop.w, prop.h);
    } else if (prop.type === 'spot_eco_essence' && this.assets?.spotEcoEssence) {
      ctx.drawImage(this.assets.spotEcoEssence, px, py, prop.w, prop.h);
    }
    // 7. Floresta Sombria
    else if (prop.type === 'dark_deadtree' && this.assets?.darkDeadtree) {
      ctx.drawImage(this.assets.darkDeadtree, px, py, prop.w, prop.h);
    } else if (prop.type === 'dark_bigpine' && this.assets?.darkBigpine) {
      ctx.drawImage(this.assets.darkBigpine, px, py, prop.w, prop.h);
    } else if (prop.type === 'dark_bigrock' && this.assets?.darkBigrock) {
      ctx.drawImage(this.assets.darkBigrock, px, py, prop.w, prop.h);
    } else if (prop.type === 'dark_icecrystal' && this.assets?.darkIcecrystal) {
      ctx.drawImage(this.assets.darkIcecrystal, px, py, prop.w, prop.h);
    } else if (prop.type === 'dark_thorn' && this.assets?.darkThorn) {
      ctx.drawImage(this.assets.darkThorn, px, py, prop.w, prop.h);
    }
    // 8. Muralhas musicais
    else if (prop.type === 'wallMusical1' && this.assets?.wallMusical1) {
      ctx.drawImage(this.assets.wallMusical1, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical2' && this.assets?.wallMusical2) {
      ctx.drawImage(this.assets.wallMusical2, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical3' && this.assets?.wallMusical3) {
      ctx.drawImage(this.assets.wallMusical3, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical4' && this.assets?.wallMusical4) {
      ctx.drawImage(this.assets.wallMusical4, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical5' && this.assets?.wallMusical5) {
      ctx.drawImage(this.assets.wallMusical5, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical6' && this.assets?.wallMusical6) {
      ctx.drawImage(this.assets.wallMusical6, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical7' && this.assets?.wallMusical7) {
      ctx.drawImage(this.assets.wallMusical7, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallMusical8' && this.assets?.wallMusical8) {
      ctx.drawImage(this.assets.wallMusical8, px, py, prop.w, prop.h);
    } else if (prop.type === 'wallGate' && this.assets?.wallGate) {
      ctx.drawImage(this.assets.wallGate, px, py, prop.w, prop.h);
    }

    // Brilho + partículas nos nós de coleta (cristais, madeira, minério, ouro)
    const spotFx: Record<string, string> = {
      spot_crystal_blue: '90,170,255',
      spot_crystal_red: '255,90,90',
      dark_icecrystal: '160,220,255',
      spot_wood: '250,204,120',
      spot_mineral: '190,200,215',
      spot_gold: '255,215,110',
    };
    const fxCol = spotFx[prop.type];
    if (fxCol) {
      const isCrystal =
        prop.type === 'spot_crystal_blue' ||
        prop.type === 'spot_crystal_red' ||
        prop.type === 'dark_icecrystal';
      const downed = hv && hv.downUntil > 0;
      if (!downed) {
        const pulse = 0.55 + Math.sin(this.timeElapsed * 2.2 + prop.x * 0.05) * 0.35;
        const gcx = px + prop.w / 2;
        const gcy = py + prop.h * 0.55;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rad = prop.w * (isCrystal ? 0.85 : 0.62);
        const gr = ctx.createRadialGradient(gcx, gcy, 2, gcx, gcy, rad);
        gr.addColorStop(0, `rgba(${fxCol},${(isCrystal ? 0.4 : 0.26) * pulse})`);
        gr.addColorStop(1, `rgba(${fxCol},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(gcx, gcy, rad, 0, Math.PI * 2);
        ctx.fill();

        // motes que sobem chamando atenção (procedurais, sem alocação)
        const seed = (prop.x * 13.37 + prop.y * 7.11) % 1000;
        const motes = isCrystal ? 5 : 4;
        for (let i = 0; i < motes; i++) {
          const ph = (this.timeElapsed * 0.6 + seed + i * (1 / motes)) % 1;
          const mx = gcx + Math.sin((seed + i) * 2.2 + ph * 6.28) * prop.w * 0.34;
          const my = py + prop.h * 0.72 - ph * prop.h * 1.15;
          const a = Math.sin(ph * Math.PI) * (0.35 + 0.35 * pulse);
          const s = 1.4 + Math.sin(ph * Math.PI) * 1.6;
          ctx.fillStyle = `rgba(${fxCol},${a})`;
          ctx.beginPath();
          ctx.arc(mx, my, s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Flash branco ao levar golpe + barra de vida do recurso
    if (hv) {
      if (hv.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.7, hv.hitFlash * 3.5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py + prop.h * 0.15, prop.w, prop.h * 0.85);
        ctx.restore();
      }
      if (hv.hp < hv.maxHp && hv.downUntil === 0) {
        const bw = Math.min(40, prop.w * 0.7);
        const bx = px + prop.w / 2 - bw / 2;
        const by = py + prop.h * 0.12;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = hv.kind === 'tree' ? '#4ade80' : '#fbbf24';
        ctx.fillRect(bx, by, bw * (hv.hp / hv.maxHp), 3);
      }
    }
  }

  // "Shader" de água em canvas — teal da Fonte Sagrada, com profundidade,
  // rede de cáusticas em 2 camadas e espuma de margem.
  drawWaterTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: number,
    r: number,
    shallow: boolean,
    t: number
  ) {
    const g = this.ground;
    const land = (cc: number, rr: number) => {
      const v = g[rr]?.[cc];
      return v !== undefined && v < 9000;
    };

    // 1. base com gradiente de profundidade (mais escuro no meio do rio)
    const grad = ctx.createLinearGradient(x, y, x, y + 32);
    if (shallow) {
      grad.addColorStop(0, '#63bfb2');
      grad.addColorStop(1, '#3f9f98');
    } else {
      grad.addColorStop(0, '#3a9a9a');
      grad.addColorStop(0.5, '#227a80');
      grad.addColorStop(1, '#2f8f92');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, 32, 32);

    // 2. "respiração" lenta de profundidade
    const breathe = 0.5 + Math.sin(c * 0.4 + r * 0.4 + t * 0.4) * 0.5;
    ctx.fillStyle = shallow
      ? `rgba(170, 230, 220, ${0.10 * breathe})`
      : `rgba(8, 40, 52, ${0.24 * breathe})`;
    ctx.fillRect(x, y, 32, 32);

    // 3. rede de cáusticas — 2 camadas em velocidades opostas
    const wind = this.windX * 0.9;
    for (let layer = 0; layer < 2; layer++) {
      const dir = layer === 0 ? 1 : -0.6;
      const flow = t * (shallow ? 34 : 24) * dir + wind * dir;
      ctx.strokeStyle =
        layer === 0
          ? `rgba(224, 252, 250, ${shallow ? 0.26 : 0.2})`
          : `rgba(255, 255, 255, ${shallow ? 0.14 : 0.1})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const period = 44 + layer * 12;
        const band = (c * (8 + layer * 3) + r * (5 + layer * 4) + i * 22 + flow) % period;
        const off = band < period / 2 ? band : period - band;
        const wy = y + off * (32 / (period / 2)) - 4;
        const wob = Math.sin(t * 2.2 + c + r + i + layer) * 2.4;
        ctx.beginPath();
        ctx.moveTo(x - 3, wy + wob);
        ctx.bezierCurveTo(x + 8, wy - 3 + wob, x + 24, wy + 3 + wob, x + 35, wy + wob);
        ctx.stroke();
      }
    }

    // 4. espuma viva nas margens
    const foam = Math.sin(t * 3 + c + r) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(240, 252, 250, ${0.55 * foam})`;
    if (land(c, r - 1)) ctx.fillRect(x, y, 32, 2 + (foam > 0.9 ? 1 : 0));
    if (land(c, r + 1)) ctx.fillRect(x, y + 30 - (foam > 0.9 ? 1 : 0), 32, 2 + (foam > 0.9 ? 1 : 0));
    if (land(c - 1, r)) ctx.fillRect(x, y, 2, 32);
    if (land(c + 1, r)) ctx.fillRect(x + 30, y, 2, 32);

    // 5. lampejo especular pontual
    const spec = Math.sin(c * 1.7 + r * 1.1 + t * 2.1);
    if (spec > 0.9) {
      ctx.fillStyle = `rgba(255,255,255,${(spec - 0.9) * 4})`;
      ctx.fillRect(x + ((c * 11) % 22) + 4, y + ((r * 7) % 20) + 4, 2, 2);
    }
  }

  drawEnemy(e: Enemy, camX: number, camY: number) {
    const ctx = this.ctx;
    const def = ENEMY_DEFS[e.kind];
    const sheet = this.assets?.[def.sheet] as HTMLImageElement | undefined;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const cx = Math.round(e.x - camX);
    const cy = Math.round(e.y - camY);
    const dispW = def.cw * def.disp;
    const dispH = def.ch * def.disp;
    const row = (ENEMY_ROW as Record<string, number>)[e.state] ?? 0;
    const col = Math.min(def.cols - 1, Math.max(0, e.frame));

    if (e.state !== 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx + 8, cy + 3, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const dx = Math.round(cx + 8 - dispW / 2);
    const dy = Math.round(cy - dispH * ((def.ch - 3) / def.ch) + 6);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (e.hurtFlash > 0) ctx.filter = 'brightness(2.4) saturate(0.4)';
    if (e.state === 'dead') ctx.globalAlpha = Math.max(0, 1 - e.stateTimer / 0.8);
    if (e.facingLeft) {
      ctx.translate(dx + dispW, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, col * def.cw, row * def.ch, def.cw, def.ch, 0, 0, dispW, dispH);
    } else {
      ctx.drawImage(sheet, col * def.cw, row * def.ch, def.cw, def.ch, dx, dy, dispW, dispH);
    }
    ctx.restore();

    // barra de vida + nível (nível sempre visível nos monstros hostis)
    if (e.hostile && e.state !== 'dead') {
      const bw = 26;
      const bx = cx + 8 - bw / 2;
      const by = dy - 4;
      const hpFrac = Math.max(0, e.hp / e.maxHp);

      // etiqueta de nível acima da barra
      const lvlText = `Lv ${e.level}`;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(lvlText).width + 8;
      const lx = cx + 8;
      const ly = by - 11;
      ctx.fillStyle = 'rgba(10,12,20,0.78)';
      ctx.fillRect(lx - tw / 2, ly - 7, tw, 11);
      // cor por faixa de nível (dificuldade)
      ctx.fillStyle =
        e.level >= 12 ? '#f0abfc' : e.level >= 8 ? '#fca5a5' : e.level >= 4 ? '#fcd34d' : '#a7f3d0';
      ctx.fillText(lvlText, lx, ly + 2);

      if (hpFrac < 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(bx, by, bw * hpFrac, 2);
      }
    }
  }

  drawNPC(npc: NPC, camX: number, camY: number) {
    const ctx = this.ctx;
    const cx = Math.round(npc.x - camX);
    const cy = Math.round(npc.y - camY);

    if (npc.spriteType === 'merchant' && this.assets?.merchantIdle) {
      const frameW = 110;
      const frameH = 110;
      const sx = this.merchantFrame * frameW;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(cx + 32, cy + 62, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(this.assets.merchantIdle, sx, 0, frameW, frameH, cx, cy, 64, 72);
      return;
    }

    const sheetKey = NPC_SHEET[npc.spriteType];
    const sheet = sheetKey ? (this.assets?.[sheetKey] as HTMLImageElement | undefined) : undefined;
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const m = NPC_ANIM;
      const disp = 0.34;
      const dispW = m.cw * disp;
      const dispH = m.ch * disp;
      const row = AKLES_DIR_ROW[npc.direction];
      const col = npc.isMoving
        ? Math.floor(npc.stepTimer * (m.fps / 8)) % m.cols
        : 0; // parado = frame neutro (sem "pisar no lugar")
      const dx = Math.round(cx + npc.width / 2 - dispW / 2);
      const dy = Math.round(cy + npc.height - dispH * ((m.ch - 4) / m.ch));

      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx + npc.width / 2, cy + npc.height - 2, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Amostra o frame com um recuo de 1.5px: com imageSmoothing ligado a
      // interpolação bilinear "puxava" pixels dos frames vizinhos e desenhava
      // um fantasma do NPC ao lado (parecia dois NPCs ao andar).
      const inset = 1.5;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        sheet,
        col * m.cw + inset,
        row * m.ch + inset,
        m.cw - inset * 2,
        m.ch - inset * 2,
        dx,
        dy,
        Math.round(dispW),
        Math.round(dispH),
      );
      ctx.imageSmoothingEnabled = false;

      // marcador de conversa quando o herói está perto
      if (this.nearestNpcId === npc.id && !this.talkingNpcId) {
        const my = cy - 6 + Math.sin(this.timeElapsed * 5) * 2;
        ctx.fillStyle = npc.accent ?? '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx + npc.width / 2, my, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('E', cx + npc.width / 2, my + 3);
      }
    }
  }

  drawCompanion(camX: number, camY: number) {
    const ctx = this.ctx;
    const comp = this.companion;
    const cx = Math.round(comp.x - camX);
    const cy = Math.round(comp.y - camY);

    const img = comp.isMoving ? this.assets?.creatureRun : this.assets?.creatureIdle;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const fw = 96;
    const fh = 96;
    const sx = comp.frame * fw;
    const targetW = 44;
    const targetH = 44;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx + 22, cy + 38, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (comp.facingLeft) {
      ctx.translate(cx + targetW, cy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, 0, fw, fh, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(img, sx, 0, fw, fh, cx, cy, targetW, targetH);
    }
    ctx.restore();
  }

  // Ferramenta de coleta ao lado do Akles (ele fica parado, a ferramenta bate).
  // ---- ARMA FLUTUANTE (sistema global) ----
  // Nunca faz parte das sheets do Akles. Posição/rotação/escala 100% por
  // código: repouso flutuando ao lado, combo de 4 golpes, ou Amplificação
  // (mesmo sprite, escala maior). Troca de arma == troca de config, zero
  // mudança de animação do personagem.
  drawWeapon(camX: number, camY: number) {
    const ctx = this.ctx;
    const def = this.weaponDef;
    const energized = this.resonanceActive && def.spriteEnergizedAsset;
    const assetKey = (energized ? def.spriteEnergizedAsset : def.spriteAsset) as keyof LoadedAssets;
    const img = this.assets?.[assetKey] as HTMLImageElement | undefined;
    if (!img || !img.complete || !img.naturalWidth) return;

    const px = this.player.x + 12;
    const py = this.player.y + 6;
    const act = this.player.actionState;
    const baseAngle = DIR_ANGLE_DEG[this.player.direction];
    const v = def.visual;

    let angleDeg: number;
    let reach: number;
    let scaleMul: number;
    let spinDeg = 0;
    let wx: number;
    let wy: number;

    if (act === 'attack') {
      const meta = AKLES_ANIM.attack;
      const p = Math.min(1, (this.player.actionTimer || 0) / meta.cols);
      const f = comboTrajectory(this.comboIndex, p, baseAngle);
      angleDeg = f.angleDeg;
      reach = f.reach;
      scaleMul = f.scaleMul;
      spinDeg = f.spinDeg || 0;
      const rad = (angleDeg * Math.PI) / 180;
      wx = Math.round(px + Math.cos(rad) * reach - camX);
      wy = Math.round(py + Math.sin(rad) * reach * 0.55 - camY);
    } else if (act === 'spin') {
      const meta = AKLES_ANIM.spin;
      const p = Math.min(1, (this.player.actionTimer || 0) / meta.cols);
      const f = amplifyTrajectory(p, baseAngle);
      angleDeg = f.angleDeg;
      reach = f.reach;
      scaleMul = f.scaleMul;
      const rad = (angleDeg * Math.PI) / 180;
      wx = Math.round(px + Math.cos(rad) * reach - camX);
      wy = Math.round(py + Math.sin(rad) * reach * 0.55 - camY);
    } else {
      // repouso: SEMPRE nas costas do Akles — offset fixo, não gira com a
      // direção que ele encara (nem de frente ela aparece na mão).
      angleDeg = 250;
      scaleMul = 1;
      const bob = Math.sin(this.timeElapsed * v.floatSpeed) * v.floatAmplitude;
      wx = Math.round(px + v.restOffset.x - camX);
      wy = Math.round(py + v.restOffset.y + bob - camY);
    }

    const dispH = (img.naturalHeight || 300) * v.scale * scaleMul;
    const dispW = (img.naturalWidth || 100) * v.scale * scaleMul;
    const rad = (angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(rad + Math.PI / 2 + (spinDeg * Math.PI) / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // desenha com o cabo (base) próximo ao pivô
    ctx.drawImage(img, -dispW / 2, -dispH * 0.72, dispW, dispH);
    ctx.imageSmoothingEnabled = false;

    // Ressonância ativa: notas/partículas azuis ao redor da arma
    if (this.resonanceActive) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const ang = this.timeElapsed * 2.4 + (i * Math.PI * 2) / 3;
        const rr = 14 + Math.sin(this.timeElapsed * 3 + i) * 4;
        const nx = Math.cos(ang) * rr;
        const ny = Math.sin(ang) * rr - dispH * 0.35;
        ctx.fillStyle = 'rgba(120,190,255,0.75)';
        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  drawHarvestTool(camX: number, camY: number) {
    const ctx = this.ctx;
    const act = this.player.actionState;
    const isAxe = act === 'chop';
    const tier = isAxe ? this.equippedAxe : this.equippedPick;
    const key = (isAxe ? 'toolAxe' : 'toolPick') +
      tier.charAt(0).toUpperCase() + tier.slice(1);
    const img = this.assets?.[key as keyof typeof this.assets] as HTMLImageElement | undefined;
    if (!img || !img.complete || !img.naturalWidth) return;

    const px = this.player.x + 12;
    const py = this.player.y;

    // alvo: nó de coleta, ou a direção que o Akles encara
    let tx: number;
    let ty: number;
    const node = this.harvestFxNode;
    if (node) {
      tx = node.x + node.w / 2;
      ty = node.y + node.h * 0.55;
    } else {
      const d = this.player.direction;
      tx = px + (d === 'left' ? -40 : d === 'right' ? 40 : 0);
      ty = py + (d === 'up' ? -30 : d === 'down' ? 30 : 6);
    }
    const side = tx < px ? -1 : 1;

    // pivô: mão do Akles daquele lado, na altura do tronco
    const hx = Math.round(px - camX + side * 15);
    const hy = Math.round(py - camY + 12);

    // fase da batida (actionTimer vai de 0 a cols=6)
    const p = Math.min(1, (this.player.actionTimer || 0) / 6);
    // keyframes de ângulo (graus, 0 = ferramenta apontando pra cima)
    const kf: Array<[number, number]> = [
      [0.0, -35],
      [0.28, -78],
      [0.5, 46],
      [0.62, 40],
      [1.0, -12],
    ];
    let deg = kf[kf.length - 1][1];
    for (let i = 0; i < kf.length - 1; i++) {
      const [a, av] = kf[i];
      const [b, bv] = kf[i + 1];
      if (p >= a && p <= b) {
        const u = (p - a) / (b - a || 1);
        deg = av + (bv - av) * u;
        break;
      }
    }
    // "cabeça" da ferramenta aponta pro alvo: soma o ângulo base do vetor
    const aim = Math.atan2(ty - py, Math.abs(tx - px)) * 0.35;
    const rad = (deg * Math.PI) / 180 * side + aim * side;

    const dispH = isAxe ? 34 : 30;
    const dispW = (img.naturalWidth / img.naturalHeight) * dispH;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rad);
    if (side < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // desenha com o cabo (base da imagem) na mão
    ctx.drawImage(img, -dispW / 2, -dispH + 4, dispW, dispH);
    ctx.imageSmoothingEnabled = false;

    // brilho da ponta de cristal
    if (tier === 'crystal') {
      const gg = ctx.createRadialGradient(0, -dispH + 8, 1, 0, -dispH + 8, 14);
      gg.addColorStop(0, 'rgba(120,200,255,0.5)');
      gg.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = gg;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillRect(-14, -dispH - 6, 28, 28);
    }
    ctx.restore();
  }

  // Draw the Player with the user's custom animated Knight Hero
  drawPlayer(camX: number, camY: number) {
    const ctx = this.ctx;
    const char = this.player;
    const cx = Math.round(char.x - camX);
    const cy = Math.round(char.y - camY);

    // Soft drop shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 29, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const assets = this.assets;
    const dirRowMap: Record<Direction, number> = {
      left: 0,
      right: 1,
      up: 2,
      down: 3,
    };
    const row = dirRowMap[char.direction];

    const act = char.actionState;
    const isMoving = char.isMoving;
    // Akles NUNCA usa as sheets de combate (chop/attack/spin/cast) — sem
    // espada na mão, sem pose de ataque. Só a arma flutuante se move; o
    // corpo dele fica em idle/walk/run o tempo todo.
    const isAction = false;

    // ---- Akles: herói cavaleiro animado (sprite sheets processadas) ----
    const aklesKey: 'idle' | 'walk' | 'run' | AklesAction = isMoving
      ? this.heroRunning
        ? 'run'
        : 'walk'
      : 'idle';
    const aMeta = AKLES_ANIM[aklesKey];
    const aSheet = assets?.[aMeta.sheet] as HTMLImageElement | undefined;

    if (aSheet && aSheet.complete && aSheet.naturalWidth > 0) {
      const dispScale = aMeta.disp ?? AKLES_DISP_SCALE;
      const dispW = aMeta.cw * dispScale;
      const dispH = aMeta.ch * dispScale;
      const feetY = cy + 31;
      const feetFrac = aMeta.feetFrac ?? (aMeta.ch - 4) / aMeta.ch;

      const sheetRow = AKLES_DIR_ROW[char.direction];
      let col: number;
      if (isAction) {
        col = Math.min(aMeta.cols - 1, Math.max(0, char.frame));
      } else if (isMoving) {
        // sincronizado com o passo (stepTimer avança dt*8 ao andar)
        col = Math.floor(char.stepTimer * (aMeta.fps / 8)) % aMeta.cols;
      } else {
        col = Math.floor(this.timeElapsed * aMeta.fps) % aMeta.cols;
      }

      // Suaviza só o herói (as sheets têm resolução maior que o tamanho na tela).
      // Recuo de 1px na fonte p/ o filtro bilinear não puxar o frame vizinho
      // (o que fazia "meio de um, meio do outro").
      const gutter = 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        aSheet,
        col * aMeta.cw + gutter,
        sheetRow * aMeta.ch + gutter,
        aMeta.cw - gutter * 2,
        aMeta.ch - gutter * 2,
        Math.round(cx + 12 - dispW / 2),
        Math.round(feetY - dispH * feetFrac),
        Math.round(dispW),
        Math.round(dispH)
      );
      ctx.imageSmoothingEnabled = false;
      return;
    }

    // Draw the Player with the user's authentic animated Knight Hero
    if (assets?.heroAuthenticAnimated && assets.heroAuthenticAnimated.complete && assets.heroAuthenticAnimated.naturalWidth > 0) {
      const fw = 72;
      const fh = 80;
      let row = 0;
      let col = 0;

      if (isAction) {
        row = char.actionState === 'chop' ? 5 : 6;
        col = Math.min(3, Math.max(0, Math.floor(char.actionTimer || 0)));
      } else if (isMoving) {
        if (char.direction === 'down') row = 1;
        else if (char.direction === 'up') row = 2;
        else if (char.direction === 'left') row = 3;
        else if (char.direction === 'right') row = 4;
        col = Math.floor(char.stepTimer) % 4;
      } else {
        if (char.direction === 'up') {
          row = 2;
          col = 0;
        } else if (char.direction === 'left') {
          row = 3;
          col = 0;
        } else if (char.direction === 'right') {
          row = 4;
          col = 0;
        } else {
          row = 0; // Breathing Idle
          col = Math.floor(char.stepTimer) % 4;
        }
      }

      // Draw character preserving authentic proportions (32 x 64 px)
      ctx.drawImage(
        assets.heroAuthenticAnimated,
        col * fw,
        row * fh,
        fw,
        fh,
        cx - 4,
        cy - 36,
        32,
        64
      );
    } else if (assets?.knightWalk && assets?.knightIdle && assets?.knightSlash) {
      const fw = 40;
      const fh = 48;
      let img: HTMLImageElement;
      let col = 0;

      if (isAction) {
        img = assets.knightSlash;
        col = Math.min(5, Math.max(0, char.frame));
      } else if (isMoving) {
        img = assets.knightWalk;
        col = Math.floor(char.stepTimer) % 4;
      } else {
        img = assets.knightIdle;
        col = Math.floor(char.stepTimer) % 4;
      }

      ctx.drawImage(
        img,
        col * fw,
        row * fh,
        fw,
        fh,
        cx - 7,
        cy - 16,
        38,
        46
      );
    } else {
      const sheet = this.heroSprites.hero;
      const fallbackDirRowMap: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };
      const fallbackRow = fallbackDirRowMap[char.direction];
      const col = char.frame;
      ctx.drawImage(sheet, col * 20, fallbackRow * 28, 20, 28, cx, cy, 24, 32);
    }
  }
}

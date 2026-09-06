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
  Point,
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
  TERRAIN_TILES,
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
  weaponClass,
} from './weapons';
import { PASSIVE_DEFS } from './passives';
import { EQUIP_SETS, EQUIP_PIECE_INDEX, EQUIP_SLOT_ORDER, EquipSlotKey, EquipSetDef, EquipPieceDef, equipSetClass } from './catalogData';
import { StatKey, StatBag, mergeStatBags, STATS_WITHOUT_EFFECT, CharacterClassKey } from './statTypes';
import { DAILY_QUEST_POOL, QuestDef, QuestKind } from './quests';
export { WEAPON_DEFS } from './weapons';
export { PASSIVE_DEFS, PASSIVE_ORDER } from './passives';
export { EQUIP_SETS, EQUIP_PIECE_INDEX, EQUIP_SLOT_ORDER, EQUIP_SLOT_LABEL } from './catalogData';
export { STAT_LABELS, STATS_WITHOUT_EFFECT } from './statTypes';
export { DAILY_QUEST_POOL, QUEST_KIND_LABEL } from './quests';
export type { WeaponDef, WeaponTier, WeaponPassive } from './weapons';
export type { PassiveDef, PassiveGroup } from './passives';
export type { EquipSlotKey, EquipSetDef, EquipPieceDef, EquipPassive } from './catalogData';
export type { QuestDef, QuestKind, QuestReward } from './quests';

export interface QuestInstance {
  def: QuestDef;
  accepted: boolean;
  progress: number;
  claimed: boolean;
}
export type { StatKey, StatBag } from './statTypes';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type AklesAction = 'chop' | 'mine' | 'attack' | 'spin' | 'cast';

interface CombatZone {
  kind: 'winsChorus' | 'huansRain';
  x: number;
  y: number;
  radius: number;
  life: number;
  duration: number;
  tickT: number;
  entered: Record<string, number>;
  marked: Set<string>;
}

interface SpriteVfx {
  sheet: keyof LoadedAssets;
  x: number;
  y: number;
  angle: number;
  life: number;
  duration: number;
  width: number;
  height: number;
}

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

// ---- Wins — classe da Voz (personagem temporária) ----
// 3 folhas SEPARADAS (idle/walk/run são animações diferentes de verdade,
// cada uma com sua própria arte — não a mesma reaproveitada 3x). Cada
// O processador normaliza todas para células 156x340. A corrida da Wins é
// a única folha com 9 quadros; as demais têm 10.
const WINS_ANIM: Record<'idle' | 'walk' | 'run', AklesAnimMeta> = {
  idle: { sheet: 'winsIdle', cw: 156, ch: 340, cols: 10, fps: 6, loop: true, disp: HERO_DISP, feetFrac: 1 },
  walk: { sheet: 'winsWalk', cw: 156, ch: 340, cols: 10, fps: 10, loop: true, disp: HERO_DISP, feetFrac: 1 },
  run: { sheet: 'winsRun', cw: 156, ch: 340, cols: 9, fps: 15, loop: true, disp: HERO_DISP, feetFrac: 1 },
};
// ordem visual do sheet da Wins: 0=frente 1=esquerda 2=direita 3=costas
const WINS_DIR_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };

// ---- Huans — classe Cordas (personagem temporário) ----
// Mesma lógica: 3 folhas separadas, células e escala normalizadas.
const HUANS_ANIM: Record<'idle' | 'walk' | 'run', AklesAnimMeta> = {
  idle: { sheet: 'huansIdle', cw: 156, ch: 340, cols: 10, fps: 6, loop: true, disp: HERO_DISP, feetFrac: 1 },
  walk: { sheet: 'huansWalk', cw: 156, ch: 340, cols: 10, fps: 11, loop: true, disp: HERO_DISP, feetFrac: 1 },
  run: { sheet: 'huansRun', cw: 156, ch: 340, cols: 10, fps: 17, loop: true, disp: HERO_DISP, feetFrac: 1 },
};
const HUANS_DIR_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };

// tabelas de lookup por personagem — fora do loop de render (era recriada
// a cada frame dentro de drawPlayer, ~60x/seg à toa; pesava mais em
// aparelhos Android mais fracos).
const ANIM_BY_CHAR: Record<PlayerCharacterKey, Record<'idle' | 'walk' | 'run', AklesAnimMeta>> = {
  akles: AKLES_ANIM,
  wins: WINS_ANIM,
  huans: HUANS_ANIM,
};
const DIR_ROW_BY_CHAR: Record<PlayerCharacterKey, Record<Direction, number>> = {
  akles: AKLES_DIR_ROW,
  wins: WINS_DIR_ROW,
  huans: HUANS_DIR_ROW,
};

export type PlayerCharacterKey = 'akles' | 'wins' | 'huans';
export const CHARACTER_PORTRAITS: Record<PlayerCharacterKey, string> = {
  akles: '/assets/characters/portraits/akles.webp',
  wins: '/assets/characters/wins/wins_icon.png',
  huans: '/assets/characters/huans/huans_icon.png',
};
export const CHARACTER_ROSTER: PlayerCharacterKey[] = ['akles', 'wins', 'huans'];

// ---- RECURSOS COLETÁVEIS (árvores e pedras) ----
export interface ItemMeta {
  name: string;
  icon: string;
  weight: number; // peso por unidade
  heal?: number; // cura de vida
  xp?: number; // XP concedido ao usar (partituras)
  buff?: { label: string; duration: number; kind?: 'basic' | 'shield' | 'farm'; value?: number };
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
  potion_heal: { name: 'Poção de Cura', icon: '🧪', weight: 0.25, heal: 45, img: '/assets/ancient-ruins/Characters/NPC Merchant-icons-potion.png', desc: 'Restaura 45 de vida.' },
  potion_basic: { name: 'Tônico de Combate', icon: '⚔️', weight: 0.25, buff: { label: '+20% ataque básico', duration: 300, kind: 'basic', value: .20 }, img: '/assets/ancient-ruins/Characters/NPC Merchant-icons-sword.png', desc: 'Aumenta o dano dos ataques básicos por 5 minutos.' },
  potion_shield: { name: 'Poção de Escudo', icon: '🛡️', weight: 0.25, buff: { label: 'Escudo 25%', duration: 300, kind: 'shield', value: .25 }, img: '/assets/ancient-ruins/Characters/NPC Merchant-icons-potion.png', desc: 'Reduz o dano recebido em 25% por 5 minutos.' },
  potion_farm: { name: 'Essência do Coletor', icon: '🌿', weight: 0.25, buff: { label: '+50% coleta', duration: 600, kind: 'farm', value: .50 }, img: '/assets/ancient-ruins/Characters/NPC Merchant-icons-potion.png', desc: 'Aumenta os recursos obtidos na coleta por 10 minutos.' },
  ascension_keys: { name: 'Núcleo de Ascensão das Teclas', icon: '♬', weight: 0, img: '/assets/items/ascension_keys.png', desc: 'Relíquia garantida do Sentinela do Órgão. Necessária para ascender personagens da classe Teclas.' },
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

export interface ShopItemDef {
  id: string;
  item: string | 'fragment_pack' | 'bag_expansion';
  name: string;
  description: string;
  quantity: number;
  dailyLimit: number;
  currency: 'gold_raw' | 'gold_refined';
  price: number;
  img?: string;
  icon: string;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'refine_gold', item: 'gold_refined', name: 'Síntese de Ouro', description: 'Converte 5 ouros brutos em 1 barra.', quantity: 1, dailyLimit: 10, currency: 'gold_raw', price: 5, img: '/assets/items/props/gold_refined.png', icon: '◆' },
  { id: 'bag_expansion', item: 'bag_expansion', name: 'Expansão da Mochila', description: '+10 kg permanentes (máximo de 5).', quantity: 1, dailyLimit: 1, currency: 'gold_refined', price: 4, icon: '🎒' },
  { id: 'heal', item: 'potion_heal', name: 'Poção de Cura', description: 'Recupera 45 de vida.', quantity: 1, dailyLimit: 5, currency: 'gold_raw', price: 3, img: ITEM_META.potion_heal.img, icon: '🧪' },
  { id: 'basic', item: 'potion_basic', name: 'Tônico de Combate', description: '+20% no ataque básico por 5 min.', quantity: 1, dailyLimit: 2, currency: 'gold_refined', price: 1, img: ITEM_META.potion_basic.img, icon: '⚔️' },
  { id: 'shield', item: 'potion_shield', name: 'Poção de Escudo', description: '-25% de dano recebido por 5 min.', quantity: 1, dailyLimit: 2, currency: 'gold_refined', price: 2, img: ITEM_META.potion_shield.img, icon: '🛡️' },
  { id: 'farm', item: 'potion_farm', name: 'Essência do Coletor', description: '+50% de recursos coletados por 10 min.', quantity: 1, dailyLimit: 1, currency: 'gold_refined', price: 3, img: ITEM_META.potion_farm.img, icon: '🌿' },
  { id: 'wood', item: 'wood', name: 'Lote de Madeira', description: 'Pacote com 5 madeiras.', quantity: 5, dailyLimit: 4, currency: 'gold_raw', price: 2, icon: '🪵' },
  { id: 'stone', item: 'stone', name: 'Lote de Pedra', description: 'Pacote com 5 pedras.', quantity: 5, dailyLimit: 4, currency: 'gold_raw', price: 2, icon: '🪨' },
  { id: 'fragments', item: 'fragment_pack', name: 'Fragmentos de Nota', description: '3 fragmentos de notas aleatórias.', quantity: 3, dailyLimit: 3, currency: 'gold_refined', price: 1, icon: '◆' },
];

export function inventorySellOffer(item: string): { quantity: number; goldRaw: number } | null {
  if (item === 'clave' || item === 'gold_raw' || item === 'gold_refined') return null;
  if (item.startsWith('frag_')) return { quantity: 5, goldRaw: 1 };
  if (item === 'wood' || item === 'stone' || item === 'berry') return { quantity: 5, goldRaw: 1 };
  if (item === 'ore' || item.endsWith('_raw')) return { quantity: 3, goldRaw: 1 };
  if (item === 'potion_farm') return { quantity: 1, goldRaw: 3 };
  if (item === 'potion_shield') return { quantity: 1, goldRaw: 2 };
  if (item === 'potion_heal' || item === 'potion_basic') return { quantity: 1, goldRaw: 1 };
  if (item === 'partitura_ouro') return { quantity: 1, goldRaw: 12 };
  if (item === 'partitura_prata') return { quantity: 1, goldRaw: 5 };
  if (item === 'partitura_bronze') return { quantity: 1, goldRaw: 2 };
  if (item.endsWith('_refined')) return { quantity: 1, goldRaw: 2 };
  return { quantity: 3, goldRaw: 1 };
}
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
  harmonicPower: number;
  defense: number;
  critChance: number;
  critDamage: number;
  energy: number;
  maxEnergy: number;
  moveSpeedPct: number;
  attackSpeedPct: number;
}

export type AttrKey = 'forca' | 'agilidade' | 'vitalidade' | 'inteligencia' | 'sorte' | 'ressonancia';

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
  antony: 'npcSrAntony',
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
  dark_bigpine: { kind: 'tree', maxHp: 5, drop: 'wood', dropMin: 3, dropMax: 6, respawnSecs: 34 },
};

export const CLASS_PASSIVE_DEFS: Record<string, {
  character: 'wins' | 'huans';
  group: 'geral' | 'skill1' | 'skill2' | 'skill3';
  name: string;
  desc: string;
  attribute: string;
  values: [number, number, number, number, number];
  format: 'percent';
  level5Bonus: string;
}> = {
  winsRessonanciaVocal: { character: 'wins', group: 'geral', name: 'Ressonância Vocal', desc: 'A terceira Nota explode em área. Também aumenta a recuperação de Energia e o dano recebido por alvos Resonantes.', attribute: 'Dano da explosão', values: [.60,.66,.72,.78,.84], format: 'percent', level5Bonus: 'Resonante passa a amplificar em 12% todas as Skills da Wins.' },
  winsNotaPerfurante: { character: 'wins', group: 'skill1', name: 'Afinação Perfurante', desc: 'Aumenta o dano adicional da Nota Perfurante contra inimigos Resonantes.', attribute: 'Bônus contra Resonante', values: [.20,.23,.26,.29,.32], format: 'percent', level5Bonus: 'A onda deixa um eco visual adicional no alvo atingido.' },
  winsCoroDissonante: { character: 'wins', group: 'skill2', name: 'Palco Dissonante', desc: 'Aumenta a redução de movimento aplicada pelo Coro Dissonante.', attribute: 'Lentidão', values: [.20,.22,.24,.26,.28], format: 'percent', level5Bonus: 'O Silenciamento dura 1,4 segundo.' },
  winsAriaClimax: { character: 'wins', group: 'skill3', name: 'Clímax Ascendente', desc: 'Aumenta o bônus de dano recebido pela Ária para cada Nota Vocal consumida.', attribute: 'Dano por Nota', values: [.10,.11,.12,.13,.14], format: 'percent', level5Bonus: 'Consumir 3 Notas devolve 6% da Energia máxima.' },
  huansInstinto: { character: 'huans', group: 'geral', name: 'Instinto do Caçador', desc: 'Cada Marca da Presa aumenta o dano contra o alvo. Com 5 marcas, também aumenta o crítico.', attribute: 'Dano por Marca', values: [.02,.0225,.025,.0275,.03], format: 'percent', level5Bonus: 'Presa Marcada concede +12% de Chance Crítica.' },
  huansFlecha: { character: 'huans', group: 'skill1', name: 'Ponta Predatória', desc: 'Aumenta o dano adicional da Flecha Resonante contra uma Presa Marcada.', attribute: 'Bônus contra Presa', values: [.20,.23,.26,.29,.32], format: 'percent', level5Bonus: 'O primeiro alvo atingido recebe uma marca adicional.' },
  huansPasso: { character: 'huans', group: 'skill2', name: 'Passo Implacável', desc: 'Aumenta a Velocidade de Ataque concedida após o deslocamento.', attribute: 'Velocidade de Ataque', values: [.20,.22,.24,.26,.28], format: 'percent', level5Bonus: 'O bônus de movimento sobe para 14%.' },
  huansChuva: { character: 'huans', group: 'skill3', name: 'Cerco da Presa', desc: 'Aumenta o dano da Chuva das Cordas contra uma Presa Marcada.', attribute: 'Bônus contra Presa', values: [.25,.28,.31,.34,.37], format: 'percent', level5Bonus: 'Contra alvo único, o bônus total sobe para 46%.' },
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
  boss?: boolean;
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
  organ_sentinel: {
    sheet: 'bossOrganIdle', name: 'Sentinela do Órgão', hostile: true, boss: true,
    cols: 8, cw: 160, ch: 240, disp: 0.86,
    hp: 480, speed: 44, aggro: 430, attackRange: 185, touchDamage: 16, attackCd: 1.7,
    xp: 900, claveMin: 18, claveMax: 28, fragMin: 10, fragMax: 16, respawnSecs: 900,
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
  spriteType?: NPC['spriteType'];
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
  onAssetsLoaded?: () => void;
  heroSprites: ReturnType<typeof generateCharacterSprites>;
  trees: ReturnType<typeof generateTrees>;
  houses: ReturnType<typeof generateHouses>;

  ground: number[][];
  staticColliders: Rect[] = [];
  props: WorldProp[];
  npcs: NPC[];

  player: CharacterState;
  companion: CompanionState;

  // Campanha narrativa. O jogo começa somente com Akles; o companheiro de
  // combate é liberado mais tarde pela escolha entre Wins e Huans.
  companionVisible = false;
  storyControlLocked = false;
  storyObjective: { title: string; text: string; progress: number; target: number; ready: boolean } | null = null;
  onStoryBeat?: (beat: 'movement_learned' | 'attack_learned' | 'opening_sound_found' | 'shinkers_appear' | 'shinkers_defeated' | 'three_echoes_found' | 'gate_arrival' | 'mirella_arrival' | 'house_entered' | 'morning_arrival' | 'opening_mission_complete' | 'antony_arrival' | 'second_mission_complete') => void;
  private openingSoundTarget: Point | null = null;
  private storyStage: 'idle' | 'follow_vibration' | 'sol_bemol_scene' | 'find_origin' | 'encounter_scene' | 'fight' | 'aftermath' | 'find_echoes' | 'echo_scene' | 'follow_echoes' | 'gate_scene' | 'follow_pippo' | 'mirella_scene' | 'entering_house' | 'rest_scene' | 'morning_scene' | 'follow_pippo_antony' | 'antony_scene' | 'complete' = 'idle';
  private openingMissionComplete = true;
  private antonyMissionComplete = false;
  voicesMissionAccepted = false;
  marketIntroStage: 'not_started' | 'intro' | 'collecting' | 'completed' = 'not_started';
  lucianMeetingRewarded = false;
  private storyMoveOrigin: Point | null = null;
  private storyMovementTaught = false;
  private storyAttackTaught = false;
  private storyEnemyIds = new Set<string>();
  private storyEchoIds = new Set<string>();
  private suspendedStoryEnemies: Enemy[] = [];
  private storyCheckpoint: Point | null = null;
  private storyDialogueIndex = 0;
  private storyDialogueAt = 0;
  onStoryVoice?: (text: string, voice: string) => void;
  private storyActorMoves: Array<{
    kind: 'npc' | 'enemy';
    id: string;
    x: number;
    y: number;
    speed: number;
    path?: Point[];
  }> = [];

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

  // Balões de fala (NPCs, Akles e Chat Multiplayer)
  private bubbles: Array<{
    who: 'npc' | 'enemy' | 'akles' | 'remotePlayer';
    npcId?: string;
    enemyId?: string;
    remotePlayerId?: string;
    playerName?: string;
    text: string;
    born: number;
    ttl: number;
  }> = [];
  private npcBarkCd: Record<string, number> = {};
  private barkNpcInRange: string | null = null;

  // Jogadores remotos sincronizados em tempo real (Multiplayer Online)
  public remotePlayers: Map<string, {
    id: string;
    name: string;
    character: 'akles' | 'wins' | 'huans';
    x: number;
    y: number;
    direction: Direction;
    isMoving: boolean;
    stepTimer: number;
    actionState?: CharacterState['actionState'];
    actionTimer?: number;
    lastUpdate: number;
    targetX?: number;
    targetY?: number;
  }> = new Map();

  setRemotePlayer(data: {
    id: string;
    name: string;
    character: 'akles' | 'wins' | 'huans';
    x: number;
    y: number;
    direction: Direction;
    isMoving: boolean;
    stepTimer: number;
    actionState?: CharacterState['actionState'];
    actionTimer?: number;
    lastUpdate: number;
  }) {
    if (!data?.id || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    const current = this.remotePlayers.get(data.id);
    this.remotePlayers.set(data.id, current
      ? { ...current, ...data, x: current.x, y: current.y, targetX: data.x, targetY: data.y }
      : { ...data, targetX: data.x, targetY: data.y });
  }

  private updateRemotePlayers(dt: number) {
    const blend = 1 - Math.exp(-dt * 14);
    for (const [id, player] of this.remotePlayers) {
      player.x += ((player.targetX ?? player.x) - player.x) * blend;
      player.y += ((player.targetY ?? player.y) - player.y) * blend;
      if (Date.now() - player.lastUpdate > 15000) this.remotePlayers.delete(id);
    }
  }

  removeRemotePlayer(id: string) {
    this.remotePlayers.delete(id);
  }

  clearRemotePlayers() {
    this.remotePlayers.clear();
  }
  onEnemyDamaged?: (enemyId: string, damage: number, fromX: number, fromY: number) => void;
  private applyingNetworkDamage = false;

  applyRemoteEnemyDamage(enemyId: string, damage: number, fromX: number, fromY: number) {
    const enemy = this.enemies.find((candidate) => candidate.id === enemyId);
    if (!enemy || enemy.state === 'dead' || !Number.isFinite(damage) || damage <= 0) return;
    this.applyingNetworkDamage = true;
    this.damageEnemy(enemy, damage, fromX, fromY, { networkFinal: true });
    this.applyingNetworkDamage = false;
  }

  showChatBubble(senderId: string, senderName: string, text: string, isLocal = false) {
    this.bubbles.push({
      who: isLocal ? 'akles' : 'remotePlayer',
      remotePlayerId: senderId,
      playerName: senderName,
      text,
      born: this.timeElapsed,
      ttl: 6.5,
    });
  }

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
  private enemyRngState = 0x41c0de;
  private enemyRandom() {
    this.enemyRngState = (Math.imul(this.enemyRngState, 1664525) + 1013904223) >>> 0;
    return this.enemyRngState / 0x100000000;
  }
  lightBeams: LightBeam[] = [];
  combatZones: CombatZone[] = [];
  spriteVfx: SpriteVfx[] = [];
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
  bagLevel = 0;
  get maxCarryWeight() { return MAX_CARRY_WEIGHT + Math.min(5, this.bagLevel) * 10; }
  shopPurchases: { date: string; counts: Record<string, number> } = {
    date: new Date().toISOString().slice(0, 10),
    counts: {},
  };

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
  private weaponByCharacter: Record<PlayerCharacterKey, string> = {
    akles: 'acordelamina_t2', wins: 'vocal_cajado_do_solista', huans: 'cordas_arco_do_violao_harmonico',
  };
  // nível de cada arma é independente — trocar de arma não reseta progresso.
  weaponLevels: Record<string, number> = { acordelamina_t2: 1 };
  onWeaponChange?: () => void;
  get weaponDef(): WeaponDef {
    return WEAPON_DEFS[this.equippedWeaponKey];
  }
  get weaponLevel(): number {
    return this.weaponLevels[this.equippedWeaponKey] ?? 1;
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
    this.weaponLevels[this.equippedWeaponKey] = this.weaponLevel + 1;
    this.onInventoryChange?.({ ...this.inventory });
    this.onWeaponChange?.();
    this.onHarvestPopup?.(
      `⚔ ${this.weaponDef.name} +${this.weaponLevel}!`,
      this.player.x,
      this.player.y - 20,
    );
    return true;
  }
  // Troca a arma equipada (catálogo — sem gate de posse por enquanto).
  equipWeapon(key: string): boolean {
    if (!WEAPON_DEFS[key] || key === this.equippedWeaponKey || weaponClass(WEAPON_DEFS[key]) !== this.characterClassKey) return false;
    this.equippedWeaponKey = key;
    this.weaponByCharacter[this.activeCharacter] = key;
    if (this.weaponLevels[key] == null) this.weaponLevels[key] = 1;
    this.syncEquipHpBonus();
    this.onWeaponChange?.();
    return true;
  }

  // ---- Personagem ativo (Akles / Wins / Huans — personagens temporários) ----
  activeCharacter: PlayerCharacterKey = 'akles';
  private unlockedCharacters = new Set<PlayerCharacterKey>(['akles']);
  onCharacterChange?: () => void;
  private static readonly CHARACTER_DEFAULT_WEAPON: Record<PlayerCharacterKey, string> = {
    akles: 'acordelamina_t2',
    wins: 'vocal_cajado_do_solista',
    huans: 'cordas_arco_do_violao_harmonico',
  };
  private static readonly CHARACTER_IDENTITY: Record<PlayerCharacterKey, { name: string; className: string }> = {
    akles: { name: 'Akles', className: 'Cavaleiro Errante' },
    wins: { name: 'Wins', className: 'Arauto da Voz' },
    huans: { name: 'Huans', className: 'Caçador das Cordas' },
  };
  get activeCharacterPortrait(): string {
    return CHARACTER_PORTRAITS[this.activeCharacter];
  }
  get availableCharacters(): PlayerCharacterKey[] {
    return CHARACTER_ROSTER.filter((character) => this.unlockedCharacters.has(character));
  }
  get characterClassKey(): CharacterClassKey {
    return this.activeCharacter === 'akles' ? 'teclas' : this.activeCharacter === 'wins' ? 'vocal' : 'cordas';
  }
  switchCharacter(key: PlayerCharacterKey): boolean {
    if (key === this.activeCharacter || !this.unlockedCharacters.has(key)) return false;
    if (this.appliedEquipHpBonus) {
      this.stats.maxHp -= this.appliedEquipHpBonus;
      this.stats.hp = Math.min(this.stats.hp, this.stats.maxHp);
      this.appliedEquipHpBonus = 0;
    }
    this.statsByCharacter[this.activeCharacter] = { ...this.stats };
    this.piecesByCharacter[this.activeCharacter] = { ...this.equippedPieces };
    this.activeCharacter = key;
    this.stats = { ...this.statsByCharacter[key] };
    this.equippedPieces = { ...this.piecesByCharacter[key] };
    this.equippedWeaponKey = this.weaponByCharacter[key] ?? GameEngine.CHARACTER_DEFAULT_WEAPON[key];
    this.syncEquipHpBonus();
    this.lightBeams = [];
    this.combatZones = [];
    this.spriteVfx = [];
    this.player.actionState = 'idle';
    // miniatura, nome e classe seguem o personagem ativo — vida, nível e
    // poder já são os mesmos this.stats compartilhados, então já "seguem
    // junto" automaticamente (mesmo progresso de personagem, corpos
    // diferentes).
    const identity = GameEngine.CHARACTER_IDENTITY[key];
    this.stats.name = identity.name;
    this.stats.className = identity.className;
    this.onStatsChange?.({ ...this.stats });
    this.onCharacterChange?.();
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
  skillCooldowns: Record<PlayerCharacterKey, [number, number, number]> = {
    akles: [0, 0, 0], wins: [0, 0, 0], huans: [0, 0, 0],
  };
  skillLevels: Record<PlayerCharacterKey, [number, number, number]> = {
    akles: [1, 1, 1], wins: [1, 1, 1], huans: [1, 1, 1],
  };
  hunterBuffT = 0;
  hunterEnhancedBasics = 0;
  hunterGuaranteedCrit = false;
  hunterDashWindow = 0;

  // Passivas (todas Nível 1 por padrão — sem sistema de pontos ainda)
  passiveLevels: Record<string, number> = Object.fromEntries(
    Object.keys(PASSIVE_DEFS).map((k) => [k, 1]),
  );
  classPassiveLevels: Record<string, number> = Object.fromEntries(
    Object.keys(CLASS_PASSIVE_DEFS).map((k) => [k, 1]),
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
    this.saveSkillProgression();
  }
  getAnyPassiveLevel(id: string): number {
    return PASSIVE_DEFS[id] ? this.getPassiveLevel(id) : (this.classPassiveLevels[id] ?? 1);
  }
  classPassiveValue(id: string): number {
    const def = CLASS_PASSIVE_DEFS[id];
    if (!def) return 0;
    return def.values[Math.max(0, Math.min(4, this.getAnyPassiveLevel(id) - 1))];
  }
  passiveUpgradeCost(id: string): Record<string, number> | null {
    if (!PASSIVE_DEFS[id] && !CLASS_PASSIVE_DEFS[id]) return null;
    const level = this.getAnyPassiveLevel(id);
    if (level >= 5) return null;
    return { clave: 10 * level, eco_dust: 2 * level, crystal_blue_raw: level };
  }
  canUpgradePassive(id: string): boolean {
    const cost = this.passiveUpgradeCost(id);
    return !!cost && Object.entries(cost).every(([key, qty]) => (this.inventory[key] || 0) >= qty);
  }
  upgradePassive(id: string): boolean {
    if (!this.canUpgradePassive(id)) return false;
    const cost = this.passiveUpgradeCost(id)!;
    for (const [key, qty] of Object.entries(cost)) {
      this.inventory[key] = Math.max(0, (this.inventory[key] || 0) - qty);
      if (!this.inventory[key]) delete this.inventory[key];
    }
    if (PASSIVE_DEFS[id]) this.passiveLevels[id] = this.getAnyPassiveLevel(id) + 1;
    else this.classPassiveLevels[id] = this.getAnyPassiveLevel(id) + 1;
    this.saveSkillProgression();
    this.onInventoryChange?.({ ...this.inventory });
    this.onHarvestPopup?.('✦ Passiva aprimorada!', this.player.x, this.player.y - 20);
    return true;
  }
  getSkillLevel(slot: number, character: PlayerCharacterKey = this.activeCharacter) {
    return this.skillLevels[character][Math.max(0, Math.min(2, slot))] ?? 1;
  }
  skillRankMul(slot: number) {
    return 1 + (this.getSkillLevel(slot) - 1) * .10;
  }
  skillEnergyCost(base: number, slot: number) {
    return Math.ceil(base * (1 + (this.getSkillLevel(slot) - 1) * .08));
  }
  skillUpgradeCost(slot: number): Record<string, number> | null {
    const level = this.getSkillLevel(slot);
    if (level >= 5) return null;
    return { clave: 15 * level, eco_dust: 3 * level, crystal_blue_raw: 2 * level };
  }
  skillUpgradeRequirement(slot: number): { label: string; current: number; required: number; met: boolean } {
    const next = this.getSkillLevel(slot) + 1;
    if (this.activeCharacter === 'wins') {
      const required = [0, 0, 130, 145, 160, 180][next];
      return { label: 'Ressonância Máxima', current: this.stats.maxEnergy, required, met: this.stats.maxEnergy >= required };
    }
    if (this.activeCharacter === 'huans') {
      const required = [0, 0, 12, 15, 19, 24][next];
      return { label: 'Agilidade', current: this.stats.agilidade, required, met: this.stats.agilidade >= required };
    }
    const current = slot === 2 ? this.stats.inteligencia : this.stats.forca;
    const required = [0, 0, 10, 13, 17, 22][next];
    return { label: slot === 2 ? 'Inteligência' : 'Força', current, required, met: current >= required };
  }
  canUpgradeSkill(slot: number): boolean {
    const cost = this.skillUpgradeCost(slot);
    return !!cost && this.skillUpgradeRequirement(slot).met && Object.entries(cost).every(([key, qty]) => (this.inventory[key] || 0) >= qty);
  }
  upgradeSkill(slot: number): boolean {
    if (!this.canUpgradeSkill(slot)) return false;
    const cost = this.skillUpgradeCost(slot)!;
    for (const [key, qty] of Object.entries(cost)) {
      this.inventory[key] = Math.max(0, (this.inventory[key] || 0) - qty);
      if (!this.inventory[key]) delete this.inventory[key];
    }
    this.skillLevels[this.activeCharacter][slot] += 1;
    this.saveSkillProgression();
    this.onInventoryChange?.({ ...this.inventory });
    return true;
  }
  private saveSkillProgression() {
    try { localStorage.setItem('acordelot_skill_progress_v1', JSON.stringify({ akles: this.passiveLevels, classes: this.classPassiveLevels, skills: this.skillLevels })); } catch {}
  }
  private loadSkillProgression() {
    try {
      const parsed = JSON.parse(localStorage.getItem('acordelot_skill_progress_v1') || '{}');
      for (const key of Object.keys(PASSIVE_DEFS)) if (parsed.akles?.[key]) this.passiveLevels[key] = Math.max(1, Math.min(5, parsed.akles[key]));
      for (const key of Object.keys(CLASS_PASSIVE_DEFS)) if (parsed.classes?.[key]) this.classPassiveLevels[key] = Math.max(1, Math.min(5, parsed.classes[key]));
      for (const char of CHARACTER_ROSTER) if (Array.isArray(parsed.skills?.[char])) this.skillLevels[char] = parsed.skills[char].map((n: number) => Math.max(1, Math.min(5, n))) as [number, number, number];
    } catch {}
  }

  // ---- Equipamentos (Colar / Anel / Aura / Catalisador) ----
  // Cada slot guarda a CHAVE da peça equipada (de qualquer conjunto/tier) —
  // permite montar builds mistas (4 peças de um conjunto, ou 2+2 de dois
  // conjuntos diferentes). Aprimoramento (+0 a +15) é guardado por peça,
  // independente de ela estar equipada agora.
  equippedPieces: Record<EquipSlotKey, string | null> = {
    colar: null,
    anel: null,
    aura: null,
    catalisador: null,
  };
  private piecesByCharacter: Record<PlayerCharacterKey, Record<EquipSlotKey, string | null>> = {
    akles: { colar: null, anel: null, aura: null, catalisador: null },
    wins: { colar: null, anel: null, aura: null, catalisador: null },
    huans: { colar: null, anel: null, aura: null, catalisador: null },
  };
  pieceLevels: Record<string, number> = {};
  onEquipChange?: () => void;
  private appliedEquipHpBonus = 0;

  getPieceLevel(key: string): number {
    return this.pieceLevels[key] ?? 0;
  }
  // custo p/ subir a peça `key` do nível atual -> +1 (reaproveita os mesmos
  // materiais das armas; null = já no +15).
  pieceUpgradeCost(key: string): Record<string, number> | null {
    const entry = EQUIP_PIECE_INDEX[key];
    if (!entry) return null;
    const lvl = this.getPieceLevel(key);
    if (lvl >= 15) return null;
    const tier = entry.set.tier;
    return {
      gold_refined: tier * (1 + Math.floor(lvl * 0.6)),
      crystal_blue_refined: Math.max(1, Math.floor(tier * (0.5 + lvl * 0.3))),
      gold_raw: tier * (2 + lvl),
      crystal_blue_raw: tier * (1 + Math.floor(lvl * 0.7)),
    };
  }
  canUpgradePiece(key: string): boolean {
    const cost = this.pieceUpgradeCost(key);
    if (!cost) return false;
    return Object.entries(cost).every(([k, n]) => (this.inventory[k] || 0) >= n);
  }
  upgradePiece(key: string): boolean {
    if (!this.canUpgradePiece(key)) return false;
    const cost = this.pieceUpgradeCost(key)!;
    for (const [k, n] of Object.entries(cost)) {
      this.inventory[k] = Math.max(0, (this.inventory[k] || 0) - n);
      if (this.inventory[k] === 0) delete this.inventory[k];
    }
    this.pieceLevels[key] = this.getPieceLevel(key) + 1;
    this.syncEquipHpBonus();
    this.onInventoryChange?.({ ...this.inventory });
    this.onEquipChange?.();
    return true;
  }
  equipPiece(key: string): boolean {
    const entry = EQUIP_PIECE_INDEX[key];
    if (!entry || equipSetClass(entry.set) !== this.characterClassKey) return false;
    this.equippedPieces[entry.piece.slot] = key;
    this.syncEquipHpBonus();
    this.onEquipChange?.();
    return true;
  }
  unequipSlot(slot: EquipSlotKey) {
    this.equippedPieces[slot] = null;
    this.syncEquipHpBonus();
    this.onEquipChange?.();
  }
  // Quantas peças de cada conjunto estão equipadas agora — base do bônus 2/4.
  get activeSetCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const slot of EQUIP_SLOT_ORDER) {
      const key = this.equippedPieces[slot];
      const entry = key ? EQUIP_PIECE_INDEX[key] : undefined;
      if (!entry) continue;
      counts[entry.set.key] = (counts[entry.set.key] ?? 0) + 1;
    }
    return counts;
  }
  // Soma total de uma stat: peças equipadas (com aprimoramento) + bônus de
  // conjunto ativo (2/4 peças) + arma equipada. Em pontos percentuais.
  equipStat(key: StatKey): number {
    let total = 0;
    for (const slot of EQUIP_SLOT_ORDER) {
      const pieceKey = this.equippedPieces[slot];
      const entry = pieceKey ? EQUIP_PIECE_INDEX[pieceKey] : undefined;
      if (!entry) continue;
      const base = entry.piece.stats[key] ?? 0;
      if (base === 0) continue;
      const lvl = this.getPieceLevel(pieceKey!);
      total += base * (1 + lvl * 0.08); // aprimoramento: +8%/nível (até +15 ≈ +120%)
    }
    const counts = this.activeSetCounts;
    for (const set of EQUIP_SETS) {
      const n = counts[set.key] ?? 0;
      if (n >= 2) total += set.bonus2[key] ?? 0;
      if (n >= 4) total += set.bonus4[key] ?? 0;
    }
    total += this.weaponDef.statBonus[key] ?? 0;
    return total;
  }
  // HP Máximo é % — reconciliado como delta flat sobre stats.maxHp sempre
  // que algo muda (equipar/desequipar/upar peça, trocar de arma).
  private syncEquipHpBonus() {
    const pct = this.equipStat('hpPct');
    const baseForPct = this.stats.maxHp - this.appliedEquipHpBonus;
    const newBonus = Math.round(baseForPct * (pct / 100));
    const delta = newBonus - this.appliedEquipHpBonus;
    if (delta !== 0) {
      this.stats.maxHp += delta;
      this.stats.hp = delta > 0 ? this.stats.hp + delta : Math.min(this.stats.hp, this.stats.maxHp);
      this.onStatsChange?.({ ...this.stats });
    }
    this.appliedEquipHpBonus = newBonus;
  }

  // ---- Missões diárias (independentes da história) ----
  // 3 sorteadas do pool por dia (reseta à meia-noite local, via
  // localStorage). Só contam progresso depois de aceitas.
  dailyQuests: QuestInstance[] = [];
  onQuestsChange?: () => void;

  private static readonly QUEST_LS_KEY = 'acordelot_daily_quests_v1';

  private loadOrRollDailyQuests() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem(GameEngine.QUEST_LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          date: string;
          quests: Array<{ id: string; accepted: boolean; progress: number; claimed: boolean }>;
        };
        if (saved.date === today && Array.isArray(saved.quests) && saved.quests.length === 3) {
          const restored = saved.quests
            .map((q) => {
              const def = DAILY_QUEST_POOL.find((d) => d.id === q.id);
              return def ? { def, accepted: q.accepted, progress: q.progress, claimed: q.claimed } : null;
            })
            .filter((q): q is QuestInstance => q !== null);
          if (restored.length === 3) {
            this.dailyQuests = restored;
            return;
          }
        }
      }
    } catch {
      /* localStorage indisponível — sorteia normalmente */
    }
    const pool = [...DAILY_QUEST_POOL];
    const picked: QuestDef[] = [];
    while (picked.length < 3 && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    this.dailyQuests = picked.map((def) => ({ def, accepted: false, progress: 0, claimed: false }));
    this.saveDailyQuests(today);
  }
  private saveDailyQuests(date?: string) {
    try {
      localStorage.setItem(
        GameEngine.QUEST_LS_KEY,
        JSON.stringify({
          date: date ?? new Date().toISOString().slice(0, 10),
          quests: this.dailyQuests.map((q) => ({
            id: q.def.id,
            accepted: q.accepted,
            progress: q.progress,
            claimed: q.claimed,
          })),
        }),
      );
    } catch {
      /* ignora — missões continuam funcionando só nesta sessão */
    }
  }
  acceptQuest(id: string): boolean {
    if (!this.dailyQuestsUnlocked) return false;
    const q = this.dailyQuests.find((x) => x.def.id === id);
    if (!q || q.accepted) return false;
    q.accepted = true;
    this.saveDailyQuests();
    this.onQuestsChange?.();
    return true;
  }
  claimQuestReward(id: string): boolean {
    if (!this.dailyQuestsUnlocked) return false;
    const q = this.dailyQuests.find((x) => x.def.id === id);
    if (!q || !q.accepted || q.claimed || q.progress < q.def.target) return false;
    for (const r of q.def.rewards) {
      if (r.item === 'clave') this.addCoins(r.qty);
      else if (r.item.startsWith('frag_')) this.addFragment(NOTE_KEY.indexOf(r.item.slice(5)), r.qty);
      else this.addToInventory(r.item, r.qty);
    }
    q.claimed = true;
    this.saveDailyQuests();
    this.onQuestsChange?.();
    this.onHarvestPopup?.(`✓ Missão concluída: ${q.def.title}!`, this.player.x, this.player.y - 20);
    return true;
  }
  private bumpQuestProgress(kind: QuestKind, n = 1) {
    if (!this.dailyQuestsUnlocked) return;
    let changed = false;
    for (const q of this.dailyQuests) {
      if (!q.accepted || q.claimed || q.def.kind !== kind || q.progress >= q.def.target) continue;
      q.progress = Math.min(q.def.target, q.progress + n);
      changed = true;
    }
    if (changed) {
      this.saveDailyQuests();
      this.onQuestsChange?.();
    }
  }
  // missão ativa mais relevante pra mostrar embaixo da barra de vida
  get activeQuestObjective(): { title: string; text: string; progress: number; target: number; ready: boolean } | null {
    if (this.storyObjective) return this.storyObjective;
    const q = this.dailyQuests.find((x) => x.accepted && !x.claimed);
    if (!q) return null;
    const ready = q.progress >= q.def.target;
    return {
      title: q.def.title,
      text: ready ? `${q.def.title} — pronta! Volte às Missões pra coletar.` : `${q.def.title}: ${q.def.desc} (${q.progress}/${q.def.target})`,
      progress: q.progress,
      target: q.def.target,
      ready,
    };
  }

  /** Registro da campanha. As diárias só serão abertas por uma missão futura. */
  get dailyQuestsUnlocked() { return false; }

  get isOpeningComplete() { return this.openingMissionComplete; }
  get isAntonyMissionComplete() { return this.antonyMissionComplete; }

  get completedMainQuestIds() {
    const ids: string[] = ['MQ_C1_001_DESPERTAR_SEM_NOME'];
    if (this.antonyMissionComplete) ids.push('MQ_C1_002_ESTRADA_PARA_ACORDELOT');
    if (this.voicesMissionAccepted) ids.push('MQ_C1_003_AS_VOZES_DE_ACORDELOT_ACCEPTED');
    if (this.marketIntroStage === 'completed') ids.push('SQ_MERCADO_PRIMEIRA_COLETA');
    if (this.lucianMeetingRewarded) ids.push('MQ_C1_003_AS_VOZES_DE_ACORDELOT');
    return ids;
  }

  restoreMainQuestProgress(ids: string[]) {
    this.openingMissionComplete = true;
    this.antonyMissionComplete = ids.includes('MQ_C1_002_ESTRADA_PARA_ACORDELOT')
      || ids.includes('MQ_C1_002_ESTRADA_ACORDELOT');
    this.voicesMissionAccepted = ids.includes('MQ_C1_003_AS_VOZES_DE_ACORDELOT_ACCEPTED')
      || ids.includes('MQ_C1_003_AS_VOZES_DE_ACORDELOT');
    if (ids.includes('SQ_MERCADO_PRIMEIRA_COLETA') || ids.includes('MQ_C1_003_AS_VOZES_DE_ACORDELOT')) {
      this.marketIntroStage = 'completed';
    } else if (this.voicesMissionAccepted) {
      this.marketIntroStage = 'intro';
    }
    if (ids.includes('MQ_C1_003_AS_VOZES_DE_ACORDELOT')) {
      this.lucianMeetingRewarded = true;
    }
    if (this.openingMissionComplete) {
      const antony = this.ensureSrAntony();
      if (this.antonyMissionComplete) {
        this.storyStage = 'complete';
        this.storyControlLocked = false;
        const pippo = this.npcs.find((npc) => npc.id === 'story_pippo')
          ?? this.ensureStoryNpc('story_pippo', 'Pippo', 'seminima', antony.x - 38, antony.y + 4, '#fbbf24');
        pippo.direction = 'right';
        this.ensureLucian();
      }
    }
    this.onQuestsChange?.();
  }

  acceptVoicesMission(): boolean {
    if (this.voicesMissionAccepted) return false;
    this.voicesMissionAccepted = true;
    this.marketIntroStage = 'intro';
    this.storyObjective = {
      title: 'As Vozes de Acordelot',
      text: 'Apresente-se a Miro no Mercado de Acordelot',
      progress: 0,
      target: 2,
      ready: false,
    };
    this.onQuestsChange?.();
    return true;
  }

  get mainQuestLog() {
    const woodCount = Math.min(3, this.inventory['wood'] || 0);
    const stoneCount = Math.min(3, this.inventory['stone'] || 0);
    const hasMaterials = woodCount >= 3 && stoneCount >= 3;

    return [
      {
        id: 'MQ_C1_001_DESPERTAR_SEM_NOME',
        chapter: 'Capítulo I',
        title: 'Despertar sem Nome',
        description: 'Acorde na floresta, reconheça a vibração, enfrente as criaturas e siga os Ecos até Pippo e Mirella.',
        status: 'completed' as const,
        objective: 'Você encontrou abrigo antes do amanhecer.',
      },
      {
        id: 'MQ_C1_002_ESTRADA_PARA_ACORDELOT',
        chapter: 'Capítulo I',
        title: 'A Estrada para Acordelot',
        description: 'Viaje até o centro da cidade e procure o Sr. Antony, líder de Acordelot.',
        status: this.antonyMissionComplete ? ('completed' as const) : ('active' as const),
        objective: this.antonyMissionComplete ? 'Você conheceu o líder de Acordelot.' : (this.storyObjective?.text ?? 'Procure o Sr. Antony no centro da cidade.'),
      },
      {
        id: 'MQ_C1_003_AS_VOZES_DE_ACORDELOT',
        chapter: 'Capítulo I',
        title: 'As Vozes de Acordelot',
        description: 'O Sr. Antony recomendou que você conheça os cidadãos influentes da cidade. Apresente-se a Miro no Mercado e a Lucian, pai de Pippo.',
        status: !this.antonyMissionComplete
          ? ('locked' as const)
          : !this.voicesMissionAccepted
            ? ('available' as const)
            : this.lucianMeetingRewarded
              ? ('completed' as const)
              : ('active' as const),
        objective: !this.voicesMissionAccepted
          ? 'Aceite a missão para registrar seu objetivo.'
          : this.marketIntroStage === 'intro'
            ? 'Apresente-se a Miro no Mercado de Acordelot.'
            : this.marketIntroStage === 'collecting'
              ? hasMaterials
                ? 'Materiais reunidos! Fale com Miro no Mercado para entregar.'
                : `Colete Madeira (${woodCount}/3) e Pedra (${stoneCount}/3) para Miro.`
              : !this.lucianMeetingRewarded
                ? 'Miro visitado! Conheça Lucian na oficina ao oeste da praça.'
                : 'Você conheceu os cidadãos influentes de Acordelot!',
      },
      ...(this.marketIntroStage === 'collecting' || this.marketIntroStage === 'completed' ? [{
        id: 'SQ_MERCADO_PRIMEIRA_COLETA',
        chapter: 'Secundária',
        title: 'A Primeira Coleta do Mercado',
        description: 'Colete 3 Madeiras de árvores e 3 Pedras de rochas nas redondezas da cidade para abastecer os artesãos.',
        status: this.marketIntroStage === 'completed' ? ('completed' as const) : ('active' as const),
        objective: this.marketIntroStage === 'completed'
          ? 'Materiais entregues a Miro! Recompensa recebida.'
          : hasMaterials
            ? 'Materiais prontos! Fale com Miro no Mercado.'
            : `Madeira: ${woodCount}/3 | Pedra: ${stoneCount}/3 (use machado e picareta)`,
      }] : []),
    ];
  }

  // ---- multiplicadores derivados das passivas ----
  get basicAtkMul() {
    const marketBuff = this.activeBuffValue('basic');
    return (
      1 +
      (this.activeCharacter === 'akles' ? this.passiveValue('afinacaoPermanente') + this.passiveValue('forcaRessonante') + this.passiveValue('maestriaDaLamina') : 0) +
      (this.equipStat('atkPct') + this.equipStat('basicDmgPct')) / 100 +
      marketBuff
    );
  }
  get skillDmgMul() {
    return (
      1 +
      (this.activeCharacter === 'akles' ? this.passiveValue('canalizacao') + this.passiveValue('ressonanciaInterior') : 0) +
      (this.equipStat('atkPct') + this.equipStat('skillDmgPct')) / 100
    );
  }
  get critChanceBonus() {
    return (this.activeCharacter === 'akles' ? this.passiveValue('ouvidoAbsoluto') : 0) + this.equipStat('critChancePct') / 100;
  }
  // multiplicador do dano crítico — base 1.6x + "Dano Crítico" de arma/set
  get critDmgMul() {
    return this.stats.critDamage / 100 + this.equipStat('critDmgPct') / 100;
  }
  get moveSpeedMul() {
    const hunterMove = this.getAnyPassiveLevel('huansPasso') >= 5 ? .14 : .10;
    return (this.stats.moveSpeedPct / 100) * (1 + (this.activeCharacter === 'akles' ? this.passiveValue('corpoEmCompasso') : 0) + (this.activeCharacter === 'huans' && this.hunterBuffT > 0 ? hunterMove : 0));
  }
  get maxHpPassiveMul() {
    return 1 + this.passiveValue('harmoniaVital') + this.passiveValue('forcaRessonante');
  }
  get meleeAreaMul() {
    return 1 + (this.activeCharacter === 'akles' ? this.passiveValue('expansao') : 0) + this.equipStat('areaPct') / 100;
  }
  get cooldownMul() {
    return Math.max(0.3, 1 - (this.activeCharacter === 'akles' ? this.passiveValue('fluxoSonoro') : 0) - this.equipStat('cooldownReductionPct') / 100);
  }
  // redutor de dano recebido — "DEF" + "Resistência" de arma/equipamentos
  // (cap em 65% de redução pra não anular o combate).
  get incomingDmgMul() {
    const baseDefReduction = this.stats.defense / (100 + this.stats.defense);
    const base = Math.max(0.35, 1 - baseDefReduction - (this.equipStat('defPct') + this.equipStat('resistPct')) / 100);
    return base * (1 - this.activeBuffValue('shield'));
  }

  get effectiveHarmonicPower(): number {
    return this.stats.harmonicPower * (1 + this.equipStat('harmonicPowerPct') / 100);
  }
  get effectiveMaxEnergy(): number {
    return this.stats.maxEnergy * (1 + this.equipStat('energyMaxPct') / 100);
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
    harmonicPower: 10,
    defense: 12,
    critChance: 5,
    critDamage: 150,
    energy: 100,
    maxEnergy: 100,
    moveSpeedPct: 100,
    attackSpeedPct: 100,
  };
  private statsByCharacter: Record<PlayerCharacterKey, PlayerStats> = {
    akles: this.stats,
    wins: { name: 'Wins', className: 'Vocal · Maga', level: 1, xp: 0, xpNext: 100, hp: 90, maxHp: 90, attrPoints: 0, forca: 9, agilidade: 7, vitalidade: 8, inteligencia: 18, sorte: 5, harmonicPower: 18, defense: 8, critChance: 5, critDamage: 150, energy: 120, maxEnergy: 120, moveSpeedPct: 100, attackSpeedPct: 95 },
    huans: { name: 'Huans', className: 'Cordas · Caçador', level: 1, xp: 0, xpNext: 100, hp: 105, maxHp: 105, attrPoints: 0, forca: 16, agilidade: 10, vitalidade: 10, inteligencia: 8, sorte: 8, harmonicPower: 8, defense: 10, critChance: 8, critDamage: 150, energy: 100, maxEnergy: 100, moveSpeedPct: 108, attackSpeedPct: 108 },
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
    if (attr === 'ressonancia') {
      s.maxEnergy += 8;
      s.energy = Math.min(s.maxEnergy, s.energy + 8);
    } else {
      s[attr] += 1;
      if (this.activeCharacter === 'wins' && attr === 'inteligencia') s.harmonicPower += 2;
      if (this.activeCharacter === 'huans' && attr === 'agilidade') s.attackSpeedPct += 1;
    }
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

    this.loadMapFromStorage(true);
    this.ensureBossArena();
    this.rebuildColliderGrid();
    this.initHarvestables();
    this.initFragments();
    this.initEnemies();
    this.loadTools();
    this.loadSkillProgression();
    this.loadOrRollDailyQuests();

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
        this.onAssetsLoaded?.();
      })
      .catch((err) => {
        console.error('Failed to load assets:', err);
        this.assetsLoaded = true;
        this.onAssetsLoaded?.();
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

    if (this.storyControlLocked) return;

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
    if (this.storyControlLocked) {
      this.touchVector = { x: 0, y: 0 };
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.isMoving = false;
      return;
    }
    this.touchVector = { x, y };
  }

  clearInputState() {
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isMoving = false;
    this.heroRunning = false;
    this.player.actionState = 'idle';
  }

  beginOpeningScene() {
    if (this.activeCharacter !== 'akles') this.switchCharacter('akles');
    this.companionVisible = false;
    this.storyControlLocked = true;
    this.storyObjective = null;
    this.storyStage = 'idle';
    this.storyEnemyIds.clear();
    this.storyEchoIds.clear();
    this.storyActorMoves = [];
    // A abertura é uma instância narrativa: nenhum monstro normal do mundo
    // aparece, agride ou interfere até Akles dormir em segurança.
    this.suspendedStoryEnemies = this.enemies.filter((enemy) => !enemy.id.startsWith('enemy_90') && !enemy.id.startsWith('enemy_91'));
    this.enemies = [];
    this.openingSoundTarget = { x: 36 * TILE_SIZE, y: 150 * TILE_SIZE };
    this.player.x = 36 * TILE_SIZE;
    this.player.y = 156 * TILE_SIZE;
    this.storyMoveOrigin = { x: this.player.x, y: this.player.y };
    this.storyCheckpoint = { x: this.player.x, y: this.player.y };
    this.storyMovementTaught = false;
    this.storyAttackTaught = false;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.direction = 'down';
    this.player.actionState = 'idle';
    this.player.frame = 0;
    this.playerInvuln = 30;
    // Evita que os monstros de nível alto da floresta invadam o tutorial.
    this.enemies = this.enemies.filter((enemy) => Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) > 560);
    this.autoDayCycle = false;
    this.setTimeOfDay('night');
    this.camX = this.player.x + 12 - this.viewportW / 2;
    this.camY = this.player.y + 16 - this.viewportH / 2;
    this.clampCamera();
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };
  }

  releaseOpeningControl() {
    this.storyStage = 'follow_vibration';
    this.storyControlLocked = false;
    this.playerInvuln = Math.max(this.playerInvuln, 12);
    this.storyObjective = {
      title: 'Despertar sem Nome',
      text: 'Aprenda a se mover e siga a vibração',
      progress: 0,
      target: 1,
      ready: false,
    };
    this.onQuestsChange?.();
  }

  finishOpeningDiscovery() {
    this.storyControlLocked = false;
    this.storyStage = 'find_origin';
    this.openingSoundTarget = { x: 36 * TILE_SIZE, y: 144 * TILE_SIZE };
    this.playerInvuln = Math.max(this.playerInvuln, 10);
    this.storyObjective = {
      title: 'Despertar sem Nome',
      text: 'Encontre a origem do som',
      progress: 0,
      target: 1,
      ready: false,
    };
    this.onQuestsChange?.();
  }

  beginShinkerEncounter() {
    this.storyControlLocked = false;
    this.storyStage = 'fight';
    this.openingSoundTarget = null;
    this.playerInvuln = 1.2;
    this.storyCheckpoint = { x: this.player.x, y: this.player.y };
    const spawns: Array<[number, number, number]> = [[34, 145, 900001], [38, 145, 900002]];
    for (const [col, row, id] of spawns) {
      if (this.spawnEnemy('nocturno', col, row, id, 1)) {
        const enemyId = `enemy_${id}`;
        this.storyEnemyIds.add(enemyId);
        const enemy = this.enemies.find((candidate) => candidate.id === enemyId);
        if (enemy) {
          enemy.homeX = this.player.x;
          enemy.homeY = this.player.y;
        }
      }
    }
    this.storyObjective = {
      title: 'Despertar sem Nome',
      text: 'Use o ataque básico contra as criaturas',
      progress: 0,
      target: Math.max(1, this.storyEnemyIds.size),
      ready: false,
    };
    this.onQuestsChange?.();
  }

  revealThreeEchoes() {
    this.storyControlLocked = false;
    this.storyStage = 'find_echoes';
    const spawns: Array<[string, number, number, number]> = [
      ['eco_c', 35, 142, 910001],
      ['eco_e', 37, 142, 910002],
      ['eco_g', 36, 141, 910003],
    ];
    for (const [kind, col, row, id] of spawns) {
      if (!this.spawnEnemy(kind, col, row, id, 1)) continue;
      const enemyId = `enemy_${id}`;
      this.storyEchoIds.add(enemyId);
      this.moveStoryActor('enemy', enemyId, col * TILE_SIZE + 8, (row - 1) * TILE_SIZE + 8, 24);
    }
    this.storyObjective = {
      title: 'Despertar sem Nome',
      text: 'Aproxime-se das três criaturas luminosas',
      progress: 0,
      target: 1,
      ready: false,
    };
    this.onQuestsChange?.();
  }

  finishThreeEchoes() {
    this.storyControlLocked = false;
    this.storyStage = 'follow_echoes';
    this.autoDayCycle = false;
    this.playerInvuln = Math.max(this.playerInvuln, 5);
    this.storyObjective = {
      title: 'Despertar sem Nome',
      text: 'Siga Dó, Mi e Sol pelo caminho',
      progress: 0,
      target: 1,
      ready: false,
    };
    const gate = this.props.find((prop) => prop.type === 'wallGate');
    const gateCol = gate ? (gate.x + gate.w / 2) / TILE_SIZE : 36;
    const gateRow = gate ? (gate.y + gate.h + 46) / TILE_SIZE : 72;
    const targets: Array<[number, number]> = [[gateCol - .8, gateRow], [gateCol + .8, gateRow], [gateCol, gateRow - .7]];
    [...this.storyEchoIds].forEach((id, index) => {
      const [col, row] = targets[index] ?? targets[0];
      this.moveStoryActor('enemy', id, col * TILE_SIZE + 8, row * TILE_SIZE + 8, 150);
    });
    this.storyDialogueIndex = 0;
    this.storyDialogueAt = this.timeElapsed + 2;
    this.onQuestsChange?.();
  }

  private ensureStoryNpc(id: string, name: string, spriteType: NPC['spriteType'], x: number, y: number, accent: string) {
    let npc = this.npcs.find((candidate) => candidate.id === id);
    if (!npc) {
      npc = {
        id, name, title: 'Personagem da história', spriteType, accent,
        x, y, vx: 0, vy: 0, direction: 'down', frame: 0, isMoving: false,
        stepTimer: 0, width: 28, height: 40,
        homeX: x, homeY: y, patrolRadius: 0, wanderTimer: 0, idleTimer: 0,
        wanderTarget: null, speed: 44,
        collider: { offsetX: 8, offsetY: 28, w: 12, h: 10 },
        route: [{ x, y }], routeIdx: 0, routePause: 0,
      };
      this.npcs.push(npc);
    }
    npc.x = x; npc.y = y; npc.homeX = x; npc.homeY = y;
    return npc;
  }

  beginPippoEscort() {
    this.storyStage = 'follow_pippo';
    this.storyControlLocked = false;
    const gate = this.props.find((prop) => prop.type === 'wallGate');
    const startX = gate ? gate.x + gate.w / 2 : 36 * TILE_SIZE;
    const startY = gate ? gate.y + gate.h + 28 : 72 * TILE_SIZE;
    const pippo = this.ensureStoryNpc('story_pippo', 'Pippo', 'seminima', startX + 28, startY, '#fbbf24');
    const destination = this.mirellaHomeDoor();
    const mirella = this.ensureStoryNpc('story_mirella', 'Mirella', 'cadencia', destination.x + 42, destination.y - 8, '#c084fc');
    mirella.direction = 'down';
    this.moveStoryActor('npc', pippo.id, destination.x, destination.y, 150);
    this.storyDialogueIndex = 0;
    this.storyDialogueAt = this.timeElapsed + 2;
    this.storyObjective = { title: 'Despertar sem Nome', text: 'Siga Pippo até Mirella', progress: 0, target: 1, ready: false };
    this.onQuestsChange?.();
  }

  private mirellaHomeDoor() {
    const gate = this.props.find((prop) => prop.type === 'wallGate');
    const homes = this.props.filter((prop) => ['bldgLodgeEast', 'lodgeWest', 'bldgHerbalistWest', 'herbalistEast', 'residentialFront'].includes(prop.type));
    const home = homes.sort((a, b) => {
      const gx = gate?.x ?? 36 * TILE_SIZE, gy = gate?.y ?? 70 * TILE_SIZE;
      return Math.hypot(a.x - gx, a.y - gy) - Math.hypot(b.x - gx, b.y - gy);
    })[0];
    return home
      ? { x: home.x + home.w / 2 - 14, y: home.y + home.h + 4, insideY: home.y + home.h * .7 }
      : { x: 36 * TILE_SIZE, y: 58 * TILE_SIZE, insideY: 57 * TILE_SIZE };
  }

  beginHouseRest() {
    this.storyStage = 'entering_house';
    this.storyControlLocked = true;
    const door = this.mirellaHomeDoor();
    const pippo = this.npcs.find((npc) => npc.id === 'story_pippo');
    const mirella = this.npcs.find((npc) => npc.id === 'story_mirella');
    if (pippo) this.moveStoryActor('npc', pippo.id, door.x - 13, door.insideY, 42);
    if (mirella) this.moveStoryActor('npc', mirella.id, door.x + 13, door.insideY, 42);
  }

  finishOpeningRest() {
    this.storyStage = 'morning_scene';
    this.storyControlLocked = true;
    this.setTimeOfDay('day');
    this.stats.hp = this.stats.maxHp;
    const door = this.mirellaHomeDoor();
    this.player.x = door.x; this.player.y = door.y + 34;
    const pippo = this.npcs.find((npc) => npc.id === 'story_pippo');
    const mirella = this.npcs.find((npc) => npc.id === 'story_mirella');
    if (pippo) { pippo.x = door.x - 34; pippo.y = door.y + 4; pippo.direction = 'down'; }
    if (mirella) { mirella.x = door.x + 30; mirella.y = door.y; mirella.direction = 'down'; }
    this.onStatsChange?.({ ...this.stats });
    this.onStoryBeat?.('morning_arrival');
  }

  startAtMorningScene() {
    if (this.activeCharacter !== 'akles') this.switchCharacter('akles');
    this.companionVisible = false;
    this.openingMissionComplete = true;
    this.storyStage = 'morning_scene';
    this.storyControlLocked = true;
    this.autoDayCycle = true;
    this.setTimeOfDay('day');
    this.stats.hp = this.stats.maxHp;
    this.playerInvuln = 4;
    this.storyActorMoves = [];
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };

    this.enemies = this.enemies.filter(
      (enemy) => !enemy.id.startsWith('enemy_90') && !enemy.id.startsWith('enemy_91') && !this.storyEnemyIds.has(enemy.id) && !this.storyEchoIds.has(enemy.id),
    );
    this.storyEnemyIds.clear();
    this.storyEchoIds.clear();

    const door = this.mirellaHomeDoor();
    this.player.x = door.x;
    this.player.y = door.y + 34;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.direction = 'down';
    this.player.actionState = 'idle';

    const pippo = this.ensureStoryNpc('story_pippo', 'Pippo', 'seminima', door.x - 34, door.y + 4, '#fbbf24');
    pippo.direction = 'down';
    pippo.isMoving = false;

    const mirella = this.ensureStoryNpc('story_mirella', 'Mirella', 'cadencia', door.x + 30, door.y, '#c084fc');
    mirella.direction = 'down';
    mirella.isMoving = false;

    this.ensureSrAntony();

    this.camX = this.player.x + 12 - this.viewportW / 2;
    this.camY = this.player.y + 16 - this.viewportH / 2;
    this.clampCamera();

    this.storyObjective = {
      title: 'A Estrada para Acordelot',
      text: 'Converse com Mirella e procure o Sr. Antony',
      progress: 0,
      target: 1,
      ready: false,
    };

    this.onStatsChange?.({ ...this.stats });
    this.onQuestsChange?.();
  }

  finishMorningBriefing() {
    this.storyStage = 'follow_pippo_antony';
    this.openingMissionComplete = true;
    this.storyControlLocked = false;
    this.autoDayCycle = true;
    this.playerInvuln = 4;
    this.enemies = [
      ...this.enemies.filter((enemy) => !this.storyEnemyIds.has(enemy.id) && !this.storyEchoIds.has(enemy.id)),
      ...this.suspendedStoryEnemies,
    ];
    this.suspendedStoryEnemies = [];
    const antony = this.ensureSrAntony();
    const pippo = this.npcs.find((npc) => npc.id === 'story_pippo');
    if (pippo) {
      this.moveStoryActor('npc', pippo.id, 35 * TILE_SIZE, 30 * TILE_SIZE, 105, [
        { x: antony.x - 46, y: antony.y + 8 },
      ]);
    }
    this.storyDialogueIndex = 0;
    this.storyDialogueAt = this.timeElapsed + 2;
    this.storyObjective = { title: 'A Estrada para Acordelot', text: 'Siga Pippo e procure o Sr. Antony no centro', progress: 0, target: 1, ready: false };
    this.onQuestsChange?.();
    this.onStoryBeat?.('opening_mission_complete');
  }

  private ensureSrAntony() {
    const hall = this.props.find((prop) => prop.id === 'b_town_hall') ?? this.props.find((prop) => prop.type === 'bldgTownHall');
    const x = hall ? hall.x + hall.w / 2 - 14 : 36 * TILE_SIZE;
    const y = hall ? hall.y + hall.h + 8 : 24 * TILE_SIZE;
    const antony = this.ensureStoryNpc('story_sr_antony', 'Sr. Antony', 'antony', x, y, '#60a5fa');
    antony.title = 'Líder de Acordelot';
    antony.direction = 'down';
    antony.dialogue = [
      'Bem-vindo ao centro de Acordelot, Akles.',
      'Sua memória ainda repousa nas sombras, mas seu instinto musical é límpido.',
      'Fique em nossa cidade e prepare-se. Logo aprenderemos o que o seu passado esconde.',
    ];
    antony.barks = [
      'A harmonia não perdoa desafinações.',
      'Ouça o tom das coisas antes de agir.',
    ];
    return antony;
  }

  ensureLucian() {
    const lodge = this.props.find((prop) => prop.id === 'b_lodge_west') ?? this.props.find((prop) => prop.type === 'lodgeWest');
    const x = lodge ? lodge.x + 36 : 26 * TILE_SIZE;
    const y = lodge ? lodge.y + lodge.h + 8 : 16 * TILE_SIZE;
    const lucian = this.ensureStoryNpc('story_lucian', 'Lucian', 'lucian', x, y, '#eab308');
    lucian.title = 'Mestre Luthier';
    lucian.direction = 'down';
    lucian.dialogue = [
      'As cordas de Acordelot vibram com a energia da própria terra.',
      'Cada instrumento carrega uma parte da alma de quem o toca.',
    ];
    lucian.barks = [
      'Ouça essa ressonância...',
      'Uma madeira bem curada canta por gerações.',
    ];
    return lucian;
  }

  finishAntonyMeeting() {
    this.clearInputState();
    this.storyStage = 'complete';
    this.storyControlLocked = false;
    this.antonyMissionComplete = true;
    this.ensureLucian();
    this.gainXp(25);
    const antony = this.npcs.find((npc) => npc.id === 'story_sr_antony');
    if (antony) antony.direction = 'down';
    const pippo = this.npcs.find((npc) => npc.id === 'story_pippo');
    if (pippo && antony) {
      pippo.x = antony.x - 38;
      pippo.y = antony.y + 4;
      pippo.direction = 'right';
      pippo.isMoving = false;
      pippo.dialogue = [
        'Eu disse que o Sr. Antony ia ajudar!',
        'Agora você pode explorar a cidade. Mas tome cuidado fora dos muros, hein!',
      ];
      pippo.barks = [
        'Acho que você vai se acostumar com Acordelot!',
        'Qualquer coisa, pergunte ao Sr. Antony.',
      ];
    }
    this.storyObjective = {
      title: 'As Vozes de Acordelot',
      text: 'Abra o Diário de Missões para aceitar a nova tarefa',
      progress: 0,
      target: 2,
      ready: false,
    };
    this.onQuestsChange?.();
    this.onStoryBeat?.('second_mission_complete');
  }

  unlockCompanion() {
    this.companionVisible = true;
    this.companion.x = this.player.x - 28;
    this.companion.y = this.player.y + 4;
  }

  unlockCharacter(key: PlayerCharacterKey) {
    if (this.unlockedCharacters.has(key)) return;
    this.unlockedCharacters.add(key);
    this.onCharacterChange?.();
  }

  /** Move NPCs ou inimigos sem simular teclado e NUNCA move o jogador. */
  moveStoryActor(kind: 'npc' | 'enemy', id: string, x: number, y: number, speed = 70, path?: Point[]) {
    this.storyActorMoves = this.storyActorMoves.filter((move) => !(move.kind === kind && move.id === id));
    this.storyActorMoves.push({ kind, id, x, y, speed, path: path ? [...path] : undefined });
  }

  private updateStoryActorMoves(dt: number) {
    this.storyActorMoves = this.storyActorMoves.filter((move) => {
      const actor = move.kind === 'npc'
        ? this.npcs.find((npc) => npc.id === move.id)
        : this.enemies.find((enemy) => enemy.id === move.id);
      if (!actor) return false;
      const guidedActor = (this.storyStage === 'follow_echoes' && move.kind === 'enemy' && this.storyEchoIds.has(move.id))
        || ((this.storyStage === 'follow_pippo' || this.storyStage === 'follow_pippo_antony') && move.kind === 'npc' && move.id === 'story_pippo');
      if (guidedActor && Math.hypot(actor.x - this.player.x, actor.y - this.player.y) > 130) {
        if ('isMoving' in actor) actor.isMoving = false;
        return true;
      }
      const dx = move.x - actor.x;
      const dy = move.y - actor.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) {
        if (move.path && move.path.length > 0) {
          const next = move.path.shift()!;
          move.x = next.x;
          move.y = next.y;
          return true;
        }
        actor.x = move.x;
        actor.y = move.y;
        if ('isMoving' in actor) actor.isMoving = false;
        return false;
      }
      const step = Math.min(distance, move.speed * dt);
      actor.x += dx / distance * step;
      actor.y += dy / distance * step;
      if ('isMoving' in actor) actor.isMoving = true;
      if ('direction' in actor) {
        actor.direction = Math.abs(dx) > Math.abs(dy)
          ? (dx < 0 ? 'left' : 'right')
          : (dy < 0 ? 'up' : 'down');
      }
      if ('facingLeft' in actor) actor.facingLeft = dx < 0;
      return true;
    });
  }

  setSkillAimPreview(slot: number, dx: number, dy: number, power = 1) {
    const len = Math.hypot(dx, dy);
    if (len < 0.08) {
      const [fx, fy] = this.facingVector();
      this.skillAimPreview = { slot, dx: fx, dy: fy, power: 0.35 };
      return;
    }
    this.skillAimPreview = { slot, dx: dx / len, dy: dy / len, power: Math.max(.25, Math.min(1, power)) };
  }

  cancelSkillAim() {
    this.skillAimPreview = null;
  }

  releaseAimedSkill(slot: number, dx: number, dy: number, power = 1) {
    const len = Math.hypot(dx, dy);
    const [fx, fy] = this.facingVector();
    this.queuedSkillAim = {
      dx: len > .08 ? dx / len : fx,
      dy: len > .08 ? dy / len : fy,
      power: Math.max(.25, Math.min(1, power)),
    };
    const ax = this.queuedSkillAim.dx, ay = this.queuedSkillAim.dy;
    this.player.direction = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 'left' : 'right') : (ay < 0 ? 'up' : 'down');
    this.skillAimPreview = null;
    if (slot === 0) {
      const used = this.activateResonance();
      if (!used || this.activeCharacter === 'akles') this.queuedSkillAim = null;
      return;
    }
    const action = slot === 1 ? 'spin' : 'cast';
    this.triggerAction(action);
    if (this.player.actionState !== action) this.queuedSkillAim = null;
  }

  // Dispara animações de ação (coleta, ataque, giro, magia)
  triggerAction(action: AklesAction) {
    const busy: Array<CharacterState['actionState']> = ['chop', 'mine', 'attack', 'spin', 'cast'];
    if (busy.includes(this.player.actionState)) return;
    if (this.activeCharacter !== 'akles' && (action === 'spin' || action === 'cast')) {
      const slot = action === 'spin' ? 1 : 2;
      const bases = this.activeCharacter === 'wins' ? [15, 28, 45] : [14, 20, 40];
      const costs = bases.map((base, index) => this.skillEnergyCost(base, index));
      const cds = this.activeCharacter === 'wins' ? [5, 11, 18] : [5, 9, 17];
      if (this.skillCooldowns[this.activeCharacter][slot] > 0 || !this.spendEnergy(costs[slot])) return;
      this.skillCooldowns[this.activeCharacter][slot] = cds[slot] * this.cooldownMul;
    }
    if (action === 'attack') {
      if (this.storyStage === 'fight' && !this.storyAttackTaught) {
        this.storyAttackTaught = true;
        if (this.storyObjective) this.storyObjective = { ...this.storyObjective, text: 'Derrote as duas criaturas' };
        this.onQuestsChange?.();
        this.onStoryBeat?.('attack_learned');
      }
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
    if (n.id === 'npc_mercador_cidade') {
      const woodCount = Math.min(3, this.inventory['wood'] || 0);
      const stoneCount = Math.min(3, this.inventory['stone'] || 0);
      const hasMaterials = woodCount >= 3 && stoneCount >= 3;

      let dialogue = n.dialogue ?? ['...'];
      if (this.voicesMissionAccepted && this.marketIntroStage === 'intro') {
        dialogue = [
          'Olá, viajante! O Sr. Antony me avisou que você viria.',
          'Sou Miro, responsável pelo abastecimento do Mercado de Acordelot.',
          'Para aprender como nossa economia funciona, faça uma primeira coleta ao redor da praça.',
          'Use seu machado e picareta para me trazer 3 Madeiras e 3 Pedras. Estarei esperando!',
        ];
      } else if (this.voicesMissionAccepted && this.marketIntroStage === 'collecting') {
        if (hasMaterials) {
          dialogue = [
            'Excelente trabalho, Akles! Você reuniu a madeira e a pedra com destreza.',
            'Aqui está sua recompensa: 50 moedas de ouro e uma Poção de Cura artesanal!',
            'Lembre-se: você sempre pode comprar suprimentos diários comigo quando precisar.',
            'Agora, procure por Lucian, o luthier e pai de Pippo. A oficina dele fica a oeste da praça!',
          ];
        } else {
          dialogue = [
            `Ainda aguardo os materiais, Akles. Você tem ${woodCount}/3 Madeiras e ${stoneCount}/3 Pedras.`,
            'Golpeie os troncos de árvores com o machado e as rochas com a picareta nas redondezas!',
          ];
        }
      } else if (this.marketIntroStage === 'completed') {
        dialogue = [
          'Suas coletas ajudaram muito nossos artesãos, Akles!',
          'Lucian deve estar dedilhando seu alaúde na oficina a oeste. Não deixe de falar com ele.',
          'Se precisar de poções ou ferramentas novas, confira meu estoque diário!',
        ];
      }
      return {
        id: n.id,
        name: n.name,
        title: n.title,
        accent: n.accent ?? '#f59e0b',
        dialogue,
        isMerchant: n.isMerchant === true || n.spriteType === 'merchant',
        spriteType: n.spriteType,
      };
    }

    if (n.id === 'story_lucian') {
      let dialogue = n.dialogue ?? ['...'];
      if (this.marketIntroStage === 'completed') {
        if (this.lucianMeetingRewarded) {
          dialogue = [
            'A música da cidade soa mais viva com você aqui, Akles.',
            'Continue explorando Acordelot e aperfeiçoando suas habilidades!',
          ];
        } else {
          dialogue = [
            'Saudações, Akles! Pippo me contou tudo sobre como você o salvou na floresta.',
            'Como pai e mestre luthier desta cidade, minha gratidão a você é eterna.',
            'Tome estas 60 moedas e este elixir de experiência para fortalecer sua jornada.',
            'Sempre que o som do mundo parecer desafinado, lembre-se: a verdadeira harmonia começa em nós mesmos!',
          ];
        }
      } else {
        dialogue = [
          'Olá! Ouço os tons da floresta ecoando em você.',
          'Se você está conhecendo a cidade, passe no Mercado e converse com Miro primeiro.',
        ];
      }
      return {
        id: n.id,
        name: n.name,
        title: n.title,
        accent: n.accent ?? '#eab308',
        dialogue,
        isMerchant: false,
        spriteType: n.spriteType,
      };
    }

    return {
      id: n.id,
      name: n.name,
      title: n.title,
      accent: n.accent ?? '#f59e0b',
      dialogue: n.dialogue ?? ['...'],
      isMerchant: n.isMerchant === true || n.spriteType === 'merchant',
      spriteType: n.spriteType,
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
      nearMerchant: near?.isMerchant === true || near?.spriteType === 'merchant',
      merchantName: talking?.name,
      merchantTitle: talking?.title,
      dialogue: talking?.dialogue,
    });
  }

  handleInteract() {
    if (this.talkingNpcId) {
      this.closeDialogue();
      return;
    }
    if (this.nearestNpcId) {
      this.talkingNpcId = this.nearestNpcId;
      this.isTalkingToMerchant = this.isNearMerchant;
      this.emitInteraction();
    }
  }

  closeDialogue() {
    const talking = this.npcs.find((n) => n.id === this.talkingNpcId);
    if (talking?.id === 'npc_mercador_cidade') {
      if (this.voicesMissionAccepted && this.marketIntroStage === 'intro') {
        this.marketIntroStage = 'collecting';
        const woodCount = Math.min(3, this.inventory['wood'] || 0);
        const stoneCount = Math.min(3, this.inventory['stone'] || 0);
        this.storyObjective = {
          title: 'As Vozes de Acordelot',
          text: `Colete Madeira (${woodCount}/3) e Pedra (${stoneCount}/3) para Miro`,
          progress: 0,
          target: 2,
          ready: false,
        };
        this.onQuestsChange?.();
      } else if (this.voicesMissionAccepted && this.marketIntroStage === 'collecting') {
        const woodCount = this.inventory['wood'] || 0;
        const stoneCount = this.inventory['stone'] || 0;
        if (woodCount >= 3 && stoneCount >= 3) {
          this.inventory['wood'] = Math.max(0, woodCount - 3);
          this.inventory['stone'] = Math.max(0, stoneCount - 3);
          this.addCoins(50);
          this.addToInventory('potion_heal', 1);
          this.gainXp(35);
          this.marketIntroStage = 'completed';
          this.storyObjective = {
            title: 'As Vozes de Acordelot',
            text: 'Conheça Lucian, pai de Pippo, na oficina a oeste da praça',
            progress: 1,
            target: 2,
            ready: false,
          };
          this.onInventoryChange?.();
          this.onQuestsChange?.();
        }
      }
    } else if (talking?.id === 'story_lucian') {
      if (this.marketIntroStage === 'completed' && !this.lucianMeetingRewarded) {
        this.lucianMeetingRewarded = true;
        this.addCoins(60);
        this.gainXp(40);
        this.storyObjective = {
          title: 'As Vozes de Acordelot',
          text: 'Missão concluída! Você conheceu os artesãos de Acordelot',
          progress: 2,
          target: 2,
          ready: true,
        };
        this.onQuestsChange?.();
      }
    }

    this.talkingNpcId = null;
    this.isTalkingToMerchant = false;
    this.clearInputState();
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
    if (!this.isEditMode) {
      const rect = this.canvas.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      this.pointerAimWorld = inside ? this.getWorldPosFromEvent(e) : null;
      this.canvas.style.cursor = this.activeCharacter === 'akles' ? 'default' : 'crosshair';
      return;
    }
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

  loadMapFromStorage(preferBundled = false) {
    try {
      let parsed: Array<{ id: string; type: string; x: number; y: number; scale: number }> | null = null;
      const bundled = initialCustomMap as Array<{ id: string; type: string; x: number; y: number; scale: number }>;
      const data = localStorage.getItem('acordelot_map_v3');
      if (!preferBundled && data) {
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          console.warn('Failed to parse localStorage map:', e);
        }
      }

      // Sem edições do usuário: usa o customMapLayout.json versionado se ele
      // tiver conteúdo; caso contrário mantém o layout padrão de buildMap().
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        if (!Array.isArray(bundled) || bundled.length === 0) return;
        parsed = bundled;
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
      const snapshotCoversDarkForest = parsed.some((item) => item.y >= darkLine);
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
      if (!snapshotCoversDarkForest) {
        for (const dp of darkProceduralProps) {
          if (savedIds.has(dp.id)) continue;
          this.syncPropAutoCollider(dp);
          rebuiltProps.push(dp);
        }
      }

      this.props = rebuiltProps;
      this.syncFixedNpcPositions();
      // O mapa pode ser reconstruído novamente pelo sincronismo online depois
      // do construtor. Reanexa a coleta aqui, no mesmo ponto da reconstrução.
      this.initHarvestables();
    } catch (err) {
      console.warn('Failed to load custom map from storage:', err);
    }
  }

  public ensureBossArena() {
    // Clareira natural na expansão leste. Remove apenas o cenário artificial
    // anterior e objetos que bloqueiem o espaço imediato de combate.
    const safeLeft = 161 * TILE_SIZE, safeRight = 176 * TILE_SIZE;
    const safeTop = 7 * TILE_SIZE, safeBottom = 21 * TILE_SIZE;
    this.props = this.props.filter((p) => {
      if (p.id.startsWith('boss_arena_')) return false;
      const blocksFight = p.x + p.w > safeLeft && p.x < safeRight && p.y + p.h > safeTop && p.y < safeBottom;
      return !blocksFight;
    });

    // Garante um campo verde em toda a área do boss (sem piso preto) e mantém
    // uma trilha curta ligada à avenida.
    for (let r = 2; r <= 23; r++) {
      for (let c = 150; c <= 182; c++) {
        this.ground[r][c] = (r + c) % 7 === 0 ? TERRAIN_TILES.GRASS_FLOWER1 : TERRAIN_TILES.GRASS_BASE;
      }
    }
    for (let r = 20; r <= 29; r++) {
      for (let c = 167; c <= 169; c++) this.ground[r][c] = TERRAIN_TILES.STONE_CENTER;
    }

    const addNaturalProp = (id: string, type: string, c: number, r: number, w: number, h: number, collider: Rect) => {
      const x = c * TILE_SIZE, y = r * TILE_SIZE;
      const prop: WorldProp = {
        id: `boss_arena_${id}`, type, x, y, w, h, sortY: y + h - 5,
        collider: { x: x + collider.x, y: y + collider.y, w: collider.w, h: collider.h },
      };
      this.attachHarvestData(prop);
      this.props.push(prop);
    };

    const crystals: Array<[number, number, 'spot_crystal_blue' | 'spot_crystal_red']> = [
      [159,8,'spot_crystal_blue'],[177,8,'spot_crystal_blue'],
      [157,13,'spot_crystal_red'],[179,13,'spot_crystal_red'],
      [160,19,'spot_crystal_blue'],[176,19,'spot_crystal_blue'],
    ];
    crystals.forEach(([c,r,type], i) => addNaturalProp(`crystal_${i}`, type, c, r, 56, 60, { x: 12, y: 38, w: 32, h: 18 }));

    const gold: Array<[number, number]> = [[155,6],[181,7],[154,18],[181,20],[163,23],[174,23]];
    gold.forEach(([c,r], i) => addNaturalProp(`gold_${i}`, 'spot_gold', c, r, 60, 44, { x: 11, y: 20, w: 38, h: 22 }));

    const trees: Array<[number, number, 'oak' | 'pine']> = [
      [151,3,'oak'],[157,3,'pine'],[179,3,'oak'],[182,11,'pine'],
      [151,14,'pine'],[153,23,'oak'],[180,25,'oak'],[158,26,'pine'],[178,27,'pine'],
    ];
    trees.forEach(([c,r,type], i) => addNaturalProp(`tree_${i}`, type, c, r, type === 'oak' ? 64 : 40, 80, type === 'oak' ? { x: 25, y: 66, w: 14, h: 8 } : { x: 14, y: 66, w: 12, h: 8 }));

    const rocks: Array<[number, number, 'rockCluster' | 'rockPair' | 'rockMonolith']> = [
      [154,10,'rockCluster'],[181,15,'rockPair'],[158,22,'rockMonolith'],[178,22,'rockCluster'],
    ];
    rocks.forEach(([c,r,type], i) => {
      const size = type === 'rockMonolith' ? [24,40] : type === 'rockPair' ? [28,22] : [32,26];
      addNaturalProp(`rock_${i}`, type, c, r, size[0], size[1], { x: 2, y: Math.max(5, size[1] - 12), w: size[0] - 4, h: 10 });
    });
  }

  private syncFixedNpcPositions() {
    const market = this.props.find((p) => p.id === 'b_bakery_front') ?? this.props.find((p) => p.type === 'bldgBakeryFront');
    const merchant = this.npcs.find((n) => n.id === 'npc_mercador_cidade');
    if (market && merchant) {
      merchant.x = market.x + market.w / 2 - merchant.width / 2;
      merchant.y = market.y + market.h + 4;
      merchant.homeX = merchant.x; merchant.homeY = merchant.y;
      merchant.route = [{ x: merchant.x, y: merchant.y }]; merchant.routeIdx = 0;
    }
    const gate = this.props.find((p) => p.type === 'wallGate');
    const guard = this.npcs.find((n) => n.id === 'guard_muralha');
    if (gate && guard) {
      guard.x = gate.x + gate.w * .22;
      guard.y = gate.y + gate.h - guard.height - 12;
      guard.homeX = guard.x; guard.homeY = guard.y;
      guard.route = [{ x: guard.x, y: guard.y }]; guard.routeIdx = 0;
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
    this.ensureBossArena();
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
    if (!def || p.harvest) return;
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
      facingLeft: this.enemyRandom() < 0.5,
      direction: 'down',
      state: 'idle',
      frame: 0,
      animTimer: this.enemyRandom() * 2,
      stateTimer: 0,
      attackCd: 0,
      hurtFlash: 0,
      knockX: 0,
      knockY: 0,
      wanderTarget: null,
      wanderTimer: this.enemyRandom() * 3,
      respawnAt: 0,
      hitBy: -1,
    });
    return true;
  }

  initEnemies() {
    this.enemies = [];
    this.enemyRngState = 0x41c0de;
    let id = 0;
    // Monstros hostis em clusters de floresta longe da vila
    const hostiles = ['aranha', 'nocturno', 'maestro'];
    const clusters = [
      [12, 14], [22, 88], [10, 62], [40, 100], [64, 98],
      [128, 96], [124, 60], [90, 100],
    ];
    for (const [cc, rr] of clusters) {
      const kind = hostiles[Math.floor(this.enemyRandom() * hostiles.length)];
      const n = 2 + Math.floor(this.enemyRandom() * 3);
      // nível cresce com a distância da vila (spawn ~ col 36, row 29)
      const distTiles = Math.hypot(cc - 36, rr - 29);
      const baseLvl = 1 + Math.floor(distTiles / 26);
      for (let k = 0; k < n; k++) {
        this.spawnEnemy(
          kind,
          cc + Math.round((this.enemyRandom() - 0.5) * 8),
          rr + Math.round((this.enemyRandom() - 0.5) * 8),
          id++,
          baseLvl + Math.floor(this.enemyRandom() * 2)
        );
      }
    }
    // 12 Ecos no NORDESTE (parte superior direita do mapa)
    for (let i = 0; i < 12; i++) {
      for (let tries = 0; tries < 20; tries++) {
        const c = 92 + Math.floor(this.enemyRandom() * 46);
        const r = 4 + Math.floor(this.enemyRandom() * 34);
        if (this.spawnEnemy('eco_' + NOTE_KEY[i], c, r, id++)) break;
      }
    }

    // Boss da ascensão de Teclas, sozinho no centro da arena nordeste.
    this.spawnEnemy('organ_sentinel', 168, 13, id++, 12);

    // FLORESTA SOMBRIA — MUITOS monstros espalhados por toda a região
    const darkStartRow = DARK_START + 3;
    const darkEndRow = MAP_ROWS - 4;
    const darkKinds = ['aranha', 'nocturno', 'maestro', 'dama', 'colosso'];
    let placed = 0;
    for (let tries = 0; tries < 900 && placed < 130; tries++) {
      const c = 3 + Math.floor(this.enemyRandom() * (MAP_COLS - 6));
      const r = darkStartRow + Math.floor(this.enemyRandom() * (darkEndRow - darkStartRow));
      // colosso é raro (chefe)
      const roll = this.enemyRandom();
      const kind =
        roll < 0.06 ? 'colosso' : darkKinds[Math.floor(this.enemyRandom() * 4)];
      // nível base da Floresta Sombria: começa alto e cresce com a profundidade
      const depthLvl = 6 + Math.floor((r - DARK_START) / 7) + Math.floor(this.enemyRandom() * 3);
      const lvl = kind === 'colosso' ? depthLvl + 4 : depthLvl;
      if (this.spawnEnemy(kind, c, r, id++, lvl)) placed++;
    }
  }

  // Timestamp do último golpe (dado ou sofrido) — botão de ataque/coleta
  // inteligente usa isso pra saber se "está em luta" agora.
  lastCombatAt = -999;
  private pointerAimWorld: { x: number; y: number } | null = null;
  private queuedSkillAim: { dx: number; dy: number; power: number } | null = null;
  private skillAimPreview: { slot: number; dx: number; dy: number; power: number } | null = null;
  get inCombat() {
    return this.timeElapsed - this.lastCombatAt < 4.5;
  }

  damagePlayer(n: number) {
    if (this.playerInvuln > 0) {
      if (this.activeCharacter === 'huans' && this.hunterDashWindow > 0) this.hunterGuaranteedCrit = true;
      return;
    }
    this.lastCombatAt = this.timeElapsed;
    const s = this.stats;
    n = Math.max(1, Math.round(n * this.incomingDmgMul));
    s.hp = Math.max(0, s.hp - n);
    this.playerHurtFlash = 0.35;
    this.playerInvuln = 0.7;
    this.addDamageText(this.player.x + 12, this.player.y - 4, `-${n}`, '#f87171', true);
    this.onStatsChange?.({ ...s });
    if (s.hp <= 0) {
      // Durante a abertura, nunca quebra a narrativa mandando Akles à praça.
      s.hp = s.maxHp;
      const respawn = this.storyStage !== 'complete' && this.storyCheckpoint
        ? this.storyCheckpoint
        : this.spawnPoint;
      this.player.x = respawn.x;
      this.player.y = respawn.y;
      this.player.actionState = 'idle';
      this.playerInvuln = 1.6;
      this.onStatsChange?.({ ...s });
      this.onHarvestPopup?.(
        this.storyStage !== 'complete' ? 'A melodia o traz de volta ao último passo…' : 'Você tombou... de volta à Vila',
        respawn.x,
        respawn.y,
      );
    }
  }

  tempDmgBuffT = 0; // Eco Final nv.5: pequeno bônus de dano temporário pós-kill

  damageEnemy(
    e: Enemy,
    dmg: number,
    fromX: number,
    fromY: number,
    opts: { crit?: boolean; isPulse?: boolean; skill?: boolean; networkFinal?: boolean } = {},
  ) {
    if (e.state === 'dead') return;
    // Os três Ecos da abertura são guias narrativos, não alvos de combate.
    if (this.storyEchoIds.has(e.id) && this.storyStage !== 'complete') return;
    this.lastCombatAt = this.timeElapsed;
    // Impacto Harmônico (Amplificação) — inimigo "com a DEF reduzida"
    if (!opts.networkFinal) {
      if (e.harmonicDebuffT && e.harmonicDebuffT > 0) dmg *= 1 + (e.harmonicDebuffPct || 0);
      if (this.activeCharacter === 'wins' && opts.skill && e.resonantT && e.resonantT > 0) dmg *= 1 + (.08 + (this.getAnyPassiveLevel('winsRessonanciaVocal') - 1) * .01);
      if (this.activeCharacter === 'huans' && (e.preyMarks ?? 0) > 0) dmg *= 1 + (e.preyMarks ?? 0) * this.classPassiveValue('huansInstinto');
      if (this.activeCharacter === 'huans') e.preyLastHitAt = this.timeElapsed;
    }
    // Reverberação (Pulso Harmônico) — marca consumida pelo próximo golpe básico
    if (!opts.isPulse && e.reverbMarkHits && e.reverbMarkHits > 0) {
      dmg *= 1 + (e.reverbMarkPct || 0);
      e.reverbMarkHits -= 1;
    }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (!this.applyingNetworkDamage) this.onEnemyDamaged?.(e.id, dmg, fromX, fromY);
    e.hurtFlash = 0.2;
    this.addDamageText(
      e.x + 8,
      e.y - 12,
      (opts.crit ? '✦' : '') + String(dmg),
      opts.crit ? '#f472b6' : '#fde047',
      opts.crit,
    );
    const kd = Math.atan2(e.y - fromY, e.x - fromX);
    const knockForce = ENEMY_DEFS[e.kind]?.boss ? 18 : 90;
    e.knockX = Math.cos(kd) * knockForce;
    e.knockY = Math.sin(kd) * knockForce;
    for (let i = 0; i < 6; i++) this.addMiningSpark(e.x + 8, e.y);
    if (e.hp <= 0) {
      e.state = 'dead';
      e.frame = 0;
      e.stateTimer = 0;
      this.bumpQuestProgress('kill');
      if (this.storyStage === 'fight' && this.storyEnemyIds.has(e.id)) {
        const defeated = [...this.storyEnemyIds].filter((id) => this.enemies.find((enemy) => enemy.id === id)?.state === 'dead').length;
        if (this.storyObjective) {
          this.storyObjective = { ...this.storyObjective, progress: defeated, ready: defeated >= this.storyEnemyIds.size };
          this.onQuestsChange?.();
        }
        if (defeated >= this.storyEnemyIds.size) {
          this.storyStage = 'aftermath';
          this.storyControlLocked = true;
          this.player.vx = 0;
          this.player.vy = 0;
          window.setTimeout(() => this.onStoryBeat?.('shinkers_defeated'), 650);
        }
      }
      const def = ENEMY_DEFS[e.kind];
      const lvlBonus = Math.floor((e.level - 1) / 2);
      const claves = def.claveMin + lvlBonus + Math.floor(Math.random() * (def.claveMax - def.claveMin + 1));
      const frags = def.fragMin + Math.floor(Math.random() * (def.fragMax - def.fragMin + 1));
      // dropa no CHÃO — não vai direto pro inventário (igual madeira/pedra)
      if (claves > 0) this.spawnDropScattered(e.x + 8, e.y, 'clave', claves);
      if (def.boss) {
        this.spawnDrop(e.x + 8, e.y - 8, 'ascension_keys', 1);
        this.onHarvestPopup?.('♬ Núcleo de Ascensão das Teclas!', e.x, e.y - 36);
      }
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
    if (this.activeCharacter === 'huans' && this.hunterGuaranteedCrit) {
      this.hunterGuaranteedCrit = false;
      return true;
    }
    return Math.random() < this.stats.critChance / 100 + this.critChanceBonus;
  }

  private spendEnergy(cost: number): boolean {
    if (this.stats.energy + 0.001 < cost) return false;
    this.stats.energy -= cost;
    this.onStatsChange?.({ ...this.stats });
    return true;
  }

  private facingVector(): [number, number] {
    return this.player.direction === 'left' ? [-1, 0] : this.player.direction === 'right' ? [1, 0] : this.player.direction === 'up' ? [0, -1] : [0, 1];
  }

  private aimOrigin() {
    return { x: this.player.x + 12, y: this.player.y + 14 };
  }

  private combatAim(maxRange = 330): { dx: number; dy: number; x: number; y: number } {
    const origin = this.aimOrigin();
    let tx: number;
    let ty: number;
    if (this.queuedSkillAim) {
      const queued = this.queuedSkillAim;
      this.queuedSkillAim = null;
      tx = origin.x + queued.dx * maxRange * queued.power;
      ty = origin.y + queued.dy * maxRange * queued.power;
    } else if (this.pointerAimWorld) {
      const pdx = this.pointerAimWorld.x - origin.x;
      const pdy = this.pointerAimWorld.y - origin.y;
      const dist = Math.max(1, Math.hypot(pdx, pdy));
      const clamped = Math.min(maxRange, dist);
      tx = origin.x + pdx / dist * clamped;
      ty = origin.y + pdy / dist * clamped;
    } else {
      const [fdx, fdy] = this.facingVector();
      tx = origin.x + fdx * maxRange;
      ty = origin.y + fdy * maxRange;
    }
    const rawX = tx - origin.x;
    const rawY = ty - origin.y;
    const len = Math.max(1, Math.hypot(rawX, rawY));
    const dx = rawX / len;
    const dy = rawY / len;
    this.player.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    return { dx, dy, x: tx, y: ty };
  }

  private rangedBasicAim(maxRange: number): { dx: number; dy: number; x: number; y: number; targetId?: string } {
    const origin = this.aimOrigin();
    const candidates = this.enemies
      .filter((e) => e.state !== 'dead')
      .map((e) => ({ e, dist: Math.hypot(e.x + 8 - origin.x, e.y - origin.y) }))
      .filter(({ dist }) => dist <= maxRange)
      .sort((a, b) => {
        // Huans mantém o foco na presa que já está marcando; Wins prefere o
        // alvo mais próximo. Isso afeta somente o ataque básico.
        if (this.activeCharacter === 'huans') {
          const marks = (b.e.preyMarks ?? 0) - (a.e.preyMarks ?? 0);
          if (marks !== 0) return marks;
        }
        return a.dist - b.dist;
      });
    const target = candidates[0]?.e;
    if (!target) {
      const [dx, dy] = this.facingVector();
      return { dx, dy, x: origin.x + dx * maxRange, y: origin.y + dy * maxRange };
    }
    const rawX = target.x + 8 - origin.x;
    const rawY = target.y - origin.y;
    const len = Math.max(1, Math.hypot(rawX, rawY));
    const dx = rawX / len, dy = rawY / len;
    this.player.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    return { dx, dy, x: target.x + 8, y: target.y, targetId: target.id };
  }

  private fireClassProjectile(kind: LightBeam['kind'], dmg: number, maxHits: number, speed = 440) {
    const isBasic = kind === 'winsBasic' || kind === 'huansBasic';
    const aim: { dx: number; dy: number; x: number; y: number; targetId?: string } = isBasic
      ? this.rangedBasicAim(kind === 'winsBasic' ? 320 : 380)
      : this.combatAim(kind?.startsWith('wins') ? 320 : 380);
    this.lightBeams.push({ x: this.player.x + 12 + aim.dx * 16, y: this.player.y + 12 + aim.dy * 12, vx: aim.dx * speed, vy: aim.dy * speed, life: 0, maxLife: 1.15, dmg, hitIds: [], kind, maxHits, targetId: aim.targetId });
  }

  private applyVocalNote(e: Enemy) {
    e.vocalNotes = Math.min(3, (e.vocalNotes ?? 0) + 1);
    if (e.vocalNotes === 3) this.explodeVocalResonance(e);
  }

  private explodeVocalResonance(target: Enemy) {
    target.vocalNotes = 0;
    target.resonantT = 5;
    const dmg = this.effectiveHarmonicPower * this.classPassiveValue('winsRessonanciaVocal') * this.skillDmgMul;
    for (const e of this.enemies) if (e.state !== 'dead' && Math.hypot(e.x - target.x, e.y - target.y) <= 46) this.damageEnemy(e, dmg, target.x, target.y, { skill: true });
    const energyPct = .04 + (this.getAnyPassiveLevel('winsRessonanciaVocal') - 1) * .005;
    this.stats.energy = Math.min(this.effectiveMaxEnergy, this.stats.energy + this.effectiveMaxEnergy * energyPct);
    this.onStatsChange?.({ ...this.stats });
  }

  private applyPreyMarks(e: Enemy, count: number) {
    e.preyMarks = Math.min(5, (e.preyMarks ?? 0) + count);
    e.preyLastHitAt = this.timeElapsed;
  }

  private useWinsChorus() {
    const aim = this.combatAim(190);
    const x = aim.x, y = aim.y;
    this.combatZones.push({ kind: 'winsChorus', x, y, radius: 58 * this.meleeAreaMul, life: 0, duration: 5, tickT: 1, entered: {}, marked: new Set() });
  }

  private useWinsAria() {
    const { dx, dy } = this.combatAim(260);
    const cx = this.player.x + 12, cy = this.player.y + 16;
    this.spriteVfx.push({ sheet: 'vfxWinsAria', x: cx + dx * 72, y: cy + dy * 72, angle: Math.atan2(dy, dx), life: 0, duration: .9, width: 180, height: 145 });
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      const ex = e.x + 8 - cx, ey = e.y - cy, dist = Math.hypot(ex, ey);
      if (dist > 150 * this.meleeAreaMul || (ex * dx + ey * dy) / Math.max(1, dist) < 0.25) continue;
      const notes = e.vocalNotes ?? 0;
      this.damageEnemy(e, this.effectiveHarmonicPower * 3.2 * (1 + notes * this.classPassiveValue('winsAriaClimax')) * this.skillDmgMul * this.skillRankMul(2), cx, cy, { skill: true });
      if (notes === 3 && this.getAnyPassiveLevel('winsAriaClimax') >= 5) this.stats.energy = Math.min(this.effectiveMaxEnergy, this.stats.energy + this.effectiveMaxEnergy * .06);
      if (notes === 3) this.explodeVocalResonance(e); else e.vocalNotes = 0;
    }
  }

  private useHunterStep() {
    const aim = this.combatAim(100);
    const dx = aim.dx, dy = aim.dy;
    const startX = this.player.x + 12, startY = this.player.y + 14;
    for (let step = 0; step < 5; step++) {
      const nx = this.player.x + dx * 18, ny = this.player.y + dy * 18;
      if (this.checkSolidCollision({ x: nx, y: ny, w: 20, h: 14 })) break;
      this.player.x = nx; this.player.y = ny;
    }
    this.playerInvuln = Math.max(this.playerInvuln, 0.35);
    this.hunterDashWindow = 0.35;
    this.hunterBuffT = 5 + (this.getSkillLevel(1) - 1) * .5;
    this.hunterEnhancedBasics = 3;
    this.spriteVfx.push({ sheet: 'vfxHuansStep', x: (startX + this.player.x + 12) / 2, y: (startY + this.player.y + 14) / 2, angle: Math.atan2(dy, dx), life: 0, duration: .55, width: 135, height: 68 });
  }

  private useHuansRain() {
    const aim = this.combatAim(260);
    this.combatZones.push({ kind: 'huansRain', x: aim.x, y: aim.y, radius: 72 * this.meleeAreaMul, life: 0, duration: 1.21, tickT: 0, entered: {}, marked: new Set() });
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
    for (let i = this.spriteVfx.length - 1; i >= 0; i--) {
      this.spriteVfx[i].life += dt;
      if (this.spriteVfx[i].life >= this.spriteVfx[i].duration) this.spriteVfx.splice(i, 1);
    }
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
    for (const char of ['wins', 'huans'] as const) for (let i = 0; i < 3; i++) this.skillCooldowns[char][i] = Math.max(0, this.skillCooldowns[char][i] - dt);
    this.hunterBuffT = Math.max(0, this.hunterBuffT - dt);
    this.hunterDashWindow = Math.max(0, this.hunterDashWindow - dt);
    if (this.activeCharacter !== 'akles') {
      const before = this.stats.energy;
      this.stats.energy = Math.min(this.effectiveMaxEnergy, this.stats.energy + dt * 2.5 * (1 + this.equipStat('energyRegenPct') / 100));
      if (Math.floor(before * 2) !== Math.floor(this.stats.energy * 2)) this.onStatsChange?.({ ...this.stats });
    }
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
      if (e.resonantT && e.resonantT > 0) e.resonantT = Math.max(0, e.resonantT - dt);
      if (e.slowT && e.slowT > 0) e.slowT = Math.max(0, e.slowT - dt);
      if (e.silenceT && e.silenceT > 0) e.silenceT = Math.max(0, e.silenceT - dt);
      if ((e.preyMarks ?? 0) > 0 && this.timeElapsed - (e.preyLastHitAt ?? 0) > 6) e.preyMarks = 0;
    }
  }

  // Skill 1 — Ressonância: buff temporário (energiza a arma + acelera ataques)
  activateResonance(): boolean {
    if (this.activeCharacter !== 'akles') {
      const char = this.activeCharacter;
      const cost = this.skillEnergyCost(char === 'wins' ? 15 : 14, 0);
      if (this.skillCooldowns[char][0] > 0 || !this.spendEnergy(cost)) return false;
      this.skillCooldowns[char][0] = 5 * this.cooldownMul;
      if (char === 'wins') this.fireClassProjectile('winsNote', this.effectiveHarmonicPower * 1.35 * this.skillDmgMul * this.skillRankMul(0), 99, 470);
      else this.fireClassProjectile('huansArrow', (this.stats.forca + this.weaponAtk) * 1.5 * this.skillDmgMul * this.skillRankMul(0), 2, 520);
      return true;
    }
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
    const aim = this.combatAim(380);
    const dvec = [aim.dx, aim.dy];
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
      kind: 'aklesPulse',
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
      if (b.targetId && (b.kind === 'winsBasic' || b.kind === 'huansBasic')) {
        const target = this.enemies.find((e) => e.id === b.targetId && e.state !== 'dead');
        if (target) {
          const tx = target.x + 8 - b.x, ty = target.y - b.y;
          const len = Math.max(1, Math.hypot(tx, ty));
          const speed = Math.max(1, Math.hypot(b.vx, b.vy));
          const turn = Math.min(1, dt * 7);
          b.vx += (tx / len * speed - b.vx) * turn;
          b.vy += (ty / len * speed - b.vy) * turn;
          const adjustedSpeed = Math.max(1, Math.hypot(b.vx, b.vy));
          b.vx = b.vx / adjustedSpeed * speed;
          b.vy = b.vy / adjustedSpeed * speed;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // a luz atravessa a vegetação; só o tempo de vida e os inimigos a param
      let dead = b.life >= b.maxLife;
      for (const e of this.enemies) {
        if (e.state === 'dead' || b.hitIds.includes(e.id)) continue;
        const hitRadius = b.kind === 'winsBasic' || b.kind === 'huansBasic' ? 30 : 24;
        if (Math.hypot(e.x + 8 - b.x, e.y - b.y) < hitRadius) {
          b.hitIds.push(e.id);
          let dmg = b.dmg;
          if (b.kind === 'winsNote') {
            if ((e.resonantT ?? 0) > 0) dmg *= 1 + this.classPassiveValue('winsNotaPerfurante');
            this.damageEnemy(e, dmg, b.x - b.vx * 0.1, b.y - b.vy * 0.1, { skill: true });
            this.applyVocalNote(e);
          } else if (b.kind === 'huansArrow') {
            if ((e.preyMarks ?? 0) >= 5) dmg *= 1 + this.classPassiveValue('huansFlecha');
            this.damageEnemy(e, dmg, b.x - b.vx * 0.1, b.y - b.vy * 0.1, { skill: true });
            this.applyPreyMarks(e, this.getAnyPassiveLevel('huansFlecha') >= 5 && b.hitIds.length === 1 ? 3 : 2);
          } else if (b.kind === 'huansBasic') {
            const crit = this.rollCritAgainst(e);
            this.damageEnemy(e, crit ? dmg * this.critDmgMul : dmg, b.x, b.y, { crit });
            this.applyPreyMarks(e, this.hunterEnhancedBasics > 0 ? 2 : 1);
            if (this.hunterEnhancedBasics > 0) this.hunterEnhancedBasics--;
          } else this.damageEnemy(e, dmg, b.x - b.vx * 0.1, b.y - b.vy * 0.1, { isPulse: b.kind !== 'winsBasic' });
          if (b.maxHits && b.hitIds.length >= b.maxHits) dead = true;
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

  private rollCritAgainst(e: Enemy): boolean {
    if (this.hunterGuaranteedCrit) { this.hunterGuaranteedCrit = false; return true; }
    const markedBonus = this.activeCharacter === 'huans' && (e.preyMarks ?? 0) >= 5
      ? .08 + (this.getAnyPassiveLevel('huansInstinto') - 1) * .01 : 0;
    return Math.random() < this.stats.critChance / 100 + this.critChanceBonus + markedBonus;
  }

  private updateCombatZones(dt: number) {
    for (let i = this.combatZones.length - 1; i >= 0; i--) {
      const z = this.combatZones[i];
      z.life += dt; z.tickT -= dt;
      const inside = this.enemies.filter((e) => e.state !== 'dead' && Math.hypot(e.x + 8 - z.x, e.y - z.y) <= z.radius);
      if (z.kind === 'winsChorus') {
        for (const e of inside) {
          z.entered[e.id] = (z.entered[e.id] ?? 0) + dt;
          e.slowT = 0.2; e.slowPct = this.classPassiveValue('winsCoroDissonante');
          if (!z.marked.has(e.id)) {
            z.marked.add(e.id);
            this.damageEnemy(e, this.effectiveHarmonicPower * 0.8 * this.skillDmgMul * this.skillRankMul(1), z.x, z.y, { skill: true });
            if (e.state !== 'dead') this.applyVocalNote(e);
          }
          if (z.entered[e.id] >= 3 && !(e.silenceT && e.silenceT > 0)) e.silenceT = this.getAnyPassiveLevel('winsCoroDissonante') >= 5 ? 1.4 : 1;
        }
        if (z.tickT <= 0) {
          z.tickT += 1;
          for (const e of inside) this.damageEnemy(e, this.effectiveHarmonicPower * 0.35 * this.skillDmgMul * this.skillRankMul(1), z.x, z.y, { skill: true });
        }
      } else if (z.tickT <= 0) {
        z.tickT += 0.3;
        const single = inside.length === 1;
        for (const e of inside) {
          const markedBefore = (e.preyMarks ?? 0) >= 5;
          let dmg = (this.stats.forca + this.weaponAtk) * 2.8 / 5 * this.skillDmgMul * this.skillRankMul(2);
          if (markedBefore) dmg *= 1 + this.classPassiveValue('huansChuva');
          if (single) dmg *= 1 + (this.getAnyPassiveLevel('huansChuva') >= 5 ? .46 : .30);
          this.damageEnemy(e, dmg, z.x, z.y, { skill: true });
          e.slowT = 3; e.slowPct = 0.2;
          if (!z.marked.has(e.id) && e.state !== 'dead') { z.marked.add(e.id); this.applyPreyMarks(e, 3); }
        }
      }
      if (z.life >= z.duration) this.combatZones.splice(i, 1);
    }
  }

  updateEnemies(dt: number) {
    if (this.playerHurtFlash > 0) this.playerHurtFlash = Math.max(0, this.playerHurtFlash - dt);
    if (this.playerInvuln > 0) this.playerInvuln = Math.max(0, this.playerInvuln - dt);
    const px = this.player.x + 12;
    const py = this.player.y + 18;

    for (const e of this.enemies) {
      const def = ENEMY_DEFS[e.kind];

      if (this.storyActorMoves.some((move) => move.kind === 'enemy' && move.id === e.id)) {
        e.animTimer += dt;
        e.state = 'walk';
        e.frame = Math.floor(e.animTimer * 7) % Math.max(1, def.cols);
        continue;
      }

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
        const impactAt = def.boss ? .46 : .25;
        if (e.stateTimer > impactAt && e.stateTimer - dt <= impactAt) {
          if (def.boss) {
            const raging = e.hp <= e.maxHp * .5;
            const range = e.bossAttackMode === 'cast' ? 245 : 82;
            if (dToPlayer < range) {
              const modeMul = e.bossAttackMode === 'cast' ? .72 : 1;
              this.damagePlayer(Math.round(def.touchDamage * e.dmgMul * modeMul * (raging ? 1.2 : 1)));
              for (let i = 0; i < 14; i++) this.addMiningSpark(px + (Math.random() - .5) * 32, py + (Math.random() - .5) * 24);
            }
          } else if (dToPlayer < def.attackRange + 10) {
            this.damagePlayer(Math.round(def.touchDamage * e.dmgMul));
          }
        }
        if (e.stateTimer > (def.boss ? .9 : .6)) {
          e.state = 'chase';
          e.attackCd = def.attackCd * (def.boss && e.hp <= e.maxHp * .5 ? .72 : 1);
        }
        continue;
      }

      if (e.attackCd > 0) e.attackCd -= dt;

      // aggro (só monstros hostis perseguem/atacam)
      if (def.hostile && dToPlayer < def.aggro) {
        if (dToPlayer <= def.attackRange && e.attackCd <= 0 && !(e.silenceT && e.silenceT > 0)) {
          e.state = 'attack';
          e.stateTimer = 0;
          e.frame = 0;
          e.facingLeft = px < e.x;
          if (def.boss) {
            e.bossAttackMode = dToPlayer <= 82 ? 'melee' : 'cast';
            const dx = px - (e.x + 8), dy = py - e.y;
            e.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
          }
          continue;
        }
        e.state = 'chase';
        const ang = Math.atan2(py - e.y, px - (e.x + 8));
        const slowMul = e.slowT && e.slowT > 0 ? 1 - (e.slowPct ?? 0) : 1;
        const sx = Math.cos(ang) * def.speed * slowMul * dt;
        const sy = Math.sin(ang) * def.speed * slowMul * dt;
        if (!this.checkSolidCollision({ x: e.x + sx, y: e.y + sy, w: 16, h: 12 })) {
          e.x += sx;
          e.y += sy;
        } else if (!this.checkSolidCollision({ x: e.x + sx, y: e.y, w: 16, h: 12 })) {
          e.x += sx;
        } else if (!this.checkSolidCollision({ x: e.x, y: e.y + sy, w: 16, h: 12 })) {
          e.y += sy;
        }
        e.facingLeft = Math.cos(ang) < 0;
        if (def.boss) e.direction = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang)) ? (Math.cos(ang) < 0 ? 'left' : 'right') : (Math.sin(ang) < 0 ? 'up' : 'down');
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

    // Conversa de percurso: guia o ritmo da caminhada sem abrir outra caixa
    // de diálogo e dá personalidade aos acompanhantes.
    if ((this.storyStage === 'follow_echoes' || this.storyStage === 'follow_pippo' || this.storyStage === 'follow_pippo_antony') && now >= this.storyDialogueAt) {
      const echoIds = [...this.storyEchoIds];
      const echoLines = [
        { who: 'enemy' as const, enemyId: echoIds[0], text: '♪ Dó... dó...', voice: 'pippo' },
        { who: 'akles' as const, text: 'Vocês querem que eu siga?', voice: 'akles' },
        { who: 'enemy' as const, enemyId: echoIds[1], text: '♪ Mi—sol, mi—sol...', voice: 'wins' },
        { who: 'akles' as const, text: 'Isso é uma resposta? Acho que é.', voice: 'akles' },
      ];
      const pippoLines = [
        { who: 'npc' as const, npcId: 'story_pippo', text: 'Mirella mora logo depois da muralha.', voice: 'pippo' },
        { who: 'akles' as const, text: 'Você sempre conversa com desconhecidos na floresta?', voice: 'akles' },
        { who: 'npc' as const, npcId: 'story_pippo', text: 'Só com os que chegam escoltados por um acorde.', voice: 'pippo' },
        { who: 'npc' as const, npcId: 'story_pippo', text: 'A estrada para Acordelot é longa. Hoje você precisa dormir.', voice: 'pippo' },
      ];
      const antonyLines = [
        { who: 'npc' as const, npcId: 'story_pippo', text: 'O Sr. Antony sabe tudo o que acontece em Acordelot.', voice: 'pippo' },
        { who: 'akles' as const, text: 'Talvez ele saiba quem eu sou.', voice: 'akles' },
        { who: 'npc' as const, npcId: 'story_pippo', text: 'Talvez. Mas ele responde perguntas com outras perguntas.', voice: 'pippo' },
        { who: 'akles' as const, text: 'Então já sei o que esperar.', voice: 'akles' },
      ];
      const lines = this.storyStage === 'follow_echoes' ? echoLines : this.storyStage === 'follow_pippo_antony' ? antonyLines : pippoLines;
      const line = lines[this.storyDialogueIndex % lines.length];
      this.bubbles.push({ ...line, born: now, ttl: 4.4 });
      this.onStoryVoice?.(line.text, line.voice);
      this.storyDialogueIndex++;
      this.storyDialogueAt = now + 5.2;
    }

    // NPC mais próximo dentro do raio de "bark" (maior que o de conversa)
    let barkNpc: NPC | null = null;
    let bd = 128;
    for (const n of this.npcs) {
      if (n.spriteType === 'merchant' || n.isMerchant || !n.barks || !n.barks.length) continue;
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
      if (this.storyActorMoves.some((move) => move.kind === 'npc' && move.id === npc.id)) continue;
      if (npc.spriteType === 'merchant' || npc.isMerchant) continue;
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
    const free = this.maxCarryWeight - this.carryWeight;
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

  activeBuffs: Array<{ label: string; until: number; kind?: 'basic' | 'shield' | 'farm'; value?: number }> = [];
  private activeBuffValue(kind: 'basic' | 'shield' | 'farm'): number {
    this.activeBuffs = this.activeBuffs.filter((b) => b.until > this.timeElapsed);
    return this.activeBuffs
      .filter((b) => b.kind === kind)
      .reduce((best, b) => Math.max(best, b.value ?? 0), 0);
  }

  useBuffItem(): boolean {
    for (const [k, qty] of Object.entries(this.inventory)) {
      if (qty <= 0) continue;
      const buff = ITEM_META[k]?.buff;
      if (!buff) continue;
      this.inventory[k] -= 1;
      if (this.inventory[k] <= 0) delete this.inventory[k];
      // Reusar a mesma categoria renova/substitui o efeito, sem empilhar.
      if (buff.kind) this.activeBuffs = this.activeBuffs.filter((b) => b.kind !== buff.kind);
      this.activeBuffs.push({ label: buff.label, until: this.timeElapsed + buff.duration, kind: buff.kind, value: buff.value });
      this.onInventoryChange?.({ ...this.inventory });
      this.addDamageText(this.player.x + 12, this.player.y - 10, buff.label, '#f472b6');
      for (let i = 0; i < 10; i++) this.addMiningSpark(this.player.x + 12, this.player.y + 6);
      return true;
    }
    this.addDamageText(this.player.x + 12, this.player.y - 8, 'sem buff', '#94a3b8');
    return false;
  }

  private refreshDailyShop() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.shopPurchases.date !== today) this.shopPurchases = { date: today, counts: {} };
  }

  getShopBought(id: string): number {
    this.refreshDailyShop();
    return this.shopPurchases.counts[id] ?? 0;
  }

  buyShopItem(id: string): { ok: boolean; message: string } {
    this.refreshDailyShop();
    const def = SHOP_ITEMS.find((item) => item.id === id);
    if (!def) return { ok: false, message: 'Item indisponível.' };
    const bought = this.getShopBought(id);
    if (bought >= def.dailyLimit) return { ok: false, message: 'Limite diário atingido.' };
    if ((this.inventory[def.currency] || 0) < def.price) {
      return { ok: false, message: def.currency === 'gold_raw' ? 'Ouro bruto insuficiente.' : 'Ouro sintetizado insuficiente.' };
    }
    if (def.item === 'bag_expansion' && this.bagLevel >= 5) {
      return { ok: false, message: 'Sua mochila já está no nível máximo.' };
    }

    const rewardWeight = def.item === 'bag_expansion' ? 0 : def.item === 'fragment_pack'
      ? (ITEM_META.frag_c?.weight ?? .08) * def.quantity
      : (ITEM_META[def.item]?.weight ?? 1) * def.quantity;
    const paidWeight = (ITEM_META[def.currency]?.weight ?? 0) * def.price;
    if (this.carryWeight - paidWeight + rewardWeight > this.maxCarryWeight + 1e-6) {
      return { ok: false, message: 'Sem espaço suficiente na mochila.' };
    }

    this.inventory[def.currency] -= def.price;
    if (this.inventory[def.currency] <= 0) delete this.inventory[def.currency];
    if (def.item === 'bag_expansion') {
      this.bagLevel++;
    } else if (def.item === 'fragment_pack') {
      for (let i = 0; i < def.quantity; i++) this.addFragment(Math.floor(Math.random() * NOTE_KEY.length), 1);
    } else {
      this.inventory[def.item] = (this.inventory[def.item] || 0) + def.quantity;
    }
    this.shopPurchases.counts[id] = bought + 1;
    this.onInventoryChange?.({ ...this.inventory });
    this.onHarvestPopup?.(`Comprado: ${def.name}`, this.player.x, this.player.y - 18);
    return { ok: true, message: `${def.name} comprado.` };
  }

  private removeInventoryUnits(item: string, quantity: number) {
    this.inventory[item] = Math.max(0, (this.inventory[item] || 0) - quantity);
    if (this.inventory[item] <= 0) delete this.inventory[item];
    if (item === 'clave') {
      this.coins = Math.max(0, this.coins - quantity);
      this.onCoinsChange?.(this.coins);
    } else if (item.startsWith('frag_')) {
      const note = NOTE_KEY.indexOf(item.slice(5));
      if (note >= 0) {
        this.fragments[note] = Math.max(0, this.fragments[note] - quantity);
        this.onFragmentsChange?.({ fragments: [...this.fragments], built: [...this.notesBuilt] });
      }
    }
  }

  sellInventoryItem(item: string): { ok: boolean; message: string } {
    const offer = inventorySellOffer(item);
    if (!offer) return { ok: false, message: 'Esta moeda não pode ser vendida.' };
    if ((this.inventory[item] || 0) < offer.quantity) {
      return { ok: false, message: `São necessárias ${offer.quantity} unidades para vender.` };
    }
    this.removeInventoryUnits(item, offer.quantity);
    this.inventory.gold_raw = (this.inventory.gold_raw || 0) + offer.goldRaw;
    this.onInventoryChange?.({ ...this.inventory });
    return { ok: true, message: `Vendido por ${offer.goldRaw} ouro bruto.` };
  }

  discardInventoryItem(item: string, quantity = 1): { ok: boolean; message: string } {
    if ((this.inventory[item] || 0) < quantity) return { ok: false, message: 'Item não disponível.' };
    this.removeInventoryUnits(item, quantity);
    this.onInventoryChange?.({ ...this.inventory });
    return { ok: true, message: `${quantity} unidade descartada.` };
  }

  private harvestReach() {
    // A colisão visual de árvores e rochas pode impedir o centro do jogador
    // de chegar a 62 px do ponto de extração, especialmente no celular.
    return 88;
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
      const box = p.collider ?? { x: p.x, y: p.y + p.h * .55, w: p.w, h: p.h * .45 };
      const nearestX = Math.max(box.x, Math.min(px, box.x + box.w));
      const nearestY = Math.max(box.y, Math.min(py, box.y + box.h));
      const d = Math.hypot(px - nearestX, py - nearestY);
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

  // Botão único (HUD): recurso próximo sempre tem prioridade. O bloqueio por
  // combate fazia o botão permanecer em ataque e dava a impressão de que a
  // coleta havia parado após qualquer golpe recebido.
  primaryAction() {
    if (['chop', 'mine', 'attack', 'spin', 'cast'].includes(this.player.actionState as string)) return;
    if (this.findNearestHarvestable('any')) {
      this.harvestAction();
      return;
    }
    this.triggerAction('attack');
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
    if (item === 'clave') {
      this.addCoins(qty);
      this.bumpQuestProgress('collect_clave', qty);
    } else if (item.startsWith('frag_') && note !== undefined) {
      this.addFragment(note, qty);
    } else {
      this.addToInventory(item, qty);
    }
    if (item === 'wood') this.bumpQuestProgress('harvest_wood', qty);
    else if (item === 'stone') this.bumpQuestProgress('harvest_stone', qty);
    else if (item === 'gold_raw') this.bumpQuestProgress('collect_gold', qty);
    else if (item === 'crystal_blue_raw') this.bumpQuestProgress('collect_crystal', qty);

    if (this.marketIntroStage === 'collecting' && (item === 'wood' || item === 'stone')) {
      const woodCount = Math.min(3, this.inventory['wood'] || 0);
      const stoneCount = Math.min(3, this.inventory['stone'] || 0);
      if (woodCount >= 3 && stoneCount >= 3) {
        this.storyObjective = {
          title: 'As Vozes de Acordelot',
          text: 'Materiais reunidos! Fale com Miro no Mercado para entregar',
          progress: 1,
          target: 2,
          ready: true,
        };
      } else {
        this.storyObjective = {
          title: 'As Vozes de Acordelot',
          text: `Colete Madeira (${woodCount}/3) e Pedra (${stoneCount}/3) para Miro`,
          progress: 0,
          target: 2,
          ready: false,
        };
      }
      this.onQuestsChange?.();
    }

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
    const farmBonus = this.activeBuffValue('farm');
    const boostedQty = (qty: number) => qty + Math.floor(qty * farmBonus) + (Math.random() < (qty * farmBonus) % 1 ? 1 : 0);
    this.spawnDropScattered(ix, iy, h.drop, boostedQty(1));
    this.gainXp(3);

    if (h.hp <= 0) {
      const bonus = h.dropMin + Math.floor(Math.random() * (h.dropMax - h.dropMin + 1));
      this.spawnDropScattered(ix, iy, h.drop, boostedQty(bonus));
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

    this.updateStoryActorMoves(dt);

    // Personagem em ação ativa (coleta, ataque, giro, magia)
    const act = this.player.actionState;
    const isBusy =
      act === 'chop' || act === 'mine' || act === 'attack' || act === 'spin' || act === 'cast';

    if (isBusy) {
      const meta = AKLES_ANIM[act as AklesAction];
      this.player.isMoving = false;
      this.player.vx = 0;
      this.player.vy = 0;
      // Pulso Acelerado (passiva, só durante Ressonância) + Velocidade de
      // Ataque de arma/equipamentos (sempre ativa, qualquer ação)
      const atkSpeedMul =
        this.stats.attackSpeedPct / 100 +
        this.equipStat('atkSpeedPct') / 100 +
        (this.activeCharacter === 'huans' && this.hunterBuffT > 0 ? this.classPassiveValue('huansPasso') : 0) +
        (act === 'attack' && this.resonanceActive ? this.passiveValue('pulsoAcelerado') : 0);
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
          if (this.activeCharacter === 'akles') {
            const crit = this.rollCrit();
            let dmg = this.basicAttackDamage();
            if (crit) dmg *= this.critDmgMul;
            this.applyMeleeHit(dmg, 46, { crit });
            this.onComboHitLanded();
          } else if (this.activeCharacter === 'wins') {
            this.fireClassProjectile('winsBasic', this.effectiveHarmonicPower * 0.65 * (1 + this.equipStat('basicDmgPct') / 100), 1, 390);
          } else {
            this.fireClassProjectile('huansBasic', (this.stats.forca + this.weaponAtk) * this.basicAtkMul, 1, 500);
          }
        }
        if (act === 'spin') {
          if (this.activeCharacter === 'akles') this.amplifyAttack();
          else if (this.activeCharacter === 'wins') this.useWinsChorus();
          else this.useHunterStep();
        }
        if (act === 'cast') {
          if (this.activeCharacter === 'akles') this.fireLightCannon();
          else if (this.activeCharacter === 'wins') this.useWinsAria();
          else this.useHuansRain();
        }
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

      if (!this.isTalkingToMerchant && !this.storyControlLocked) {
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
      const escortedWalk = this.storyStage === 'follow_echoes' || this.storyStage === 'follow_pippo' || this.storyStage === 'follow_pippo_antony';
      this.heroRunning = len > 0.05 && (sprintKey || sprintTouch) && !escortedWalk;
      // base mais rápida + escala com Agilidade (pontos de habilidade)
      const unrestrictedSpeed =
        (150 + this.stats.agilidade * 7) * (this.heroRunning ? 1.7 : 1) * this.moveSpeedMul;
      // Durante escolta narrativa, regula a velocidade máxima para acompanhar o NPC guia sem ultrapassá-lo
      const speed = escortedWalk ? Math.min(105, unrestrictedSpeed) : unrestrictedSpeed;

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
    if (this.companionVisible) this.updateCompanion(dt);
    this.updateRemotePlayers(dt);
    this.updateNpcs(dt);
    this.updateFragments(dt);
    if (!this.storyControlLocked) this.updateEnemies(dt);
    this.updateLightBeams(dt);
    this.updateCombatZones(dt);

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
      this.isNearMerchant = near?.isMerchant === true || near?.spriteType === 'merchant';
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

    if (!this.storyControlLocked && this.openingSoundTarget && (this.storyStage === 'follow_vibration' || this.storyStage === 'find_origin')) {
      if (this.storyStage === 'follow_vibration' && !this.storyMovementTaught && this.storyMoveOrigin && Math.hypot(this.player.x - this.storyMoveOrigin.x, this.player.y - this.storyMoveOrigin.y) > 30) {
        this.storyMovementTaught = true;
        if (this.storyObjective) this.storyObjective = { ...this.storyObjective, text: 'Siga a vibração pelo caminho' };
        this.onQuestsChange?.();
        this.onStoryBeat?.('movement_learned');
      }
      const distance = Math.hypot(
        this.player.x + this.player.width / 2 - this.openingSoundTarget.x,
        this.player.y + this.player.height / 2 - this.openingSoundTarget.y,
      );
      if (distance < 44) {
        this.storyControlLocked = true;
        this.player.vx = 0;
        this.player.vy = 0;
        const foundFirstSound = this.storyStage === 'follow_vibration';
        this.storyStage = foundFirstSound ? 'sol_bemol_scene' : 'encounter_scene';
        this.storyObjective = foundFirstSound
          ? { title: 'Despertar sem Nome', text: 'Vibração encontrada', progress: 1, target: 1, ready: true }
          : { title: 'Despertar sem Nome', text: 'A origem está logo adiante', progress: 1, target: 1, ready: true };
        this.onQuestsChange?.();
        this.onStoryBeat?.(foundFirstSound ? 'opening_sound_found' : 'shinkers_appear');
      }
    }

    if (!this.storyControlLocked && this.storyStage === 'follow_echoes' && this.storyEchoIds.size) {
      const living = [...this.storyEchoIds]
        .map((id) => this.enemies.find((enemy) => enemy.id === id && enemy.state !== 'dead'))
        .filter((enemy): enemy is Enemy => !!enemy);
      const lead = living.sort((a, b) => a.y - b.y)[0];
      const gate = this.props.find((prop) => prop.type === 'wallGate');
      const gateX = gate ? gate.x + gate.w / 2 : 36 * TILE_SIZE;
      const gateY = gate ? gate.y + gate.h + 46 : 72 * TILE_SIZE;
      if (lead && Math.hypot(lead.x - gateX, lead.y - gateY) < 90 && Math.hypot(gateX - this.player.x, gateY - this.player.y) < 180) {
        this.storyStage = 'gate_scene';
        this.storyControlLocked = true;
        this.player.vx = 0;
        this.player.vy = 0;
        this.ensureStoryNpc('story_pippo', 'Pippo', 'seminima', gateX + 28, gateY - 12, '#fbbf24');
        this.storyObjective = { title: 'Despertar sem Nome', text: 'Os portões de Acordelot', progress: 1, target: 1, ready: true };
        this.onQuestsChange?.();
        this.onStoryBeat?.('gate_arrival');
      }
    }

    if (!this.storyControlLocked && this.storyStage === 'follow_pippo') {
      const pippo = this.npcs.find((npc) => npc.id === 'story_pippo');
      const mirella = this.npcs.find((npc) => npc.id === 'story_mirella');
      if (pippo && mirella && Math.hypot(pippo.x - mirella.x, pippo.y - mirella.y) < 80 && Math.hypot(this.player.x - mirella.x, this.player.y - mirella.y) < 150) {
        this.storyStage = 'mirella_scene';
        this.storyControlLocked = true;
        this.player.vx = 0;
        this.player.vy = 0;
        this.storyObjective = { title: 'Despertar sem Nome', text: 'Abrigo de Mirella', progress: 1, target: 1, ready: true };
        this.onQuestsChange?.();
        this.onStoryBeat?.('mirella_arrival');
      }
    }

    if (!this.storyControlLocked && this.storyStage === 'follow_pippo_antony') {
      const pippo = this.npcs.find((npc) => npc.id === 'story_pippo');
      const antony = this.npcs.find((npc) => npc.id === 'story_sr_antony');
      const playerDist = antony ? Math.hypot(this.player.x - antony.x, this.player.y - antony.y) : 999;
      const pippoDist = pippo && antony ? Math.hypot(pippo.x - antony.x, pippo.y - antony.y) : 999;
      if (antony && (playerDist < 90 || (pippoDist < 95 && playerDist < 160))) {
        if (pippo) {
          pippo.x = antony.x - 38;
          pippo.y = antony.y + 4;
          pippo.direction = 'right';
          pippo.isMoving = false;
          this.storyActorMoves = this.storyActorMoves.filter((m) => m.id !== 'story_pippo');
        }
        this.storyStage = 'antony_scene';
        this.storyControlLocked = true;
        this.player.vx = 0;
        this.player.vy = 0;
        this.storyObjective = { title: 'A Estrada para Acordelot', text: 'Diante do Sr. Antony', progress: 1, target: 1, ready: true };
        this.onQuestsChange?.();
        this.onStoryBeat?.('antony_arrival');
      }
    }

    if (this.storyStage === 'entering_house') {
      const entering = this.storyActorMoves.some((move) => move.id === 'story_pippo' || move.id === 'story_mirella');
      if (!entering) {
        this.storyStage = 'rest_scene';
        this.onStoryBeat?.('house_entered');
      }
    }

    if (!this.storyControlLocked && this.storyStage === 'find_echoes' && this.storyEchoIds.size) {
      const nearEcho = [...this.storyEchoIds].some((id) => {
        const echo = this.enemies.find((enemy) => enemy.id === id && enemy.state !== 'dead');
        return !!echo && Math.hypot(echo.x - this.player.x, echo.y - this.player.y) < 74;
      });
      if (nearEcho) {
        this.storyStage = 'echo_scene';
        this.storyControlLocked = true;
        this.player.vx = 0;
        this.player.vy = 0;
        this.storyObjective = { title: 'Despertar sem Nome', text: 'Dó, Mi e Sol', progress: 1, target: 1, ready: true };
        this.onQuestsChange?.();
        this.onStoryBeat?.('three_echoes_found');
      }
    }

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

    if (this.companionVisible) {
      renderables.push({
        sortY: this.companion.y + 36,
        draw: () => this.drawCompanion(camX, camY),
      });
    }

    if (this.equippedPieces.aura) {
      renderables.push({
        sortY: this.player.y + 5,
        draw: () => this.drawAura(camX, camY),
      });
    }

    renderables.push({
      sortY: this.player.y + 30,
      draw: () => this.drawPlayer(camX, camY),
    });

    // Jogadores remotos (Multiplayer Online)
    for (const rp of this.remotePlayers.values()) {
      renderables.push({
        sortY: rp.y + 30,
        draw: () => this.drawRemotePlayer(rp, camX, camY),
      });
    }

    if (this.isToolHarvest) {
      renderables.push({
        sortY: this.player.y + 31,
        draw: () => this.drawHarvestTool(camX, camY),
      });
    } else {
      // arma flutuante (não durante coleta — a ferramenta assume o lugar).
      // Em repouso, de frente/lado fica ATRÁS do Akles (não tampa ele); de
      // costas (direção 'up', o jogador vê as costas dele) ela é o que fica
      // visível ali montada nas costas, então vai NA FRENTE. Golpeando,
      // sempre na frente pra dar pra ver o combo.
      const swinging = this.activeCharacter === 'akles' && (this.player.actionState === 'attack' || this.player.actionState === 'spin');
      const backVisible = this.player.direction === 'up';
      renderables.push({
        sortY: this.player.y + (swinging || backVisible ? 40 : 6),
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

    if (this.openingSoundTarget && !this.storyControlLocked) {
      const sx = Math.round(this.openingSoundTarget.x - camX);
      const sy = Math.round(this.openingSoundTarget.y - camY);
      const pulse = .65 + Math.sin(this.timeElapsed * 4) * .2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(167,139,250,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 11 + pulse * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(221,214,254,${pulse})`;
      ctx.font = 'bold 17px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♪', sx, sy + 5);
      ctx.restore();
    }

    // 3.42 Drops no chão (claves, fragmentos, madeira, pedra...)
    this.renderGroundDrops(ctx, camX, camY);

    // 3.45 VFX de combate: a animação vem das folhas progressivas 4x4.
    const drawVfxFrame = (sheet: keyof LoadedAssets, frame: number, x: number, y: number, w: number, h: number, angle = 0) => {
      const img = this.assets?.[sheet];
      if (!img?.complete || !img.naturalWidth) return;
      const cw = img.naturalWidth / 4, ch = img.naturalHeight / 4;
      const f = Math.max(0, Math.min(15, frame));
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.translate(Math.round(x - camX), Math.round(y - camY));
      ctx.rotate(angle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(img, (f % 4) * cw, Math.floor(f / 4) * ch, cw, ch, -w / 2, -h / 2, w, h);
      ctx.restore();
    };

    if (this.skillAimPreview) {
      const a = this.skillAimPreview;
      const ox = this.player.x + 12 - camX, oy = this.player.y + 14 - camY;
      const range = a.slot === 1 ? 190 : a.slot === 2 ? 260 : 330;
      ctx.save();
      ctx.strokeStyle = a.slot === 0 ? 'rgba(96,220,255,.9)' : a.slot === 1 ? 'rgba(216,120,255,.9)' : 'rgba(255,215,90,.9)';
      ctx.fillStyle = 'rgba(120,210,255,.11)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + a.dx * range * a.power, oy + a.dy * range * a.power); ctx.stroke();
      ctx.beginPath(); ctx.arc(ox + a.dx * range * a.power, oy + a.dy * range * a.power, a.slot === 0 ? 13 : 46, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    for (const z of this.combatZones) {
      const frame = z.kind === 'winsChorus' ? Math.floor(z.life * 12) % 16 : Math.floor(z.life / z.duration * 16);
      drawVfxFrame(z.kind === 'winsChorus' ? 'vfxWinsChorus' : 'vfxHuansRain', frame, z.x, z.y, z.radius * 2.6, z.radius * 2.1);
    }
    for (const b of this.lightBeams) {
      const ang = Math.atan2(b.vy, b.vx);
      const frame = Math.floor(Math.min(.999, b.life / b.maxLife) * 16);
      const sheet = b.kind?.startsWith('wins') ? 'vfxWinsNote' : b.kind?.startsWith('huans') ? 'vfxHuansArrow' : 'vfxAklesCannon';
      const scale = b.kind === 'aklesPulse' ? 1 : b.kind?.endsWith('Basic') ? .55 : .78;
      drawVfxFrame(sheet, frame, b.x, b.y, 190 * scale, 95 * scale, ang);
    }
    for (const fx of this.spriteVfx) {
      drawVfxFrame(fx.sheet, Math.floor(Math.min(.999, fx.life / fx.duration) * 16), fx.x, fx.y, fx.width, fx.height, fx.angle);
    }

    // 3.5 Chuva (atrás do shader de luz)
    this.renderRain(ctx);

    // 4. Lighting Shader Pass
    this.renderLightingShader(ctx, camX, camY);

    // Marcas e debuffs são HUD de combate: desenhados depois da iluminação
    // para continuarem legíveis durante noite, chuva e efeitos de Skills.
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      const count = this.activeCharacter === 'wins' ? (e.vocalNotes ?? 0) : this.activeCharacter === 'huans' ? (e.preyMarks ?? 0) : 0;
      if (count <= 0 && !(e.resonantT && e.resonantT > 0)) continue;
      const ex = Math.round(e.x + 8 - camX), ey = Math.round(e.y - 30 - camY);
      ctx.save(); ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const badgeW = Math.max(36, count * 12 + 10);
      ctx.fillStyle = 'rgba(2,6,23,.9)'; ctx.beginPath(); ctx.roundRect(ex - badgeW / 2, ey - 8, badgeW, 16, 7); ctx.fill();
      for (let n = 0; n < count; n++) {
        const mx = ex + (n - (count - 1) / 2) * 11;
        ctx.fillStyle = this.activeCharacter === 'wins' ? '#d946ef' : '#fbbf24'; ctx.beginPath(); ctx.arc(mx, ey, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(this.activeCharacter === 'wins' ? '♪' : '•', mx, ey);
      }
      if (this.activeCharacter === 'wins' && (e.resonantT ?? 0) > 0) { ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#f0abfc'; ctx.fillText(`RESSONANTE +${8 + (this.getAnyPassiveLevel('winsRessonanciaVocal') - 1)}%`, ex, ey + 13); }
      else if (this.activeCharacter === 'huans' && count >= 5) { ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#fde68a'; ctx.fillText(`PRESA +${8 + (this.getAnyPassiveLevel('huansInstinto') - 1)}% CRIT`, ex, ey + 13); }
      ctx.restore();
    }

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
        accent = '#fbbf24';
      } else if (b.who === 'remotePlayer') {
        const rp = b.remotePlayerId ? this.remotePlayers.get(b.remotePlayerId) : null;
        if (!rp) continue;
        ax = rp.x + 12 - camX;
        ay = rp.y - 20 - camY;
        accent = '#38bdf8';
      } else if (b.who === 'enemy') {
        const enemy = b.enemyId ? this.enemies.find((candidate) => candidate.id === b.enemyId) : null;
        if (!enemy) continue;
        ax = enemy.x + 8 - camX;
        ay = enemy.y - 22 - camY;
        accent = '#a7f3d0';
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
      if (b.playerName && (b.who === 'akles' || b.who === 'remotePlayer')) {
        lines.push(b.playerName + ':');
      }
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
    const ragingBoss = !!def.boss && e.hp <= e.maxHp * .5;
    let sheetKey = def.sheet;
    if (def.boss) {
      const prefix = ragingBoss ? 'bossOrganRage' : 'bossOrgan';
      const action = e.state === 'attack' ? (e.bossAttackMode === 'cast' ? 'Cast' : 'Attack') : (e.state === 'walk' || e.state === 'chase' ? 'Walk' : 'Idle');
      sheetKey = `${prefix}${action}` as keyof LoadedAssets;
    }
    const sheet = this.assets?.[sheetKey] as HTMLImageElement | undefined;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const cx = Math.round(e.x - camX);
    const cy = Math.round(e.y - camY);
    const dispW = def.cw * def.disp;
    const dispH = def.ch * def.disp;
    const bossDirRow: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
    const row = def.boss ? bossDirRow[e.direction ?? 'down'] : ((ENEMY_ROW as Record<string, number>)[e.state] ?? 0);
    const col = Math.min(def.cols - 1, Math.max(0, e.frame));

    if (e.state !== 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx + 8, cy + 3, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const dx = Math.round(cx + 8 - dispW / 2);
    const dy = Math.round(def.boss ? cy - dispH + 22 : cy - dispH * ((def.ch - 3) / def.ch) + 6);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ragingBoss) {
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 20 + Math.sin(this.timeElapsed * 5) * 6;
    }
    if (e.hurtFlash > 0) ctx.filter = 'brightness(2.4) saturate(0.4)';
    if (e.state === 'dead') ctx.globalAlpha = Math.max(0, 1 - e.stateTimer / 0.8);
    if (e.facingLeft && !def.boss) {
      ctx.translate(dx + dispW, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, col * def.cw, row * def.ch, def.cw, def.ch, 0, 0, dispW, dispH);
    } else {
      ctx.drawImage(sheet, col * def.cw, row * def.ch, def.cw, def.ch, dx, dy, dispW, dispH);
    }
    ctx.restore();

    // barra de vida + nível (nível sempre visível nos monstros hostis)
    if (e.hostile && e.state !== 'dead') {
      const bw = def.boss ? 104 : 26;
      const bx = cx + 8 - bw / 2;
      const by = dy - 4;
      const hpFrac = Math.max(0, e.hp / e.maxHp);

      // etiqueta de nível acima da barra
      const lvlText = def.boss ? `${def.name} · Lv ${e.level}${ragingBoss ? ' · FÚRIA' : ''}` : `Lv ${e.level}`;
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
        ctx.fillStyle = ragingBoss ? '#d946ef' : '#f43f5e';
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

    if (npc.spriteType === 'guard' && this.assets?.knightIdle && this.assets?.knightWalk) {
      const sheet = npc.isMoving ? this.assets.knightWalk : this.assets.knightIdle;
      const fw = 40, fh = 48;
      const row = AKLES_DIR_ROW[npc.direction];
      const col = npc.isMoving ? Math.floor(npc.stepTimer) % 4 : Math.floor(npc.stepTimer * .35) % 4;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx + npc.width / 2, cy + npc.height - 2, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(sheet, col * fw, row * fh, fw, fh, cx - 10, cy - 17, 48, 58);
      if (this.nearestNpcId === npc.id && !this.talkingNpcId) {
        const my = cy - 8 + Math.sin(this.timeElapsed * 5) * 2;
        ctx.fillStyle = npc.accent ?? '#60a5fa';
        ctx.beginPath(); ctx.arc(cx + npc.width / 2, my, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillText('E', cx + npc.width / 2, my + 3);
      }
      return;
    }

    if (npc.spriteType === 'lucian') {
      const walkSheet = this.assets?.npcLucianWalk;
      const idleSheet = this.assets?.npcLucianIdle;
      const sheet = npc.isMoving ? walkSheet : idleSheet;
      if (sheet && sheet.complete && sheet.naturalWidth > 0) {
        const fw = 128;
        const fh = 192;
        const cols = 8;
        const disp = 0.28;
        const dispW = fw * disp;
        const dispH = fh * disp;

        let row = 0;
        let flipH = false;
        if (npc.direction === 'down') row = 0;
        else if (npc.direction === 'up') row = 3;
        else if (npc.direction === 'right') row = 1;
        else if (npc.direction === 'left') {
          row = 1;
          flipH = true;
        }

        const col = npc.isMoving
          ? Math.floor(npc.stepTimer * (9 / 8)) % cols
          : Math.floor(this.timeElapsed * 4) % cols;

        const dx = Math.round(cx + npc.width / 2 - dispW / 2);
        const dy = Math.round(cy + npc.height - dispH * ((186 - 4) / fh));

        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(cx + npc.width / 2, cy + npc.height - 2, 11, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        if (flipH) {
          ctx.translate(dx + dispW, dy);
          ctx.scale(-1, 1);
          ctx.drawImage(sheet, col * fw, row * fh, fw, fh, 0, 0, Math.round(dispW), Math.round(dispH));
        } else {
          ctx.drawImage(sheet, col * fw, row * fh, fw, fh, dx, dy, Math.round(dispW), Math.round(dispH));
        }
        ctx.restore();

        if (this.nearestNpcId === npc.id && !this.talkingNpcId) {
          const my = cy - 6 + Math.sin(this.timeElapsed * 5) * 2;
          ctx.fillStyle = npc.accent ?? '#eab308';
          ctx.beginPath();
          ctx.arc(cx + npc.width / 2, my, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('E', cx + npc.width / 2, my + 3);
        }
        return;
      }
    }

    const sheetKey = NPC_SHEET[npc.spriteType];
    const sheet = sheetKey ? (this.assets?.[sheetKey] as HTMLImageElement | undefined) : undefined;
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const m = npc.spriteType === 'antony'
        ? { cw: sheet.naturalWidth / 10, ch: sheet.naturalHeight / 4, cols: 10, fps: 9 }
        : NPC_ANIM;
      const disp = npc.spriteType === 'antony' ? 0.3 : 0.44;
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
  // Aura Ressonante (único equipamento visual) — brilho + notas orbitando
  drawAura(camX: number, camY: number) {
    const auraKey = this.equippedPieces.aura;
    if (!auraKey) return;
    const entry = EQUIP_PIECE_INDEX[auraKey];
    if (!entry) return;
    // reaproveita a curva visual antiga (pensada pra níveis 0-5) mapeando o
    // aprimoramento 0-15 da peça pra essa mesma faixa.
    const lvl = Math.min(5, 1 + Math.floor(this.getPieceLevel(auraKey) / 3));
    const ctx = this.ctx;
    const color = entry.set.color;
    const cx = Math.round(this.player.x + 12 - camX);
    const cy = Math.round(this.player.y + 26 - camY);
    const t = this.timeElapsed;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // anel no chão
    const pulse = 0.6 + Math.sin(t * 2) * 0.2;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20 + lvl * 2);
    g.addColorStop(0, color + '55');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18 + lvl * 2, 8 + lvl, 0, 0, Math.PI * 2);
    ctx.fill();
    // notas orbitando (mais com nível maior)
    const n = 2 + lvl;
    for (let i = 0; i < n; i++) {
      const ang = t * 1.4 + (i * Math.PI * 2) / n;
      const rx = 20 + lvl * 1.5;
      const ry = 10 + lvl * 0.6;
      const ox = cx + Math.cos(ang) * rx;
      const oy = cy - 14 + Math.sin(ang) * ry - Math.abs(Math.sin(t * 2 + i)) * 6;
      ctx.globalAlpha = Math.min(1, 0.55 + 0.3 * pulse);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ox, oy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---- ARMA FLUTUANTE (sistema global) ----
  // Nunca faz parte das sheets do Akles. Posição/rotação/escala 100% por
  // código: repouso flutuando ao lado, combo de 4 golpes, ou Amplificação
  // (mesmo sprite, escala maior). Troca de arma == troca de config, zero
  // mudança de animação do personagem.
  drawWeapon(camX: number, camY: number) {
    const ctx = this.ctx;
    const def = this.weaponDef;
    const isProcedural = !!def.procedural;
    const energized = this.resonanceActive && def.spriteEnergizedAsset;
    const assetKey = (energized ? def.spriteEnergizedAsset : def.spriteAsset) as keyof LoadedAssets;
    const img = this.assets?.[assetKey] as HTMLImageElement | undefined;
    if (!isProcedural && (!img || !img.complete || !img.naturalWidth)) return;

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

    if (act === 'attack' && this.activeCharacter === 'akles') {
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
    } else if (act === 'spin' && this.activeCharacter === 'akles') {
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
      // direção que ele encara (nem de frente ela aparece na mão). Lâmina
      // apontando pra baixo (ângulo 90° = ponta pra baixo neste espaço).
      angleDeg = 95;
      scaleMul = 1;
      const bob = Math.sin(this.timeElapsed * v.floatSpeed) * v.floatAmplitude;
      wx = Math.round(px + v.restOffset.x - camX);
      wy = Math.round(py + v.restOffset.y + bob - camY);
    }

    // v.scale = altura alvo em px (não multiplicador!) — normaliza o
    // tamanho na tela mesmo entre sprites de fontes com resoluções bem
    // diferentes (ex.: 125x420 vs 474x783). Largura segue a proporção.
    const aspect = isProcedural ? 0.16 : (img!.naturalWidth || 100) / (img!.naturalHeight || 300);
    const classSizeMul = this.activeCharacter === 'wins' ? 1.35 : this.activeCharacter === 'huans' ? 1.45 : 1;
    const dispH = v.scale * scaleMul * classSizeMul;
    const dispW = dispH * aspect;
    const rad = (angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(rad + Math.PI / 2 + (spinDeg * Math.PI) / 180);
    const rangedShotGlow = this.activeCharacter !== 'akles' && act === 'attack';
    if (rangedShotGlow) {
      const shotProgress = Math.min(1, Math.max(0, (this.player.actionTimer || 0) / AKLES_ANIM.attack.cols));
      const pulse = Math.max(0.25, Math.sin(shotProgress * Math.PI));
      const glowColor = this.activeCharacter === 'wins' ? 'rgba(192,132,252,0.95)' : 'rgba(250,204,21,0.95)';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pulse * 0.75;
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 16 + pulse * 16;
      ctx.beginPath();
      ctx.arc(0, -dispH * 0.18, Math.max(7, dispW * 0.8) * (0.8 + pulse * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (def.procedural === 'staff') {
      // cajado temporário: sem arte própria — cabo + orbe desenhados por
      // código. Mesma convenção de eixo local que a espada (local -Y aponta
      // pra baixo no mundo em repouso): o cabo "pendura" pra baixo a partir
      // do pivô — igual a espada flutuante — e a orbe fica pertinho do
      // pivô (não no chão/pés).
      const shaftLen = dispH * 0.78;
      const shaftW = Math.max(2, dispW * 0.22);
      const orbR = dispW * 0.48;
      ctx.fillStyle = '#8b5e34';
      ctx.fillRect(-shaftW / 2, -shaftLen, shaftW, shaftLen);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0, -shaftLen * 0.02, orbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = Math.max(1, orbR * 0.14);
      ctx.stroke();
      ctx.fillStyle = 'rgba(233,213,255,0.55)';
      ctx.beginPath();
      ctx.arc(0, -shaftLen * 0.02, orbR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.procedural === 'bow') {
      // arco temporário: sem arte própria — curva + corda desenhadas por
      // código. Mesma convenção: pendura pra baixo a partir do pivô, tucado
      // nas costas, sem tocar no chão.
      const bowLen = dispH * 0.75;
      const bowBulge = dispW * 0.55;
      ctx.strokeStyle = '#6b4226';
      ctx.lineWidth = Math.max(2, dispW * 0.16);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(bowBulge, -bowLen * 0.5, 0, -bowLen);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(229,231,235,0.8)';
      ctx.lineWidth = Math.max(1, dispW * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -bowLen);
      ctx.stroke();
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // desenha com o cabo (base) próximo ao pivô
      ctx.drawImage(img!, -dispW / 2, -dispH * 0.72, dispW, dispH);
      ctx.imageSmoothingEnabled = false;
    }

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

    // ---- Personagem animado (sprite sheets processadas) — Akles, Wins ou
    // Huans, conforme this.activeCharacter. Todos usam a mesma estrutura de
    // sheet (col*cw, linha*ch), só a tabela de meta/linhas por direção muda.
    const moveKey: 'idle' | 'walk' | 'run' = isMoving ? (this.heroRunning ? 'run' : 'walk') : 'idle';
    const aMeta = ANIM_BY_CHAR[this.activeCharacter][moveKey];
    const dirRowTable = DIR_ROW_BY_CHAR[this.activeCharacter];
    const aSheet = assets?.[aMeta.sheet] as HTMLImageElement | undefined;

    if (aSheet && aSheet.complete && aSheet.naturalWidth > 0) {
      const effCw = aMeta.cw;
      const effCh = aMeta.ch;

      const dispScale = aMeta.disp ?? AKLES_DISP_SCALE;
      const dispW = effCw * dispScale;
      const dispH = effCh * dispScale;
      // O centro de colisão fica acima da elipse de chão; +31 deixava as
      // botas visualmente separadas da sombra (mais evidente de perfil).
      const feetY = cy + 38;
      const feetFrac = aMeta.feetFrac ?? (effCh - 4) / effCh;

      const sheetRow = dirRowTable[char.direction];
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
        col * effCw + gutter,
        sheetRow * effCh + gutter,
        effCw - gutter * 2,
        effCh - gutter * 2,
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

  drawRemotePlayer(
    rp: {
      id: string;
      name: string;
      character: 'akles' | 'wins' | 'huans';
      x: number;
      y: number;
      direction: Direction;
      isMoving: boolean;
      stepTimer: number;
      actionState?: CharacterState['actionState'];
      actionTimer?: number;
    },
    camX: number,
    camY: number
  ) {
    const ctx = this.ctx;
    const cx = Math.round(rp.x - camX);
    const cy = Math.round(rp.y - camY);

    if (cx < -80 || cx > this.viewportW + 80 || cy < -80 || cy > this.viewportH + 80) return;

    // Drop shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 29, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const assets = this.assets;
    const charKey = (rp.character || 'akles') as PlayerCharacterKey;
    const moveKey: 'idle' | 'walk' | 'run' = rp.isMoving ? 'walk' : 'idle';
    const aMeta = ANIM_BY_CHAR[charKey]?.[moveKey] ?? ANIM_BY_CHAR['akles']['idle'];
    const dirRowTable = DIR_ROW_BY_CHAR[charKey] ?? DIR_ROW_BY_CHAR['akles'];
    const aSheet = assets?.[aMeta.sheet] as HTMLImageElement | undefined;

    const remoteActing = rp.actionState === 'attack' || rp.actionState === 'spin' || rp.actionState === 'cast';
    if (remoteActing) {
      const color = rp.character === 'wins' ? '#e879f9' : rp.character === 'huans' ? '#6ee7b7' : '#93c5fd';
      const radius = 16 + Math.sin(this.timeElapsed * 12) * 3;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 12, cy + 17, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (aSheet && aSheet.complete && aSheet.naturalWidth > 0) {
      const effCw = aMeta.cw;
      const effCh = aMeta.ch;
      const dispScale = aMeta.disp ?? AKLES_DISP_SCALE;
      const dispW = effCw * dispScale;
      const dispH = effCh * dispScale;
      const feetY = cy + 38;
      const feetFrac = aMeta.feetFrac ?? (effCh - 4) / effCh;
      const sheetRow = dirRowTable[rp.direction] ?? 0;
      const col = rp.isMoving
        ? Math.floor(rp.stepTimer * (aMeta.fps / 8)) % aMeta.cols
        : Math.floor(this.timeElapsed * aMeta.fps) % aMeta.cols;

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        aSheet,
        col * effCw + 1,
        sheetRow * effCh + 1,
        effCw - 2,
        effCh - 2,
        Math.round(cx + 12 - dispW / 2),
        Math.round(feetY - dispH * feetFrac),
        Math.round(dispW),
        Math.round(dispH)
      );
      ctx.imageSmoothingEnabled = false;
    } else {
      const sheet = this.heroSprites.hero;
      const fallbackDirRowMap: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };
      const fallbackRow = fallbackDirRowMap[rp.direction] ?? 0;
      ctx.drawImage(sheet, 0, fallbackRow * 28, 20, 28, cx, cy, 24, 32);
    }

    // Placa do nome sobre a cabeça do jogador
    ctx.save();
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(rp.name).width;
    const tagY = cy - 4;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cx + 12 - textW / 2 - 4, tagY - 6, textW + 8, 12, 3);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(rp.name, cx + 12, tagY);
    ctx.restore();
  }
}

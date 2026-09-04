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
} from './types';
import {
  buildMap,
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from './mapData';
import { loadGameAssets, LoadedAssets } from './assetLoader';
import { generateCharacterSprites, generateTrees, generateHouses } from './pixelArt';
import initialCustomMap from './customMapLayout.json';

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
}

const AKLES_ANIM: Record<'idle' | 'walk' | 'run' | AklesAction, AklesAnimMeta> = {
  idle: { sheet: 'aklesIdle', cw: 64, ch: 88, cols: 6, fps: 6, loop: true },
  walk: { sheet: 'aklesWalk', cw: 64, ch: 80, cols: 8, fps: 11, loop: true },
  run: { sheet: 'aklesRun', cw: 64, ch: 80, cols: 8, fps: 15, loop: true },
  chop: { sheet: 'aklesSlash', cw: 96, ch: 96, cols: 6, fps: 13, loop: false },
  mine: { sheet: 'aklesThrust', cw: 96, ch: 96, cols: 6, fps: 13, loop: false },
  attack: { sheet: 'aklesSlash', cw: 96, ch: 96, cols: 6, fps: 15, loop: false },
  spin: { sheet: 'aklesSpin', cw: 96, ch: 96, cols: 6, fps: 13, loop: false },
  cast: { sheet: 'aklesCast', cw: 128, ch: 96, cols: 6, fps: 11, loop: false },
};

// Linhas canônicas das folhas: 0=down, 1=left, 2=up, 3=right
const AKLES_DIR_ROW: Record<Direction, number> = { down: 0, left: 1, up: 2, right: 3 };

// ---- RECURSOS COLETÁVEIS (árvores e pedras) ----
export interface ItemMeta {
  name: string;
  icon: string;
}
export const ITEM_META: Record<string, ItemMeta> = {
  wood: { name: 'Madeira', icon: '🪵' },
  stone: { name: 'Pedra', icon: '🪨' },
  ore: { name: 'Minério', icon: '⛏️' },
  fiber: { name: 'Fibra', icon: '🌿' },
};

interface HarvestDef {
  kind: 'tree' | 'rock';
  maxHp: number;
  drop: string;
  dropMin: number;
  dropMax: number;
  respawnSecs: number;
}
export const HARVEST_DEFS: Record<string, HarvestDef> = {
  oak: { kind: 'tree', maxHp: 4, drop: 'wood', dropMin: 2, dropMax: 4, respawnSecs: 22 },
  pine: { kind: 'tree', maxHp: 3, drop: 'wood', dropMin: 2, dropMax: 3, respawnSecs: 20 },
  blossomTree: { kind: 'tree', maxHp: 3, drop: 'wood', dropMin: 2, dropMax: 3, respawnSecs: 24 },
  bush: { kind: 'tree', maxHp: 2, drop: 'fiber', dropMin: 1, dropMax: 2, respawnSecs: 14 },
  stoneQuarry: { kind: 'rock', maxHp: 8, drop: 'ore', dropMin: 4, dropMax: 7, respawnSecs: 45 },
  limestoneBoulders: { kind: 'rock', maxHp: 5, drop: 'stone', dropMin: 3, dropMax: 5, respawnSecs: 32 },
  rockCluster: { kind: 'rock', maxHp: 3, drop: 'stone', dropMin: 2, dropMax: 3, respawnSecs: 24 },
  rockPair: { kind: 'rock', maxHp: 3, drop: 'stone', dropMin: 2, dropMax: 3, respawnSecs: 24 },
  rockMonolith: { kind: 'rock', maxHp: 4, drop: 'stone', dropMin: 2, dropMax: 4, respawnSecs: 28 },
  rockFlatSlab: { kind: 'rock', maxHp: 2, drop: 'stone', dropMin: 1, dropMax: 2, respawnSecs: 18 },
};

export interface InteractionState {
  nearMerchant: boolean;
  isTalking: boolean;
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
};

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  lightCanvas: HTMLCanvasElement;
  lightCtx: CanvasRenderingContext2D;

  timeOfDay: TimeOfDay = 'day';

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
  onInteractionChange?: (state: InteractionState) => void;

  // Inventário / coleta de recursos
  inventory: Record<string, number> = {};
  onInventoryChange?: (inv: Record<string, number>) => void;
  onHarvestPopup?: (text: string, worldX: number, worldY: number) => void;
  private actionHitDone = false;

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

  isEditMode: boolean = false;
  selectedPropId: string | null = null;
  hoveredPropId: string | null = null;
  isDragging: boolean = false;
  dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  propScales: Record<string, number> = {};

  onSelectedPropChange?: (prop: SelectedPropInfo | null) => void;
  onMapSaveNotification?: () => void;

  isRunning: boolean = false;
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
    this.initHarvestables();

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

    // Spawn 24 butterflies
    const butterflyColors = ['#38bdf8', '#f59e0b', '#f43f5e', '#4ade80', '#c084fc', '#f1f5f9'];
    for (let i = 0; i < 24; i++) {
      const bx = (10 + Math.random() * 52) * TILE_SIZE;
      const by = (8 + Math.random() * 38) * TILE_SIZE;
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

    // Spawn 20 fireflies
    for (let i = 0; i < 20; i++) {
      const fx = (12 + Math.random() * 48) * TILE_SIZE;
      const fy = (10 + Math.random() * 34) * TILE_SIZE;
      this.fireflies.push({
        x: fx,
        y: fy,
        baseX: fx,
        baseY: fy,
        color: i % 2 === 0 ? '#fde047' : '#a3e635',
        phase: Math.random() * Math.PI * 2,
        speed: 0.9 + Math.random() * 0.7,
        radius: 20 + Math.random() * 30,
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
  }

  unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

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

    // Delete selected prop in editor
    if (this.isEditMode && (e.code === 'Delete' || e.code === 'Backspace')) {
      if (this.selectedPropId) {
        this.deleteProp(this.selectedPropId);
        return;
      }
    }

    // Duplicate selected prop with 'D' in editor
    if (this.isEditMode && (e.code === 'KeyD' || (e.ctrlKey && e.code === 'KeyD'))) {
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

  setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
  }

  setViewportSize(w: number, h: number) {
    this.baseViewportW = w;
    this.baseViewportH = h;
    this.updateViewportDimensions();
  }

  setCameraZoom(zoom: number) {
    this.cameraZoom = Math.max(0.4, Math.min(2.5, Math.round(zoom * 100) / 100));
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

  updateViewportDimensions() {
    this.viewportW = Math.round(this.baseViewportW / this.cameraZoom);
    this.viewportH = Math.round(this.baseViewportH / this.cameraZoom);
    this.canvas.width = this.viewportW;
    this.canvas.height = this.viewportH;
    this.ctx.imageSmoothingEnabled = false;

    this.lightCanvas.width = this.viewportW;
    this.lightCanvas.height = this.viewportH;
  }

  handleInteract() {
    if (this.isNearMerchant) {
      this.isTalkingToMerchant = !this.isTalkingToMerchant;
      const merchant = this.npcs.find((n) => n.spriteType === 'merchant');
      if (this.onInteractionChange) {
        this.onInteractionChange({
          nearMerchant: true,
          isTalking: this.isTalkingToMerchant,
          merchantName: merchant?.name,
          merchantTitle: merchant?.title,
          dialogue: merchant?.dialogue,
        });
      }
    }
  }

  // Drag logic for Map Editor
  getWorldPosFromEvent(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
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
      this.selectedPropId = hitProp.id;
      this.isDragging = true;
      this.dragOffset = {
        x: worldPos.x - hitProp.x,
        y: worldPos.y - hitProp.y,
      };
      this.canvas.style.cursor = 'grabbing';
      if (this.onSelectedPropChange) {
        this.onSelectedPropChange(this.getSelectedPropInfo(hitProp.id));
      }
    } else {
      this.selectedPropId = null;
      if (this.onSelectedPropChange) {
        this.onSelectedPropChange(null);
      }
    }
  };

  onMouseMove = (e: MouseEvent) => {
    if (!this.isEditMode) return;
    const worldPos = this.getWorldPosFromEvent(e);
    if (!worldPos) return;

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
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
      this.saveMapToStorage();
    }
  };

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

  saveMapToStorage() {
    try {
      const savedProps = this.props
        .filter((p) => EDITABLE_PROP_METAS[p.type])
        .map((p) => ({
          id: p.id,
          type: p.type,
          x: p.x,
          y: p.y,
          scale: this.propScales[p.id] || 1.0,
        }));

      // 1. Instant local persistence
      localStorage.setItem('vila_encantada_custom_map_v2', JSON.stringify(savedProps));

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
      const data = localStorage.getItem('vila_encantada_custom_map_v2');
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

      for (const item of parsed) {
        const meta = EDITABLE_PROP_METAS[item.type];
        if (!meta) continue;

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

      this.props = rebuiltProps;
    } catch (err) {
      console.warn('Failed to load custom map from storage:', err);
    }
  }

  resetMapToDefault() {
    try {
      localStorage.removeItem('vila_encantada_custom_map_v2');
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
    this.initHarvestables();
    this.selectProp(null);
    this.saveMapToStorage();
  }

  // ---- COLETA DE RECURSOS ----
  initHarvestables() {
    for (const p of this.props) {
      const def = HARVEST_DEFS[p.type];
      if (!def) continue;
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
  }

  addToInventory(item: string, qty: number) {
    if (qty <= 0) return;
    this.inventory[item] = (this.inventory[item] || 0) + qty;
    this.onInventoryChange?.({ ...this.inventory });
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

    // ganho parcial por golpe
    this.addToInventory(h.drop, 1);

    if (h.hp <= 0) {
      const bonus =
        h.dropMin + Math.floor(Math.random() * (h.dropMax - h.dropMin + 1));
      this.addToInventory(h.drop, bonus);
      h.downUntil = this.timeElapsed + h.respawnSecs;
      h.hp = 0;
      // poeira/folhas da queda
      for (let i = 0; i < 14; i++) {
        if (h.kind === 'tree') this.addForestLeaf(ix + (Math.random() - 0.5) * 40, iy - Math.random() * 20);
        else this.addFootstepDust(ix + (Math.random() - 0.5) * 30, node.y + node.h - 6);
      }
      this.onHarvestPopup?.(`+${bonus + 1} ${ITEM_META[h.drop]?.name ?? h.drop}`, ix, node.y);
    } else {
      this.onHarvestPopup?.(`+1 ${ITEM_META[h.drop]?.name ?? h.drop}`, ix, node.y);
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
      this.player.actionTimer = (this.player.actionTimer || 0) + dt * meta.fps;
      this.player.frame = Math.min(meta.cols - 1, Math.floor(this.player.actionTimer));

      // Golpe conecta no frame de impacto (uma vez por ação)
      if (!this.actionHitDone && this.player.frame >= 2 && (act === 'chop' || act === 'mine')) {
        this.actionHitDone = true;
        this.applyHarvestHit();
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
      const speed = 125;

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

        this.player.stepTimer += dt * 8;
        this.player.frame = Math.floor(this.player.stepTimer) % 4;

        this.footstepTimer += dt;
        if (this.footstepTimer > 0.22) {
          this.footstepTimer = 0;
          this.addFootstepDust(this.player.x + 12, this.player.y + 28);
        }
      } else {
        this.player.isMoving = false;
        this.player.actionState = 'idle';
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.stepTimer += dt * 3.5;
        this.player.frame = Math.floor(this.player.stepTimer) % 4;
      }
    }

    this.moveCharacterWithCollision(this.player, dt);
    this.updateCompanion(dt);

    // Merchant interaction check
    const merchant = this.npcs.find((n) => n.spriteType === 'merchant');
    if (merchant) {
      const distToMerchant = Math.hypot(this.player.x - merchant.x, this.player.y - merchant.y);
      const wasNear = this.isNearMerchant;
      this.isNearMerchant = distToMerchant < 75;

      if (wasNear !== this.isNearMerchant && this.onInteractionChange) {
        this.onInteractionChange({
          nearMerchant: this.isNearMerchant,
          isTalking: this.isTalkingToMerchant,
          merchantName: merchant.name,
          merchantTitle: merchant.title,
          dialogue: merchant.dialogue,
        });
      }

      if (!this.isNearMerchant && this.isTalkingToMerchant) {
        this.isTalkingToMerchant = false;
        if (this.onInteractionChange) {
          this.onInteractionChange({ nearMerchant: false, isTalking: false });
        }
      }
    }

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

  checkSolidCollision(box: Rect): boolean {
    for (const solid of this.staticColliders) {
      if (
        box.x < solid.x + solid.w &&
        box.x + box.w > solid.x &&
        box.y < solid.y + solid.h &&
        box.y + box.h > solid.y
      ) {
        return true;
      }
    }

    for (const prop of this.props) {
      if (!prop.collider) continue;
      if (prop.harvest && prop.harvest.downUntil > 0) continue; // recurso derrubado = passável
      const solid = prop.collider;
      if (
        box.x < solid.x + solid.w &&
        box.x + box.w > solid.x &&
        box.y < solid.y + solid.h &&
        box.y + box.h > solid.y
      ) {
        return true;
      }
    }

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
      p.x += p.vx * dt;
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
        b.x += (dx / dist) * b.speed * dt;
        b.y += (dy / dist) * b.speed * dt + Math.sin(this.timeElapsed * 6) * 0.5;
      }
    }
  }

  updateFireflies(dt: number) {
    for (const f of this.fireflies) {
      f.phase += dt * f.speed;
      f.x = f.baseX + Math.cos(f.phase) * f.radius;
      f.y = f.baseY + Math.sin(f.phase * 1.5) * (f.radius * 0.6);
    }
  }

  render() {
    const ctx = this.ctx;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);

    ctx.fillStyle = '#1e4827';
    ctx.fillRect(0, 0, this.viewportW, this.viewportH);

    const terrainImg = this.assets?.terrain;

    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(MAP_COLS - 1, Math.ceil((camX + this.viewportW) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camY + this.viewportH) / TILE_SIZE));

    // 1. Ground Tiles
    if (terrainImg && terrainImg.complete && terrainImg.naturalWidth > 0) {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const tileId = this.ground[r][c];
          const sx = (tileId % 36) * 32;
          const sy = Math.floor(tileId / 36) * 32;
          const screenX = c * TILE_SIZE - camX;
          const screenY = r * TILE_SIZE - camY;

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

    renderables.push({
      sortY: this.companion.y + 36,
      draw: () => this.drawCompanion(camX, camY),
    });

    renderables.push({
      sortY: this.player.y + 30,
      draw: () => this.drawPlayer(camX, camY),
    });

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

    for (const f of this.fireflies) {
      const fx = Math.round(f.x - camX);
      const fy = Math.round(f.y - camY);
      if (fx < -15 || fx > this.viewportW + 15 || fy < -15 || fy > this.viewportH + 15) continue;

      const glow = 0.5 + Math.sin(f.phase * 3.5) * 0.4;
      ctx.fillStyle =
        f.color === '#fde047'
          ? `rgba(253, 224, 71, ${glow * 0.35})`
          : `rgba(163, 230, 53, ${glow * 0.35})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // 6. Editor Gizmos
    if (this.isEditMode) {
      this.renderEditorGizmos(ctx, camX, camY);
    }
  }

  renderLightingShader(mainCtx: CanvasRenderingContext2D, camX: number, camY: number) {
    if (this.timeOfDay === 'day') {
      mainCtx.fillStyle = 'rgba(255, 245, 200, 0.025)';
      mainCtx.fillRect(0, 0, this.viewportW, this.viewportH);
      return;
    }

    const lCtx = this.lightCtx;
    const w = this.viewportW;
    const h = this.viewportH;

    lCtx.clearRect(0, 0, w, h);

    if (this.timeOfDay === 'sunset') {
      mainCtx.fillStyle = 'rgba(217, 119, 6, 0.2)';
      mainCtx.fillRect(0, 0, w, h);

      mainCtx.fillStyle = 'rgba(88, 28, 135, 0.08)';
      mainCtx.fillRect(0, 0, w, h);

      mainCtx.save();
      mainCtx.globalCompositeOperation = 'lighter';
      for (const prop of this.props) {
        if (prop.type === 'streetLantern') {
          const lampX = Math.round(prop.x + prop.w * 0.49 - camX);
          const lampY = Math.round(prop.y + prop.h * 0.24 - camY);
          if (lampX < -100 || lampX > w + 100 || lampY < -100 || lampY > h + 100) continue;

          const grad = mainCtx.createRadialGradient(lampX, lampY, 2, lampX, lampY, 65);
          grad.addColorStop(0, 'rgba(254, 240, 138, 0.6)');
          grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.25)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          mainCtx.fillStyle = grad;
          mainCtx.beginPath();
          mainCtx.arc(lampX, lampY, 65, 0, Math.PI * 2);
          mainCtx.fill();
        }
      }
      mainCtx.restore();
      return;
    }

    // NIGHT MODE
    lCtx.fillStyle = 'rgba(7, 13, 29, 0.90)';
    lCtx.fillRect(0, 0, w, h);

    lCtx.save();
    lCtx.globalCompositeOperation = 'destination-out';

    // A. Street Lanterns Lights
    for (const prop of this.props) {
      if (prop.type === 'streetLantern') {
        const lampX = Math.round(prop.x + prop.w * 0.49 - camX);
        const lampY = Math.round(prop.y + prop.h * 0.24 - camY);

        if (lampX < -150 || lampX > w + 150 || lampY < -150 || lampY > h + 150) continue;

        const flicker = Math.sin(this.timeElapsed * 7 + prop.x) * 4;
        const radius = Math.max(30, Math.round(115 + flicker));

        const lightGrad = lCtx.createRadialGradient(lampX, lampY, 2, lampX, lampY, radius);
        lightGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        lightGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.85)');
        lightGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        lCtx.fillStyle = lightGrad;
        lCtx.beginPath();
        lCtx.arc(lampX, lampY, radius, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // B. Warm Interior House Windows Lights
    for (const prop of this.props) {
      if (
        prop.type.startsWith('townHall') ||
        prop.type.startsWith('bakery') ||
        prop.type.startsWith('bldg') ||
        prop.type === 'blacksmithFront' ||
        prop.type === 'residentialFront'
      ) {
        const winX = Math.round(prop.x + prop.w * 0.5 - camX);
        const winY = Math.round(prop.y + prop.h * 0.65 - camY);
        if (winX < -150 || winX > w + 150 || winY < -150 || winY > h + 150) continue;

        const grad = lCtx.createRadialGradient(winX, winY, 4, winX, winY, 80);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = grad;
        lCtx.beginPath();
        lCtx.arc(winX, winY, 80, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // C. Sacred Ancient Fountain / Shrine Aura
    const shrineX = Math.round(36 * TILE_SIZE - camX);
    const shrineY = Math.round(23 * TILE_SIZE - camY);
    if (shrineX > -180 && shrineX < w + 180 && shrineY > -180 && shrineY < h + 180) {
      const shrineGrad = lCtx.createRadialGradient(shrineX, shrineY, 10, shrineX, shrineY, 130);
      shrineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      shrineGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
      shrineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = shrineGrad;
      lCtx.beginPath();
      lCtx.arc(shrineX, shrineY, 130, 0, Math.PI * 2);
      lCtx.fill();
    }

    // D. Hero & Companion Light Aura
    const heroX = Math.round(this.player.x + 12 - camX);
    const heroY = Math.round(this.player.y + 16 - camY);
    const heroGrad = lCtx.createRadialGradient(heroX, heroY, 4, heroX, heroY, 70);
    heroGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    heroGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
    heroGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lCtx.fillStyle = heroGrad;
    lCtx.beginPath();
    lCtx.arc(heroX, heroY, 70, 0, Math.PI * 2);
    lCtx.fill();

    // E. Fireflies Glow Cutouts
    for (const f of this.fireflies) {
      const fx = Math.round(f.x - camX);
      const fy = Math.round(f.y - camY);
      if (fx < -20 || fx > w + 20 || fy < -20 || fy > h + 20) continue;

      const fGrad = lCtx.createRadialGradient(fx, fy, 1, fx, fy, 18);
      fGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
      fGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = fGrad;
      lCtx.beginPath();
      lCtx.arc(fx, fy, 18, 0, Math.PI * 2);
      lCtx.fill();
    }

    lCtx.restore();

    mainCtx.drawImage(this.lightCanvas, 0, 0);

    mainCtx.save();
    mainCtx.globalCompositeOperation = 'lighter';

    // Golden Halo on Lantern Bulbs
    for (const prop of this.props) {
      if (prop.type === 'streetLantern') {
        const lampX = Math.round(prop.x + prop.w * 0.49 - camX);
        const lampY = Math.round(prop.y + prop.h * 0.24 - camY);
        if (lampX < -150 || lampX > w + 150 || lampY < -150 || lampY > h + 150) continue;

        const flicker = Math.sin(this.timeElapsed * 7 + prop.x) * 0.05;

        mainCtx.fillStyle = `rgba(255, 255, 220, ${0.9 + flicker})`;
        mainCtx.beginPath();
        mainCtx.arc(lampX, lampY, 3, 0, Math.PI * 2);
        mainCtx.fill();

        const flare = mainCtx.createRadialGradient(lampX, lampY, 2, lampX, lampY, 70);
        flare.addColorStop(0, `rgba(254, 240, 138, ${0.55 + flicker})`);
        flare.addColorStop(0.35, `rgba(245, 158, 11, ${0.28 + flicker})`);
        flare.addColorStop(0.7, 'rgba(217, 119, 6, 0.08)');
        flare.addColorStop(1, 'rgba(217, 119, 6, 0)');

        mainCtx.fillStyle = flare;
        mainCtx.beginPath();
        mainCtx.arc(lampX, lampY, 70, 0, Math.PI * 2);
        mainCtx.fill();
      }
    }

    // Celestial Cyan Glow at Shrine
    if (shrineX > -180 && shrineX < w + 180 && shrineY > -180 && shrineY < h + 180) {
      const shrineCyan = mainCtx.createRadialGradient(shrineX, shrineY, 4, shrineX, shrineY, 90);
      shrineCyan.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      shrineCyan.addColorStop(0.5, 'rgba(14, 165, 233, 0.18)');
      shrineCyan.addColorStop(1, 'rgba(14, 165, 233, 0)');
      mainCtx.fillStyle = shrineCyan;
      mainCtx.beginPath();
      mainCtx.arc(shrineX, shrineY, 90, 0, Math.PI * 2);
      mainCtx.fill();
    }

    // Cool Moonlight Wash
    const moonGrad = mainCtx.createLinearGradient(0, 0, 0, h);
    moonGrad.addColorStop(0, 'rgba(56, 189, 248, 0.06)');
    moonGrad.addColorStop(1, 'rgba(30, 58, 138, 0.02)');
    mainCtx.fillStyle = moonGrad;
    mainCtx.fillRect(0, 0, w, h);

    mainCtx.restore();
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
      if (hv.kind === 'tree') {
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
    const isAction =
      act === 'chop' || act === 'mine' || act === 'attack' || act === 'spin' || act === 'cast';
    const isMoving = char.isMoving;

    // ---- Akles: herói cavaleiro animado (sprite sheets processadas) ----
    const aklesKey: 'idle' | 'walk' | AklesAction =
      isAction ? (act as AklesAction) : isMoving ? 'walk' : 'idle';
    const aMeta = AKLES_ANIM[aklesKey];
    const aSheet = assets?.[aMeta.sheet] as HTMLImageElement | undefined;

    if (aSheet && aSheet.complete && aSheet.naturalWidth > 0) {
      const dispScale = 0.7;
      const dispW = aMeta.cw * dispScale;
      const dispH = aMeta.ch * dispScale;
      const feetY = cy + 30;
      const feetFrac = (aMeta.ch - 4) / aMeta.ch;

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

      ctx.drawImage(
        aSheet,
        col * aMeta.cw,
        sheetRow * aMeta.ch,
        aMeta.cw,
        aMeta.ch,
        Math.round(cx + 12 - dispW / 2),
        Math.round(feetY - dispH * feetFrac),
        Math.round(dispW),
        Math.round(dispH)
      );
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

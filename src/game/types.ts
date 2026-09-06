export type Direction = 'down' | 'up' | 'left' | 'right';

// Tiers das ferramentas de coleta (machado / picareta)
export type ToolTier = 'wood' | 'gold' | 'crystal';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CharacterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: Direction;
  frame: number;
  isMoving: boolean;
  stepTimer: number;
  width: number;
  height: number;
  actionState?: 'idle' | 'walk' | 'run' | 'chop' | 'mine' | 'attack' | 'spin' | 'cast';
  actionTimer?: number;
  // Collision box relative to x, y
  collider: {
    offsetX: number;
    offsetY: number;
    w: number;
    h: number;
  };
}

export type NpcSprite =
  | 'merchant'
  | 'guard'
  | 'cadencia'
  | 'tonico'
  | 'setimo'
  | 'seminima'
  | 'diapasao'
  | 'antony'
  | 'lucian';

export interface NPC extends CharacterState {
  id: string;
  name: string;
  title?: string;
  spriteType: NpcSprite;
  accent?: string; // cor de destaque do balão de diálogo
  homeX: number;
  homeY: number;
  patrolRadius: number;
  wanderTimer: number;
  idleTimer: number;
  wanderTarget: Point | null;
  speed: number;
  dialogue?: string[];
  // falas curtas aleatórias quando o Akles se aproxima
  barks?: string[];
  isMerchant?: boolean;
  // rota de patrulha (waypoints em px de mundo)
  route?: Point[];
  routeIdx?: number;
  routePause?: number;
}

export interface CompanionState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  frame: number;
  isMoving: boolean;
  stepTimer: number;
  targetX: number;
  targetY: number;
  facingLeft: boolean;
}

export interface WorldProp {
  id: string;
  x: number;
  y: number;
  type: string;
  w: number;
  h: number;
  // Anchor Y for depth sorting (base of prop)
  sortY: number;
  // Collider if solid
  collider?: Rect;
  // Custom texture crop coords from atlas if applicable
  crop?: { sx: number; sy: number; sw: number; sh: number };
  // Animation properties if animated
  animated?: {
    totalFrames: number;
    frameWidth: number;
    frameHeight: number;
    frameDuration: number; // ms
  };
  // Recurso coletável (árvore / pedra)
  harvest?: HarvestState;
  data?: any;
}

export interface HarvestState {
  kind: 'tree' | 'rock';
  hp: number;
  maxHp: number;
  drop: string;
  dropMin: number;
  dropMax: number;
  respawnSecs: number;
  downUntil: number; // 0 = de pé; senão, timeElapsed em que renasce
  hitFlash: number; // segundos restantes do flash de golpe
  shake: number; // segundos restantes de tremor
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface Enemy {
  id: string;
  kind: string;
  hostile: boolean;
  note?: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  level: number;
  dmgMul: number; // multiplicador de dano derivado do nível
  facingLeft: boolean;
  direction?: Direction;
  bossAttackMode?: 'melee' | 'cast';
  state: 'idle' | 'walk' | 'chase' | 'attack' | 'hurt' | 'dead';
  frame: number;
  animTimer: number;
  stateTimer: number;
  attackCd: number;
  hurtFlash: number;
  knockX: number;
  knockY: number;
  wanderTarget: Point | null;
  wanderTimer: number;
  respawnAt: number;
  hitBy: number; // timeElapsed do último golpe (evita multi-hit no mesmo swing)
  // Passivas de Akles: Impacto Harmônico (Amplificação) e Reverberação (Pulso)
  harmonicDebuffT?: number; // segundos restantes do debuff de "DEF" (mais dano recebido)
  harmonicDebuffPct?: number;
  reverbMarkHits?: number; // quantos dos próximos ataques básicos ganham bônus
  reverbMarkPct?: number;
  vocalNotes?: number;
  resonantT?: number;
  preyMarks?: number;
  preyLastHitAt?: number;
  slowT?: number;
  slowPct?: number;
  silenceT?: number;
}

export interface LightBeam {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  dmg: number;
  hitIds: string[];
  kind?: 'aklesPulse' | 'winsNote' | 'winsBasic' | 'huansArrow' | 'huansBasic';
  maxHits?: number;
  targetId?: string;
}

export interface Butterfly {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  wingAngle: number;
  speed: number;
}

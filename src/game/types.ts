export type Direction = 'down' | 'up' | 'left' | 'right';

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
  actionState?: 'idle' | 'walk' | 'chop' | 'mine';
  actionTimer?: number;
  // Collision box relative to x, y
  collider: {
    offsetX: number;
    offsetY: number;
    w: number;
    h: number;
  };
}

export interface NPC extends CharacterState {
  id: string;
  name: string;
  title?: string;
  spriteType: 'merchant' | 'elder' | 'baker' | 'villager' | 'gardener' | 'dog';
  homeX: number;
  homeY: number;
  patrolRadius: number;
  wanderTimer: number;
  idleTimer: number;
  wanderTarget: Point | null;
  speed: number;
  dialogue?: string[];
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
  data?: any;
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

export interface Butterfly {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  wingAngle: number;
  speed: number;
}

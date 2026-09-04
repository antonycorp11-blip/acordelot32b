// ============================================================================
// SISTEMA GLOBAL DE ARMA FLUTUANTE — modular, reutilizável por qualquer
// personagem. A arma é um objeto visual separado do personagem: nunca fica
// dentro das spritesheets. Todo movimento (posição/rotação/escala/trajetória)
// é feito por código a partir destes parâmetros configuráveis.
// ============================================================================

export type WeaponTier = 1 | 2 | 3 | 4 | 5;

export interface WeaponVisualCfg {
  // deslocamento de repouso (parado/andando), relativo ao personagem
  restOffset: { x: number; y: number };
  scale: number;
  restRotationDeg: number;
  zIndex?: number;
  floatAmplitude: number;
  floatSpeed: number;
  attackSpeed: number; // multiplicador de velocidade do swing
  returnSpeed: number; // 1/seg — quão rápido volta ao repouso
  followSmoothing: number; // 1/seg — suavização ao seguir o personagem
}

export interface WeaponDef {
  key: string;
  name: string;
  tier: WeaponTier;
  rarity: string;
  spriteAsset: string; // chave em LoadedAssets — sprite normal
  spriteEnergizedAsset?: string; // sprite p/ Ressonância ativa (se existir)
  baseAtk: number;
  atkPerLevel: number;
  maxLevel: number;
  visual: WeaponVisualCfg;
  // custo de material p/ subir do nível `level` -> `level+1`
  upgradeCost: (level: number) => Record<string, number>;
}

export const WEAPON_DEFS: Record<string, WeaponDef> = {
  acordelamina_t2: {
    key: 'acordelamina_t2',
    name: 'Acordelâmina T2',
    tier: 2,
    rarity: 'Incomum',
    spriteAsset: 'weaponAcordelaminaT2',
    spriteEnergizedAsset: 'weaponAcordelaminaT2Energized',
    baseAtk: 14,
    atkPerLevel: 3,
    maxLevel: 10,
    visual: {
      restOffset: { x: -2, y: -18 },
      scale: 0.12,
      restRotationDeg: -35,
      floatAmplitude: 2,
      floatSpeed: 1.7,
      attackSpeed: 1,
      returnSpeed: 7,
      followSmoothing: 9,
    },
    upgradeCost: (lvl) => ({
      gold_refined: 2 + lvl * 2,
      crystal_blue_refined: 1 + Math.floor(lvl * 1.4),
      gold_raw: 4 + lvl * 3,
      crystal_blue_raw: 3 + lvl * 2,
    }),
  },
};

// ---------------------------------------------------------------------------
// Trajetórias do combo de ataque básico (4 golpes). `p` = progresso 0..1 do
// golpe atual. Retorna ângulo (graus, 0 = direita, 90 = baixo — espaço de
// tela), alcance (distância do personagem) e multiplicador de escala.
// Cada golpe é visualmente diferente para passar sensação de combo.
// ---------------------------------------------------------------------------
export interface ComboFrame {
  angleDeg: number;
  reach: number;
  scaleMul: number;
  spinDeg?: number; // rotação extra do próprio sprite da arma (giro)
}

const REST_REACH = 16;

export function comboTrajectory(index: number, p: number, baseAngleDeg: number): ComboFrame {
  const t = Math.max(0, Math.min(1, p));
  switch (index % 4) {
    case 0: {
      // Golpe 1: corte horizontal (de trás pra frente)
      const sweep = -70 + t * 140; // -70..+70 relativo à direção
      const reach = REST_REACH + Math.sin(t * Math.PI) * 30;
      return { angleDeg: baseAngleDeg + sweep, reach, scaleMul: 1, spinDeg: 0 };
    }
    case 1: {
      // Golpe 2: corte horizontal no sentido contrário
      const sweep = 70 - t * 140;
      const reach = REST_REACH + Math.sin(t * Math.PI) * 32;
      return { angleDeg: baseAngleDeg + sweep, reach, scaleMul: 1.04, spinDeg: 0 };
    }
    case 2: {
      // Golpe 3: giro completo ao redor do personagem
      const sweep = t * 360;
      const reach = REST_REACH + 22;
      return { angleDeg: baseAngleDeg + sweep, reach, scaleMul: 1.05, spinDeg: sweep };
    }
    default: {
      // Golpe 4: finalizador — estocada longa pra frente com pulso de escala
      const reach = REST_REACH + Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.9) * 46;
      const scale = 1 + Math.sin(t * Math.PI) * 0.35;
      return { angleDeg: baseAngleDeg + (t < 0.5 ? -8 : 8), reach, scaleMul: scale, spinDeg: 0 };
    }
  }
}

// Skill 2 — Amplificação: a arma cresce muito e golpeia em área. Mesmo
// sprite, só a escala/alcance mudam via código.
export function amplifyTrajectory(p: number, baseAngleDeg: number): ComboFrame {
  const t = Math.max(0, Math.min(1, p));
  const grow = Math.sin(t * Math.PI); // 0 -> 1 -> 0
  return {
    angleDeg: baseAngleDeg + (t - 0.5) * 50,
    reach: REST_REACH + 20 + grow * 34,
    scaleMul: 1 + grow * 2.6,
    spinDeg: 0,
  };
}

export const DIR_ANGLE_DEG: Record<'left' | 'right' | 'up' | 'down', number> = {
  right: 0,
  down: 80,
  left: 180,
  up: -80,
};

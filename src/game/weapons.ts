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
  // ALTURA ALVO na tela em px (não é multiplicador do pixel nativo!) — cada
  // sprite de arma vem de fonte com resolução própria bem diferente (ex.:
  // Acordelâmina 125x420 vs Virtuose 474x783), então escalar por um fator
  // fixo faz cada arma aparecer num tamanho diferente. Fixando a altura,
  // toda arma ocupa o mesmo espaço visual, com a largura mantendo proporção.
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
  img: string; // caminho público pro ícone/arte grande (telas de UI)
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
    img: '/assets/weapons/acordelamina_t2.png',
    baseAtk: 14,
    atkPerLevel: 3,
    maxLevel: 10,
    visual: {
      restOffset: { x: -2, y: -18 },
      scale: 50,
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
// Catálogo da classe Teclas (Tier 1-5) — armas geradas por template. Todas
// usam a mesma arquitetura de arma flutuante acima; só escala/atk/custo
// variam por tier. Arte já vem cortada/limpa em public/assets/catalogo/armas.
// ---------------------------------------------------------------------------
const RARITY_BY_TIER: Record<WeaponTier, string> = {
  1: 'Comum',
  2: 'Incomum',
  3: 'Raro',
  4: 'Épico',
  5: 'Lendário',
};
const BASE_ATK_BY_TIER: Record<WeaponTier, number> = { 1: 8, 2: 14, 3: 22, 4: 32, 5: 45 };
const ATK_PER_LVL_BY_TIER: Record<WeaponTier, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
// altura alvo na tela (px), não multiplicador — ver comentário em WeaponVisualCfg
const SCALE_BY_TIER: Record<WeaponTier, number> = { 1: 42, 2: 50, 3: 58, 4: 66, 5: 76 };

function visualForTier(tier: WeaponTier): WeaponVisualCfg {
  return {
    restOffset: { x: -2, y: -18 },
    scale: SCALE_BY_TIER[tier],
    restRotationDeg: -35,
    floatAmplitude: 2,
    floatSpeed: 1.7,
    attackSpeed: 1,
    returnSpeed: 7,
    followSmoothing: 9,
  };
}

function makeWeapon(key: string, name: string, tier: WeaponTier, slug: string): WeaponDef {
  return {
    key,
    name,
    tier,
    rarity: RARITY_BY_TIER[tier],
    spriteAsset: `weapon_${slug}`,
    img: `/assets/catalogo/armas/${slug}.png`,
    baseAtk: BASE_ATK_BY_TIER[tier],
    atkPerLevel: ATK_PER_LVL_BY_TIER[tier],
    maxLevel: 10,
    visual: visualForTier(tier),
    upgradeCost: (lvl) => ({
      gold_refined: tier * (2 + lvl * 2),
      crystal_blue_refined: tier * (1 + Math.floor(lvl * 1.4)),
      gold_raw: tier * (4 + lvl * 3),
      crystal_blue_raw: tier * (3 + lvl * 2),
    }),
  };
}

const CATALOG_WEAPONS: [string, string, WeaponTier, string][] = [
  // T1
  ['tecla_de_carvalho', 'Tecla de Carvalho', 1, 'tecla_de_carvalho'],
  ['ferro_do_pianista', 'Ferro do Pianista', 1, 'ferro_do_pianista'],
  ['cravo_de_batalha', 'Cravo de Batalha', 1, 'cravo_de_batalha'],
  ['acordeonita', 'Acordeonita', 1, 'acordeonita'],
  // T2 (além da Acordelâmina T2 acima)
  ['cravo_azul', 'Cravo Azul', 2, 'cravo_azul'],
  ['teclado_resonante', 'Teclado Resonante', 2, 'teclado_resonante'],
  ['acordeon_de_aco', 'Acordeon de Aço', 2, 'acordeon_de_aco'],
  ['orgao_do_peregrino', 'Órgão do Peregrino', 2, 'orgao_do_peregrino'],
  // T3
  ['piano_de_cristal', 'Piano de Cristal', 3, 'piano_de_cristal'],
  ['cravo_real_de_acordelot', 'Cravo Real de Acordelot', 3, 'cravo_real_de_acordelot'],
  ['orgao_resonante_arma', 'Órgão Resonante', 3, 'orgao_resonante_arma'],
  ['celesta_lunar_arma', 'Celesta Lunar', 3, 'celesta_lunar_arma'],
  // T4
  ['piano_do_maestro', 'Piano do Maestro', 4, 'piano_do_maestro'],
  ['catedral_harmonica_arma', 'Catedral Harmônica', 4, 'catedral_harmonica_arma'],
  ['cravo_do_rei', 'Cravo do Rei', 4, 'cravo_do_rei'],
  ['concerto_de_cristal', 'Concerto de Cristal', 4, 'concerto_de_cristal'],
  // T5
  ['virtuose_arma', 'Virtuose', 5, 'virtuose_arma'],
  ['orgao_celestial', 'Órgão Celestial', 5, 'orgao_celestial'],
  ['requiem_do_cravo', 'Réquiem do Cravo', 5, 'requiem_do_cravo'],
];

for (const [key, name, tier, slug] of CATALOG_WEAPONS) {
  WEAPON_DEFS[key] = makeWeapon(key, name, tier, slug);
}

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

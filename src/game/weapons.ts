// ============================================================================
// SISTEMA GLOBAL DE ARMA FLUTUANTE — modular, reutilizável por qualquer
// personagem. A arma é um objeto visual separado do personagem: nunca fica
// dentro das spritesheets. Todo movimento (posição/rotação/escala/trajetória)
// é feito por código a partir destes parâmetros configuráveis.
// ============================================================================

import type { StatBag } from './statTypes';

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

export interface WeaponPassive {
  name: string;
  desc: string;
}

export interface WeaponDef {
  key: string;
  name: string;
  tier: WeaponTier;
  rarity: string;
  spriteAsset: string; // chave em LoadedAssets — sprite normal
  spriteEnergizedAsset?: string; // sprite p/ Ressonância ativa (se existir)
  img: string; // caminho público pro ícone/arte grande (telas de UI)
  baseAtk: number; // ATQ da arma em +0, conforme o kit da classe Teclas
  atkPerLevel: number;
  maxLevel: number;
  statBonus: StatBag; // bônus fixos da arma em +0 (não escala com o nível)
  passive?: WeaponPassive; // só T4/T5
  aklesSynergy?: string; // bônus extra só quando equipada em Akles (texto)
  visual: WeaponVisualCfg;
  // custo de material p/ subir do nível `level` -> `level+1`
  upgradeCost: (level: number) => Record<string, number>;
  // arma sem arte própria — desenhada por código (formas simples), não por
  // ctx.drawImage. Usado pro cajado temporário da Wins / arco da Huans.
  procedural?: 'staff' | 'bow';
}

export const WEAPON_DEFS: Record<string, WeaponDef> = {};

const STAFF_ICON_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 220"><rect x="25" y="46" width="10" height="164" rx="5" fill="#8b5e34"/><circle cx="30" cy="30" r="26" fill="#a855f7"/><circle cx="30" cy="30" r="26" fill="none" stroke="#e9d5ff" stroke-width="3"/></svg>',
  );

// ---------------------------------------------------------------------------
// Wins — classe da Voz. Arma temporária (placeholder): cajado desenhado por
// código, sem arte própria ainda. Mesma arquitetura de arma flutuante.
// ---------------------------------------------------------------------------
WEAPON_DEFS.cajado_temporario = {
  key: 'cajado_temporario',
  name: 'Cajado Temporário',
  tier: 1,
  rarity: 'Provisório',
  spriteAsset: '',
  img: STAFF_ICON_SVG,
  baseAtk: 10,
  atkPerLevel: 2,
  maxLevel: 10,
  statBonus: { skillDmgPct: 5 },
  procedural: 'staff',
  // mesma config visual da Acordelâmina T2 — flutuante, tucada nas costas
  // em repouso, sem tocar no chão nem nos pés.
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
    gold_refined: 1 + lvl,
    gold_raw: 3 + lvl * 2,
  }),
};

// ---------------------------------------------------------------------------
// Huans — classe Cordas. Arma temporária (placeholder): arco desenhado por
// código, sem arte própria ainda. Mesma arquitetura de arma flutuante.
// ---------------------------------------------------------------------------
const BOW_ICON_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 220"><path d="M20 10 Q60 110 20 210" fill="none" stroke="#6b4226" stroke-width="8"/><line x1="20" y1="10" x2="20" y2="210" stroke="#e5e7eb" stroke-width="2"/></svg>',
  );

WEAPON_DEFS.arco_temporario = {
  key: 'arco_temporario',
  name: 'Arco Temporário',
  tier: 1,
  rarity: 'Provisório',
  spriteAsset: '',
  img: BOW_ICON_SVG,
  baseAtk: 13,
  atkPerLevel: 3,
  maxLevel: 10,
  statBonus: { critChancePct: 4 },
  procedural: 'bow',
  // mesma config visual da Acordelâmina T2 — flutuante, tucada nas costas
  // em repouso, sem tocar no chão nem nos pés.
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
    gold_refined: 1 + lvl,
    gold_raw: 3 + lvl * 2,
  }),
};

// ---------------------------------------------------------------------------
// Catálogo da classe Teclas (Tier 1-5) — kit completo conforme especificação.
// Todo valor abaixo é o item em +0. Arte já vem cortada/limpa em
// public/assets/catalogo/armas.
// ---------------------------------------------------------------------------
const RARITY_BY_TIER: Record<WeaponTier, string> = {
  1: 'Comum',
  2: 'Incomum',
  3: 'Raro',
  4: 'Épico',
  5: 'Lendário',
};
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

interface WeaponSpec {
  key: string;
  name: string;
  tier: WeaponTier;
  slug: string;
  atk: number;
  stats: StatBag;
  passive?: WeaponPassive;
  aklesSynergy?: string;
  /** T2 acordelamina_t2 usa os assets originais (weapons/), não os do catálogo. */
  legacyAsset?: boolean;
}

function makeWeapon(spec: WeaponSpec): WeaponDef {
  const { key, name, tier, slug, atk, stats, passive, aklesSynergy, legacyAsset } = spec;
  return {
    key,
    name,
    tier,
    rarity: RARITY_BY_TIER[tier],
    spriteAsset: legacyAsset ? 'weaponAcordelaminaT2' : `weapon_${slug}`,
    spriteEnergizedAsset: legacyAsset ? 'weaponAcordelaminaT2Energized' : undefined,
    img: legacyAsset ? '/assets/weapons/acordelamina_t2.png' : `/assets/catalogo/armas/${slug}.png`,
    baseAtk: atk,
    atkPerLevel: ATK_PER_LVL_BY_TIER[tier],
    maxLevel: 10,
    statBonus: stats,
    passive,
    aklesSynergy,
    visual: visualForTier(tier),
    upgradeCost: (lvl) => ({
      gold_refined: tier * (2 + lvl * 2),
      crystal_blue_refined: tier * (1 + Math.floor(lvl * 1.4)),
      gold_raw: tier * (4 + lvl * 3),
      crystal_blue_raw: tier * (3 + lvl * 2),
    }),
  };
}

const CATALOG_WEAPONS: WeaponSpec[] = [
  // ---- T1 ----
  { key: 'tecla_de_carvalho', name: 'Tecla de Carvalho', tier: 1, slug: 'tecla_de_carvalho', atk: 28, stats: { hpPct: 3 } },
  { key: 'ferro_do_pianista', name: 'Ferro do Pianista', tier: 1, slug: 'ferro_do_pianista', atk: 30, stats: { defPct: 4 } },
  { key: 'cravo_de_batalha', name: 'Cravo de Batalha', tier: 1, slug: 'cravo_de_batalha', atk: 31, stats: { critChancePct: 2 } },
  { key: 'acordeonita', name: 'Acordeonita', tier: 1, slug: 'acordeonita', atk: 27, stats: { atkSpeedPct: 4 } },
  // ---- T2 ----
  { key: 'acordelamina_t2', name: 'Acordelâmina T2', tier: 2, slug: 'acordelamina_t2', atk: 48, stats: { basicDmgPct: 6 }, legacyAsset: true },
  { key: 'cravo_azul', name: 'Cravo Azul', tier: 2, slug: 'cravo_azul', atk: 50, stats: { critChancePct: 4 } },
  { key: 'teclado_resonante', name: 'Teclado Resonante', tier: 2, slug: 'teclado_resonante', atk: 46, stats: { energyMaxPct: 8 } },
  { key: 'acordeon_de_aco', name: 'Acordeon de Aço', tier: 2, slug: 'acordeon_de_aco', atk: 54, stats: { hpPct: 6 } },
  { key: 'orgao_do_peregrino', name: 'Órgão do Peregrino', tier: 2, slug: 'orgao_do_peregrino', atk: 49, stats: { skillDmgPct: 6 } },
  // ---- T3 ----
  { key: 'piano_de_cristal', name: 'Piano de Cristal', tier: 3, slug: 'piano_de_cristal', atk: 76, stats: { critChancePct: 7 } },
  { key: 'cravo_real_de_acordelot', name: 'Cravo Real de Acordelot', tier: 3, slug: 'cravo_real_de_acordelot', atk: 82, stats: { critDmgPct: 12 } },
  { key: 'orgao_resonante_arma', name: 'Órgão Resonante', tier: 3, slug: 'orgao_resonante_arma', atk: 78, stats: { skillDmgPct: 10 } },
  { key: 'celesta_lunar_arma', name: 'Celesta Lunar', tier: 3, slug: 'celesta_lunar_arma', atk: 74, stats: { cooldownReductionPct: 6 } },
  // ---- T4 ----
  {
    key: 'piano_do_maestro', name: 'Piano do Maestro', tier: 4, slug: 'piano_do_maestro', atk: 116,
    stats: { atkSpeedPct: 10, critChancePct: 8 },
    passive: {
      name: 'Cadência Magistral',
      desc: 'Cada ataque básico concede 1 Compasso (máx. 4). Ao chegar a 4, a próxima Skill causa +20% de dano; usar a Skill consome todos os Compassos.',
    },
  },
  {
    key: 'catedral_harmonica_arma', name: 'Catedral Harmônica', tier: 4, slug: 'catedral_harmonica_arma', atk: 120,
    stats: { skillDmgPct: 12, areaPct: 10 },
    passive: {
      name: 'Eco da Catedral',
      desc: 'Quando uma Skill atinge 3+ inimigos, cria um Eco Harmônico que causa 40% do dano da Skill numa pequena área (cooldown interno de 5s).',
    },
  },
  {
    key: 'cravo_do_rei', name: 'Cravo do Rei', tier: 4, slug: 'cravo_do_rei', atk: 124,
    stats: { critChancePct: 10, critDmgPct: 18 },
    passive: {
      name: 'Execução Real',
      desc: 'Acertar um crítico concede +3% ATQ por 6s (máx. 5 acúmulos, até +15% ATQ).',
    },
  },
  {
    key: 'concerto_de_cristal', name: 'Concerto de Cristal', tier: 4, slug: 'concerto_de_cristal', atk: 118,
    stats: { skillDmgPct: 14, energyMaxPct: 12 },
    passive: {
      name: 'Cristalização',
      desc: 'Usar uma Skill gera 1 Cristal Harmônico (máx. 3). Ao chegar a 3, os cristais explodem: 60% do ATQ em área, e as cargas zeram.',
    },
  },
  // ---- T5 ----
  {
    key: 'virtuose_arma', name: 'Virtuose', tier: 5, slug: 'virtuose_arma', atk: 170,
    stats: { atkPct: 15, critChancePct: 12, basicDmgPct: 15 },
    passive: {
      name: 'Virtuosidade Absoluta',
      desc: 'Ataques básicos e Skills concedem 1 Compasso (máx. 5). Ao alcançar 5: +20% Dano Geral por 8s; depois os Compassos zeram.',
    },
    aklesSynergy: 'Equipada por Akles: Ressonância dura +2s e ganha +10% Velocidade de Ataque adicional durante ela.',
  },
  {
    key: 'orgao_celestial', name: 'Órgão Celestial', tier: 5, slug: 'orgao_celestial', atk: 166,
    stats: { skillDmgPct: 20, cooldownReductionPct: 10, energyMaxPct: 15 },
    passive: {
      name: 'Concerto Celestial',
      desc: 'Usar uma Skill concede +5% Dano de Skill por 8s (máx. 4 acúmulos, até +20%). No máximo, recupera 10% da Energia Harmônica (cooldown de 12s).',
    },
  },
  {
    key: 'requiem_do_cravo', name: 'Réquiem do Cravo', tier: 5, slug: 'requiem_do_cravo', atk: 176,
    stats: { critChancePct: 15, critDmgPct: 25 },
    passive: {
      name: 'Nota Fúnebre',
      desc: 'Críticos aplicam Dissonância no alvo: +4% de dano recebido por carga (máx. 4 cargas, até +16%), por 6s.',
    },
  },
];

for (const spec of CATALOG_WEAPONS) {
  WEAPON_DEFS[spec.key] = makeWeapon(spec);
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

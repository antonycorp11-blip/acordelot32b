// ============================================================================
// CATÁLOGO — conjuntos de equipamento da classe Teclas (Tier 1-5), conforme
// especificação completa do kit. Cada conjunto tem 4 peças (colar / anel /
// aura / catalisador). Aprimoramento (+0 a +15) só sobe os atributos-base da
// peça — nunca passivas exclusivas nem bônus de 2/4 peças.
// ============================================================================

import type { CharacterClassKey, StatBag } from './statTypes';

export type EquipSlotKey = 'colar' | 'anel' | 'aura' | 'catalisador';
export const EQUIP_SLOT_ORDER: EquipSlotKey[] = ['colar', 'anel', 'aura', 'catalisador'];
export const EQUIP_SLOT_LABEL: Record<EquipSlotKey, string> = {
  colar: 'Colar',
  anel: 'Anel',
  aura: 'Aura',
  catalisador: 'Catalisador',
};

export interface EquipPassive {
  name: string;
  desc: string;
}

export interface EquipPieceDef {
  key: string; // slug único global
  slot: EquipSlotKey;
  name: string;
  img?: string; // undefined pros conjuntos T1 (ainda sem arte)
  stats: StatBag;
  passive?: EquipPassive; // só catalisador de T4/T5
}

export interface EquipSetDef {
  key: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  color: string; // ícone/realce quando a peça ainda não tem arte
  pieces: Record<EquipSlotKey, EquipPieceDef>;
  bonus2: StatBag;
  bonus4: StatBag;
  bonus4Extra?: string; // efeito de texto que não é um StatKey numérico
  aklesExtra?: string; // bônus extra só com Akles (só o set Virtuose tem)
  identity: string;
  classKey?: CharacterClassKey; // ausente nos sets legados = Teclas
}

const TIER_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#94a3b8',
  2: '#34d399',
  3: '#60a5fa',
  4: '#c084fc',
  5: '#fbbf24',
};

function piece(slug: string, slot: EquipSlotKey, name: string, stats: StatBag, opts?: { noArt?: boolean; passive?: EquipPassive }): EquipPieceDef {
  return {
    key: slug,
    slot,
    name,
    img: opts?.noArt ? undefined : `/assets/catalogo/equipamentos/${slug}.png`,
    stats,
    passive: opts?.passive,
  };
}

export const EQUIP_SETS: EquipSetDef[] = [
  // ==================== T1 ====================
  {
    key: 'aprendiz_harmonico',
    name: 'Conjunto do Aprendiz Harmônico',
    tier: 1,
    color: TIER_COLOR[1],
    pieces: {
      colar: piece('colar_aprendiz_harmonico', 'colar', 'Colar do Aprendiz Harmônico', { hpPct: 6, energyMaxPct: 4 }, { noArt: true }),
      anel: piece('anel_aprendiz_harmonico', 'anel', 'Anel do Aprendiz Harmônico', { atkPct: 4, critChancePct: 2 }, { noArt: true }),
      aura: piece('aura_aprendiz_harmonico', 'aura', 'Aura do Aprendiz Harmônico', { skillDmgPct: 5, cooldownReductionPct: 2 }, { noArt: true }),
      catalisador: piece('catalisador_aprendiz_harmonico', 'catalisador', 'Catalisador do Aprendiz Harmônico', { harmonicPowerPct: 6, basicDmgPct: 3 }, { noArt: true }),
    },
    bonus2: { atkPct: 5 },
    bonus4: { hpPct: 8, basicDmgPct: 5 },
    identity: 'Set inicial equilibrado.',
  },
  {
    key: 'teclas_de_carvalho',
    name: 'Conjunto das Teclas de Carvalho',
    tier: 1,
    color: TIER_COLOR[1],
    pieces: {
      colar: piece('colar_teclas_de_carvalho', 'colar', 'Colar das Teclas de Carvalho', { hpPct: 8, defPct: 4 }, { noArt: true }),
      anel: piece('anel_teclas_de_carvalho', 'anel', 'Anel das Teclas de Carvalho', { atkPct: 3, defPct: 3 }, { noArt: true }),
      aura: piece('aura_teclas_de_carvalho', 'aura', 'Aura das Teclas de Carvalho', { resistPct: 5, energyMaxPct: 4 }, { noArt: true }),
      catalisador: piece('catalisador_teclas_de_carvalho', 'catalisador', 'Catalisador das Teclas de Carvalho', { harmonicPowerPct: 5, energyRegenPct: 5 }, { noArt: true }),
    },
    bonus2: { hpPct: 6 },
    bonus4: { defPct: 8, energyRegenPct: 8 },
    identity: 'Build defensiva.',
  },
  // ==================== T2 ====================
  {
    key: 'pianista_solitario',
    name: 'Conjunto do Pianista Solitário',
    tier: 2,
    color: TIER_COLOR[2],
    pieces: {
      colar: piece('colar_do_pianista_solitario', 'colar', 'Colar do Pianista Solitário', { hpPct: 8, energyMaxPct: 6 }),
      anel: piece('anel_do_pianista_solitario', 'anel', 'Anel do Pianista Solitário', { atkPct: 7, critChancePct: 5 }),
      aura: piece('aura_do_pianista_solitario', 'aura', 'Aura do Pianista Solitário', { skillDmgPct: 8, cooldownReductionPct: 4 }),
      catalisador: piece('reliquia_do_pianista_solitario', 'catalisador', 'Catalisador do Pianista Solitário', { harmonicPowerPct: 9, basicDmgPct: 6 }),
    },
    bonus2: { atkPct: 8 },
    bonus4: { basicDmgPct: 10, critChancePct: 5 },
    identity: 'Build de ataque básico e crítico.',
  },
  {
    key: 'acordeonista',
    name: 'Conjunto do Acordeonista de Acordelot',
    tier: 2,
    color: TIER_COLOR[2],
    pieces: {
      colar: piece('colar_do_acordeonista', 'colar', 'Colar do Acordeonista', { hpPct: 10, energyMaxPct: 8 }),
      anel: piece('anel_do_acordeonista', 'anel', 'Anel do Acordeonista', { atkPct: 6, atkSpeedPct: 6 }),
      aura: piece('aura_do_acordeonista', 'aura', 'Aura do Acordeonista', { skillDmgPct: 6, cooldownReductionPct: 5 }),
      catalisador: piece('reliquia_do_acordeonista', 'catalisador', 'Catalisador do Acordeonista', { harmonicPowerPct: 8, atkSpeedPct: 8 }),
    },
    bonus2: { atkSpeedPct: 8 },
    bonus4: {},
    bonus4Extra: 'Ataques básicos recuperam 2% de Energia Harmônica (cooldown interno de 2s).',
    identity: 'Build rápida focada em geração de Energia.',
  },
  // ==================== T3 ====================
  {
    key: 'celesta_lunar',
    name: 'Conjunto da Celesta Lunar',
    tier: 3,
    color: TIER_COLOR[3],
    pieces: {
      colar: piece('colar_da_celesta_lunar', 'colar', 'Colar da Celesta Lunar', { hpPct: 12, energyMaxPct: 10 }),
      anel: piece('anel_da_celesta_lunar', 'anel', 'Anel da Celesta Lunar', { atkPct: 8, critChancePct: 8 }),
      aura: piece('aura_da_celesta_lunar', 'aura', 'Aura da Celesta Lunar', { skillDmgPct: 12, cooldownReductionPct: 6 }),
      catalisador: piece('reliquia_da_celesta_lunar', 'catalisador', 'Catalisador da Celesta Lunar', { harmonicPowerPct: 12, critDmgPct: 12 }),
    },
    bonus2: { critChancePct: 10 },
    bonus4: { skillDmgPct: 15 },
    identity: 'Híbrido crítico + Skills.',
  },
  {
    key: 'orgao_resonante',
    name: 'Conjunto do Órgão Resonante',
    tier: 3,
    color: TIER_COLOR[3],
    pieces: {
      colar: piece('colar_do_orgao_resonante', 'colar', 'Colar do Órgão Resonante', { hpPct: 14, energyMaxPct: 12 }),
      anel: piece('anel_do_orgao_resonante', 'anel', 'Anel do Órgão Resonante', { atkPct: 9, critChancePct: 6 }),
      aura: piece('aura_do_orgao_resonante', 'aura', 'Aura do Órgão Resonante', { areaPct: 14, cooldownReductionPct: 8 }),
      catalisador: piece('reliquia_do_orgao_resonante', 'catalisador', 'Catalisador do Órgão Resonante', { harmonicPowerPct: 13, energyMaxPct: 10 }),
    },
    bonus2: { areaPct: 12 },
    bonus4: { cooldownReductionPct: 8, energyMaxPct: 10 },
    identity: 'Build de AoE e Skills frequentes.',
  },
  // ==================== T4 ====================
  {
    key: 'maestro',
    name: 'Conjunto do Maestro de Acordelot',
    tier: 4,
    color: TIER_COLOR[4],
    pieces: {
      colar: piece('colar_do_maestro', 'colar', 'Colar do Maestro', { hpPct: 16, energyMaxPct: 12 }),
      anel: piece('anel_do_maestro', 'anel', 'Anel do Maestro', { atkPct: 12, critChancePct: 10 }),
      aura: piece('aura_do_maestro', 'aura', 'Aura do Maestro', { skillDmgPct: 15, cooldownReductionPct: 10 }),
      catalisador: piece('reliquia_do_maestro', 'catalisador', 'Piano Magistral', { harmonicPowerPct: 16, atkSpeedPct: 12 }, {
        passive: {
          name: 'Regência Magistral',
          desc: 'Usar uma Skill concede +4% ATQ por 8s (máx. 3 cargas, até +12% ATQ). Além disso, +10% Velocidade de Ataque fixo.',
        },
      }),
    },
    bonus2: { atkPct: 12, critChancePct: 5 },
    bonus4: { basicDmgPct: 15, skillDmgPct: 15, atkSpeedPct: 10 },
    identity: 'Set T4 híbrido — excelente para alternar ataques e Skills.',
  },
  {
    key: 'catedral_harmonica',
    name: 'Conjunto da Catedral Harmônica',
    tier: 4,
    color: TIER_COLOR[4],
    pieces: {
      colar: piece('colar_da_catedral_harmonica', 'colar', 'Colar da Catedral Harmônica', { hpPct: 18, defPct: 12 }),
      anel: piece('anel_da_catedral_harmonica', 'anel', 'Anel da Catedral Harmônica', { atkPct: 10, critChancePct: 8 }),
      aura: piece('aura_da_catedral_harmonica', 'aura', 'Aura da Catedral Harmônica', { skillDmgPct: 18, areaPct: 12 }),
      catalisador: piece('reliquia_da_catedral_harmonica', 'catalisador', 'Mil Tubos', { harmonicPowerPct: 17, cooldownReductionPct: 10 }, {
        passive: {
          name: 'Mil Vozes',
          desc: 'A cada 3ª Skill usada, gera um Eco Harmônico que repete 35% do dano da Skill (50% se ela atingiu 3+ inimigos).',
        },
      }),
    },
    bonus2: { skillDmgPct: 15 },
    bonus4: { areaPct: 20, cooldownReductionPct: 10 },
    identity: 'Um dos melhores conjuntos de AoE do jogo — pode competir com T5 contra grupos.',
  },
  // ==================== T5 ====================
  {
    key: 'virtuose',
    name: 'Conjunto Virtuose',
    tier: 5,
    color: TIER_COLOR[5],
    pieces: {
      colar: piece('colar_virtuose', 'colar', 'Colar Virtuose', { hpPct: 22, energyMaxPct: 15 }),
      anel: piece('anel_virtuose', 'anel', 'Anel Virtuose', { atkPct: 15, critChancePct: 12, critDmgPct: 20 }),
      aura: piece('aura_virtuose', 'aura', 'Aura Virtuose', { skillDmgPct: 22, cooldownReductionPct: 12, areaPct: 15 }),
      catalisador: piece('reliquia_virtuose', 'catalisador', 'Catalisador Virtuose', { harmonicPowerPct: 22, atkPct: 15, atkSpeedPct: 12 }, {
        passive: {
          name: 'Compasso Perfeito',
          desc: 'Ataques básicos e Skills concedem Compassos. Ao alcançar 5: +20% Dano Geral, +15% Velocidade de Ataque, +10% Chance Crítica, por 8s.',
        },
      }),
    },
    bonus2: { atkPct: 15, atkSpeedPct: 10 },
    bonus4: { basicDmgPct: 20, skillDmgPct: 15 },
    aklesExtra: 'Ressonância recebe +15% de Dano de Ataque Básico adicional; conjunto completo (4 peças) soma +10% de dano na Ressonância.',
    identity: 'Melhor set híbrido de Akles — não é necessariamente o melhor pra todo personagem Teclas.',
  },
  {
    key: 'concerto_celestial',
    name: 'Conjunto do Concerto Celestial',
    tier: 5,
    color: TIER_COLOR[5],
    pieces: {
      colar: piece('colar_do_concerto_celestial', 'colar', 'Colar do Concerto Celestial', { hpPct: 20, energyMaxPct: 20 }),
      anel: piece('anel_do_concerto_celestial', 'anel', 'Anel do Concerto Celestial', { atkPct: 14, critChancePct: 10, critDmgPct: 18 }),
      aura: piece('aura_do_concerto_celestial', 'aura', 'Aura do Concerto Celestial', { skillDmgPct: 25, cooldownReductionPct: 15, areaPct: 15 }),
      catalisador: piece('reliquia_do_concerto_celestial', 'catalisador', 'Órgão Celestial', { harmonicPowerPct: 24, skillDmgPct: 18, energyMaxPct: 15 }, {
        passive: {
          name: 'Ascensão Harmônica',
          desc: 'Cada Skill usada concede +4% Dano de Skill e +2% Redução de Recarga (máx. 5 cargas, até +20%/+10%). Ao chegar a 5, recupera 15% da Energia Máxima (cooldown 15s).',
        },
      }),
    },
    bonus2: { skillDmgPct: 15, critChancePct: 10 },
    bonus4: { skillDmgPct: 20, cooldownReductionPct: 12, energyMaxPct: 15 },
    identity: 'Melhor conjunto pra personagens Teclas focados quase totalmente em Skills.',
  },
];

type ClassSetSpec = { tier: 1 | 2 | 3 | 4 | 5; name: string; identity: string };

const CLASS_SET_SPECS: Record<'vocal' | 'cordas', ClassSetSpec[]> = {
  vocal: [
    { tier: 1, name: 'Aprendiz Vocal', identity: 'Entrada equilibrada para Energia e Skills.' },
    { tier: 1, name: 'Eco de Carvalho', identity: 'Sustentação e controle para a maga Vocal.' },
    { tier: 2, name: 'Solista Solitário', identity: 'Burst e Poder Harmônico.' },
    { tier: 2, name: 'Coral de Acordelot', identity: 'Recarga e controle de área.' },
    { tier: 3, name: 'Diva Lunar', identity: 'Crítico mágico e finalização.' },
    { tier: 3, name: 'Tenor Resonante', identity: 'Notas Vocais e regeneração.' },
    { tier: 4, name: 'Maestro Vocal', identity: 'Skills frequentes de alto impacto.' },
    { tier: 4, name: 'Ópera Real', identity: 'Grande área e explosões harmônicas.' },
    { tier: 5, name: 'Virtuose Vocal', identity: 'Máximo burst da classe Vocal.' },
    { tier: 5, name: 'Voz Celestial', identity: 'Controle, Energia e Poder Harmônico.' },
  ],
  cordas: [
    { tier: 1, name: 'Aprendiz das Cordas', identity: 'Entrada equilibrada para o caçador.' },
    { tier: 1, name: 'Lira de Carvalho', identity: 'Mobilidade e sobrevivência.' },
    { tier: 2, name: 'Violinista Solitário', identity: 'Ataque básico e crítico.' },
    { tier: 2, name: 'Violinista de Acordelot', identity: 'Velocidade e perseguição.' },
    { tier: 3, name: 'Harpa Lunar', identity: 'Crítico para alvos prioritários.' },
    { tier: 3, name: 'Baixo Resonante', identity: 'Marcação e cadência de ataques.' },
    { tier: 4, name: 'Maestro das Cordas', identity: 'DPS sustentado e mobilidade.' },
    { tier: 4, name: 'Luthier Real', identity: 'Skills e dano contra elites.' },
    { tier: 5, name: 'Virtuose das Cordas', identity: 'Máximo dano crítico de alvo único.' },
    { tier: 5, name: 'Sinfonia Celestial', identity: 'Chuva de flechas e perseguição.' },
  ],
};

function plainSlug(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function classSet(classKey: 'vocal' | 'cordas', spec: ClassSetSpec): EquipSetDef {
  const setSlug = plainSlug(spec.name);
  const p = (slot: EquipSlotKey, stats: StatBag): EquipPieceDef => ({
    key: `${classKey}_${slot}_${setSlug}`,
    slot,
    name: `${EQUIP_SLOT_LABEL[slot]} ${spec.name}`,
    img: `/assets/catalogo/${classKey}/equipamentos/${classKey}_${slot}_${setSlug}.png`,
    stats,
  });
  const t = spec.tier;
  const vocal = classKey === 'vocal';
  return {
    key: `${classKey}_${setSlug}`,
    name: `Conjunto ${spec.name}`,
    tier: t,
    classKey,
    color: TIER_COLOR[t],
    pieces: {
      colar: p('colar', { hpPct: 4 + t * 3, energyMaxPct: vocal ? 3 + t * 2 : 2 + t }),
      anel: p('anel', vocal ? { harmonicPowerPct: 3 + t * 3, critChancePct: t } : { atkPct: 3 + t * 3, critChancePct: 2 + t * 2 }),
      aura: p('aura', vocal ? { skillDmgPct: 4 + t * 3, areaPct: 2 + t * 2 } : { skillDmgPct: 2 + t * 2, atkSpeedPct: 3 + t * 2 }),
      catalisador: p('catalisador', vocal ? { cooldownReductionPct: 2 + t * 2, energyRegenPct: 3 + t * 2 } : { basicDmgPct: 4 + t * 3, critDmgPct: 3 + t * 3 }),
    },
    bonus2: vocal ? { harmonicPowerPct: 3 + t * 2 } : { atkSpeedPct: 3 + t * 2 },
    bonus4: vocal ? { skillDmgPct: 5 + t * 3, energyMaxPct: 2 + t * 2 } : { basicDmgPct: 5 + t * 3, critChancePct: 2 + t * 2 },
    identity: spec.identity,
  };
}

for (const classKey of ['vocal', 'cordas'] as const) {
  for (const spec of CLASS_SET_SPECS[classKey]) EQUIP_SETS.push(classSet(classKey, spec));
}

export function equipSetClass(set: EquipSetDef): CharacterClassKey {
  return set.classKey ?? 'teclas';
}

// index rápido: chave da peça -> {set, piece} — usado ao equipar/mostrar detalhe
export const EQUIP_PIECE_INDEX: Record<string, { set: EquipSetDef; piece: EquipPieceDef }> = {};
for (const set of EQUIP_SETS) {
  for (const slot of EQUIP_SLOT_ORDER) {
    const p = set.pieces[slot];
    EQUIP_PIECE_INDEX[p.key] = { set, piece: p };
  }
}

export function catalogEquipImg(slug: string): string {
  return `/assets/catalogo/equipamentos/${slug}.png`;
}

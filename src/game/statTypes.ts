// ============================================================================
// STATS — chaves compartilhadas por armas e equipamentos (kit da classe
// Teclas). Todo valor é em pontos percentuais (6 = +6%), somado de:
// peça(s) equipada(s) + bônus de conjunto (2/4 peças) + arma equipada.
// ============================================================================

export type StatKey =
  | 'hpPct'
  | 'defPct'
  | 'atkPct'
  | 'basicDmgPct'
  | 'skillDmgPct'
  | 'critChancePct'
  | 'critDmgPct'
  | 'atkSpeedPct'
  | 'cooldownReductionPct'
  | 'areaPct'
  | 'resistPct'
  | 'energyMaxPct'
  | 'energyRegenPct'
  | 'harmonicPowerPct';

export const STAT_LABELS: Record<StatKey, string> = {
  hpPct: 'HP Máximo',
  defPct: 'DEF',
  atkPct: 'ATQ',
  basicDmgPct: 'Dano de Ataque Básico',
  skillDmgPct: 'Dano de Skill',
  critChancePct: 'Chance Crítica',
  critDmgPct: 'Dano Crítico',
  atkSpeedPct: 'Velocidade de Ataque',
  cooldownReductionPct: 'Redução de Recarga',
  areaPct: 'Área das Skills',
  resistPct: 'Resistência',
  energyMaxPct: 'Energia Máxima',
  energyRegenPct: 'Regeneração de Energia',
  harmonicPowerPct: 'Poder Harmônico',
};

// Stats que ainda não têm um sistema (Energia Harmônica é um recurso que o
// jogo não tem implementado) — mostrados normalmente na UI, mas sem efeito
// de combate por enquanto.
export const STATS_WITHOUT_EFFECT: Set<StatKey> = new Set(['energyMaxPct', 'energyRegenPct', 'harmonicPowerPct']);

export type StatBag = Partial<Record<StatKey, number>>;

export function formatStatLine(key: StatKey, value: number): string {
  return `${STAT_LABELS[key]}: +${value}%`;
}

export function mergeStatBags(...bags: (StatBag | undefined)[]): StatBag {
  const out: StatBag = {};
  for (const bag of bags) {
    if (!bag) continue;
    for (const k of Object.keys(bag) as StatKey[]) {
      out[k] = (out[k] ?? 0) + (bag[k] ?? 0);
    }
  }
  return out;
}

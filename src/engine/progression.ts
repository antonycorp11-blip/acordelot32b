import type { Assignment } from '../types';

export interface ProgressOutcome {
  currentBpm: number;
  currentStreak: number;
  advanced: boolean;
  atTarget: boolean;
}

/**
 * Regra de avanço — IDÊNTICA ao trigger `apply_execution_progress` no Supabase
 * (supabase/migrations/0001_init.sql). O cliente aplica de forma otimista (offline);
 * o banco é a fonte da verdade quando a execução sincroniza.
 *  - execução perfeita: sequência +1;
 *  - ao atingir N perfeitas seguidas (e abaixo do alvo): BPM sobe `bpmStep` (limitado ao alvo) e a sequência zera;
 *  - qualquer erro: sequência zera.
 */
export function applyExecution(a: Pick<Assignment, 'currentBpm' | 'currentStreak' | 'targetBpm' | 'bpmStep' | 'streakRequired'>, perfect: boolean): ProgressOutcome {
  if (!perfect) return { currentBpm: a.currentBpm, currentStreak: 0, advanced: false, atTarget: a.currentBpm >= a.targetBpm };
  const streak = a.currentStreak + 1;
  if (streak >= a.streakRequired && a.currentBpm < a.targetBpm) {
    const bpm = Math.min(a.targetBpm, a.currentBpm + a.bpmStep);
    return { currentBpm: bpm, currentStreak: 0, advanced: true, atTarget: bpm >= a.targetBpm };
  }
  return { currentBpm: a.currentBpm, currentStreak: streak, advanced: false, atTarget: a.currentBpm >= a.targetBpm };
}

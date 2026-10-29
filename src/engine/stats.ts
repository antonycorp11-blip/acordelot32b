import type { Assignment, Exercise, Execution, Profile, RankingRow } from '../types';

export const dayKey = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const startOfDay = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
};

export const weekStart = () => startOfDay(-6);

export const countOnDay = (ex: Execution[], assignmentId: string, day = dayKey(new Date())) =>
  ex.filter((e) => e.assignmentId === assignmentId && dayKey(e.performedAt) === day).length;

export type DayStatus = 'done' | 'partial' | 'none' | 'empty';

/** Cumprimento de um aluno num dia: todas as atribuições ativas com as repetições feitas. */
export function dayStatus(assignments: Assignment[], ex: Execution[], day: string): { status: DayStatus; done: number; total: number } {
  const act = assignments.filter((a) => a.active);
  if (!act.length) return { status: 'empty', done: 0, total: 0 };
  const done = act.filter((a) => countOnDay(ex, a.id, day) >= a.repsPerDay).length;
  const any = act.some((a) => countOnDay(ex, a.id, day) > 0);
  return { status: done === act.length ? 'done' : any ? 'partial' : 'none', done, total: act.length };
}

export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => dayKey(startOfDay(i - n + 1)));

export function bestStreak(ex: Execution[]): number {
  let best = 0, cur = 0;
  for (const e of [...ex].sort((a, b) => a.performedAt.localeCompare(b.performedAt))) {
    cur = e.perfect ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

export function topErrors(ex: Execution[], limit = 8): { note: string; count: number }[] {
  const acc: Record<string, number> = {};
  for (const e of ex) for (const [k, v] of Object.entries(e.noteErrors ?? {})) acc[k] = (acc[k] ?? 0) + v;
  return Object.entries(acc).map(([note, count]) => ({ note, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Mesmo cálculo da função SQL `school_ranking` (usado no modo demonstração). */
export function computeRanking(ex: Execution[], profiles: Profile[], exercises: Exercise[], since: Date): RankingRow[] {
  const map = new Map<string, RankingRow>();
  for (const e of ex) {
    const k = e.studentId + '|' + e.exerciseId;
    let r = map.get(k);
    if (!r) {
      r = {
        studentId: e.studentId,
        studentName: profiles.find((p) => p.id === e.studentId)?.name ?? '—',
        exerciseId: e.exerciseId,
        exerciseTitle: exercises.find((x) => x.id === e.exerciseId)?.title ?? '—',
        maxBpm: 0, perfectWeek: 0, totalWeek: 0,
      };
      map.set(k, r);
    }
    if (e.perfect) r.maxBpm = Math.max(r.maxBpm, e.bpm);
    if (new Date(e.performedAt) >= since) {
      r.totalWeek++;
      if (e.perfect) r.perfectWeek++;
    }
  }
  return [...map.values()];
}

/** Ranking geral: soma das perfeitas na semana; desempate pela maior velocidade. */
export function overallRanking(rows: RankingRow[]) {
  const m = new Map<string, { studentId: string; name: string; perfectWeek: number; totalWeek: number; maxBpm: number }>();
  for (const r of rows) {
    const x = m.get(r.studentId) ?? { studentId: r.studentId, name: r.studentName, perfectWeek: 0, totalWeek: 0, maxBpm: 0 };
    x.perfectWeek += r.perfectWeek;
    x.totalWeek += r.totalWeek;
    x.maxBpm = Math.max(x.maxBpm, r.maxBpm);
    m.set(r.studentId, x);
  }
  return [...m.values()].sort((a, b) => b.perfectWeek - a.perfectWeek || b.maxBpm - a.maxBpm);
}

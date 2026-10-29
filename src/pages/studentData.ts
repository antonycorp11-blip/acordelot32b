import { api } from '../data/api';
import { effective, outbox } from '../data/outbox';
import { startOfDay } from '../engine/stats';
import type { Execution } from '../types';

/** Junta execuções do servidor com as que ainda estão na fila offline (sem duplicar). */
export function withPending(server: Execution[], studentId: string): Execution[] {
  const ids = new Set(server.map((e) => e.id));
  return [...server, ...outbox.list().filter((e) => e.studentId === studentId && !ids.has(e.id))];
}

export async function loadStudentDay(studentId: string) {
  const [assignments, exercises, today] = await Promise.all([
    api.listAssignments(studentId),
    api.listExercises(),
    api.listExecutions({ studentId, since: startOfDay() }),
  ]);
  return {
    assignments: assignments.filter((a) => a.active).map(effective),
    exercises,
    today: withPending(today, studentId),
  };
}

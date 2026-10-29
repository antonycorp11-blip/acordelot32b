import { applyExecution } from '../engine/progression';
import { computeRanking, startOfDay } from '../engine/stats';
import { buildArpeggio, buildProgression, buildScale, parseNoteList } from '../lib/music';
import type { Assignment, Exercise, Execution, Profile, School } from '../types';
import type { Api } from './api';
import { uid } from './uid';

/*
 * MODO DEMONSTRAÇÃO: mesmo contrato da API do Supabase, com os dados no localStorage.
 * Serve para testar o app sem backend. insertExecution reproduz o trigger de progressão.
 */
interface DB {
  school: School;
  profiles: Profile[];
  exercises: Exercise[];
  assignments: Assignment[];
  executions: Execution[];
}
const KEY = 'demo-db:v1';
const SESSION = 'demo-session';

function seed(): DB {
  const school = 'demo-school';
  const teacher: Profile = { id: 't1', name: 'Prof. Helena Duarte', role: 'teacher', instrument: 'keyboard', schoolId: school };
  const students: Profile[] = [
    { id: 's1', name: 'Bruno Lima', role: 'student', instrument: 'keyboard', schoolId: school },
    { id: 's2', name: 'Carla Souza', role: 'student', instrument: 'acoustic_guitar', schoolId: school },
    { id: 's3', name: 'Diego Martins', role: 'student', instrument: 'keyboard', schoolId: school },
    { id: 's4', name: 'Elisa Rocha', role: 'student', instrument: 'bass', schoolId: school },
  ];
  const base = { beatsPerBar: 4, timingTolMs: 90, pitchTolCents: 35, updatedAt: new Date().toISOString() };
  const exercises: Exercise[] = [
    { ...base, id: 'e1', title: 'Dó maior — 1 oitava', kind: 'scale', instrument: 'keyboard', bpmRef: 80, description: 'Mão direita, dedilhado 1-2-3-1-2-3-4-5.',
      notes: buildScale({ tonic: 0, mode: 'major', octave: 4, octaves: 1, direction: 'updown', perBeat: 2 }) },
    { ...base, id: 'e2', title: 'Sol menor harmônica', kind: 'scale', instrument: 'keyboard', bpmRef: 70,
      notes: buildScale({ tonic: 7, mode: 'harmonic_minor', octave: 3, octaves: 1, direction: 'updown', perBeat: 2 }) },
    { ...base, id: 'e3', title: 'Arpejo de Lá menor', kind: 'arpeggio', instrument: 'keyboard', bpmRef: 80,
      notes: buildArpeggio({ tonic: 9, quality: 'min', octave: 3, octaves: 2, direction: 'updown', perBeat: 2 }) },
    { ...base, id: 'e4', title: 'Progressão C – G – Am – F', kind: 'chord', instrument: 'keyboard', bpmRef: 72, description: 'Tríades em posição fundamental.',
      notes: buildProgression('C G Am F', 4, 2).notes },
    { ...base, id: 'e5', title: 'Für Elise — início (gravado)', kind: 'recording', instrument: 'keyboard', bpmRef: 66,
      notes: parseNoteList('E5 D#5 E5 D#5 E5 B4 D5 C5 A4 - C4 E4 A4 B4', 2).notes },
    { ...base, id: 'e6', title: 'Mi menor natural (violão)', kind: 'scale', instrument: 'acoustic_guitar', bpmRef: 70, timingTolMs: 110,
      notes: buildScale({ tonic: 4, mode: 'natural_minor', octave: 2, octaves: 1, direction: 'updown', perBeat: 1 }) },
    { ...base, id: 'e7', title: 'Linha de baixo em Lá', kind: 'arpeggio', instrument: 'bass', bpmRef: 80, timingTolMs: 110,
      notes: parseNoteList('A1 C#2 E2 A2 E2 C#2 A1 -', 2).notes },
  ];
  const mk = (id: string, ex: string, st: string, start: number, target: number, cur: number, streak: number, reps = 8): Assignment => ({
    id, exerciseId: ex, studentId: st, repsPerDay: reps, startBpm: start, targetBpm: target, bpmStep: 4, streakRequired: 6,
    currentBpm: cur, currentStreak: streak, active: true, createdAt: new Date(Date.now() - 12 * 864e5).toISOString(),
  });
  const assignments = [
    mk('a1', 'e1', 's1', 60, 120, 60, 0), mk('a2', 'e4', 's1', 56, 100, 56, 0), mk('a3', 'e5', 's1', 50, 80, 50, 0, 5),
    mk('a4', 'e6', 's2', 50, 100, 50, 0), mk('a5', 'e1', 's3', 60, 120, 60, 0), mk('a6', 'e3', 's3', 60, 110, 60, 0),
    mk('a7', 'e7', 's4', 60, 110, 60, 0),
  ];
  // histórico sintético determinístico dos últimos 10 dias (aplicando a regra real de avanço)
  const executions: Execution[] = [];
  let rnd = 7;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const skill: Record<string, number> = { s1: 0.8, s2: 0.6, s3: 0.7, s4: 0.5 };
  const notes = ['C4', 'E4', 'F4', 'B4', 'G3', 'A3', 'D5', 'F#4'];
  for (let d = 10; d >= 0; d--) {
    for (const a of assignments) {
      const sk = skill[a.studentId];
      if (rand() > sk + 0.1) continue;
      const reps = d === 0 ? Math.floor(rand() * (a.repsPerDay + 1)) : Math.round(a.repsPerDay * (0.5 + rand() * 0.7));
      for (let r = 0; r < reps; r++) {
        const perfect = rand() < sk;
        const total = exercises.find((e) => e.id === a.exerciseId)!.notes.length;
        const errors = perfect ? 0 : 1 + Math.floor(rand() * 3);
        const noteErrors: Record<string, number> = {};
        for (let k = 0; k < errors; k++) {
          const n = notes[Math.floor(rand() * notes.length)];
          noteErrors[n] = (noteErrors[n] ?? 0) + 1;
        }
        const when = startOfDay(-d);
        when.setHours(17 + Math.floor(r / 6), (r * 7) % 60);
        executions.push({
          id: uid(), assignmentId: a.id, studentId: a.studentId, exerciseId: a.exerciseId, performedAt: when.toISOString(),
          bpm: a.currentBpm, hits: total - errors, errors, missed: 0, score: Math.round((100 * (total - errors)) / total), perfect,
          noteErrors, inputMode: a.studentId === 's2' || a.studentId === 's4' ? 'mic' : 'midi',
        });
        Object.assign(a, applyExecution(a, perfect));
      }
    }
  }
  return { school: { name: 'Escola de Música Acordelot', joinCode: 'ACORDE', teacherCode: 'PROF-2026' }, profiles: [teacher, ...students], exercises, assignments, executions };
}

export function createDemoApi(): Api {
  const load = (): DB => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) return JSON.parse(s);
    } catch { /* recria */ }
    const db = seed();
    localStorage.setItem(KEY, JSON.stringify(db));
    return db;
  };
  const save = (db: DB) => localStorage.setItem(KEY, JSON.stringify(db));
  const me = () => load().profiles.find((p) => p.id === localStorage.getItem(SESSION)) ?? null;
  const upsert = <T extends { id: string }>(list: T[], v: T) => {
    const i = list.findIndex((x) => x.id === v.id);
    if (i >= 0) list[i] = v;
    else list.push(v);
  };
  const visible = (studentId?: string) => {
    const u = me();
    return u?.role === 'student' ? u.id : studentId;
  };

  return {
    mode: 'demo',
    async currentUser() { return me(); },
    async signIn() { throw new Error('No modo demonstração, escolha um perfil abaixo.'); },
    async signUp() { throw new Error('Cadastro requer Supabase configurado (veja o README).'); },
    async signOut() { localStorage.removeItem(SESSION); },
    demoProfiles: () => load().profiles,
    demoLogin(id) {
      localStorage.setItem(SESSION, id);
      return me()!;
    },
    demoReset() {
      localStorage.removeItem(KEY);
      localStorage.removeItem('outbox:v1');
    },
    async school() { return load().school; },
    async listStudents() { return load().profiles.filter((p) => p.role === 'student'); },
    async listExercises() { return load().exercises.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')); },
    async saveExercise(e) {
      const db = load();
      const v = { ...e, updatedAt: new Date().toISOString() };
      upsert(db.exercises, v);
      save(db);
      return v;
    },
    async deleteExercise(id) {
      const db = load();
      db.exercises = db.exercises.filter((e) => e.id !== id);
      db.assignments = db.assignments.filter((a) => a.exerciseId !== id);
      save(db);
    },
    async listAssignments(studentId) {
      const s = visible(studentId);
      return load().assignments.filter((a) => !s || a.studentId === s);
    },
    async saveAssignment(a) {
      const db = load();
      upsert(db.assignments, a);
      save(db);
      return a;
    },
    async deleteAssignment(id) {
      const db = load();
      db.assignments = db.assignments.filter((a) => a.id !== id);
      save(db);
    },
    async listExecutions({ studentId, since }) {
      const s = visible(studentId);
      return load()
        .executions.filter((e) => (!s || e.studentId === s) && (!since || new Date(e.performedAt) >= since))
        .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
    },
    async insertExecution(e) {
      const db = load();
      if (db.executions.some((x) => x.id === e.id)) return;
      db.executions.push(e);
      const a = db.assignments.find((x) => x.id === e.assignmentId);
      if (a) {
        const r = applyExecution(a, e.perfect);
        a.currentBpm = r.currentBpm;
        a.currentStreak = r.currentStreak;
      }
      save(db);
    },
    async ranking(since) {
      const db = load();
      return computeRanking(db.executions, db.profiles, db.exercises, since);
    },
  };
}

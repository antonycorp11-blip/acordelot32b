import { createClient } from '@supabase/supabase-js';
import type { Assignment, Exercise, Execution, Profile, RankingRow } from '../types';
import type { Api, SignUpInput } from './api';
import { cached, clearCache } from './cache';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const toProfile = (r: Row): Profile => ({ id: r.id, name: r.full_name, role: r.role, instrument: r.instrument, schoolId: r.school_id });
const toExercise = (r: Row): Exercise => ({
  id: r.id, title: r.title, kind: r.kind, instrument: r.instrument, description: r.description ?? '',
  notes: r.notes ?? [], bpmRef: r.bpm_ref, beatsPerBar: r.beats_per_bar, timingTolMs: r.timing_tol_ms,
  pitchTolCents: r.pitch_tol_cents, updatedAt: r.updated_at,
});
const toAssignment = (r: Row): Assignment => ({
  id: r.id, exerciseId: r.exercise_id, studentId: r.student_id, repsPerDay: r.reps_per_day, startBpm: r.start_bpm,
  targetBpm: r.target_bpm, bpmStep: r.bpm_step, streakRequired: r.streak_required, currentBpm: r.current_bpm,
  currentStreak: r.current_streak, active: r.active, createdAt: r.created_at,
});
const toExecution = (r: Row): Execution => ({
  id: r.id, assignmentId: r.assignment_id, studentId: r.student_id, exerciseId: r.exercise_id, performedAt: r.performed_at,
  bpm: r.bpm, hits: r.hits, errors: r.errors, missed: r.missed, score: r.score, perfect: r.perfect,
  noteErrors: r.note_errors ?? {}, inputMode: r.input_mode,
});

// erro do Supabase vira exceção; com erro nulo, data está presente
function check<T>(res: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  let me: Profile | null = null;

  const loadMe = async (userId: string) => {
    me = await cached('me', async () => toProfile(check(await sb.from('profiles').select('*').eq('id', userId).single())));
    return me;
  };

  return {
    mode: 'supabase',
    async currentUser() {
      const { data } = await sb.auth.getSession(); // lê a sessão local: funciona offline
      return data.session ? loadMe(data.session.user.id) : null;
    },
    async signIn(email, password) {
      const d = check<{ user: { id: string } | null }>(await sb.auth.signInWithPassword({ email, password }));
      return loadMe(d.user!.id);
    },
    async signUp(i: SignUpInput) {
      const d = check<{ user: { id: string } | null; session: unknown }>(
        await sb.auth.signUp({
          email: i.email,
          password: i.password,
          options: { data: { full_name: i.name, role: i.role, instrument: i.instrument, school_name: i.schoolName ?? '', join_code: i.joinCode ?? '' } },
        }),
      );
      return d.session && d.user ? loadMe(d.user.id) : null;
    },
    async signOut() {
      await sb.auth.signOut();
      clearCache();
      me = null;
    },
    school: () =>
      cached('school', async () => {
        const s = check<Row>(await sb.from('schools').select('name, join_code').limit(1).single());
        let teacherCode: string | undefined;
        if (me?.role === 'teacher') {
          const sec = await sb.from('school_secrets').select('teacher_code').limit(1).maybeSingle();
          teacherCode = sec.data?.teacher_code;
        }
        return { name: s.name, joinCode: s.join_code, teacherCode };
      }),
    listStudents: () =>
      cached('students', async () => check(await sb.from('profiles').select('*').eq('role', 'student').order('full_name')).map(toProfile)),
    listExercises: () =>
      cached('exercises', async () => check(await sb.from('exercises').select('*').order('updated_at', { ascending: false })).map(toExercise)),
    async saveExercise(e) {
      const row = {
        id: e.id, school_id: me!.schoolId, created_by: me!.id, title: e.title, kind: e.kind, instrument: e.instrument,
        description: e.description ?? '', notes: e.notes, bpm_ref: e.bpmRef, beats_per_bar: e.beatsPerBar,
        timing_tol_ms: e.timingTolMs, pitch_tol_cents: e.pitchTolCents, updated_at: new Date().toISOString(),
      };
      return toExercise(check(await sb.from('exercises').upsert(row).select().single()));
    },
    async deleteExercise(id) {
      check(await sb.from('exercises').delete().eq('id', id));
    },
    listAssignments: (studentId) =>
      cached('assignments:' + (studentId ?? 'all'), async () => {
        let q = sb.from('assignments').select('*').order('created_at');
        if (studentId) q = q.eq('student_id', studentId);
        return check(await q).map(toAssignment);
      }),
    async saveAssignment(a) {
      const row = {
        id: a.id, school_id: me!.schoolId, exercise_id: a.exerciseId, student_id: a.studentId, assigned_by: me!.id,
        reps_per_day: a.repsPerDay, start_bpm: a.startBpm, target_bpm: a.targetBpm, bpm_step: a.bpmStep,
        streak_required: a.streakRequired, current_bpm: a.currentBpm, current_streak: a.currentStreak, active: a.active,
      };
      return toAssignment(check(await sb.from('assignments').upsert(row).select().single()));
    },
    async deleteAssignment(id) {
      check(await sb.from('assignments').delete().eq('id', id));
    },
    listExecutions: ({ studentId, since }) =>
      cached(`executions:${studentId ?? 'all'}:${since ? since.toISOString().slice(0, 10) : 'all'}`, async () => {
        let q = sb.from('executions').select('*').order('performed_at', { ascending: false }).limit(2000);
        if (studentId) q = q.eq('student_id', studentId);
        if (since) q = q.gte('performed_at', since.toISOString());
        return check(await q).map(toExecution);
      }),
    async insertExecution(e) {
      // student_id/exercise_id/school_id são revalidados por trigger a partir da atribuição
      const row = {
        id: e.id, assignment_id: e.assignmentId, student_id: e.studentId, exercise_id: e.exerciseId, school_id: me?.schoolId,
        performed_at: e.performedAt, bpm: e.bpm, hits: e.hits, errors: e.errors, missed: e.missed, score: e.score,
        perfect: e.perfect, note_errors: e.noteErrors, input_mode: e.inputMode,
      };
      check(await sb.from('executions').upsert(row, { onConflict: 'id', ignoreDuplicates: true }));
    },
    ranking: (since) =>
      cached('ranking', async () =>
        (check(await sb.rpc('school_ranking', { p_since: since.toISOString() })) as Row[]).map(
          (r): RankingRow => ({
            studentId: r.student_id, studentName: r.student_name, exerciseId: r.exercise_id, exerciseTitle: r.exercise_title,
            maxBpm: r.max_bpm, perfectWeek: r.perfect_week, totalWeek: r.total_week,
          }),
        ),
      ),
  };
}

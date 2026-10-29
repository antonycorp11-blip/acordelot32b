import type { Assignment, Exercise, Execution, Instrument, Profile, RankingRow, Role, School } from '../types';
import { createDemoApi } from './demoApi';
import { createSupabaseApi } from './supabaseApi';

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: Role;
  instrument: Instrument;
  /** Professor criando escola nova. */
  schoolName?: string;
  /** Aluno: código da escola. Professor entrando numa escola existente: código de professor. */
  joinCode?: string;
}

export interface Api {
  mode: 'supabase' | 'demo';
  currentUser(): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  /** null quando o Supabase exige confirmação por e-mail. */
  signUp(input: SignUpInput): Promise<Profile | null>;
  signOut(): Promise<void>;
  school(): Promise<School | null>;
  listStudents(): Promise<Profile[]>;
  listExercises(): Promise<Exercise[]>;
  saveExercise(e: Exercise): Promise<Exercise>;
  deleteExercise(id: string): Promise<void>;
  listAssignments(studentId?: string): Promise<Assignment[]>;
  saveAssignment(a: Assignment): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;
  listExecutions(o: { studentId?: string; since?: Date }): Promise<Execution[]>;
  insertExecution(e: Execution): Promise<void>;
  ranking(since: Date): Promise<RankingRow[]>;
  /** Só no modo demonstração. */
  demoProfiles?(): Profile[];
  demoLogin?(id: string): Profile;
  demoReset?(): void;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const api: Api = url && key ? createSupabaseApi(url, key) : createDemoApi();

export { uid } from './uid';

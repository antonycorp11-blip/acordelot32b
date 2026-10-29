export type Role = 'teacher' | 'student';
export type Instrument = 'keyboard' | 'acoustic_guitar' | 'electric_guitar' | 'bass';
export type ExerciseKind = 'scale' | 'arpeggio' | 'chord' | 'recording';
export type InputMode = 'midi' | 'midi+mic' | 'mic';

export interface InstrumentInfo {
  label: string;
  minFreq: number;
  maxFreq: number;
  baseOctave: number;
  /** Cordas soltas (MIDI) para o afinador. */
  strings?: number[];
  midi: boolean;
}

export const INSTRUMENTS: Record<Instrument, InstrumentInfo> = {
  keyboard: { label: 'Teclado', minFreq: 50, maxFreq: 2100, baseOctave: 4, midi: true },
  acoustic_guitar: { label: 'Violão', minFreq: 70, maxFreq: 1400, baseOctave: 3, strings: [40, 45, 50, 55, 59, 64], midi: false },
  electric_guitar: { label: 'Guitarra', minFreq: 70, maxFreq: 1400, baseOctave: 3, strings: [40, 45, 50, 55, 59, 64], midi: false },
  bass: { label: 'Baixo', minFreq: 36, maxFreq: 500, baseOctave: 2, strings: [28, 33, 38, 43], midi: false },
};

export const KIND_LABEL: Record<ExerciseKind, string> = {
  scale: 'Escala',
  arpeggio: 'Arpejo / Sequência',
  chord: 'Acordes',
  recording: 'Trecho gravado',
};

/** Nota do gabarito. Tempo em batidas (beats) para independer do BPM. */
export interface NoteEv {
  midi: number;
  beat: number;
  dur: number;
}

export interface Profile {
  id: string;
  name: string;
  role: Role;
  instrument: Instrument;
  schoolId: string;
}

export interface Exercise {
  id: string;
  title: string;
  kind: ExerciseKind;
  instrument: Instrument;
  description?: string;
  notes: NoteEv[];
  bpmRef: number;
  beatsPerBar: number;
  timingTolMs: number;
  pitchTolCents: number;
  updatedAt?: string;
}

export interface Assignment {
  id: string;
  exerciseId: string;
  studentId: string;
  repsPerDay: number;
  startBpm: number;
  targetBpm: number;
  bpmStep: number;
  streakRequired: number;
  currentBpm: number;
  currentStreak: number;
  active: boolean;
  createdAt: string;
}

export interface Execution {
  id: string;
  assignmentId: string;
  studentId: string;
  exerciseId: string;
  performedAt: string;
  bpm: number;
  hits: number;
  errors: number;
  missed: number;
  score: number;
  perfect: boolean;
  noteErrors: Record<string, number>;
  inputMode: InputMode;
}

export interface RankingRow {
  studentId: string;
  studentName: string;
  exerciseId: string;
  exerciseTitle: string;
  maxBpm: number;
  perfectWeek: number;
  totalWeek: number;
}

export interface School {
  name: string;
  joinCode?: string;
  teacherCode?: string;
}

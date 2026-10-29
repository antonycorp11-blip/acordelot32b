import { noteName, pc } from '../lib/music';
import type { NoteEv } from '../types';

export type NoteStatus = 'pending' | 'hit' | 'wrong' | 'missed';
export interface ExpectedNote extends NoteEv {
  t: number;
  status: NoteStatus;
  dtMs?: number;
  played?: number;
}
export interface PlayedEvent { midi: number; time: number; cents?: number; source: 'midi' | 'mic' }
export interface ScoreResult {
  total: number;
  hits: number;
  wrong: number;
  extras: number;
  missed: number;
  errors: number;
  score: number;
  perfect: boolean;
  avgAbsDtMs: number;
  noteErrors: Record<string, number>;
}

/**
 * Compara o que foi tocado com o gabarito em tempo real.
 * Execução perfeita = toda nota dentro da tolerância de tempo (ms) e de afinação (cents),
 * nenhuma nota errada/extra e nenhuma faltando.
 * Acordes (MIDI): cada nota do acorde precisa cair dentro da tolerância do mesmo instante.
 */
export class Scorer {
  notes: ExpectedNote[];
  extras = 0;
  noteErrors: Record<string, number> = {};
  private last: { midi: number; time: number } | null = null;

  constructor(
    notes: NoteEv[],
    readonly bpm: number,
    readonly startTime: number,
    readonly tolMs: number,
    readonly tolCents: number,
    /** Microfone: aceita a nota certa em outra oitava (detector e instrumentos transpositores). */
    readonly octaveAgnostic = false,
  ) {
    const spb = 60 / bpm;
    this.notes = notes
      .map((n) => ({ ...n, t: startTime + n.beat * spb, status: 'pending' as NoteStatus }))
      .sort((a, b) => a.t - b.t || a.midi - b.midi);
  }

  /** Janela em que uma nota tocada ainda é atribuída a uma nota esperada. */
  get window() {
    return Math.max((this.tolMs / 1000) * 2.5, (0.5 * 60) / this.bpm);
  }

  get endTime() {
    return this.notes.reduce((mx, n) => Math.max(mx, n.t + (n.dur * 60) / this.bpm), this.startTime) + this.window;
  }

  pitchOk(expected: number, ev: PlayedEvent) {
    if (ev.source === 'midi') return ev.midi === expected;
    let diff = (ev.midi + (ev.cents ?? 0) / 100 - expected) * 100;
    if (this.octaveAgnostic) diff = ((((diff + 600) % 1200) + 1200) % 1200) - 600;
    return Math.abs(diff) <= this.tolCents;
  }

  private err(midi: number) {
    const k = noteName(midi);
    this.noteErrors[k] = (this.noteErrors[k] ?? 0) + 1;
  }

  onNote(ev: PlayedEvent): { index: number; status: NoteStatus } | null {
    // microfone: ignora ataque duplicado da mesma nota logo após um acerto
    if (ev.source === 'mic' && this.last && pc(this.last.midi) === pc(ev.midi) && ev.time - this.last.time < 0.12) return null;
    const tol = this.tolMs / 1000;
    const w = this.window;
    let best = -1;
    let bestDt = Infinity;
    let bestPitch = false;
    this.notes.forEach((n, i) => {
      if (n.status !== 'pending') return;
      const dt = ev.time - n.t;
      if (Math.abs(dt) > w) return;
      const p = this.pitchOk(n.midi, ev);
      if ((p && !bestPitch) || (p === bestPitch && Math.abs(dt) < Math.abs(bestDt))) {
        best = i;
        bestDt = dt;
        bestPitch = p;
      }
    });
    this.last = { midi: ev.midi, time: ev.time };
    if (best < 0) {
      this.extras++;
      this.err(ev.midi);
      return null;
    }
    const n = this.notes[best];
    n.played = ev.midi;
    n.dtMs = Math.round(bestDt * 1000);
    if (bestPitch && Math.abs(bestDt) <= tol) n.status = 'hit';
    else {
      n.status = 'wrong';
      this.err(n.midi);
    }
    return { index: best, status: n.status };
  }

  /** Marca como "faltando" as notas cuja janela já passou. Retorna true se algo mudou. */
  tick(now: number): boolean {
    let changed = false;
    for (const n of this.notes) {
      if (n.status === 'pending' && now - n.t > this.window) {
        n.status = 'missed';
        this.err(n.midi);
        changed = true;
      }
    }
    return changed;
  }

  result(): ScoreResult {
    const total = this.notes.length;
    const hits = this.notes.filter((n) => n.status === 'hit').length;
    const wrong = this.notes.filter((n) => n.status === 'wrong').length;
    const missed = this.notes.filter((n) => n.status === 'missed' || n.status === 'pending').length;
    const timed = this.notes.filter((n) => n.dtMs !== undefined);
    return {
      total,
      hits,
      wrong,
      extras: this.extras,
      missed,
      errors: wrong + this.extras,
      score: total ? Math.round((100 * hits) / (total + this.extras)) : 0,
      perfect: total > 0 && hits === total && this.extras === 0,
      avgAbsDtMs: timed.length ? Math.round(timed.reduce((s, n) => s + Math.abs(n.dtMs!), 0) / timed.length) : 0,
      noteErrors: this.noteErrors,
    };
  }
}

import type { NoteEv } from '../types';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_PT = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];

export const pc = (m: number) => ((m % 12) + 12) % 12;
export const octaveOf = (m: number) => Math.floor(m / 12) - 1;
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidiFloat = (f: number) => 69 + 12 * Math.log2(f / 440);
export const noteName = (m: number) => NOTE_NAMES[pc(m)] + octaveOf(m);
export const notePt = (m: number, withOctave = true) => NOTE_NAMES_PT[pc(m)] + (withOctave ? octaveOf(m) : '');
export const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(pc(m));

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

/** Aceita "C#", "Db", "Sol", "Ré♭"… e devolve a classe de altura e o resto do texto. */
export function parsePitchClass(s: string): { pc: number; rest: string } | null {
  const m = /^(dó|do|ré|re|mi|fá|fa|sol|lá|la|si|[a-g])([#b♯♭]*)(.*)$/i.exec(s.trim());
  if (!m) return null;
  const key = m[1].toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let acc = 0;
  for (const ch of m[2]) acc += ch === '#' || ch === '♯' ? 1 : -1;
  return { pc: pc(LETTER[key] + acc), rest: m[3] };
}

export function parseNote(s: string): number | null {
  const p = parsePitchClass(s);
  if (!p || !/^-?\d$/.test(p.rest)) return null;
  return (Number(p.rest) + 1) * 12 + p.pc;
}

export const SCALES = {
  major: { label: 'Maior', steps: [0, 2, 4, 5, 7, 9, 11] },
  natural_minor: { label: 'Menor natural', steps: [0, 2, 3, 5, 7, 8, 10] },
  harmonic_minor: { label: 'Menor harmônica', steps: [0, 2, 3, 5, 7, 8, 11] },
  melodic_minor: { label: 'Menor melódica', steps: [0, 2, 3, 5, 7, 9, 11] },
} as const;
export type ScaleMode = keyof typeof SCALES;

export const TRIADS = {
  maj: { label: 'Maior', iv: [0, 4, 7], suffix: '' },
  min: { label: 'Menor', iv: [0, 3, 7], suffix: 'm' },
  dim: { label: 'Diminuto', iv: [0, 3, 6], suffix: 'dim' },
  aug: { label: 'Aumentado', iv: [0, 4, 8], suffix: 'aug' },
} as const;
export type TriadQuality = keyof typeof TRIADS;

const seqToNotes = (seq: number[], perBeat: number): NoteEv[] =>
  seq.map((midi, i) => ({ midi, beat: i / perBeat, dur: 1 / perBeat }));

function shape(base: number[], top: number, direction: 'up' | 'updown'): number[] {
  const up = [...base, top];
  return direction === 'updown' ? [...up, ...up.slice(0, -1).reverse()] : up;
}

export function buildScale(o: { tonic: number; mode: ScaleMode; octave: number; octaves: number; direction: 'up' | 'updown'; perBeat: number }): NoteEv[] {
  const root = (o.octave + 1) * 12 + o.tonic;
  const base: number[] = [];
  for (let k = 0; k < o.octaves; k++) for (const s of SCALES[o.mode].steps) base.push(root + 12 * k + s);
  return seqToNotes(shape(base, root + 12 * o.octaves, o.direction), o.perBeat);
}

export function buildArpeggio(o: { tonic: number; quality: TriadQuality; octave: number; octaves: number; direction: 'up' | 'updown'; perBeat: number }): NoteEv[] {
  const root = (o.octave + 1) * 12 + o.tonic;
  const base: number[] = [];
  for (let k = 0; k < o.octaves; k++) for (const s of TRIADS[o.quality].iv) base.push(root + 12 * k + s);
  return seqToNotes(shape(base, root + 12 * o.octaves, o.direction), o.perBeat);
}

export function parseChordSymbol(sym: string, octave: number): number[] | null {
  const p = parsePitchClass(sym);
  if (!p) return null;
  const r = p.rest.trim();
  const q: TriadQuality | null =
    r === '' || r === 'M' || r === 'maj' ? 'maj'
    : r === 'm' || r === 'min' || r === '-' ? 'min'
    : r === 'dim' || r === '°' || r === 'o' ? 'dim'
    : r === 'aug' || r === '+' ? 'aug' : null;
  if (!q) return null;
  const root = (octave + 1) * 12 + p.pc;
  return TRIADS[q].iv.map((i) => root + i);
}

/** "C G Am F" → acordes com as notas no mesmo beat. */
export function buildProgression(symbols: string, octave: number, beatsEach: number): { notes: NoteEv[]; invalid: string[] } {
  const notes: NoteEv[] = [];
  const invalid: string[] = [];
  symbols.split(/[\s,|]+/).filter(Boolean).forEach((s, i) => {
    const ch = parseChordSymbol(s, octave);
    if (!ch) return invalid.push(s);
    ch.forEach((midi) => notes.push({ midi, beat: i * beatsEach, dur: beatsEach }));
  });
  return { notes, invalid };
}

/** "C4 E4 G4 - C5": "-" é pausa. */
export function parseNoteList(text: string, perBeat: number): { notes: NoteEv[]; invalid: string[] } {
  const notes: NoteEv[] = [];
  const invalid: string[] = [];
  let i = 0;
  for (const tok of text.split(/[\s,]+/).filter(Boolean)) {
    if (tok === '-' || tok === '_') { i++; continue; }
    const m = parseNote(tok);
    if (m === null) { invalid.push(tok); continue; }
    notes.push({ midi: m, beat: i / perBeat, dur: 1 / perBeat });
    i++;
  }
  return { notes, invalid };
}

// ---------- edição do gabarito (sem regravar) ----------
export const transpose = (n: NoteEv[], st: number) => n.map((x) => ({ ...x, midi: x.midi + st }));
export const stretch = (n: NoteEv[], f: number) => n.map((x) => ({ ...x, beat: x.beat * f, dur: x.dur * f }));
export const quantize = (n: NoteEv[], grid: number) =>
  n.map((x) => ({ ...x, beat: Math.round(x.beat / grid) * grid, dur: Math.max(grid, Math.round(x.dur / grid) * grid) }));
export const totalBeats = (n: NoteEv[]) => n.reduce((mx, x) => Math.max(mx, x.beat + x.dur), 0);
export const sortNotes = (n: NoteEv[]) => [...n].sort((a, b) => a.beat - b.beat || a.midi - b.midi);

/** Agrupa notas que começam juntas (acordes). */
export function groupByBeat(notes: NoteEv[], eps = 0.02): NoteEv[][] {
  const groups: NoteEv[][] = [];
  for (const n of sortNotes(notes)) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[0].beat - n.beat) <= eps) g.push(n);
    else groups.push([n]);
  }
  return groups;
}
export const hasChords = (notes: NoteEv[]) => groupByBeat(notes).some((g) => g.length > 1);

/**
 * LIMITAÇÃO: a detecção por microfone é monofônica. Sem MIDI, um acorde não pode ser
 * validado pelo áudio; ele é convertido em arpejo (notas uma a uma dentro da duração do acorde).
 */
export function expandChordsForMic(notes: NoteEv[]): NoteEv[] {
  const out: NoteEv[] = [];
  for (const g of groupByBeat(notes)) {
    if (g.length === 1) { out.push(g[0]); continue; }
    const span = Math.max(...g.map((n) => n.dur));
    const step = span / g.length;
    g.sort((a, b) => a.midi - b.midi).forEach((n, i) => out.push({ midi: n.midi, beat: g[0].beat + i * step, dur: step }));
  }
  return out;
}

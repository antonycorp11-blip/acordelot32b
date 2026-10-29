import { describe, expect, it } from 'vitest';
import { applyExecution } from '../src/engine/progression';
import { Scorer } from '../src/engine/scorer';
import { buildProgression, buildScale, expandChordsForMic, parseChordSymbol, parseNote, parseNoteList, transpose } from '../src/lib/music';

const scale = buildScale({ tonic: 0, mode: 'major', octave: 4, octaves: 1, direction: 'up', perBeat: 1 }); // C4..C5
const at = (bpm: number, beat: number, start = 10) => start + (beat * 60) / bpm;

describe('teoria', () => {
  it('escala de Dó maior', () => expect(scale.map((n) => n.midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]));
  it('Sol menor harmônica tem Fá#', () => {
    const g = buildScale({ tonic: 7, mode: 'harmonic_minor', octave: 3, octaves: 1, direction: 'up', perBeat: 1 }).map((n) => n.midi);
    expect(g).toEqual([55, 57, 58, 60, 62, 63, 66, 67]);
  });
  it('lê notas e acordes', () => {
    expect(parseNote('C4')).toBe(60);
    expect(parseNote('Bb3')).toBe(58);
    expect(parseNote('Sol4')).toBe(67);
    expect(parseChordSymbol('Am', 4)).toEqual([69, 72, 76]);
    expect(parseNoteList('C4 - E4', 1).notes.map((n) => n.beat)).toEqual([0, 2]);
  });
  it('transpõe sem regravar', () => expect(transpose(scale, 2)[0].midi).toBe(62));
  it('sem MIDI, acorde vira arpejo', () => {
    const c = buildProgression('C', 4, 3).notes;
    const a = expandChordsForMic(c);
    expect(a.map((n) => n.beat)).toEqual([0, 1, 2]);
  });
});

describe('Etapa 3/4 · avaliação da execução', () => {
  it('execução perfeita', () => {
    const s = new Scorer(scale, 60, 10, 80, 30);
    scale.forEach((n) => s.onNote({ midi: n.midi, time: at(60, n.beat) + 0.03, source: 'midi' }));
    s.tick(100);
    const r = s.result();
    expect(r.perfect).toBe(true);
    expect(r.score).toBe(100);
  });

  it('nota fora do tempo fica vermelha e não é perfeita', () => {
    const s = new Scorer(scale, 60, 10, 80, 30);
    scale.forEach((n, i) => s.onNote({ midi: n.midi, time: at(60, n.beat) + (i === 3 ? 0.2 : 0), source: 'midi' }));
    s.tick(100);
    const r = s.result();
    expect(s.notes[3].status).toBe('wrong');
    expect(r.perfect).toBe(false);
    expect(r.noteErrors).toEqual({ F4: 1 });
  });

  it('nota errada e nota faltando', () => {
    const s = new Scorer(scale, 60, 10, 80, 30);
    scale.forEach((n, i) => { if (i !== 5) s.onNote({ midi: i === 2 ? 63 : n.midi, time: at(60, n.beat), source: 'midi' }); });
    s.tick(100);
    const r = s.result();
    expect(r.wrong).toBe(1);
    expect(r.missed).toBe(1);
    expect(r.hits).toBe(6);
  });

  it('acorde MIDI: todas as notas dentro da tolerância', () => {
    const ch = buildProgression('C', 4, 2).notes;
    const ok = new Scorer(ch, 60, 10, 50, 30);
    [60, 64, 67].forEach((m, i) => ok.onNote({ midi: m, time: 10 + i * 0.01, source: 'midi' }));
    expect(ok.result().perfect).toBe(true);
    const late = new Scorer(ch, 60, 10, 50, 30);
    [60, 64, 67].forEach((m, i) => late.onNote({ midi: m, time: 10 + i * 0.04, source: 'midi' }));
    expect(late.result().perfect).toBe(false);
  });

  it('microfone: respeita a tolerância de afinação em cents', () => {
    const s = new Scorer(scale.slice(0, 2), 60, 10, 80, 30);
    s.onNote({ midi: 60, cents: 20, time: 10, source: 'mic' });
    s.onNote({ midi: 62, cents: 45, time: 11, source: 'mic' });
    expect(s.notes.map((n) => n.status)).toEqual(['hit', 'wrong']);
  });
});

describe('Etapa 3 · regra de avanço do metrônomo', () => {
  const a = { currentBpm: 60, currentStreak: 0, targetBpm: 68, bpmStep: 4, streakRequired: 6 };
  it('sobe só depois de N perfeitas seguidas', () => {
    let s = { ...a };
    for (let i = 0; i < 5; i++) s = { ...s, ...applyExecution(s, true) };
    expect(s.currentBpm).toBe(60);
    expect(s.currentStreak).toBe(5);
    const r = applyExecution(s, true);
    expect(r).toMatchObject({ currentBpm: 64, currentStreak: 0, advanced: true });
  });
  it('um erro zera a sequência', () => expect(applyExecution({ ...a, currentStreak: 5 }, false).currentStreak).toBe(0));
  it('não passa do alvo', () => expect(applyExecution({ ...a, currentBpm: 66, currentStreak: 5 }, true).currentBpm).toBe(68));
});

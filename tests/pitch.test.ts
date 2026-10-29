import { describe, expect, it } from 'vitest';
import { freqToMidiFloat, midiToFreq } from '../src/lib/music';
import { yin } from '../src/lib/pitch';

const tone = (f: number, sr: number, n: number, harmonics = false) => {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    x[i] = 0.5 * Math.sin(2 * Math.PI * f * t) + (harmonics ? 0.3 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t) : 0);
  }
  return x;
};

describe('Etapa 1 · detecção de altura (YIN)', () => {
  it.each([
    ['Mi1 (baixo)', 28, 36],
    ['Mi2 (violão)', 40, 70],
    ['Dó4', 60, 50],
    ['Lá4', 69, 50],
    ['Dó6', 84, 50],
  ])('detecta %s', (_n, midi, minF) => {
    const sr = 48000;
    const x = tone(midiToFreq(midi), sr, 2 * Math.ceil(sr / minF) + 64, true);
    const r = yin(x, sr, minF, 2100)!;
    expect(r).not.toBeNull();
    const cents = (freqToMidiFloat(r.freq) - midi) * 100;
    expect(Math.abs(cents)).toBeLessThan(5);
  });

  it('não inventa nota em ruído', () => {
    const x = new Float32Array(2048).map(() => Math.random() * 2 - 1);
    expect(yin(x, 48000)).toBeNull();
  });
});

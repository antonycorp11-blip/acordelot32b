import { describe, expect, it } from 'vitest';
import { MicAnalyzer } from '../src/lib/micAnalyzer';
import { midiToFreq } from '../src/lib/music';

/** Piano sintético: harmônicos levemente desafinados (inarmonicidade), ataque rápido, decaimento. */
/** Sem pedal, a nota abafa ao soltar a tecla (90% do intervalo). Com `pedal`, cada nota soa 0,7 s. */
function piano(seq: number[], step: number, amp: number, opts: { sr?: number; noise?: number; legato?: boolean; pedal?: boolean; soft?: boolean } = {}) {
  const sr = opts.sr ?? 48000;
  const n = Math.round(sr * (0.8 + seq.length * step + 0.8));
  const x = new Float32Array(n);
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  seq.forEach((m, k) => {
    const f = midiToFreq(m);
    const s0 = Math.round(sr * (0.8 + k * step));
    // mesma tecla tocada de novo: a corda é reiniciada (não soma com o som anterior)
    const next = seq.indexOf(m, k + 1);
    const cut = next > 0 ? Math.round(sr * (next - k) * step) : Infinity;
    const len = Math.min(cut, Math.round(sr * (opts.legato ? step + 0.02 : opts.pedal ? 0.7 : step * 0.9 + 0.04)));
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 5) * Math.min(1, t / 0.003) * (opts.legato ? Math.min(1, (len - i) / (0.02 * sr)) : 1);
      let v = 0;
      for (let h = 1; h <= 6; h++) v += (0.6 / h) * Math.sin(2 * Math.PI * f * h * t * (1 + 0.0004 * h * h));
      const hammer = !opts.soft && i < sr * 0.004 ? rnd() * 0.5 * (1 - i / (sr * 0.004)) : 0; // ruído do martelo
      const release = Math.min(1, (len - i) / ((opts.pedal && cut === Infinity ? 0.004 : 0.03) * sr));
      x[s0 + i] += amp * (env * v * release + hammer);
    }
  });
  for (let i = 0; i < n; i++) x[i] += (opts.noise ?? 0.0015) * rnd();
  return { x, sr };
}

function run(x: Float32Array, sr: number, sensitivity = 0.65) {
  const out: { midi: number; t: number }[] = [];
  const a = new MicAnalyzer(sr, { on: (midi, _c, f) => out.push({ midi, t: f / sr }), off: () => {} });
  a.sensitivity = sensitivity;
  for (let i = 0; i + 512 <= x.length; i += 512) a.push(i + 512, x.slice(i, i + 512));
  return out;
}

const SCALE = [60, 62, 64, 65, 67, 67, 69, 71, 72, 71, 69, 67, 65, 65, 64, 62]; // com notas repetidas

describe('Microfone · detecção de notas', () => {
  it.each([
    ['volume baixo, 150 ms por nota', 0.04, 0.15],
    ['volume MUITO baixo, 150 ms', 0.012, 0.15],
    ['rápido: 110 ms por nota', 0.04, 0.11],
    ['muito rápido: 80 ms por nota', 0.04, 0.08],
    ['volume muito baixo (−42 dB) com sensibilidade alta, 150 ms', 0.008, 0.15, 48000, 0.9],
    ['celular a 44,1 kHz, 110 ms', 0.03, 0.11, 44100],
  ])('%s (inclui notas repetidas)', (_n, amp, step, rate?: number, sens?: number) => {
    const { x, sr } = piano(SCALE, step, amp, { sr: rate });
    const got = run(x, sr, sens);
    expect(got.map((g) => g.midi)).toEqual(SCALE);
    // tempo de cada ataque: até ~25 ms de erro
    got.forEach((g, k) => expect(Math.abs(g.t - (0.8 + k * step))).toBeLessThan(0.025));
  });

  it('com pedal (notas anteriores continuam soando), 150 ms', () => {
    const { x, sr } = piano(SCALE, 0.15, 0.04, { pedal: true });
    expect(run(x, sr).map((g) => g.midi)).toEqual(SCALE);
  });

  it('ataque suave, sem ruído de martelo (piano elétrico/órgão), 150 ms', () => {
    const { x, sr } = piano(SCALE, 0.15, 0.04, { soft: true });
    expect(run(x, sr).map((g) => g.midi)).toEqual(SCALE);
  });

  it('legato (sem silêncio entre as notas)', () => {
    const seq = [60, 64, 67, 72, 67, 64, 60];
    const { x, sr } = piano(seq, 0.2, 0.04, { legato: true });
    expect(run(x, sr).map((g) => g.midi)).toEqual(seq);
  });

  it('notas graves (Dó2–Dó3) e agudas (Dó6)', () => {
    const seq = [36, 43, 48, 84, 79];
    const { x, sr } = piano(seq, 0.25, 0.04);
    expect(run(x, sr).map((g) => g.midi)).toEqual(seq);
  });

  it('nota longa com tremolo forte não vira várias notas', () => {
    const sr = 48000;
    const x = new Float32Array(sr * 2);
    for (let i = 0; i < x.length; i++) {
      const t = i / sr;
      if (t < 0.3) continue;
      const trem = 0.55 + 0.45 * Math.sin(2 * Math.PI * 6 * t); // volume oscilando 6×/s
      x[i] = 0.04 * trem * Math.min(1, (t - 0.3) / 0.01) * (Math.sin(2 * Math.PI * 261.63 * t) + 0.4 * Math.sin(2 * Math.PI * 523.25 * t));
    }
    expect(run(x, sr).map((g) => g.midi)).toEqual([60]);
  });

  it('silêncio com ruído de fundo não gera nota (nem com sensibilidade máxima)', () => {
    const { x, sr } = piano([], 0.1, 0, { noise: 0.004 });
    expect(run(x, sr)).toEqual([]);
    expect(run(x, sr, 1)).toEqual([]);
  });
});

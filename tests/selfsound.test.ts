import { describe, expect, it } from 'vitest';
import { MicAnalyzer } from '../src/lib/micAnalyzer';
import { midiToFreq } from '../src/lib/music';

const SR = 48000;
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

/** "Tic" do metrônomo igual ao do app: ruído em passa-banda (~2,4–3,2 kHz), 25 ms. */
function addClicks(x: Float32Array, times: number[], amp: number) {
  for (const [k, t0] of times.entries()) {
    const f0 = k % 4 === 0 ? 3200 : 2400, q = 0.9;
    const w = (2 * Math.PI * f0) / SR, al = Math.sin(w) / (2 * q);
    const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * Math.cos(w), a2 = 1 - al;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const s0 = Math.round(t0 * SR);
    for (let i = 0; i < SR * 0.03 && s0 + i < x.length; i++) {
      const xin = rnd() * Math.exp(-i / (SR * 0.006));
      const y = (b0 * xin + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = xin; y2 = y1; y1 = y;
      x[s0 + i] += amp * 4 * y;
    }
  }
}

function addNote(x: Float32Array, midi: number, t0: number, dur: number, amp: number) {
  const f = midiToFreq(midi), s0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  for (let i = 0; i < len && s0 + i < x.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 2) * Math.min(1, t / 0.003) * Math.min(1, (len - i) / (0.03 * SR));
    let v = 0;
    for (let h = 1; h <= 6; h++) v += (0.6 / h) * Math.sin(2 * Math.PI * f * h * t * (1 + 0.0004 * h * h));
    const hammer = i < SR * 0.004 ? rnd() * 0.5 * (1 - i / (SR * 0.004)) : 0;
    x[s0 + i] += amp * (env * v + hammer);
  }
}

function run(x: Float32Array, self?: (t: number) => 'click' | 'tone' | null) {
  const out: number[] = [];
  const a = new MicAnalyzer(SR, { on: (m) => out.push(m), off: () => {}, selfSound: self && ((f) => self(f / SR)) });
  for (let i = 0; i + 512 <= x.length; i += 512) a.push(i + 512, x.slice(i, i + 512));
  return out;
}

const beats = Array.from({ length: 8 }, (_, k) => 0.5 + k * 0.5); // 120 BPM
const clickWindow = (t: number) => (beats.some((b) => t >= b - 0.03 && t <= b + 0.25) ? 'click' : null);

describe('O app não se ouve', () => {
  it('o tic do metrônomo sozinho (alto) não vira nota', () => {
    const x = new Float32Array(SR * 5);
    for (let i = 0; i < x.length; i++) x[i] = 0.001 * rnd();
    addClicks(x, beats, 0.3);
    expect(run(x)).toEqual([]);
  });

  it('o tic sobre uma nota longa não a repete', () => {
    const x = new Float32Array(SR * 5);
    addNote(x, 60, 0.3, 4, 0.05);
    addClicks(x, beats, 0.3);
    expect(run(x, clickWindow)).toEqual([60]);
  });

  it('notas tocadas junto com o clique continuam valendo', () => {
    const x = new Float32Array(SR * 5);
    const mel = [60, 64, 67, 72, 67, 64, 62, 60];
    mel.forEach((m, k) => addNote(x, m, beats[k] + 0.01, 0.45, 0.05));
    addClicks(x, beats, 0.3);
    expect(run(x, clickWindow)).toEqual(mel);
  });

  it('o som do "Ouvir" (reprodução do próprio app) não vira nota', () => {
    const x = new Float32Array(SR * 3);
    [60, 62, 64, 65].forEach((m, k) => addNote(x, m, 0.3 + k * 0.4, 0.38, 0.05));
    expect(run(x, () => 'tone')).toEqual([]);
  });
});

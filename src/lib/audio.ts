import { midiToFreq } from './music';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** Um único AudioContext para metrônomo, síntese e microfone: todos no mesmo relógio. */
export function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

export async function resumeCtx(): Promise<AudioContext> {
  const c = getCtx();
  if (c.state !== 'running') await c.resume();
  return c;
}

const out = () => (getCtx(), master!);

/**
 * Converte um instante de performance.now() (ex.: timestamp de um evento MIDI) para o
 * relógio do AudioContext "como ouvido nos alto-falantes". Assim o momento em que o aluno
 * ouve o clique e o momento em que toca ficam na mesma escala (compensa a latência de saída).
 */
export function perfToAudioTime(perfMs: number): number {
  const c = getCtx();
  const ts = c.getOutputTimestamp?.();
  if (ts && ts.performanceTime && ts.contextTime !== undefined) {
    return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  }
  const outLat = (c as AudioContext & { outputLatency?: number }).outputLatency || c.baseLatency || 0;
  return c.currentTime - (performance.now() - perfMs) / 1000 - outLat;
}

/** Tempo "ouvido agora" (no mesmo domínio de perfToAudioTime). */
export const heardNow = () => perfToAudioTime(performance.now());

export function click(time: number, accent: boolean, volume = 0.7) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = accent ? 1760 : 1175;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(volume * (accent ? 1 : 0.65), time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
  o.connect(g).connect(out());
  o.start(time);
  o.stop(time + 0.06);
}

/** Síntese simples para ouvir o gabarito. */
export function playTone(midi: number, time: number, dur: number, volume = 0.22) {
  const c = getCtx();
  const f = midiToFreq(midi);
  const g = c.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(volume, time + 0.01);
  g.gain.exponentialRampToValueAtTime(volume * 0.4, time + 0.25);
  g.gain.setValueAtTime(volume * 0.4, time + Math.max(0.26, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.3, dur) + 0.15);
  g.connect(out());
  for (const [type, mult, v] of [['triangle', 1, 1], ['sine', 2, 0.3]] as const) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = type;
    o.frequency.value = f * mult;
    og.gain.value = v;
    o.connect(og).connect(g);
    o.start(time);
    o.stop(time + Math.max(0.3, dur) + 0.2);
  }
}

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

/*
 * Sons que o próprio app toca (relógio de áudio). O microfone consulta esta lista para não
 * confundir o som do app (clique do metrônomo, "Ouvir") com o que o aluno tocou.
 */
export type SelfKind = 'click' | 'tone';
const selfSounds: { start: number; end: number; kind: SelfKind }[] = [];
function markSelf(start: number, end: number, kind: SelfKind) {
  selfSounds.push({ start, end, kind });
  const old = getCtx().currentTime - 5;
  while (selfSounds.length && selfSounds[0].end < old) selfSounds.shift();
}
/** Som do próprio app soando no instante `t` (com folga para a latência e o eco da sala). */
export function selfSoundAt(t: number): SelfKind | null {
  let k: SelfKind | null = null;
  for (const s of selfSounds) {
    if (t >= s.start - 0.03 && t <= s.end + (s.kind === 'click' ? 0.25 : 0.35)) {
      if (s.kind === 'tone') return 'tone';
      k = 'click';
    }
  }
  return k;
}

let noise: AudioBuffer | null = null;
/**
 * Clique do metrônomo: um "tic" de ruído filtrado (como um bloco de madeira), SEM nota
 * definida — o detector de altura do microfone não o transforma em nota.
 */
export function click(time: number, accent: boolean, volume = 0.7) {
  const c = getCtx();
  if (!noise) {
    noise = c.createBuffer(1, Math.round(c.sampleRate * 0.03), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noise;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = accent ? 3200 : 2400;
  bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(volume * (accent ? 1.6 : 1.1), time + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
  src.connect(bp).connect(g).connect(out());
  src.start(time);
  src.stop(time + 0.03);
  markSelf(time, time + 0.03, 'click');
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
  markSelf(time, time + Math.max(0.3, dur) + 0.2, 'tone');
}

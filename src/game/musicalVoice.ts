export type MusicalVoiceId = 'akles' | 'pippo' | 'wins' | 'huans' | 'narrator' | string;

type VoicePreset = {
  root: number;
  scale: number[];
  waveform: OscillatorType;
  speed: number;
  sustain: number;
  brightness: number;
};

const PRESETS: Record<string, VoicePreset> = {
  akles: { root: 146.83, scale: [0, 2, 3, 5, 7, 10], waveform: 'triangle', speed: .075, sustain: .11, brightness: .45 },
  pippo: { root: 293.66, scale: [0, 2, 4, 7, 9], waveform: 'sine', speed: .058, sustain: .09, brightness: .75 },
  wins: { root: 220, scale: [0, 3, 5, 7, 10], waveform: 'sine', speed: .068, sustain: .13, brightness: .9 },
  huans: { root: 164.81, scale: [0, 2, 5, 7, 9], waveform: 'triangle', speed: .052, sustain: .07, brightness: .6 },
  narrator: { root: 110, scale: [0, 5, 7, 10], waveform: 'sine', speed: .095, sustain: .15, brightness: .25 },
};

let audioContext: AudioContext | null = null;
let activeNodes: Array<OscillatorNode | GainNode | BiquadFilterNode> = [];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function presetFor(voice: MusicalVoiceId): VoicePreset {
  if (PRESETS[voice]) return PRESETS[voice];
  const h = hash(voice);
  return {
    root: [130.81, 146.83, 164.81, 196, 220][h % 5],
    scale: h % 2 ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10],
    waveform: h % 3 === 0 ? 'sine' : 'triangle',
    speed: .06 + (h % 4) * .008,
    sustain: .08 + (h % 3) * .02,
    brightness: .35 + (h % 5) * .1,
  };
}

export function stopMusicalVoice() {
  for (const node of activeNodes) {
    try {
      if ('stop' in node && typeof node.stop === 'function') node.stop();
      node.disconnect();
    } catch {}
  }
  activeNodes = [];
}

/**
 * Voz sem palavras: converte o ritmo visual do texto em uma frase musical.
 * O hash torna a frase repetível; cada personagem mantém registro e modo próprios.
 */
export function speakMusically(text: string, voice: MusicalVoiceId, volume = .12) {
  if (typeof window === 'undefined' || !text.trim() || volume <= 0) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  audioContext ??= new AudioCtx();
  if (audioContext.state === 'suspended') void audioContext.resume();
  stopMusicalVoice();

  const ctx = audioContext;
  const preset = presetFor(voice);
  const seed = hash(`${voice}:${text}`);
  const syllables = text.match(/[A-Za-zÀ-ÿ]+|[,.!?…]/g) ?? [];
  const tokens = syllables.slice(0, 22);
  let cursor = ctx.currentTime + .018;

  tokens.forEach((token, index) => {
    if (/^[,.!?…]$/.test(token)) {
      cursor += token === ',' ? preset.speed * 1.5 : preset.speed * 2.6;
      return;
    }
    const local = hash(`${seed}:${token}:${index}`);
    const degree = preset.scale[local % preset.scale.length];
    const octave = ((local >>> 5) % 3) - 1;
    const frequency = preset.root * Math.pow(2, (degree + octave * 12) / 12);
    const duration = preset.sustain + Math.min(3, token.length / 4) * .018;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    oscillator.type = preset.waveform;
    oscillator.frequency.setValueAtTime(frequency, cursor);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + preset.brightness * 2200, cursor);
    gain.gain.setValueAtTime(.0001, cursor);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), cursor + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, cursor + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + duration + .025);
    activeNodes.push(oscillator, gain, filter);
    cursor += preset.speed + Math.min(.045, token.length * .003);
  });
}

export function playMusicalTone(frequency: number, duration = .55, volume = .11) {
  if (typeof window === 'undefined' || volume <= 0) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  audioContext ??= new AudioCtx();
  if (audioContext.state === 'suspended') void audioContext.resume();
  stopMusicalVoice();
  const ctx = audioContext;
  const start = ctx.currentTime + .015;
  const oscillator = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  overtone.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, start);
  overtone.frequency.setValueAtTime(frequency * 2, start);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .025);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain);
  overtone.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  overtone.start(start);
  oscillator.stop(start + duration + .03);
  overtone.stop(start + duration + .03);
  activeNodes.push(oscillator, overtone, gain);
}

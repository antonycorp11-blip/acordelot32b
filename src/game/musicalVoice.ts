export type MusicalVoiceId = 'akles' | 'pippo' | 'wins' | 'huans' | 'narrator' | string;

type VoicePreset = {
  root: number;
  scale: number[];
  waveform: OscillatorType;
  speed: number;
  sustain: number;
  brightness: number;
  formant: number;
  roughness: number;
};

const PRESETS: Record<string, VoicePreset> = {
  akles: { root: 146.83, scale: [0, 2, 3, 5, 7, 10], waveform: 'sawtooth', speed: .075, sustain: .095, brightness: .45, formant: 720, roughness: .12 },
  pippo: { root: 293.66, scale: [0, 2, 4, 7, 9], waveform: 'triangle', speed: .058, sustain: .075, brightness: .75, formant: 1250, roughness: .04 },
  wins: { root: 220, scale: [0, 3, 5, 7, 10], waveform: 'triangle', speed: .068, sustain: .11, brightness: .9, formant: 1050, roughness: .03 },
  huans: { root: 164.81, scale: [0, 2, 5, 7, 9], waveform: 'square', speed: .052, sustain: .06, brightness: .6, formant: 820, roughness: .08 },
  narrator: { root: 110, scale: [0, 5, 7, 10], waveform: 'sawtooth', speed: .095, sustain: .13, brightness: .25, formant: 560, roughness: .15 },
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
    formant: 650 + (h % 6) * 105,
    roughness: .04 + (h % 4) * .025,
  };
}

/** Libera o sintetizador durante um gesto real do jogador (necessário no PWA/iOS). */
export function unlockMusicalVoice() {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  audioContext ??= new AudioCtx();
  if (audioContext.state === 'suspended') void audioContext.resume();
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
  const words = text.match(/[A-Za-zÀ-ÿ]+|[,.!?…]/g) ?? [];
  // Pulsos próximos de sílabas, em vez de uma nota longa por palavra. Isso
  // soa como fala fictícia musical e não como uma segunda música de fundo.
  const tokens = words.flatMap((word) => {
    if (/^[,.!?…]$/.test(word)) return [word];
    return word.match(/[^aeiouáàâãéêíóôõúü]*[aeiouáàâãéêíóôõúü]+(?:[^aeiouáàâãéêíóôõúü](?=[^aeiouáàâãéêíóôõúü]|$))?/gi) ?? [word];
  }).slice(0, 44);
  let cursor = ctx.currentTime + .018;

  tokens.forEach((token, index) => {
    if (/^[,.!?…]$/.test(token)) {
      cursor += token === ',' ? preset.speed * 1.5 : preset.speed * 2.6;
      return;
    }
    const local = hash(`${seed}:${token}:${index}`);
    const degree = preset.scale[local % Math.min(3, preset.scale.length)];
    const octave = voice === 'pippo' ? 0 : -1;
    const frequency = preset.root * Math.pow(2, (degree + octave * 12) / 12);
    const duration = preset.sustain + Math.min(2, token.length / 3) * .012;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const formant = ctx.createBiquadFilter();
    const tremolo = ctx.createOscillator();
    const tremoloGain = ctx.createGain();
    oscillator.type = preset.waveform;
    oscillator.frequency.setValueAtTime(frequency, cursor);
    oscillator.frequency.linearRampToValueAtTime(frequency * (1 + (((local >>> 9) % 5) - 2) * .006), cursor + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + preset.brightness * 2200, cursor);
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(preset.formant + (local % 4) * 75, cursor);
    formant.Q.setValueAtTime(2.4, cursor);
    tremolo.frequency.setValueAtTime(18 + preset.roughness * 70, cursor);
    tremoloGain.gain.setValueAtTime(volume * preset.roughness, cursor);
    gain.gain.setValueAtTime(.0001, cursor);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), cursor + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, cursor + duration);
    tremolo.connect(tremoloGain);
    tremoloGain.connect(gain.gain);
    oscillator.connect(filter);
    filter.connect(formant);
    formant.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(cursor);
    tremolo.start(cursor);
    oscillator.stop(cursor + duration + .025);
    tremolo.stop(cursor + duration + .025);
    activeNodes.push(oscillator, tremolo, gain, filter, formant, tremoloGain);
    cursor += preset.speed + Math.min(.022, token.length * .002);
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

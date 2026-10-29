import { getCtx, perfToAudioTime, resumeCtx } from './audio';
import { MicAnalyzer } from './micAnalyzer';

export type Source = 'midi' | 'mic';
export interface HubNote { midi: number; time: number; source: Source; velocity?: number; cents?: number }
export interface HubListener {
  noteOn?(e: HubNote): void;
  noteOff?(midi: number, time: number, source: Source): void;
  /** Nível do microfone (0..1) e o limiar atual, para o medidor. */
  level?(level: number, gate: number): void;
  status?(): void;
}

/*
 * Captura do microfone por AudioWorklet: blocos de 512 amostras (~10 ms) com o número exato
 * do quadro de áudio, então o tempo de cada nota vem do relógio de áudio, não de quando a
 * aba teve tempo de rodar.
 */
const HOP = 512;
const workletSrc = `class Tap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(${HOP});this.n=0}
process(i){const c=i[0]&&i[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===${HOP}){this.port.postMessage({f:currentFrame+k+1,d:this.b},[this.b.buffer]);this.b=new Float32Array(${HOP});this.n=0}}}return true}}
registerProcessor('tap',Tap)`;


/**
 * Hub único de entrada.
 * - MIDI: note-on/off com o timestamp do driver, convertido para o relógio de áudio.
 * - Microfone: detecção MONOFÔNICA (uma nota por vez) com YIN + detecção de ataque.
 *
 * LIMITAÇÃO: Web MIDI só existe em Chrome/Edge (desktop e Android). No Safari/iPhone
 * `midiSupported` é false e o app usa só o microfone.
 */
class InputHub {
  readonly midiSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  midiEnabled = false;
  midiDevices: string[] = [];
  midiError = '';
  micError = '';
  /** 0 = pouco sensível, 1 = muito sensível. */
  sensitivity = Number(localStorage.getItem('mic-sens') ?? '0.65');
  /** Compensação da latência de captação do microfone (ms). */
  micLatencyMs = Number(localStorage.getItem('mic-latency') ?? '20');
  down = new Set<number>();
  minFreq = 50;
  maxFreq = 2100;

  private access: MIDIAccess | null = null;
  private stream: MediaStream | null = null;
  private nodes: AudioNode[] = [];
  private ls = new Set<HubListener>();

  private mic: MicAnalyzer | null = null;

  get micEnabled() { return !!this.stream; }

  subscribe(l: HubListener) {
    this.ls.add(l);
    return () => { this.ls.delete(l); };
  }

  private emit<K extends keyof HubListener>(k: K, ...args: unknown[]) {
    this.ls.forEach((l) => (l[k] as ((...a: unknown[]) => void) | undefined)?.(...args));
  }

  setSensitivity(v: number) {
    this.sensitivity = v;
    if (this.mic) this.mic.sensitivity = v;
    localStorage.setItem('mic-sens', String(v));
  }

  /** Reconecta sozinho só o que o usuário já autorizou antes (não abre pedido de permissão). */
  async autoConnect() {
    const q = async (name: string) => {
      try { return (await navigator.permissions.query({ name: name as PermissionName })).state === 'granted'; } catch { return false; }
    };
    if (this.midiSupported && !this.midiEnabled && (await q('midi'))) await this.enableMidi();
    // sem clique o navegador deixa o áudio parado: liga no primeiro toque na tela
    addEventListener('pointerdown', () => void resumeCtx(), { once: true });
  }

  // ------------------------------------------------------------------ MIDI
  async enableMidi(): Promise<boolean> {
    if (!this.midiSupported) {
      this.midiError = 'Este navegador não tem Web MIDI (ex.: Safari no iPhone). Use Chrome ou Edge, ou o microfone.';
      this.emit('status');
      return false;
    }
    try {
      void resumeCtx(); // clique do usuário: liga o relógio de áudio
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.midiEnabled = true;
      this.midiError = '';
      this.bindMidi();
      this.access.onstatechange = () => this.bindMidi();
      return true;
    } catch {
      this.midiError = 'A permissão de MIDI foi negada no navegador.';
      this.emit('status');
      return false;
    }
  }

  private bindMidi() {
    const names: string[] = [];
    this.access!.inputs.forEach((inp) => {
      if (inp.state === 'disconnected') return;
      names.push(inp.name || 'Teclado MIDI');
      inp.onmidimessage = (ev) => this.onMidi(ev as MIDIMessageEvent);
    });
    this.midiDevices = names;
    this.emit('status');
  }

  private onMidi(ev: MIDIMessageEvent) {
    const d = ev.data;
    if (!d || d.length < 2) return;
    const cmd = d[0] & 0xf0;
    const note = d[1];
    const vel = d[2] ?? 0;
    const time = perfToAudioTime(ev.timeStamp);
    if (cmd === 0x90 && vel > 0) {
      this.down.add(note);
      this.emit('noteOn', { midi: note, time, source: 'midi', velocity: vel } satisfies HubNote);
    } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      this.down.delete(note);
      this.emit('noteOff', note, time, 'midi');
    }
  }

  // ------------------------------------------------------------------ microfone
  async enableMic(): Promise<boolean> {
    if (this.stream) return true;
    try {
      const ctx = await resumeCtx();
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([workletSrc], { type: 'application/javascript' })));
      const src = ctx.createMediaStreamSource(s);
      const tap = new AudioWorkletNode(ctx, 'tap');
      const mute = ctx.createGain();
      mute.gain.value = 0; // o worklet precisa estar ligado à saída para processar
      src.connect(tap).connect(mute).connect(ctx.destination);
      const mic = new MicAnalyzer(ctx.sampleRate, {
        on: (midi, cents, f) => this.emit('noteOn', { midi, time: this.frameTime(f), source: 'mic', cents } satisfies HubNote),
        off: (midi, f) => this.emit('noteOff', midi, this.frameTime(f), 'mic'),
        level: (l, g) => this.emit('level', l, g),
      });
      mic.sensitivity = this.sensitivity;
      mic.minFreq = this.minFreq;
      mic.maxFreq = this.maxFreq;
      this.mic = mic;
      tap.port.onmessage = (e) => mic.push(e.data.f, e.data.d);
      this.stream = s;
      this.nodes = [src, tap, mute];
      this.micError = '';
      this.emit('status');
      return true;
    } catch {
      this.micError = 'Não foi possível usar o microfone (permissão negada ou sem dispositivo).';
      this.emit('status');
      return false;
    }
  }

  disableMic() {
    this.nodes.forEach((n) => n.disconnect());
    this.nodes = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mic?.reset();
    this.mic = null;
    this.emit('status');
  }

  /** Quadro de áudio → tempo "ouvido" (mesmo domínio do metrônomo e do MIDI). */
  private frameTime(frame: number) {
    const c = getCtx();
    const outLat = (c as AudioContext & { outputLatency?: number }).outputLatency || c.baseLatency || 0;
    return frame / c.sampleRate - outLat - this.micLatencyMs / 1000;
  }
}

export const hub = new InputHub();

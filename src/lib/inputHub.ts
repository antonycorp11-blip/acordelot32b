import { getCtx, perfToAudioTime, resumeCtx } from './audio';
import { freqToMidiFloat, pc } from './music';
import { rms, yin } from './pitch';

export type Source = 'midi' | 'mic';
export interface HubNote { midi: number; time: number; source: Source; velocity?: number; cents?: number }
export interface PitchInfo { freq: number; midi: number; cents: number; clarity: number }
export interface HubListener {
  noteOn?(e: HubNote): void;
  noteOff?(midi: number, time: number, source: Source): void;
  pitch?(p: PitchInfo | null, level: number): void;
  /** Microfone confirmou (ou não) a nota tocada no teclado MIDI. */
  confirm?(midi: number, ok: boolean): void;
  status?(): void;
}

const GATE = 0.012;

/**
 * Hub único de entrada. Eventos MIDI chegam com o timestamp exato do driver
 * (MIDIMessageEvent.timeStamp) e são convertidos para o relógio de áudio.
 * O microfone é analisado com YIN (monofônico) a cada quadro de animação.
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
  /** Compensação de latência de entrada do microfone (ms), ajustável em Ferramentas. */
  micLatencyMs = Number(localStorage.getItem('mic-latency') ?? '30');
  down = new Set<number>();

  private access: MIDIAccess | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Float32Array | null = null;
  private raf = 0;
  private ls = new Set<HubListener>();
  private minF = 50;
  private maxF = 2100;
  private cur = -1;
  private cand = -1;
  private candCount = 0;
  private candPerf = 0;
  private envFloor = 0;
  private reattack = false;
  private pending: { midi: number; deadline: number }[] = [];

  get micEnabled() { return !!this.stream; }

  subscribe(l: HubListener) {
    this.ls.add(l);
    return () => { this.ls.delete(l); };
  }

  private emit<K extends keyof HubListener>(k: K, ...args: unknown[]) {
    this.ls.forEach((l) => (l[k] as ((...a: unknown[]) => void) | undefined)?.(...args));
  }

  setMicLatency(ms: number) {
    this.micLatencyMs = ms;
    localStorage.setItem('mic-latency', String(ms));
  }

  setRange(minF: number, maxF: number) {
    this.minF = minF;
    this.maxF = maxF;
  }

  async enableMidi(): Promise<boolean> {
    if (!this.midiSupported) {
      this.midiError = 'Este navegador não tem Web MIDI (ex.: Safari no iPhone). O app vai usar só o microfone.';
      this.emit('status');
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.midiEnabled = true;
      this.midiError = '';
      this.bindMidi();
      this.access.onstatechange = () => this.bindMidi();
      getCtx();
      return true;
    } catch {
      this.midiError = 'A permissão de MIDI foi negada.';
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
      if (this.stream) this.pending.push({ midi: note, deadline: performance.now() + 300 });
    } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      this.down.delete(note);
      this.emit('noteOff', note, time, 'midi');
    }
  }

  async enableMic(): Promise<boolean> {
    if (this.stream) return true;
    try {
      const ctx = await resumeCtx();
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      an.smoothingTimeConstant = 0;
      ctx.createMediaStreamSource(s).connect(an);
      this.stream = s;
      this.analyser = an;
      this.buf = new Float32Array(an.fftSize);
      this.micError = '';
      cancelAnimationFrame(this.raf);
      this.loop();
      this.emit('status');
      return true;
    } catch {
      this.micError = 'Não foi possível usar o microfone (permissão negada ou sem dispositivo).';
      this.emit('status');
      return false;
    }
  }

  disableMic() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    this.emit('status');
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.analyze();
  };

  private expire(now: number) {
    if (!this.pending.length) return;
    this.pending = this.pending.filter((p) => {
      if (p.deadline > now) return true;
      this.emit('confirm', p.midi, false);
      return false;
    });
  }

  private analyze() {
    const an = this.analyser!;
    const buf = this.buf!;
    an.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
    const sr = an.context.sampleRate;
    // janela ≈ 2 períodos da nota mais grave do instrumento
    const win = Math.min(buf.length, 2 * Math.ceil(sr / this.minF) + 64);
    const x = buf.subarray(buf.length - win);
    const level = rms(x);
    const now = performance.now();
    this.expire(now);

    if (level < GATE) {
      if (this.cur >= 0) this.emit('noteOff', this.cur, perfToAudioTime(now), 'mic');
      this.cur = -1;
      this.cand = -1;
      this.candCount = 0;
      this.envFloor = level;
      this.emit('pitch', null, level);
      return;
    }
    // novo ataque (mesma nota tocada de novo): salto de energia sobre o piso do envelope
    if (level > this.envFloor * 2.2 && level > GATE * 2) {
      this.reattack = true;
      this.candPerf = now;
    }
    this.envFloor = Math.min(level, this.envFloor + (level - this.envFloor) * 0.04);

    const r = yin(x, sr, this.minF, this.maxF);
    if (!r) { this.emit('pitch', null, level); return; }
    const mf = freqToMidiFloat(r.freq);
    const m = Math.round(mf);
    const cents = Math.round((mf - m) * 100);
    this.emit('pitch', { freq: r.freq, midi: m, cents, clarity: r.clarity } satisfies PitchInfo, level);

    if (this.pending.length) {
      this.pending = this.pending.filter((p) => {
        if (pc(p.midi) !== pc(m)) return true;
        this.emit('confirm', p.midi, true);
        return false;
      });
    }

    if (m === this.cand) this.candCount++;
    else {
      this.cand = m;
      this.candCount = 1;
      if (!this.reattack) this.candPerf = now;
    }
    // exige 2 análises seguidas com a mesma nota (≈ 30 ms) para evitar falsos ataques
    if (this.candCount >= 2 && (m !== this.cur || this.reattack)) {
      if (this.cur >= 0 && this.cur !== m) this.emit('noteOff', this.cur, perfToAudioTime(now), 'mic');
      this.cur = m;
      this.reattack = false;
      const t = perfToAudioTime(this.candPerf - (win / 2 / sr) * 1000 - this.micLatencyMs);
      this.emit('noteOn', { midi: m, time: t, source: 'mic', cents } satisfies HubNote);
    }
  }
}

export const hub = new InputHub();

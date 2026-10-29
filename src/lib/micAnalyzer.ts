import { freqToMidiFloat } from './music';
import { rms, yin } from './pitch';

export interface MicEvents {
  on(midi: number, cents: number, frame: number): void;
  off(midi: number, frame: number): void;
  level?(level: number, gate: number): void;
}

const RING = 8192;
const FLOOR_HOPS = 300; // ~3 s de histórico para estimar o ruído de fundo
const SUB = 128; // passo (~2,7 ms) para localizar o ataque
const EWIN = 512; // janela de energia (~10 ms): maior que um ciclo das notas graves
const PEAK_HIST = 40; // ~107 ms para o pico recente

/**
 * Detecção MONOFÔNICA de notas a partir de blocos de áudio (~10 ms cada).
 * - Limiar automático: acompanha o ruído de fundo do ambiente, ajustado pela sensibilidade.
 * - Ataque: salto de energia (total e de agudos) em relação aos últimos ~40 ms; pega notas
 *   rápidas e a MESMA nota tocada de novo.
 * - Altura: YIN numa janela curta (~21 ms) logo após o ataque, ou longa para notas graves.
 * Não reconhece acordes: só uma nota por vez.
 */
export class MicAnalyzer {
  minFreq = 50;
  maxFreq = 2100;
  sensitivity = 0.65;

  private ring = new Float32Array(RING);
  private wp = 0;
  private levels: number[] = [];
  private d2 = new Float32Array(EWIN); // diferença² das últimas amostras (energia de agudos)
  private d2p = 0;
  private d2sum = 0;
  private lastSample = 0;
  private eHist: number[] = [];
  private ampHist: number[] = [];
  private lastOnset = -1e9;
  private pending: { frame: number; last: number; rel: number } | null = null;
  private cur = -1;
  private cand = -1;
  private candCount = 0;
  private candFrame = 0;
  private quiet = 0;

  constructor(readonly sr: number, private ev: MicEvents) {}

  /** Últimas `n` amostras, reduzidas para metade da taxa (alcança graves com metade do custo). */
  private window(n: number): Float32Array {
    const out = new Float32Array(n >> 1);
    let p = (this.wp - n + RING) % RING;
    for (let i = 0; i < out.length; i++) {
      out[i] = (this.ring[p] + this.ring[(p + 1) % RING]) * 0.5;
      p = (p + 2) % RING;
    }
    return out;
  }

  private detect(n: number, threshold = 0.15, fallback = 0) {
    const sr = this.sr / 2;
    const r = yin(this.window(n), sr, this.minFreq, Math.min(this.maxFreq, sr * 0.45), threshold, fallback);
    if (!r) return null;
    const mf = freqToMidiFloat(r.freq);
    const midi = Math.round(mf);
    return { midi, cents: Math.round((mf - midi) * 100) };
  }

  private on(r: { midi: number; cents: number }, frame: number) {
    if (this.cur >= 0) this.ev.off(this.cur, frame);
    this.cur = r.midi;
    this.cand = r.midi;
    this.candCount = 0;
    this.ev.on(r.midi, r.cents, frame);
  }

  /** `frame` = índice da amostra logo após o fim do bloco (relógio de áudio). */
  push(frame: number, hop: Float32Array) {
    for (let i = 0; i < hop.length; i++) this.ring[(this.wp + i) % RING] = hop[i];
    this.wp = (this.wp + hop.length) % RING;
    const short = Math.round((1024 * this.sr) / 48000);
    const long = Math.min(RING, 2 * Math.ceil(this.sr / this.minFreq) + 128);

    const level = rms(hop);
    this.levels.push(level);
    if (this.levels.length > FLOOR_HOPS) this.levels.shift();
    const floor = Math.max(0.0003, Math.min(...this.levels));
    const sensFactor = Math.pow(2, (0.5 - this.sensitivity) * 4); // sens 1 → ¼ do limiar, sens 0 → 4×
    const gate = Math.max(0.001, floor * 2.2) * sensFactor;
    this.ev.level?.(level, gate);

    // ataque: energia dos agudos (diferença entre amostras) numa janela de ~10 ms, medida a
    // cada ~2,7 ms, bem acima da janela anterior. Ignora oscilações lentas (batimentos, tremolo).
    let onsetAt = -1;
    let onsetRel = 0;
    for (let i = 0; i < hop.length; i++) {
      const d = hop[i] - this.lastSample;
      this.lastSample = hop[i];
      this.d2sum += d * d - this.d2[this.d2p];
      this.d2[this.d2p] = d * d;
      this.d2p = (this.d2p + 1) % EWIN;
      if ((i + 1) % SUB) continue;
      const e = Math.max(0, this.d2sum) / EWIN;
      const prev = this.eHist.length >= EWIN / SUB ? this.eHist[this.eHist.length - EWIN / SUB] : Infinity;
      const peak = Math.max(...this.ampHist, 1e-9);
      const jump = Math.sqrt(e) - Math.sqrt(prev);
      if (onsetAt < 0 && e > prev * 1.8 && jump > peak * 0.1 && e > 1e-7) {
        onsetAt = frame - hop.length + i + 1 - EWIN / 2;
        onsetRel = jump / peak;
      }
      this.eHist.push(e);
      if (this.eHist.length > PEAK_HIST) this.eHist.shift();
      this.ampHist.push(Math.sqrt(e));
      if (this.ampHist.length > PEAK_HIST) this.ampHist.shift();
    }
    const onset = onsetAt >= 0 && level > gate && onsetAt - this.lastOnset > 0.05 * this.sr;

    if (level < gate) {
      if (++this.quiet >= 3 && this.cur >= 0) {
        this.ev.off(this.cur, frame);
        this.cur = -1;
      }
      this.cand = -1;
      this.candCount = 0;
      if (this.quiet > 6) this.pending = null;
      return;
    }
    this.quiet = 0;

    if (onset) {
      this.pending = { frame: onsetAt, last: -1, rel: onsetRel };
      this.lastOnset = onsetAt;
    }

    if (this.pending) {
      const since = frame - this.pending.frame;
      // janela inteira depois do ataque: sem mistura com a nota anterior (evita erro de oitava)
      let r = since >= short ? this.detect(short, 0.15, 0.3) : null;
      if (!r && since >= long) r = this.detect(long, 0.15, 0.3);
      // duas leituras iguais seguidas: o resto da nota anterior não engana (fundamental fantasma)
      if (r && r.midi === this.pending.last) {
        // mesma nota que já soa: só conta como nova se o golpe for forte (não é tremolo)
        if (r.midi !== this.cur || this.pending.rel > 0.25) this.on(r, this.pending.frame);
        this.pending = null;
      }
      else if (r) this.pending.last = r.midi;
      else if (since > long * 1.5) this.pending = null;
      if (this.pending && since > long * 2.5) this.pending = null;
      return;
    }

    // sem ataque claro (legato): troca de nota estável por 3 blocos (~32 ms)
    // troca sem ataque só vale com o som firme: o fim de notas que se apagam não vira nota nova
    const before = this.levels[this.levels.length - 4] ?? 0;
    if (level < gate * 2 || level < before * 0.85) { this.candCount = 0; return; }
    const r = this.detect(short, 0.1) ?? this.detect(long, 0.1);
    if (!r) return;
    if (r.midi === this.cand) this.candCount++;
    else { this.cand = r.midi; this.candCount = 1; this.candFrame = frame - short / 2; }
    if (this.candCount >= 3 && r.midi !== this.cur) this.on(r, this.candFrame);
  }

  reset() {
    if (this.cur >= 0) this.ev.off(this.cur, 0);
    this.cur = -1;
    this.pending = null;
  }
}

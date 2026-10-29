import { click, getCtx } from './audio';

/*
 * Metrônomo com agendamento no relógio do Web Audio ("lookahead scheduling").
 * Cada clique é agendado com precisão de amostra via AudioParam/start(time).
 * O Worker só "acorda" o agendador a cada 20 ms para ele pôr na fila os cliques dos
 * próximos 120 ms; atrasos desse timer não afetam o tempo do clique. Rodar no Worker
 * evita o throttling de timers da aba principal.
 */
const workerSrc = `let id=null;onmessage=e=>{clearInterval(id);if(e.data==='start')id=setInterval(()=>postMessage(0),20)}`;

export class Metronome {
  bpm = 80;
  beatsPerBar = 4;
  volume = 0.7;
  muted = false;
  running = false;
  /** Instante (relógio de áudio) do beat 0. */
  t0 = 0;
  private beat = 0;
  private next = 0;
  private worker: Worker | null = null;

  start(at: number) {
    this.t0 = at;
    this.next = at;
    this.beat = 0;
    this.running = true;
    if (!this.worker) {
      this.worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })));
      this.worker.onmessage = () => this.schedule();
    }
    this.schedule();
    this.worker.postMessage('start');
  }

  stop() {
    this.running = false;
    this.worker?.postMessage('stop');
  }

  /** Muda o andamento sem perder a fase (metrônomo livre). */
  setBpm(bpm: number) {
    if (this.running) this.t0 = this.next - (this.beat * 60) / bpm;
    this.bpm = bpm;
  }

  beatAt(time: number) {
    return ((time - this.t0) * this.bpm) / 60;
  }

  private schedule() {
    if (!this.running) return;
    const ctx = getCtx();
    while (this.next < ctx.currentTime + 0.12) {
      if (!this.muted) click(this.next, this.beat % this.beatsPerBar === 0, this.volume);
      this.beat++;
      this.next = this.t0 + (this.beat * 60) / this.bpm;
    }
  }
}

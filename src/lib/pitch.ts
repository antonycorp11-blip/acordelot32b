/** Nível RMS do bloco (0..1). */
export function rms(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/**
 * Detecção de altura monofônica pelo algoritmo YIN (de Cheveigné & Kawahara, 2002).
 * Só reconhece UMA nota por vez: acordes pelo microfone não são suportados no MVP.
 */
export function yin(x: Float32Array, sr: number, minF = 50, maxF = 2000, threshold = 0.15): { freq: number; clarity: number } | null {
  const tauMax = Math.min(Math.floor(sr / minF), Math.floor(x.length / 2));
  const tauMin = Math.max(2, Math.floor(sr / maxF));
  const W = x.length - tauMax;
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const v = x[i] - x[i + tau];
      s += v * v;
    }
    d[tau] = s;
  }
  // diferença normalizada pela média cumulativa
  d[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    run += d[tau];
    d[tau] = run > 0 ? (d[tau] * tau) / run : 1;
  }
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  let best = tau;
  if (tau > 1 && tau < tauMax) {
    const a = d[tau - 1], b = d[tau], c = d[tau + 1];
    const den = a + c - 2 * b;
    if (den !== 0) best = tau + (a - c) / (2 * den);
  }
  return { freq: sr / best, clarity: 1 - d[tau] };
}

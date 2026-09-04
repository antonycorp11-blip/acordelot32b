import React from 'react';
import type { GameEngine } from '../game/engine';

/**
 * Indicador do ciclo de dia/noite (canto superior direito).
 * Mostra o sol/lua percorrendo um domo, com o céu mudando de cor.
 */
export const DayCycleIndicator: React.FC<{ engine: GameEngine | null }> = ({ engine }) => {
  const [clock, setClock] = React.useState(engine?.dayClock ?? 0.33);

  React.useEffect(() => {
    if (!engine) return;
    let raf = 0;
    const tick = () => {
      setClock(engine.dayClock);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  // fase textual
  const phase =
    clock < 0.22 || clock >= 0.9
      ? 'Noite'
      : clock < 0.3
        ? 'Amanhecer'
        : clock < 0.46
          ? 'Manhã'
          : clock < 0.54
            ? 'Meio-dia'
            : clock < 0.7
              ? 'Tarde'
              : clock < 0.82
                ? 'Anoitecer'
                : 'Noite';

  const isDay = clock >= 0.25 && clock < 0.75;
  // t: 0..1 do nascer ao pôr (do astro vigente)
  const t = isDay ? (clock - 0.25) / 0.5 : ((clock + 0.25) % 1) / 0.5;
  const W = 116;
  const H = 60;
  const cx = W / 2;
  const cy = H - 8;
  const R = 40;
  const phi = Math.PI - t * Math.PI;
  const bx = cx + R * Math.cos(phi);
  const by = cy - R * Math.sin(phi);

  // cor do céu por hora
  const sky = (() => {
    if (clock < 0.2 || clock >= 0.92) return ['#0b1020', '#131a33'];
    if (clock < 0.29) return ['#f9a86b', '#5b6fa8']; // amanhecer
    if (clock < 0.46) return ['#7ec8f2', '#bfe6ff'];
    if (clock < 0.54) return ['#5cb8f0', '#a9e0ff'];
    if (clock < 0.7) return ['#6fb8ea', '#cfe8f8'];
    if (clock < 0.8) return ['#e88a4e', '#7c5aa0']; // anoitecer
    return ['#1a2140', '#2a2350'];
  })();

  return (
    <div
      className="pointer-events-none select-none rounded-2xl border border-white/15 shadow-xl backdrop-blur-md overflow-hidden"
      style={{ background: 'rgba(9,13,24,0.55)' }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        <defs>
          <linearGradient id="dc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[0]} />
            <stop offset="1" stopColor={sky[1]} />
          </linearGradient>
          <clipPath id="dc-clip">
            <rect x="0" y="0" width={W} height={H} rx="14" />
          </clipPath>
        </defs>
        <g clipPath="url(#dc-clip)">
          <rect x="0" y="0" width={W} height={H} fill="url(#dc-sky)" />
          {/* estrelas à noite */}
          {!isDay &&
            [
              [16, 14],
              [34, 24],
              [58, 12],
              [82, 20],
              [98, 30],
              [24, 34],
              [70, 32],
            ].map(([sx, sy], i) => (
              <circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 1.3 : 0.8} fill="#fff" opacity={0.85} />
            ))}
          {/* trilha do domo */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          {/* horizonte */}
          <rect x="0" y={cy} width={W} height={H - cy} fill="rgba(20,30,20,0.55)" />
          <line x1="0" y1={cy} x2={W} y2={cy} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* astro */}
          {isDay ? (
            <g>
              <circle cx={bx} cy={by} r="12" fill="#ffd76b" opacity="0.35" />
              <circle cx={bx} cy={by} r="6.5" fill="#ffde7a" stroke="#ffb339" strokeWidth="1.5" />
            </g>
          ) : (
            <g>
              <circle cx={bx} cy={by} r="11" fill="#cdd8ff" opacity="0.3" />
              <circle cx={bx} cy={by} r="6" fill="#e8eeff" />
              <circle cx={bx + 2.4} cy={by - 1.6} r="5" fill={sky[0]} />
            </g>
          )}
        </g>
      </svg>
      <div className="px-2 py-0.5 text-center text-[10px] font-bold tracking-wide text-slate-100">
        {phase}
      </div>
    </div>
  );
};

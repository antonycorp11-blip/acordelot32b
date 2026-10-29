import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { heardNow, playTone, resumeCtx } from './lib/audio';
import { hub } from './lib/inputHub';
import { groupByBeat, isBlack, NOTE_NAMES_PT, octaveOf, pc } from './lib/music';
import type { NoteEv } from './types';

// ---------- cores por nota: cada nota tem sempre a mesma cor ----------
export const noteColor = (m: number) => `hsl(${(pc(m) * 30 + 350) % 360} 85% 62%)`;
export const noteColorDark = (m: number) => `hsl(${(pc(m) * 30 + 350) % 360} 70% 38%)`;
export const namePt = (m: number) => NOTE_NAMES_PT[pc(m)];

const P: Record<string, ReactNode> = {
  back: <path d="M15 18l-6-6 6-6" />,
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  rec: <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none" />,
  piano: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 4v9M12 4v9M17 4v9M7 13v7M12 13v7M17 13v7" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
  trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />,
  check: <path d="m4 12 5 5L20 6" />,
  metro: <><path d="M8 21h8l-3-17h-2z" /><path d="M12 15l6-9" /></>,
  redo: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[name]}
    </svg>
  );
}

/** Re-renderiza quando o estado do MIDI/microfone muda. */
export function useHub() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => hub.subscribe({ status: bump }), []);
  return hub;
}

// ------------------------------------------------------------------ teclado virtual
/** 61 teclas (Dó2–Dó7). Teclas tocadas acendem com a cor da nota e mostram o nome. */
export function Keyboard({ lit, lo = 36, hi = 96 }: { lit: Set<number>; lo?: number; hi?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const keyRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const bw = (0.6 / whites.length) * 100;

  // no celular o teclado rola: mantém a tecla tocada à vista
  useEffect(() => {
    const first = [...lit][0];
    const el = first !== undefined ? keyRefs.current[first] : null;
    const w = wrap.current;
    if (!el || !w || w.scrollWidth <= w.clientWidth) return;
    const l = el.offsetLeft, r = l + el.offsetWidth;
    if (l < w.scrollLeft + 20 || r > w.scrollLeft + w.clientWidth - 20) w.scrollTo({ left: l - w.clientWidth / 2, behavior: 'smooth' });
  }, [lit]);

  useEffect(() => {
    const w = wrap.current; // começa centrado no Dó central
    const c = keyRefs.current[60];
    if (w && c && w.scrollWidth > w.clientWidth) w.scrollLeft = c.offsetLeft - w.clientWidth / 2 + 40;
  }, []);

  return (
    <div className="kbd-wrap" ref={wrap}>
      <div className="kbd" style={{ minWidth: whites.length * 30 }}>
        {whites.map((m) => {
          const on = lit.has(m);
          return (
            <div key={m} ref={(el) => (keyRefs.current[m] = el)} className={'kw' + (on ? ' on' : '')}
              style={on ? { background: `linear-gradient(180deg, ${noteColor(m)}, ${noteColorDark(m)})`, boxShadow: `0 0 26px ${noteColor(m)}` } : undefined}>
              {on ? <span className="klabel">{namePt(m)}<small>{octaveOf(m)}</small></span> : pc(m) === 0 && <span className="kc">Dó{octaveOf(m)}</span>}
            </div>
          );
        })}
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(isBlack).map((m) => {
          const idx = whites.indexOf(m - 1);
          const on = lit.has(m);
          return (
            <div key={m} ref={(el) => (keyRefs.current[m] = el)} className={'kb' + (on ? ' on' : '')}
              style={{ left: `calc(${((idx + 1) / whites.length) * 100}% - ${bw / 2}%)`, width: `${bw}%`, ...(on ? { background: noteColor(m), boxShadow: `0 0 22px ${noteColor(m)}` } : {}) }}>
              {on && <span className="klabel sm">{namePt(m)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ fita de notas
/** Cada nota (ou acorde) vira um bloco colorido, na ordem em que foi tocado. */
export function NoteTiles({ groups, active, follow = true }: { groups: number[][]; active?: number; follow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active !== undefined && active >= 0) {
      const t = el.children[active] as HTMLElement | undefined;
      if (t) el.scrollTo({ left: t.offsetLeft - el.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' });
    } else if (follow) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [groups.length, active, follow]);
  if (!groups.length) return <div className="tiles empty">As notas aparecem aqui conforme você toca</div>;
  return (
    <div className="tiles" ref={ref}>
      {groups.map((g, i) => (
        <div key={i} className={'tile' + (i === active ? ' active' : '') + (g.length > 1 ? ' chord' : '')}>
          {[...g].sort((a, b) => b - a).map((m) => (
            <div key={m} className="tnote" style={{ background: `linear-gradient(160deg, ${noteColor(m)}, ${noteColorDark(m)})` }}>
              {namePt(m)}<small>{octaveOf(m)}</small>
            </div>
          ))}
          <span className="tidx">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

export const toGroups = (notes: NoteEv[], bpm: number) => groupByBeat(notes, (0.06 * bpm) / 60).map((g) => g.map((n) => n.midi));

// ------------------------------------------------------------------ reprodução que acende o teclado
export function usePlayback(notes: NoteEv[], bpm: number) {
  const [playing, setPlaying] = useState(false);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(-1);
  const raf = useRef(0);
  const groups = groupByBeat(notes, (0.06 * bpm) / 60);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    setPlaying(false);
    setLit(new Set());
    setActive(-1);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const play = async () => {
    const ctx = await resumeCtx();
    const spb = 60 / bpm;
    const t0 = ctx.currentTime + 0.15;
    notes.forEach((n) => playTone(n.midi, t0 + n.beat * spb, Math.max(0.15, n.dur * spb)));
    const end = notes.reduce((mx, n) => Math.max(mx, n.beat + n.dur), 0);
    const h0 = heardNow() + 0.15;
    setPlaying(true);
    let last = '';
    const tick = () => {
      const b = (heardNow() - h0) / spb;
      if (b > end + 0.3) return stop();
      const on = new Set(notes.filter((n) => b >= n.beat && b < n.beat + Math.max(n.dur, 0.2)).map((n) => n.midi));
      const key = [...on].join(',');
      if (key !== last) {
        last = key;
        setLit(on);
        let a = -1;
        groups.forEach((g, i) => { if (g[0].beat <= b) a = i; });
        setActive(a);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  return { playing, lit, active, play, stop };
}

// ------------------------------------------------------------------ medidor do microfone
export function MicMeter() {
  const h = useHub();
  const bar = useRef<HTMLDivElement>(null);
  const gateEl = useRef<HTMLDivElement>(null);
  const [sens, setSens] = useState(h.sensitivity);
  useEffect(() => {
    // escala logarítmica: de 0,0005 (silêncio) a 0,5 (muito alto)
    const pos = (v: number) => Math.max(0, Math.min(100, ((Math.log10(Math.max(v, 0.0005)) + 3.3) / 3) * 100));
    let last = 0;
    return hub.subscribe({
      level(l, g) {
        const now = performance.now();
        if (now - last < 40) return;
        last = now;
        if (bar.current) { bar.current.style.width = pos(l) + '%'; bar.current.classList.toggle('hot', l >= g); }
        if (gateEl.current) gateEl.current.style.left = pos(g) + '%';
      },
    });
  }, []);
  return (
    <div className="meter-box">
      <div className="meter"><div ref={bar} className="meter-bar" /><div ref={gateEl} className="meter-gate" /></div>
      <label className="sens">
        <span>Sensibilidade</span>
        <input type="range" min={0} max={1} step={0.05} value={sens} onChange={(e) => { const v = Number(e.target.value); setSens(v); h.setSensitivity(v); }} />
      </label>
    </div>
  );
}

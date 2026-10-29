import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';

// ---------- ícones (traço 2px, estilo Lucide) ----------
const P: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6" /><path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.6" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  tool: <><path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L4 12l8-8z" /></>,
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></>,
  piano: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 4v9M12 4v9M17 4v9M7 13v7M12 13v7M17 13v7" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m14 6 4 4" /></>,
  logout: <><path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" /></>,
  cloud: <><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z" /></>,
  cloudOff: <><path d="M3 3l18 18M8 8.2A5 5 0 0 0 7 18h11M19 10a4 4 0 0 1 2.7 6.7M11 6.3A6 6 0 0 1 19 10" /></>,
  record: <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />,
  chart: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-7" /></>,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  back: <path d="M15 18l-6-6 6-6" />,
  send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></>,
  volume: <><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
  wave: <path d="M2 12h3l2-6 3 12 3-9 2 6 2-3h5" />,
};
export function Icon({ name, size = 20 }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[name]}
    </svg>
  );
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round">
      <path d="M4 15V9M8 18V6M12 21V3M16 17V7M20 14v-4" />
    </svg>
  );
}

// ---------- pequenos componentes ----------
const AV = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const ini = name.replace(/^Prof\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const c = AV[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AV.length];
  return (
    <div className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${c}, ${c}99)`, fontSize: size * 0.36 }}>
      {ini}
    </div>
  );
}

export function Ring({ value, max, size = 64, stroke = 7, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = max ? Math.min(1, value / max) : 0;
  const id = 'rg' + useId().replace(/:/g, '');
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor={p >= 1 ? '#34d399' : '#8b5cf6'} />
            <stop offset="1" stopColor={p >= 1 ? '#10b981' : '#ec4899'} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface3)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.24 }}>{children}</div>
    </div>
  );
}

export function Streak({ value, of }: { value: number; of: number }) {
  return (
    <span className="streak" title={`${value} de ${of} execuções perfeitas seguidas`}>
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < value ? 'on' : ''} />)}
    </span>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2>{title}</h2>
          <button className="btn ghost sm icon" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Sparkline({ values, w = 160, h = 40, color = '#a78bfa' }: { values: number[]; w?: number; h?: number; color?: string }) {
  if (values.length < 2) return <span className="dim small">—</span>;
  const mn = Math.min(...values), mx = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={`${d} L${w - 2} ${h} L2 ${h} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={color} />
    </svg>
  );
}

export function Banner({ kind = 'info', icon = 'info', children }: { kind?: 'info' | 'warn' | 'ok'; icon?: string; children: ReactNode }) {
  return <div className={'banner ' + kind}><Icon name={icon} size={18} /><div>{children}</div></div>;
}

export const Spinner = () => <div className="spin" />;

export function Empty({ icon = 'music', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ opacity: 0.5, marginBottom: 10 }}><Icon name={icon} size={36} /></div>
      <h3 style={{ color: 'var(--text)', marginBottom: 6 }}>{title}</h3>
      {children}
    </div>
  );
}

// ---------- hooks ----------
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    set((s) => ({ ...s, loading: true }));
    fn().then(
      (data) => alive && set({ data, loading: false }),
      (e) => alive && set({ error: String(e?.message ?? e), loading: false }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...state, reload };
}

let toastSet: ((s: string | null) => void) | null = null;
export function toast(msg: string) {
  toastSet?.(msg);
  setTimeout(() => toastSet?.(null), 2600);
}
export function ToastHost() {
  const [m, setM] = useState<string | null>(null);
  useEffect(() => { toastSet = setM; return () => { toastSet = null; }; }, []);
  return m ? <div className="toast">{m}</div> : null;
}

export const fmtDate = (s: string) =>
  new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

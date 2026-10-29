import { useEffect, useReducer, useRef, useState, type MutableRefObject } from 'react';
import type { NoteStatus } from '../engine/scorer';
import { playTone, resumeCtx } from '../lib/audio';
import { hub, type PitchInfo } from '../lib/inputHub';
import { isBlack, midiToFreq, noteName, notePt, totalBeats } from '../lib/music';
import { INSTRUMENTS, type Instrument, type InputMode, type NoteEv } from '../types';
import { Banner, Icon } from './kit';

/** Re-renderiza quando o estado de MIDI/microfone muda. */
export function useHubStatus() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => hub.subscribe({ status: bump }), []);
  return hub;
}

// ------------------------------------------------------------------ piano roll
type LaneNote = NoteEv & { status?: NoteStatus };
export function NoteLane({ notes, beatsPerBar = 4, beatRef, ppb = 72, compact, selected, onSelect }: {
  notes: LaneNote[];
  beatsPerBar?: number;
  /** Quando presente, a faixa rola acompanhando o beat atual (treino/gravação). */
  beatRef?: MutableRefObject<number>;
  ppb?: number;
  compact?: boolean;
  selected?: Set<number>;
  onSelect?: (i: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const H = compact ? 120 : 230;
  const total = Math.max(totalBeats(notes), beatsPerBar);
  const x0 = beatRef ? 0 : 18;
  const mids = notes.map((n) => n.midi);
  const lo = mids.length ? Math.min(...mids) - 1 : 58;
  const hi = mids.length ? Math.max(...mids) + 1 : 74;
  const y = (m: number) => 8 + ((hi - m) / Math.max(1, hi - lo)) * (H - 40) + 6;

  useEffect(() => {
    if (!beatRef) {
      if (track.current) track.current.style.transform = '';
      return;
    }
    let r = 0;
    const f = () => {
      const w = wrap.current?.clientWidth ?? 600;
      if (track.current) track.current.style.transform = `translateX(${w * 0.22 - beatRef.current * ppb}px)`;
      r = requestAnimationFrame(f);
    };
    f();
    return () => cancelAnimationFrame(r);
  }, [beatRef, ppb]);

  const lines = Array.from({ length: Math.ceil(total) + 1 }, (_, b) => b);
  return (
    <div className={'lane' + (compact ? ' compact' : '')} ref={wrap} style={beatRef ? undefined : { overflowX: 'auto' }}>
      <div className="lane-track" ref={track} style={{ width: x0 + (total + 1) * ppb, position: beatRef ? 'absolute' : 'relative', height: '100%' }}>
        {lines.map((b) => (
          <div key={b} className={'lane-bar' + (b % beatsPerBar ? ' beat' : '')} style={{ left: x0 + b * ppb }}>
            {b % beatsPerBar === 0 && !compact && <span>{b / beatsPerBar + 1}</span>}
          </div>
        ))}
        {notes.map((n, i) => (
          <div
            key={i}
            className={`chip ${n.status ?? ''}${selected?.has(i) ? ' sel' : ''}${onSelect ? ' selectable' : ''}`}
            style={{ left: x0 + n.beat * ppb, top: y(n.midi), width: Math.max(n.dur * ppb - 3, 24), height: compact ? 14 : 22, fontSize: compact ? 0 : undefined }}
            onClick={onSelect ? () => onSelect(i) : undefined}
            title={notePt(n.midi)}
          >
            {noteName(n.midi)}
          </div>
        ))}
      </div>
      {beatRef && <div className="playhead" style={{ left: '22%' }} />}
    </div>
  );
}

// ------------------------------------------------------------------ teclado
export function Keyboard({ notes, marks }: { notes: number[]; marks: Record<number, string> }) {
  let lo = notes.length ? Math.min(...notes) : 60;
  let hi = notes.length ? Math.max(...notes) : 72;
  lo = lo - (((lo % 12) + 12) % 12);
  hi = hi + (11 - (((hi % 12) + 12) % 12));
  if (hi - lo < 23) hi = lo + 23;
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const bw = (0.62 / whites.length) * 100;
  return (
    <div className="kbd">
      {whites.map((m) => (
        <div key={m} className={'w ' + (marks[m] ?? '')}>{m % 12 === 0 ? noteName(m) : ''}</div>
      ))}
      {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(isBlack).map((m) => {
        const idx = whites.indexOf(m - 1);
        return <div key={m} className={'b ' + (marks[m] ?? '')} style={{ left: `calc(${((idx + 1) / whites.length) * 100}% - ${bw / 2}%)`, width: `${bw}%` }} />;
      })}
    </div>
  );
}

// ------------------------------------------------------------------ afinador
export function Tuner({ instrument }: { instrument: Instrument }) {
  const info = INSTRUMENTS[instrument];
  const [p, setP] = useState<PitchInfo | null>(null);
  const [level, setLevel] = useState(0);
  const smooth = useRef(0);
  useEffect(() => {
    hub.setRange(info.minFreq, info.maxFreq);
    let last = 0;
    return hub.subscribe({
      pitch(pi, lv) {
        const now = performance.now();
        if (now - last < 60) return; // ~16 fps basta para a UI
        last = now;
        setLevel(lv);
        if (pi) {
          smooth.current = smooth.current * 0.6 + pi.cents * 0.4;
          setP({ ...pi, cents: Math.round(smooth.current) });
        }
      },
    });
  }, [info.minFreq, info.maxFreq]);
  const inTune = !!p && Math.abs(p.cents) <= 5;
  const angle = p ? Math.max(-50, Math.min(50, p.cents)) * 1.6 : 0;
  const nearest = info.strings && p ? info.strings.reduce((a, b) => (Math.abs(b - p.midi) < Math.abs(a - p.midi) ? b : a)) : null;
  return (
    <div className="tuner">
      <svg viewBox="0 0 220 120" width="100%" style={{ maxWidth: 300 }}>
        <defs>
          <linearGradient id="tg" x1="0" x2="1">
            <stop offset="0" stopColor="#fb7185" /><stop offset=".4" stopColor="#fbbf24" /><stop offset=".5" stopColor="#34d399" />
            <stop offset=".6" stopColor="#fbbf24" /><stop offset="1" stopColor="#fb7185" />
          </linearGradient>
        </defs>
        <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="url(#tg)" strokeWidth="8" strokeLinecap="round" opacity=".85" />
        {[-50, -25, 0, 25, 50].map((c) => {
          const a = ((c * 1.6 - 90) * Math.PI) / 180;
          return <line key={c} x1={110 + 76 * Math.cos(a)} y1={110 + 76 * Math.sin(a)} x2={110 + 68 * Math.cos(a)} y2={110 + 68 * Math.sin(a)} stroke="#5d6389" strokeWidth="2" />;
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '110px 110px', transition: 'transform .12s' }}>
          <line x1="110" y1="110" x2="110" y2="30" stroke={inTune ? '#34d399' : '#eef0fb'} strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="110" cy="110" r="7" fill="#eef0fb" />
      </svg>
      <div className={'note' + (inTune ? ' in' : '')}>{p ? notePt(p.midi, false) : '—'}</div>
      <div className="muted mono small" style={{ marginTop: 6 }}>
        {p ? `${noteName(p.midi)} · ${p.freq.toFixed(1)} Hz · ${p.cents > 0 ? '+' : ''}${p.cents} cents` : hub.micEnabled ? 'Toque uma nota…' : 'Microfone desligado'}
      </div>
      <div className="bar" style={{ maxWidth: 220, margin: '10px auto 0', height: 5 }}>
        <div style={{ width: `${Math.min(100, level * 500)}%`, background: 'var(--cyan)' }} />
      </div>
      {info.strings && (
        <div className="row wrap" style={{ justifyContent: 'center', marginTop: 14, gap: 6 }}>
          {info.strings.map((s) => (
            <button key={s} className={'btn sm' + (nearest === s ? ' primary' : '')} onClick={async () => { const c = await resumeCtx(); playTone(s, c.currentTime + 0.02, 1.2, 0.3); }}>
              {noteName(s)}
            </button>
          ))}
        </div>
      )}
      {instrument === 'keyboard' && (
        <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={async () => { const c = await resumeCtx(); playTone(69, c.currentTime + 0.02, 1.2, 0.3); }}>
          <Icon name="volume" size={16} /> Referência Lá4 = {midiToFreq(69)} Hz
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ permissões + afinação
export function DeviceSetup({ instrument, onReady, cta = 'Começar treino' }: { instrument: Instrument; onReady: (m: InputMode) => void; cta?: string }) {
  const h = useHubStatus();
  const [tuned, setTuned] = useState(false);
  const info = INSTRUMENTS[instrument];
  const wantsMidi = info.midi;
  const hasMidi = wantsMidi && h.midiDevices.length > 0;
  const mode: InputMode | null = hasMidi ? (h.micEnabled ? 'midi+mic' : 'midi') : h.micEnabled ? 'mic' : null;

  return (
    <div className="grid g2">
      <div className="card pad-lg stack">
        <div>
          <div className="tiny muted">Passo 1</div>
          <h2>Entradas de áudio</h2>
        </div>
        <Banner icon="shield">
          O app só acessa o {wantsMidi ? 'teclado MIDI e o ' : ''}microfone depois que você tocar nos botões abaixo e autorizar no navegador.
          O áudio é analisado no aparelho e <b>nunca é gravado nem enviado</b>.
        </Banner>
        {wantsMidi && (
          <div className="list-row">
            <div className="feature grow">
              <div className="ic"><Icon name="piano" /></div>
              <div>
                <b>Teclado MIDI</b>
                <div className="small muted">
                  {!h.midiSupported ? 'Sem Web MIDI neste navegador (Safari/iPhone). Use o microfone.'
                    : h.midiError ? h.midiError
                    : !h.midiEnabled ? 'Conecte o cabo USB/Bluetooth. Latência mínima, valida acordes.'
                    : h.midiDevices.length ? h.midiDevices.join(', ') : 'Permitido, mas nenhum teclado conectado.'}
                </div>
              </div>
            </div>
            {hasMidi ? <span className="pill ok"><Icon name="check" size={14} /> Ativo</span>
              : <button className="btn sm" disabled={!h.midiSupported} onClick={() => h.enableMidi()}>Permitir MIDI</button>}
          </div>
        )}
        <div className="list-row">
          <div className="feature grow">
            <div className="ic"><Icon name="mic" /></div>
            <div>
              <b>Microfone</b>
              <div className="small muted">
                {h.micError || (wantsMidi ? 'Confirma as notas do teclado e é usado sozinho quando não há MIDI.' : 'Detecta uma nota por vez (monofônico).')}
              </div>
            </div>
          </div>
          {h.micEnabled ? <span className="pill ok"><Icon name="check" size={14} /> Ativo</span>
            : <button className="btn sm" onClick={() => h.enableMic()}>Permitir microfone</button>}
        </div>
        {mode === 'mic' && wantsMidi && (
          <Banner kind="warn" icon="info">Modo só microfone: acordes serão avaliados como arpejo (uma nota por vez). Use fones de ouvido para o clique do metrônomo não atrapalhar.</Banner>
        )}
      </div>

      <div className="card pad-lg stack">
        <div>
          <div className="tiny muted">Passo 2</div>
          <h2>Afinação</h2>
        </div>
        {h.micEnabled ? <Tuner instrument={instrument} /> : (
          <Banner kind="warn" icon="info">
            {wantsMidi ? 'Teclado digital via MIDI já sai afinado. Se for usar o microfone, ative-o para conferir a afinação.' : 'Ative o microfone para usar o afinador.'}
          </Banner>
        )}
        <label className="check">
          <input type="checkbox" checked={tuned} onChange={(e) => setTuned(e.target.checked)} />
          Confirmo que meu instrumento está afinado
        </label>
        <button className="btn primary lg block" disabled={!mode || !tuned} onClick={() => mode && onReady(mode)}>
          <Icon name="play" size={18} /> {cta}
        </button>
        {!mode && <div className="small dim" style={{ textAlign: 'center' }}>Ative {wantsMidi ? 'o teclado MIDI ou ' : ''}o microfone para continuar.</div>}
      </div>
    </div>
  );
}

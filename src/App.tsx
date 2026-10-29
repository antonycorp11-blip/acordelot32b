import { useEffect, useMemo, useRef, useState } from 'react';
import { heardNow, resumeCtx } from './lib/audio';
import { hub } from './lib/inputHub';
import { Metronome } from './lib/metronome';
import { octaveOf } from './lib/music';
import { store, uid } from './store';
import type { NoteEv, Recording } from './types';
import { Icon, Keyboard, MicMeter, namePt, noteColor, NoteTiles, toGroups, useHub, usePlayback } from './ui';

const go = (p: string) => { location.hash = p; };
function useRoute() {
  const get = () => location.hash.slice(1) || '/';
  const [p, set] = useState(get);
  useEffect(() => {
    const f = () => { set(get()); scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return p;
}

export default function App() {
  const path = useRoute();
  const [toast, setToast] = useState('');
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };
  useEffect(() => { void hub.autoConnect(); }, []);
  const id = path.startsWith('/exercicio/') ? path.slice(11) : null;
  return (
    <div className="app">
      {path === '/gravar' ? <Recorder onSaved={(r) => { say('Exercício salvo'); go('/exercicio/' + r.id); }} />
        : path === '/exercicios' ? <List />
        : id ? <Viewer id={id} onDeleted={() => { say('Exercício apagado'); go('/exercicios'); }} />
        : <Home />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ início
function Home() {
  const n = store.list().length;
  return (
    <div className="home">
      <div className="logo"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round"><path d="M4 15V9M8 18V6M12 21V3M16 17V7M20 14v-4" /></svg></div>
      <h1>Acordelot Treinos</h1>
      <div className="home-btns">
        <a className="big-btn primary" href="#/gravar">
          <Icon name="piano" size={34} />
          <span>Gravar exercício de teclado</span>
        </a>
        <a className="big-btn" href="#/exercicios">
          <Icon name="list" size={34} />
          <span>Exercícios gravados</span>
          <em>{n}</em>
        </a>
      </div>
    </div>
  );
}

function Header({ title, back = '/' }: { title: string; back?: string }) {
  return (
    <header className="hdr">
      <button className="icon-btn" onClick={() => go(back)} aria-label="Voltar"><Icon name="back" size={24} /></button>
      <h2>{title}</h2>
    </header>
  );
}

// ------------------------------------------------------------------ conexão do teclado / microfone
function Connection() {
  const h = useHub();
  const midiOk = h.midiDevices.length > 0;
  return (
    <div className="conn">
      {midiOk ? (
        <span className="chip ok"><Icon name="piano" size={18} /> {h.midiDevices[0]} conectado</span>
      ) : (
        <button className="btn primary" onClick={() => h.enableMidi()} disabled={!h.midiSupported}>
          <Icon name="piano" size={18} /> {h.midiEnabled ? 'Nenhum teclado encontrado — tentar de novo' : 'Conectar teclado MIDI'}
        </button>
      )}
      {!midiOk && (h.micEnabled
        ? <span className="chip mic"><Icon name="mic" size={18} /> Microfone ativo</span>
        : <button className="btn" onClick={() => h.enableMic()}><Icon name="mic" size={18} /> Usar microfone</button>)}
      {(h.midiError || h.micError) && <p className="err">{h.midiError || h.micError}</p>}
      {!midiOk && !h.micEnabled && (
        <p className="hint">Ligue o teclado no computador ou celular pelo cabo USB. O app só acessa o teclado e o microfone depois que você toca no botão, e o som não é gravado nem enviado.</p>
      )}
      {!midiOk && h.micEnabled && <MicMeter />}
    </div>
  );
}

// ------------------------------------------------------------------ gravar
const metro = new Metronome();
type Phase = 'idle' | 'countin' | 'rec' | 'done';

function Recorder({ onSaved }: { onSaved: (r: Recording) => void }) {
  const h = useHub();
  const [phase, setPhase] = useState<Phase>('idle');
  const [bpm, setBpm] = useState(80);
  const [metroOn, setMetroOn] = useState(true);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<NoteEv[]>([]);
  const [current, setCurrent] = useState<number[]>([]);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [name, setName] = useState('');
  const rec = useRef<{ start: number; spb: number; open: Map<number, NoteEv>; list: NoteEv[]; raf: number } | null>(null);
  const lastOn = useRef(-1);
  const source = h.midiDevices.length ? 'midi' : h.micEnabled ? 'mic' : null;
  const playback = usePlayback(notes, bpm);

  // toda nota tocada acende o teclado virtual — gravando ou não
  useEffect(() => hub.subscribe({
    noteOn(e) {
      if (e.source !== (hub.midiDevices.length ? 'midi' : 'mic')) return;
      setLit((s) => new Set(s).add(e.midi));
      const t = performance.now(); // notas apertadas juntas (< 60 ms) = acorde no painel
      const together = t - lastOn.current < 60;
      lastOn.current = t;
      setCurrent((c) => (together ? [...c, e.midi] : [e.midi]));
      const r = rec.current;
      if (!r) return;
      const beat = (e.time - r.start) / r.spb;
      if (beat < -0.25) return; // tocado durante a contagem
      const n = { midi: e.midi, beat: Math.max(0, beat), dur: 0.25 };
      if (e.source === 'mic') r.open.forEach((o, m) => { o.dur = Math.max(0.1, beat - o.beat); r.open.delete(m); });
      r.list.push(n);
      r.open.set(e.midi, n);
      setNotes([...r.list]);
    },
    noteOff(m, t) {
      setLit((s) => { const n = new Set(s); n.delete(m); return n; });
      const r = rec.current;
      const o = r?.open.get(m);
      if (r && o) { o.dur = Math.max(0.1, (t - r.start) / r.spb - o.beat); r.open.delete(m); setNotes([...r.list]); }
    },
  }), []);

  useEffect(() => () => { stopRec(); metro.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    playback.stop();
    const ctx = await resumeCtx();
    const spb = 60 / bpm;
    let startAt: number;
    if (metroOn) {
      const t0 = ctx.currentTime + 0.2;
      metro.bpm = bpm;
      metro.beatsPerBar = 4;
      metro.start(t0);
      startAt = t0 + 4 * spb;
      setPhase('countin');
    } else {
      startAt = heardNow();
      setPhase('rec');
    }
    rec.current = { start: startAt, spb, open: new Map(), list: [], raf: 0 };
    setNotes([]);
    let lastC = -1, lastS = -1;
    const tick = () => {
      const r = rec.current;
      if (!r) return;
      const now = heardNow();
      if (now < r.start) {
        const c = Math.ceil((r.start - now) / spb);
        if (c !== lastC) { lastC = c; setCount(c); }
      } else {
        if (lastC !== 0) { lastC = 0; setPhase('rec'); }
        const s = Math.floor(now - r.start);
        if (s !== lastS) { lastS = s; setElapsed(s); }
      }
      r.raf = requestAnimationFrame(tick);
    };
    rec.current.raf = requestAnimationFrame(tick);
  };

  function stopRec() {
    const r = rec.current;
    if (!r) return [];
    cancelAnimationFrame(r.raf);
    metro.stop();
    const end = (heardNow() - r.start) / r.spb;
    r.open.forEach((o) => { o.dur = Math.max(0.1, end - o.beat); });
    rec.current = null;
    return r.list;
  }

  const stop = () => {
    let list = stopRec();
    if (!metroOn && list.length) { const b0 = list[0].beat; list = list.map((n) => ({ ...n, beat: n.beat - b0 })); }
    setNotes(list);
    setElapsed(0);
    if (list.length) { setName(`Exercício ${store.list().length + 1}`); setPhase('done'); }
    else setPhase('idle');
  };

  const save = () => {
    const r: Recording = { id: uid(), name: name.trim() || 'Exercício', createdAt: new Date().toISOString(), bpm, beatsPerBar: 4, source: source ?? 'midi', notes };
    store.save(r);
    onSaved(r);
  };

  const groups = useMemo(() => toGroups(notes, bpm), [notes, bpm]);
  const recording = phase === 'rec' || phase === 'countin';
  const shownLit = playback.playing ? playback.lit : lit;
  const big = playback.playing ? [...playback.lit] : current;
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="screen">
      <Header title="Gravar exercício" />
      <Connection />

      <div className={'stage' + (phase === 'rec' ? ' recording' : '')}>
        <div className="stage-top">
          {phase === 'rec' && <span className="rec-dot">● GRAVANDO {mmss}</span>}
          {phase === 'countin' && <span className="rec-dot wait">Prepare-se…</span>}
          {phase === 'idle' && <span className="muted">{source ? 'Toque algumas teclas para testar' : 'Conecte o teclado para começar'}</span>}
          {phase === 'done' && <span className="muted">{notes.length} notas gravadas</span>}
          <span className="muted">{notes.length ? `${notes.length} notas` : ''}</span>
        </div>
        <div className="now">
          {phase === 'countin' ? <span className="count">{count}</span>
            : big.length ? [...big].sort((a, b) => a - b).map((m) => (
              <span key={m} className="now-note" style={{ color: noteColor(m), textShadow: `0 0 40px ${noteColor(m)}` }}>{namePt(m)}<small>{octaveOf(m)}</small></span>
            )) : <span className="now-empty">—</span>}
        </div>
        <NoteTiles groups={groups} active={playback.playing ? playback.active : undefined} />
      </div>

      <Keyboard lit={shownLit} />

      <div className="controls">
        {phase === 'done' ? (
          <>
            <input className="name-input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do exercício" />
            <div className="row">
              <button className="btn" onClick={playback.playing ? playback.stop : playback.play}><Icon name={playback.playing ? 'stop' : 'play'} /> {playback.playing ? 'Parar' : 'Ouvir'}</button>
              <button className="btn" onClick={() => { playback.stop(); setNotes([]); setPhase('idle'); }}><Icon name="redo" /> Regravar</button>
              <button className="btn primary" onClick={save}><Icon name="check" /> Salvar</button>
            </div>
          </>
        ) : (
          <>
            <div className={'metro' + (metroOn ? '' : ' off')}>
              <button className="metro-toggle" onClick={() => setMetroOn(!metroOn)} disabled={recording} title="Liga/desliga o metrônomo">
                <Icon name="metro" /> {metroOn ? 'Metrônomo' : 'Sem metrônomo'}
              </button>
              {metroOn && (
                <div className="bpm">
                  <button onClick={() => setBpm(Math.max(30, bpm - 5))} disabled={recording}>−</button>
                  <b>{bpm}</b><span>BPM</span>
                  <button onClick={() => setBpm(Math.min(240, bpm + 5))} disabled={recording}>+</button>
                </div>
              )}
            </div>
            <button className={'rec-btn' + (recording ? ' on' : '')} onClick={recording ? stop : start} disabled={!source && !recording}
              aria-label={recording ? 'Parar gravação' : 'Gravar'}>
              <Icon name={recording ? 'stop' : 'rec'} size={recording ? 30 : 34} />
            </button>
            <span className="rec-label">{recording ? 'Parar' : 'Gravar'}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ lista
function List() {
  const [items, setItems] = useState(store.list());
  useEffect(() => setItems(store.list()), []);
  return (
    <div className="screen">
      <Header title="Exercícios gravados" />
      {!items.length ? (
        <div className="empty-state">
          <p>Nenhum exercício gravado ainda.</p>
          <a className="btn primary" href="#/gravar"><Icon name="piano" /> Gravar exercício de teclado</a>
        </div>
      ) : (
        <div className="rec-list">
          {items.map((r) => (
            <a key={r.id} className="rec-item" href={'#/exercicio/' + r.id}>
              <div className="rec-dots">
                {r.notes.slice(0, 16).map((n, i) => <i key={i} style={{ background: noteColor(n.midi) }} />)}
              </div>
              <div className="rec-info">
                <b>{r.name}</b>
                <span>{r.notes.length} notas · {r.bpm} BPM · {new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <Icon name="play" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ ver / ouvir
function Viewer({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const r = store.get(id);
  const playback = usePlayback(r?.notes ?? [], r?.bpm ?? 80);
  const groups = useMemo(() => (r ? toGroups(r.notes, r.bpm) : []), [r]);
  if (!r) return <div className="screen"><Header title="Exercício" back="/exercicios" /><p className="muted">Exercício não encontrado.</p></div>;
  return (
    <div className="screen">
      <Header title={r.name} back="/exercicios" />
      <div className="stage">
        <div className="stage-top">
          <span className="muted">{r.notes.length} notas · {r.bpm} BPM · gravado {r.source === 'midi' ? 'pelo teclado MIDI' : 'pelo microfone'}</span>
        </div>
        <div className="now">
          {playback.lit.size ? [...playback.lit].sort((a, b) => a - b).map((m) => (
            <span key={m} className="now-note" style={{ color: noteColor(m), textShadow: `0 0 40px ${noteColor(m)}` }}>{namePt(m)}<small>{octaveOf(m)}</small></span>
          )) : <span className="now-empty">—</span>}
        </div>
        <NoteTiles groups={groups} active={playback.active} follow={false} />
      </div>
      <Keyboard lit={playback.lit} />
      <div className="controls">
        <div className="row">
          <button className="btn danger" onClick={() => { if (confirm('Apagar este exercício?')) { store.remove(r.id); onDeleted(); } }}><Icon name="trash" /> Apagar</button>
          <button className="btn primary big" onClick={playback.playing ? playback.stop : playback.play}><Icon name={playback.playing ? 'stop' : 'play'} /> {playback.playing ? 'Parar' : 'Ouvir'}</button>
        </div>
      </div>
    </div>
  );
}

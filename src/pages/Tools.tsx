import { useEffect, useRef, useState } from 'react';
import { useUser } from '../App';
import { heardNow, resumeCtx } from '../lib/audio';
import { hub, type HubNote } from '../lib/inputHub';
import { Metronome } from '../lib/metronome';
import { noteName, notePt } from '../lib/music';
import { INSTRUMENTS, type Instrument } from '../types';
import { Banner, Icon } from '../ui/kit';
import { Keyboard, Tuner, useHubStatus } from '../ui/music';

const metro = new Metronome();

export default function Tools() {
  const user = useUser();
  const [tab, setTab] = useState<'input' | 'tuner' | 'metro'>('input');
  const [inst, setInst] = useState<Instrument>(user.instrument);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ferramentas</h1>
          <p className="muted">Teste o teclado MIDI e o microfone, afine o instrumento e pratique com o metrônomo livre.</p>
        </div>
        <div className="seg">
          <button className={tab === 'input' ? 'on' : ''} onClick={() => setTab('input')}>Entrada</button>
          <button className={tab === 'tuner' ? 'on' : ''} onClick={() => setTab('tuner')}>Afinador</button>
          <button className={tab === 'metro' ? 'on' : ''} onClick={() => setTab('metro')}>Metrônomo</button>
        </div>
      </div>
      <div className="row wrap" style={{ marginBottom: 16 }}>
        <span className="small muted">Instrumento:</span>
        <div className="seg">{Object.entries(INSTRUMENTS).map(([k, v]) => <button key={k} className={inst === k ? 'on' : ''} onClick={() => setInst(k as Instrument)}>{v.label}</button>)}</div>
      </div>
      {tab === 'input' && <InputTest inst={inst} />}
      {tab === 'tuner' && <TunerTab inst={inst} />}
      {tab === 'metro' && <FreeMetronome />}
    </>
  );
}

function Permissions({ inst }: { inst: Instrument }) {
  const h = useHubStatus();
  return (
    <div className="row wrap">
      {INSTRUMENTS[inst].midi && (h.midiDevices.length
        ? <span className="pill ok"><Icon name="piano" size={14} /> {h.midiDevices.join(', ')}</span>
        : <button className="btn sm" disabled={!h.midiSupported} onClick={() => h.enableMidi()}><Icon name="piano" size={16} /> {h.midiSupported ? (h.midiEnabled ? 'Nenhum teclado — reconectar' : 'Permitir MIDI') : 'Sem Web MIDI neste navegador'}</button>)}
      {h.micEnabled
        ? <><span className="pill ok"><Icon name="mic" size={14} /> Microfone ativo</span><button className="btn sm ghost" onClick={() => h.disableMic()}>Desligar</button></>
        : <button className="btn sm" onClick={() => h.enableMic()}><Icon name="mic" size={16} /> Permitir microfone</button>}
    </div>
  );
}

function InputTest({ inst }: { inst: Instrument }) {
  const [log, setLog] = useState<(HubNote & { lat: number; k: number })[]>([]);
  const [down, setDown] = useState<Record<number, string>>({});
  const [lat, setLat] = useState(hub.micLatencyMs);
  const k = useRef(0);
  useEffect(() => {
    hub.setRange(INSTRUMENTS[inst].minFreq, INSTRUMENTS[inst].maxFreq);
    return hub.subscribe({
      noteOn(e) {
        const latency = Math.round((heardNow() - e.time) * 1000); // do evento até a tela
        setLog((l) => [{ ...e, lat: latency, k: k.current++ }, ...l].slice(0, 14));
        setDown((d) => ({ ...d, [e.midi]: e.source === 'midi' ? 'down' : 'hit' }));
      },
      noteOff(m) { setDown((d) => { const n = { ...d }; delete n[m]; return n; }); },
    });
  }, [inst]);
  const midiLat = log.filter((l) => l.source === 'midi').map((l) => l.lat);
  return (
    <div className="stack">
      <div className="card stack">
        <h3>Etapa 1 · Detecção de nota</h3>
        <Banner icon="shield">MIDI e microfone só são ativados depois que você toca no botão e autoriza no navegador. O áudio não é gravado.</Banner>
        <Permissions inst={inst} />
        {!hub.midiSupported && <Banner kind="warn">Este navegador não tem Web MIDI (Safari/iPhone). Use Chrome ou Edge no computador ou no Android para usar o teclado MIDI. Aqui funciona só o microfone.</Banner>}
      </div>
      <Keyboard notes={[48, 84]} marks={down} />
      <div className="grid g2">
        <div className="card">
          <div className="section-title"><h3>Eventos</h3>{midiLat.length > 0 && <span className="pill cyan">MIDI → tela: {Math.round(midiLat.reduce((a, b) => a + b, 0) / midiLat.length)} ms</span>}</div>
          {!log.length && <p className="muted small">Toque uma nota no teclado ou no instrumento…</p>}
          <table className="t"><tbody>
            {log.map((e) => (
              <tr key={e.k}>
                <td><span className={'pill ' + (e.source === 'midi' ? 'accent' : 'cyan')}>{e.source === 'midi' ? 'MIDI' : 'Mic'}</span></td>
                <td><b>{notePt(e.midi)}</b> <span className="muted small">{noteName(e.midi)}</span></td>
                <td className="mono small muted">{e.source === 'midi' ? `vel ${e.velocity}` : `${e.cents! > 0 ? '+' : ''}${e.cents}¢`}</td>
                <td className="mono small">{e.lat} ms</td>
              </tr>
            ))}
          </tbody></table>
        </div>
        <div className="card stack">
          <h3>Calibração do microfone</h3>
          <p className="small muted">Compensa o atraso de captação do aparelho. Se as notas tocadas no tempo aparecem “atrasadas” no treino, aumente o valor.</p>
          <label className="field"><span>Latência de entrada: {lat} ms</span>
            <input type="range" min={0} max={200} step={5} value={lat} onChange={(e) => { const v = Number(e.target.value); setLat(v); hub.setMicLatency(v); }} />
          </label>
        </div>
      </div>
    </div>
  );
}

function TunerTab({ inst }: { inst: Instrument }) {
  useHubStatus();
  return (
    <div className="card pad-lg stack" style={{ maxWidth: 520, margin: '0 auto' }}>
      <Permissions inst={inst} />
      <Tuner instrument={inst} />
    </div>
  );
}

function FreeMetronome() {
  const [bpm, setBpm] = useState(80);
  const [bpb, setBpb] = useState(4);
  const [on, setOn] = useState(false);
  const [beat, setBeat] = useState(-1);
  const taps = useRef<number[]>([]);
  useEffect(() => () => metro.stop(), []);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const f = () => { setBeat(Math.floor(metro.beatAt(heardNow()))); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const change = (v: number) => { const b = Math.max(20, Math.min(300, v)); setBpm(b); metro.setBpm(b); };
  const toggle = async () => {
    if (on) { metro.stop(); setOn(false); return; }
    const ctx = await resumeCtx();
    metro.bpm = bpm;
    metro.beatsPerBar = bpb;
    metro.start(ctx.currentTime + 0.1);
    setOn(true);
  };
  const tap = () => {
    const t = performance.now();
    taps.current = [...taps.current.filter((x) => t - x < 3000), t].slice(-6);
    if (taps.current.length >= 3) {
      const d = (taps.current[taps.current.length - 1] - taps.current[0]) / (taps.current.length - 1);
      change(Math.round(60000 / d));
    }
  };
  return (
    <div className="card pad-lg stack" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
      <div className="beats" style={{ justifyContent: 'center' }}>
        {Array.from({ length: bpb }, (_, i) => <i key={i} className={(on && ((beat % bpb) + bpb) % bpb === i ? 'on' : '') + (i === 0 ? ' first' : '')} />)}
      </div>
      <div className="mono" style={{ fontSize: 72, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>{bpm}</div>
      <div className="tiny muted">BPM</div>
      <input type="range" min={20} max={300} value={bpm} onChange={(e) => change(Number(e.target.value))} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => change(bpm - 1)}>−</button>
        <button className={'bigplay' + (on ? ' stop' : '')} onClick={toggle}><Icon name={on ? 'stop' : 'play'} size={30} /></button>
        <button className="btn" onClick={() => change(bpm + 1)}>+</button>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn sm" onClick={tap}>Tap tempo</button>
        <select className="input" style={{ width: 'auto', minHeight: 34, padding: '4px 10px' }} value={bpb} disabled={on} onChange={(e) => setBpb(Number(e.target.value))}>
          {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}/4</option>)}
        </select>
      </div>
      <p className="small dim">Cliques agendados no relógio do Web Audio (precisão de amostra), não com setTimeout.</p>
    </div>
  );
}

import { useEffect, useReducer, useRef, useState } from 'react';
import { api, uid } from '../data/api';
import { heardNow, playTone, resumeCtx } from '../lib/audio';
import { hub } from '../lib/inputHub';
import { Metronome } from '../lib/metronome';
import {
  buildArpeggio, buildProgression, buildScale, NOTE_NAMES_PT, parseNoteList, quantize, SCALES, sortNotes, stretch, transpose, TRIADS,
  type ScaleMode, type TriadQuality,
} from '../lib/music';
import { go } from '../router';
import { INSTRUMENTS, KIND_LABEL, type Exercise, type ExerciseKind, type InputMode, type Instrument, type NoteEv } from '../types';
import { Banner, Empty, Icon, Modal, Spinner, toast, useAsync } from '../ui/kit';
import { DeviceSetup, NoteLane } from '../ui/music';
import { AssignForm } from './Exercises';

const metro = new Metronome();

const blank = (): Exercise => ({
  id: uid(), title: '', kind: 'scale', instrument: 'keyboard', description: '', notes: [], bpmRef: 80, beatsPerBar: 4, timingTolMs: 90, pitchTolCents: 35,
});

export default function ExerciseEditor({ id }: { id: string }) {
  const isNew = id === 'novo';
  const { data, loading } = useAsync(async () => {
    const [exercises, students] = await Promise.all([api.listExercises(), api.listStudents()]);
    return { ex: isNew ? blank() : exercises.find((e) => e.id === id), students };
  }, [id]);
  if (loading && !data) return <Spinner />;
  if (!data?.ex) return <Empty title="Exercício não encontrado" />;
  return <Editor initial={data.ex} isNew={isNew} students={data.students} />;
}

function Editor({ initial, isNew, students }: { initial: Exercise; isNew: boolean; students: import('../types').Profile[] }) {
  const [ex, setEx] = useState(initial);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(!isNew);
  const [assign, setAssign] = useState(false);
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => { setEx((e) => ({ ...e, [k]: v })); setSaved(false); };
  const setNotes = (n: NoteEv[], kind?: ExerciseKind, title?: string) => {
    setEx((e) => ({ ...e, notes: sortNotes(n), kind: kind ?? e.kind, title: e.title || title || e.title }));
    setSel(new Set());
    setSaved(false);
  };
  const edit = (f: (n: NoteEv[]) => NoteEv[]) => {
    const target = sel.size ? ex.notes.map((n, i) => (sel.has(i) ? f([n])[0] : n)) : f(ex.notes);
    setEx({ ...ex, notes: sortNotes(target) });
    setSaved(false);
  };
  const toggle = (i: number) => { const s = new Set(sel); if (s.has(i)) s.delete(i); else s.add(i); setSel(s); };

  const preview = async () => {
    const ctx = await resumeCtx();
    const spb = 60 / ex.bpmRef;
    const t0 = ctx.currentTime + 0.1;
    ex.notes.forEach((n) => playTone(n.midi, t0 + n.beat * spb, n.dur * spb));
  };

  const save = async () => {
    if (!ex.title.trim()) return toast('Dê um título ao exercício');
    if (!ex.notes.length) return toast('O gabarito está vazio');
    await api.saveExercise(ex);
    setSaved(true);
    toast('Exercício salvo no banco');
    if (isNew) history.replaceState(null, '', '#/exercicios/' + ex.id);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn ghost sm" onClick={() => go('/exercicios')} style={{ marginLeft: -10, marginBottom: 6 }}><Icon name="back" size={16} /> Exercícios</button>
          <h1>{isNew ? 'Novo exercício' : 'Editar exercício'}</h1>
        </div>
        <div className="row">
          {!isNew && (
            <button className="btn ghost danger" onClick={async () => {
              if (!confirm('Apagar este exercício e todas as atribuições dele?')) return;
              await api.deleteExercise(ex.id); toast('Exercício apagado'); go('/exercicios');
            }}><Icon name="trash" size={18} /></button>
          )}
          {saved && <button className="btn" onClick={() => setAssign(true)}><Icon name="send" size={16} /> Atribuir</button>}
          <button className="btn primary" onClick={save} disabled={saved}><Icon name="check" size={18} /> {saved ? 'Salvo' : 'Salvar'}</button>
        </div>
      </div>

      <div className="stack">
        <div className="card pad-lg">
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}><span>Título</span><input className="input" value={ex.title} onChange={(e) => set('title', e.target.value)} placeholder="ex.: Dó maior — 2 oitavas" /></label>
            <label className="field"><span>Instrumento</span>
              <select className="input" value={ex.instrument} onChange={(e) => set('instrument', e.target.value as Instrument)}>
                {Object.entries(INSTRUMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="field"><span>BPM de referência</span><input className="input" type="number" min={20} max={300} value={ex.bpmRef} onChange={(e) => set('bpmRef', Number(e.target.value))} /></label>
            <label className="field"><span>Tempos/compasso</span><input className="input" type="number" min={2} max={12} value={ex.beatsPerBar} onChange={(e) => set('beatsPerBar', Number(e.target.value))} /></label>
            <label className="field"><span>Tolerância (ms)</span><input className="input" type="number" min={10} max={500} value={ex.timingTolMs} onChange={(e) => set('timingTolMs', Number(e.target.value))} /></label>
            <label className="field"><span>Afinação (cents)</span><input className="input" type="number" min={5} max={100} value={ex.pitchTolCents} onChange={(e) => set('pitchTolCents', Number(e.target.value))} /></label>
            <label className="field" style={{ gridColumn: '1 / -1' }}><span>Orientações ao aluno</span><input className="input" value={ex.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Dedilhado, postura, dinâmica…" /></label>
          </div>
        </div>

        <Source ex={ex} onNotes={setNotes} />

        <div className="card stack">
          <div className="row between wrap">
            <div>
              <h3>Gabarito</h3>
              <div className="small muted">{ex.notes.length} notas · {sel.size ? `${sel.size} selecionada(s) — as ferramentas atuam só nelas` : 'toque nas notas para selecionar'}</div>
            </div>
            <button className="btn sm" onClick={preview} disabled={!ex.notes.length}><Icon name="volume" size={16} /> Ouvir</button>
          </div>
          <NoteLane notes={ex.notes} beatsPerBar={ex.beatsPerBar} selected={sel} onSelect={toggle} />
          <div className="row wrap" style={{ gap: 6 }}>
            <button className="btn sm danger" disabled={!sel.size} onClick={() => { setEx({ ...ex, notes: ex.notes.filter((_, i) => !sel.has(i)) }); setSel(new Set()); setSaved(false); }}><Icon name="trash" size={14} /> Apagar</button>
            <span className="dim">|</span>
            <span className="small muted">Transpor</span>
            {[-12, -1, 1, 12].map((st) => <button key={st} className="btn sm" onClick={() => edit((n) => transpose(n, st))}>{st > 0 ? '+' : ''}{st === 12 || st === -12 ? `${st / 12} 8ª` : st}</button>)}
            <span className="dim">|</span>
            <span className="small muted">Tempo</span>
            <button className="btn sm" onClick={() => edit((n) => stretch(n, 0.5))} title="Notas com metade da duração">×½</button>
            <button className="btn sm" onClick={() => edit((n) => stretch(n, 2))} title="Notas com o dobro da duração">×2</button>
            <button className="btn sm" onClick={() => edit((n) => quantize(n, 0.5))}>Quantizar ♪</button>
            <button className="btn sm" onClick={() => edit((n) => quantize(n, 0.25))}>Quantizar ♬</button>
            {sel.size > 0 && <button className="btn sm ghost" onClick={() => setSel(new Set())}>Limpar seleção</button>}
          </div>
        </div>
      </div>

      {assign && (
        <Modal title="Atribuir exercício" onClose={() => setAssign(false)}>
          <AssignForm exercises={[ex]} students={students} onDone={() => setAssign(false)} />
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------------ origem do gabarito
function Source({ ex, onNotes }: { ex: Exercise; onNotes: (n: NoteEv[], kind: ExerciseKind, title?: string) => void }) {
  const [tab, setTab] = useState<ExerciseKind>(ex.kind);
  const oct = INSTRUMENTS[ex.instrument].baseOctave;
  const [s, setS] = useState({ tonic: 0, mode: 'major' as ScaleMode, quality: 'maj' as TriadQuality, octave: oct, octaves: 1, direction: 'updown' as 'up' | 'updown', perBeat: 2, list: 'C4 E4 G4 C5 G4 E4 C4 -', chords: 'C G Am F', beatsEach: 2, arpMode: 'triad' as 'triad' | 'list' });
  const [err, setErr] = useState('');
  const upd = (k: keyof typeof s) => (e: { target: { value: string } }) => setS({ ...s, [k]: isNaN(Number(e.target.value)) || k === 'list' || k === 'chords' ? e.target.value : Number(e.target.value) });
  useEffect(() => setS((x) => ({ ...x, octave: oct })), [oct]);

  const generate = () => {
    setErr('');
    const ton = NOTE_NAMES_PT[s.tonic];
    if (tab === 'scale') onNotes(buildScale(s), 'scale', `${ton} ${SCALES[s.mode].label.toLowerCase()}`);
    if (tab === 'arpeggio') {
      if (s.arpMode === 'triad') onNotes(buildArpeggio(s), 'arpeggio', `Arpejo de ${ton} ${TRIADS[s.quality].label.toLowerCase()}`);
      else {
        const r = parseNoteList(s.list, s.perBeat);
        if (r.invalid.length) return setErr('Notas não reconhecidas: ' + r.invalid.join(', '));
        onNotes(r.notes, 'arpeggio', 'Sequência melódica');
      }
    }
    if (tab === 'chord') {
      const r = buildProgression(s.chords, s.octave, s.beatsEach);
      if (r.invalid.length) return setErr('Acordes não reconhecidos: ' + r.invalid.join(', '));
      onNotes(r.notes, 'chord', 'Acordes ' + s.chords);
    }
  };

  const Tonic = <label className="field"><span>Tônica</span><select className="input" value={s.tonic} onChange={upd('tonic')}>{NOTE_NAMES_PT.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></label>;
  const Common = (
    <>
      <label className="field"><span>Oitava</span><input className="input" type="number" min={1} max={6} value={s.octave} onChange={upd('octave')} /></label>
      <label className="field"><span>Extensão</span><select className="input" value={s.octaves} onChange={upd('octaves')}><option value={1}>1 oitava</option><option value={2}>2 oitavas</option><option value={3}>3 oitavas</option></select></label>
      <label className="field"><span>Direção</span><select className="input" value={s.direction} onChange={(e) => setS({ ...s, direction: e.target.value as 'up' | 'updown' })}><option value="up">Subida</option><option value="updown">Subida e descida</option></select></label>
      <label className="field"><span>Notas por tempo</span><select className="input" value={s.perBeat} onChange={upd('perBeat')}><option value={1}>1 (semínima)</option><option value={2}>2 (colcheias)</option><option value={3}>3 (tercinas)</option><option value={4}>4 (semicolcheias)</option></select></label>
    </>
  );

  return (
    <div className="card pad-lg stack">
      <div className="row between wrap">
        <h3>Origem do gabarito</h3>
        <div className="seg">
          {(['scale', 'arpeggio', 'chord', 'recording'] as const).map((k) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k === 'recording' ? <><Icon name="record" size={12} /> Gravar</> : KIND_LABEL[k]}</button>
          ))}
        </div>
      </div>
      {tab === 'scale' && (
        <div className="form-grid">
          {Tonic}
          <label className="field"><span>Modo</span><select className="input" value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value as ScaleMode })}>{Object.entries(SCALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          {Common}
        </div>
      )}
      {tab === 'arpeggio' && (
        <>
          <div className="seg"><button className={s.arpMode === 'triad' ? 'on' : ''} onClick={() => setS({ ...s, arpMode: 'triad' })}>Arpejo de tríade</button><button className={s.arpMode === 'list' ? 'on' : ''} onClick={() => setS({ ...s, arpMode: 'list' })}>Lista de notas</button></div>
          {s.arpMode === 'triad' ? (
            <div className="form-grid">
              {Tonic}
              <label className="field"><span>Qualidade</span><select className="input" value={s.quality} onChange={(e) => setS({ ...s, quality: e.target.value as TriadQuality })}>{Object.entries(TRIADS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
              {Common}
            </div>
          ) : (
            <div className="form-grid">
              <label className="field" style={{ gridColumn: '1 / -1' }}><span>Notas (C4, D#4, Bb3… e “-” para pausa)</span><textarea className="input" value={s.list} onChange={upd('list')} /></label>
              <label className="field"><span>Notas por tempo</span><select className="input" value={s.perBeat} onChange={upd('perBeat')}><option value={1}>1</option><option value={2}>2</option><option value={4}>4</option></select></label>
            </div>
          )}
        </>
      )}
      {tab === 'chord' && (
        <>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}><span>Acordes (ex.: C G Am F, Dm, Bdim, Eaug)</span><input className="input" value={s.chords} onChange={upd('chords')} /></label>
            <label className="field"><span>Oitava</span><input className="input" type="number" min={1} max={6} value={s.octave} onChange={upd('octave')} /></label>
            <label className="field"><span>Tempos por acorde</span><input className="input" type="number" min={1} max={8} value={s.beatsEach} onChange={upd('beatsEach')} /></label>
          </div>
          <Banner>Com teclado MIDI, o aluno toca as 3 notas juntas (dentro da tolerância). Sem MIDI, o app aceita o acorde tocado em arpejo — o microfone é monofônico.</Banner>
        </>
      )}
      {tab === 'recording' ? (
        <Recorder ex={ex} onDone={(n) => onNotes(n, 'recording', 'Trecho gravado')} />
      ) : (
        <>
          {err && <Banner kind="warn">{err}</Banner>}
          <div><button className="btn primary" onClick={generate}><Icon name="zap" size={16} /> Gerar gabarito</button>
            {ex.notes.length > 0 && <span className="small dim" style={{ marginLeft: 10 }}>substitui o gabarito atual</span>}</div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ gravação pelo teclado MIDI
function Recorder({ ex, onDone }: { ex: Exercise; onDone: (n: NoteEv[]) => void }) {
  const [mode, setMode] = useState<InputMode | null>(null);
  const [rec, setRec] = useState(false);
  const [q, setQ] = useState(true);
  const [countIn, setCountIn] = useState<number | null>(null);
  const notesRef = useRef<NoteEv[]>([]);
  const beatRef = useRef(-ex.beatsPerBar);
  const stopRef = useRef<(() => void) | null>(null);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => () => stopRef.current?.(), []);

  if (!mode) return <DeviceSetup instrument={ex.instrument} onReady={setMode} cta="Pronto para gravar" />;

  const start = async () => {
    const ctx = await resumeCtx();
    const spb = 60 / ex.bpmRef;
    const t0 = ctx.currentTime + 0.3;
    metro.bpm = ex.bpmRef;
    metro.beatsPerBar = ex.beatsPerBar;
    metro.start(t0);
    const recStart = t0 + ex.beatsPerBar * spb;
    const src = mode === 'mic' ? 'mic' : 'midi';
    const open = new Map<number, NoteEv>();
    notesRef.current = [];
    const toBeat = (t: number) => (t - recStart) / spb;
    const close = (n: NoteEv, t: number) => { n.dur = Math.max(0.1, toBeat(t) - n.beat); };
    const unsub = hub.subscribe({
      noteOn(e) {
        if (e.source !== src) return;
        const b = toBeat(e.time);
        if (b < -0.3) return; // ignora o que foi tocado durante a contagem
        if (src === 'mic') open.forEach((n) => close(n, e.time)), open.clear(); // monofônico
        const n = { midi: e.midi, beat: Math.max(0, b), dur: 0.25 };
        notesRef.current.push(n);
        open.set(e.midi, n);
        bump();
      },
      noteOff(midi, t, s) {
        if (s !== src) return;
        const n = open.get(midi);
        if (n) { close(n, t); open.delete(midi); bump(); }
      },
    });
    let raf = 0, lastC = -1;
    const tick = () => {
      const now = heardNow();
      beatRef.current = toBeat(now);
      const c = now < recStart ? Math.ceil((recStart - now) / spb) : 0;
      if (c !== lastC) { lastC = c; setCountIn(c || null); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    stopRef.current = () => {
      cancelAnimationFrame(raf);
      metro.stop();
      unsub();
      const now = heardNow();
      open.forEach((n) => close(n, now));
      stopRef.current = null;
    };
    setRec(true);
  };

  const stop = () => {
    stopRef.current?.();
    setRec(false);
    setCountIn(null);
    const n = q ? quantize(notesRef.current, 0.25) : notesRef.current;
    if (n.length) { onDone(n); toast(`${n.length} notas gravadas`); }
  };

  return (
    <div className="stack">
      <Banner icon="piano">
        Toque o trecho {mode === 'mic' ? 'no instrumento (microfone, uma nota por vez)' : 'no teclado MIDI'} acompanhando o metrônomo a {ex.bpmRef} BPM.
        Há um compasso de contagem. A sequência de notas e os tempos viram o gabarito — não é preciso digitar nada.
      </Banner>
      <div style={{ position: 'relative' }}>
        <NoteLane notes={notesRef.current} beatsPerBar={ex.beatsPerBar} beatRef={rec ? beatRef : undefined} />
        {countIn !== null && <div className="countin grad-text">{countIn}</div>}
      </div>
      <div className="row wrap">
        <button className={'btn lg ' + (rec ? '' : 'primary')} onClick={rec ? stop : start}>
          <Icon name={rec ? 'stop' : 'record'} size={18} /> {rec ? 'Parar e usar gravação' : 'Gravar'}
        </button>
        <label className="check small"><input type="checkbox" checked={q} onChange={(e) => setQ(e.target.checked)} disabled={rec} /> Quantizar para semicolcheia</label>
        {rec && <span className="pill bad"><span className="dot" /> Gravando · {notesRef.current.length} notas</span>}
      </div>
    </div>
  );
}

import { useEffect, useReducer, useRef, useState } from 'react';
import { useUser } from '../App';
import { uid } from '../data/api';
import { outbox } from '../data/outbox';
import { applyExecution, type ProgressOutcome } from '../engine/progression';
import { Scorer, type ScoreResult } from '../engine/scorer';
import { countOnDay } from '../engine/stats';
import { heardNow, playTone, resumeCtx } from '../lib/audio';
import { hub } from '../lib/inputHub';
import { Metronome } from '../lib/metronome';
import { expandChordsForMic, hasChords, notePt } from '../lib/music';
import { go } from '../router';
import { INSTRUMENTS, KIND_LABEL, type Assignment, type Execution, type Exercise, type InputMode } from '../types';
import { Banner, Empty, Icon, Ring, Spinner, Streak, useAsync } from '../ui/kit';
import { DeviceSetup, Keyboard, NoteLane } from '../ui/music';
import { loadStudentDay } from './studentData';

type Phase = 'setup' | 'ready' | 'run' | 'result';
type Result = ScoreResult & { outcome: ProgressOutcome; bpm: number; confirm: { ok: number; fail: number } };

const metro = new Metronome();

export default function Practice({ assignmentId }: { assignmentId: string }) {
  const user = useUser();
  const { data, loading } = useAsync(() => loadStudentDay(user.id), [user.id]);
  if (loading && !data) return <Spinner />;
  const a = data?.assignments.find((x) => x.id === assignmentId);
  const ex = a && data?.exercises.find((e) => e.id === a.exerciseId);
  if (!a || !ex) return <Empty title="Exercício não encontrado"><button className="btn" onClick={() => go('/')}>Voltar</button></Empty>;
  return <PracticeRun initial={a} ex={ex} todayInitial={countOnDay(data!.today, a.id)} studentId={user.id} />;
}

function PracticeRun({ initial, ex, todayInitial, studentId }: { initial: Assignment; ex: Exercise; todayInitial: number; studentId: string }) {
  const [asg, setAsg] = useState(initial);
  const [today, setToday] = useState(todayInitial);
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<InputMode>('midi');
  const [result, setResult] = useState<Result | null>(null);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [countIn, setCountIn] = useState<number | null>(null);
  const [beat, setBeat] = useState(-1);
  const [live, setLive] = useState('');
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const beatRef = useRef(-0.5); // em repouso, as primeiras notas ficam visíveis logo após o cursor
  const scorerRef = useRef<Scorer | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const confirmRef = useRef({ ok: 0, fail: 0 });
  const info = INSTRUMENTS[ex.instrument];
  const isKeys = ex.instrument === 'keyboard';
  const notes = mode === 'mic' ? expandChordsForMic(ex.notes) : ex.notes;

  useEffect(() => () => { stopRef.current?.(); }, []);

  // mantém a tela acesa durante o treino (quando suportado)
  useEffect(() => {
    if (phase !== 'run' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then((l) => (lock = l), () => {});
    return () => { lock?.release(); };
  }, [phase]);

  const start = async () => {
    const ctx = await resumeCtx();
    const bpm = asg.currentBpm;
    const bpb = ex.beatsPerBar;
    const spb = 60 / bpm;
    hub.setRange(info.minFreq, info.maxFreq);
    confirmRef.current = { ok: 0, fail: 0 };
    const t0 = ctx.currentTime + 0.3;
    metro.bpm = bpm;
    metro.beatsPerBar = bpb;
    metro.start(t0);
    const startAt = t0 + bpb * spb; // 1 compasso de contagem
    const scorer = new Scorer(notes, bpm, startAt, ex.timingTolMs, ex.pitchTolCents, mode === 'mic');
    scorerRef.current = scorer;
    const src = mode === 'mic' ? 'mic' : 'midi';
    setMarks({});
    setResult(null);
    setPhase('run');

    // Caminho de baixa latência: o evento MIDI é avaliado no próprio handler e a UI é atualizada no mesmo quadro.
    const unsub = hub.subscribe({
      noteOn(e) {
        if (e.source !== src) return;
        const r = scorer.onNote(e);
        setMarks((m) => ({ ...m, [e.midi]: r?.status === 'hit' ? 'hit' : 'wrong' }));
        setLive(notePt(e.midi));
        bump();
      },
      noteOff(midi, _t, s) {
        if (s !== src) return;
        setMarks((m) => { const n = { ...m }; delete n[midi]; return n; });
      },
      confirm(_m, ok) {
        if (ok) confirmRef.current.ok++;
        else confirmRef.current.fail++;
      },
    });

    let raf = 0;
    let lastCount = -99, lastBeat = -99;
    const stop = () => { cancelAnimationFrame(raf); metro.stop(); unsub(); stopRef.current = null; };
    stopRef.current = stop;
    const tick = () => {
      const now = heardNow();
      beatRef.current = (now - startAt) / spb;
      const b = Math.floor((now - t0) / spb);
      const c = now < startAt ? bpb - b : 0;
      if (c !== lastCount) { lastCount = c; setCountIn(c > 0 && c <= bpb ? c : null); }
      if (b !== lastBeat) { lastBeat = b; setBeat(b); }
      if (scorer.tick(now)) bump();
      if (now > scorer.endTime) { stop(); finish(scorer, bpm); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const finish = (scorer: Scorer, bpm: number) => {
    const r = scorer.result();
    const outcome = applyExecution(asg, r.perfect);
    const exec: Execution = {
      id: uid(), assignmentId: asg.id, studentId, exerciseId: ex.id, performedAt: new Date().toISOString(), bpm,
      hits: r.hits, errors: r.errors, missed: r.missed, score: r.score, perfect: r.perfect, noteErrors: r.noteErrors, inputMode: mode,
    };
    outbox.add(exec, { currentBpm: outcome.currentBpm, currentStreak: outcome.currentStreak });
    setAsg((x) => ({ ...x, currentBpm: outcome.currentBpm, currentStreak: outcome.currentStreak }));
    setToday((t) => t + 1);
    setResult({ ...r, outcome, bpm, confirm: { ...confirmRef.current } });
    setCountIn(null);
    setPhase('result');
  };

  const abort = () => { stopRef.current?.(); setCountIn(null); setPhase('ready'); beatRef.current = -0.5; };

  const preview = async () => {
    const ctx = await resumeCtx();
    const spb = 60 / asg.currentBpm;
    const t0 = ctx.currentTime + 0.15;
    ex.notes.forEach((n) => playTone(n.midi, t0 + n.beat * spb, n.dur * spb));
  };

  // atalho: barra de espaço inicia/para
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || phase === 'setup') return;
      e.preventDefault();
      if (phase === 'run') abort();
      else void start();
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  });

  const scorer = scorerRef.current;
  const laneNotes = phase === 'run' || phase === 'result' ? scorer?.notes ?? notes : notes;
  // próxima(s) nota(s) esperada(s) acesas no teclado
  const expMarks: Record<number, string> = {};
  if (phase === 'run' && scorer) {
    const nxt = scorer.notes.find((n) => n.status === 'pending');
    if (nxt) scorer.notes.filter((n) => n.status === 'pending' && Math.abs(n.t - nxt.t) < 0.01).forEach((n) => (expMarks[n.midi] = 'exp'));
  }
  const remaining = Math.max(0, asg.repsPerDay - today);

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn ghost sm" onClick={() => go('/')} style={{ marginLeft: -10, marginBottom: 6 }}><Icon name="back" size={16} /> Hoje</button>
          <div className="row wrap" style={{ gap: 6, marginBottom: 6 }}>
            <span className="pill accent">{KIND_LABEL[ex.kind]}</span>
            <span className="pill">{info.label}</span>
            {phase !== 'setup' && <span className="pill cyan">{mode === 'mic' ? 'Microfone' : mode === 'midi+mic' ? 'MIDI + microfone' : 'MIDI'}</span>}
          </div>
          <h1>{ex.title}</h1>
          {ex.description && <p className="muted">{ex.description}</p>}
        </div>
        <div className="row" style={{ gap: 14 }}>
          <Ring value={today} max={asg.repsPerDay} size={64}>{today >= asg.repsPerDay ? <Icon name="check" /> : `${today}/${asg.repsPerDay}`}</Ring>
        </div>
      </div>

      {phase === 'setup' ? (
        <DeviceSetup instrument={ex.instrument} onReady={(m) => { setMode(m); setPhase('ready'); }} />
      ) : (
        <div className="stack">
          <div className="grid g4">
            <div className="card stat"><div className="tiny muted">Velocidade</div><div className="v mono">{asg.currentBpm}<small>BPM</small></div></div>
            <div className="card stat"><div className="tiny muted">Alvo</div><div className="v mono">{asg.targetBpm}<small>BPM</small></div></div>
            <div className="card stat">
              <div className="tiny muted">Perfeitas seguidas</div>
              <div className="v mono">{asg.currentStreak}<small>/ {asg.streakRequired}</small></div>
              <Streak value={asg.currentStreak} of={asg.streakRequired} />
            </div>
            <div className="card stat"><div className="tiny muted">Faltam hoje</div><div className="v mono">{remaining}<small>rep.</small></div></div>
          </div>

          {mode === 'mic' && hasChords(ex.notes) && (
            <Banner kind="warn">Sem teclado MIDI, os acordes viram arpejo: toque as notas do acorde uma de cada vez, de baixo para cima.</Banner>
          )}

          <div className="card" style={{ padding: 12, position: 'relative' }}>
            <NoteLane notes={laneNotes} beatsPerBar={ex.beatsPerBar} beatRef={phase === 'result' ? undefined : beatRef} ppb={innerWidth < 600 ? 54 : 72} />
            {countIn !== null && <div className="countin grad-text">{countIn}</div>}
          </div>

          {isKeys && <Keyboard notes={ex.notes.map((n) => n.midi)} marks={{ ...expMarks, ...marks }} />}

          <div className="card row between wrap" style={{ gap: 16 }}>
            <div className="beats">
              {Array.from({ length: ex.beatsPerBar }, (_, i) => (
                <i key={i} className={(phase === 'run' && ((beat % ex.beatsPerBar) + ex.beatsPerBar) % ex.beatsPerBar === i ? 'on' : '') + (i === 0 ? ' first' : '')} />
              ))}
            </div>
            <div className="live-note">{phase === 'run' ? live || '—' : ''}</div>
            <div className="row">
              {phase !== 'run' && <button className="btn" onClick={preview} title="Ouvir o gabarito"><Icon name="volume" size={18} /> Ouvir</button>}
              <button className={'bigplay' + (phase === 'run' ? ' stop' : '')} onClick={phase === 'run' ? abort : start} aria-label={phase === 'run' ? 'Parar' : 'Tocar'}>
                <Icon name={phase === 'run' ? 'stop' : 'play'} size={30} />
              </button>
            </div>
          </div>

          {result && phase === 'result' && <ResultCard r={result} asg={asg} remaining={remaining} onAgain={start} />}
          {phase === 'ready' && <p className="small dim" style={{ textAlign: 'center' }}>Toque ▶ (ou barra de espaço). Um compasso de contagem antes de começar.</p>}
        </div>
      )}
    </>
  );
}

function ResultCard({ r, asg, remaining, onAgain }: { r: Result; asg: Assignment; remaining: number; onAgain: () => void }) {
  return (
    <div className={'card result' + (r.perfect ? ' perfect' : '')}>
      <div className="tiny muted">{r.perfect ? 'Execução perfeita' : 'Resultado'}</div>
      <div className={'score ' + (r.perfect ? '' : 'grad-text')} style={r.perfect ? { color: 'var(--ok)' } : undefined}>{r.score}</div>
      <div className="result-grid">
        <div><b style={{ color: 'var(--ok)' }}>{r.hits}</b><span className="small muted">acertos</span></div>
        <div><b style={{ color: 'var(--bad)' }}>{r.errors}</b><span className="small muted">erradas</span></div>
        <div><b style={{ color: 'var(--warn)' }}>{r.missed}</b><span className="small muted">faltando</span></div>
      </div>
      <div className="col" style={{ alignItems: 'center', gap: 8 }}>
        <Streak value={asg.currentStreak} of={asg.streakRequired} />
        {r.outcome.advanced ? (
          <Banner kind="ok" icon="zap"><b>Velocidade subiu!</b> {r.bpm} → {r.outcome.currentBpm} BPM</Banner>
        ) : r.perfect ? (
          <span className="small muted">
            {r.outcome.atTarget ? 'Você está na velocidade-alvo!' : `Mais ${asg.streakRequired - asg.currentStreak} perfeita(s) seguida(s) para subir a velocidade.`}
          </span>
        ) : (
          <span className="small muted">A sequência de perfeitas voltou a zero. Precisão média: ±{r.avgAbsDtMs} ms.</span>
        )}
        {r.confirm.ok + r.confirm.fail > 0 && (
          <span className="small dim">Microfone confirmou {r.confirm.ok} de {r.confirm.ok + r.confirm.fail} notas do teclado.</span>
        )}
        <span className="small">{remaining ? `Faltam ${remaining} repetições hoje.` : '✓ Atribuição cumprida hoje!'}</span>
      </div>
      <button className="btn primary lg" style={{ marginTop: 18 }} onClick={onAgain}><Icon name="play" size={18} /> Próxima repetição</button>
    </div>
  );
}

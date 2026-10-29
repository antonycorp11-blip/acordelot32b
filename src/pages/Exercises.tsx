import { useState } from 'react';
import { api, uid } from '../data/api';
import { go } from '../router';
import { INSTRUMENTS, KIND_LABEL, type Exercise, type ExerciseKind, type Profile } from '../types';
import { Empty, Icon, Modal, Spinner, toast, useAsync } from '../ui/kit';
import { NoteLane } from '../ui/music';

export default function Exercises() {
  const { data, loading, error } = useAsync(async () => {
    const [exercises, students, assignments] = await Promise.all([api.listExercises(), api.listStudents(), api.listAssignments()]);
    return { exercises, students, assignments };
  }, []);
  const [filter, setFilter] = useState<ExerciseKind | 'all'>('all');
  const [assign, setAssign] = useState<Exercise | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <Empty icon="cloudOff" title="Não foi possível carregar">{error}</Empty>;
  const list = data.exercises.filter((e) => filter === 'all' || e.kind === filter);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Banco de exercícios</h1>
          <p className="muted">Grave ou gere uma vez, atribua a quantos alunos quiser.</p>
        </div>
        <button className="btn primary" onClick={() => go('/exercicios/novo')}><Icon name="plus" size={18} /> Novo exercício</button>
      </div>
      <div className="seg" style={{ marginBottom: 16 }}>
        {(['all', 'scale', 'arpeggio', 'chord', 'recording'] as const).map((k) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{k === 'all' ? 'Todos' : KIND_LABEL[k]}</button>
        ))}
      </div>
      {!list.length && <div className="card"><Empty title="Nenhum exercício">Crie o primeiro: uma escala, um arpejo ou grave um trecho no teclado.</Empty></div>}
      <div className="grid g3">
        {list.map((e) => {
          const n = data.assignments.filter((a) => a.exerciseId === e.id).length;
          return (
            <div key={e.id} className="card stack">
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="pill accent">{KIND_LABEL[e.kind]}</span>
                <span className="pill">{INSTRUMENTS[e.instrument].label}</span>
              </div>
              <h3>{e.title}</h3>
              <NoteLane notes={e.notes} beatsPerBar={e.beatsPerBar} compact ppb={18} />
              <div className="small muted">{e.notes.length} notas · ref. {e.bpmRef} BPM · ±{e.timingTolMs} ms · ±{e.pitchTolCents} cents</div>
              <div className="row between">
                <span className="small muted"><Icon name="users" size={14} /> {n} aluno{n === 1 ? '' : 's'}</span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm" onClick={() => go('/exercicios/' + e.id)}><Icon name="edit" size={14} /> Editar</button>
                  <button className="btn sm primary" onClick={() => setAssign(e)}><Icon name="send" size={14} /> Atribuir</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {assign && (
        <Modal title="Atribuir exercício" onClose={() => setAssign(null)}>
          <AssignForm exercises={[assign]} students={data.students} onDone={() => setAssign(null)} />
        </Modal>
      )}
    </>
  );
}

export function AssignForm({ exercises, students, preselectStudent, onDone }: { exercises: Exercise[]; students: Profile[]; preselectStudent?: string; onDone: () => void }) {
  const [exId, setExId] = useState(exercises[0]?.id ?? '');
  const ex = exercises.find((e) => e.id === exId);
  const ref = ex?.bpmRef ?? 80;
  const [sel, setSel] = useState<Set<string>>(new Set(preselectStudent ? [preselectStudent] : []));
  const [p, setP] = useState({ repsPerDay: 10, startBpm: Math.round(ref * 0.7), targetBpm: ref, bpmStep: 4, streakRequired: 6 });
  const num = (k: keyof typeof p) => (e: { target: { value: string } }) => setP({ ...p, [k]: Number(e.target.value) });
  const toggle = (id: string) => { const s = new Set(sel); if (s.has(id)) s.delete(id); else s.add(id); setSel(s); };

  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      if (!ex || !sel.size) return;
      for (const sid of sel) {
        await api.saveAssignment({
          id: uid(), exerciseId: ex.id, studentId: sid, ...p, currentBpm: p.startBpm, currentStreak: 0, active: true, createdAt: new Date().toISOString(),
        });
      }
      toast(`Atribuído a ${sel.size} aluno${sel.size > 1 ? 's' : ''}`);
      onDone();
    }}>
      {exercises.length > 1 ? (
        <label className="field"><span>Exercício</span>
          <select className="input" value={exId} onChange={(e) => setExId(e.target.value)}>
            {exercises.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </label>
      ) : <p><b>{ex?.title}</b></p>}
      {!preselectStudent && (
        <div className="field">
          <span>Alunos</span>
          <div className="card" style={{ padding: 6, maxHeight: 220, overflow: 'auto', boxShadow: 'none' }}>
            {students.map((s) => (
              <label key={s.id} className="list-row check" style={{ padding: '8px 8px' }}>
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="grow">{s.name}</span>
                <span className="small muted">{INSTRUMENTS[s.instrument].label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="form-grid">
        <label className="field"><span>Repetições/dia</span><input className="input" type="number" min={1} value={p.repsPerDay} onChange={num('repsPerDay')} /></label>
        <label className="field"><span>BPM inicial</span><input className="input" type="number" min={20} max={300} value={p.startBpm} onChange={num('startBpm')} /></label>
        <label className="field"><span>BPM alvo</span><input className="input" type="number" min={20} max={300} value={p.targetBpm} onChange={num('targetBpm')} /></label>
        <label className="field"><span>Aumento (BPM)</span><input className="input" type="number" min={1} value={p.bpmStep} onChange={num('bpmStep')} /></label>
        <label className="field"><span>Perfeitas p/ subir</span><input className="input" type="number" min={1} value={p.streakRequired} onChange={num('streakRequired')} /></label>
      </div>
      <p className="small muted">O metrônomo começa em {p.startBpm} BPM e sobe {p.bpmStep} BPM após {p.streakRequired} execuções perfeitas seguidas, até {p.targetBpm} BPM.</p>
      <button className="btn primary block" disabled={!sel.size || !ex}>Atribuir</button>
    </form>
  );
}

import { useState } from 'react';
import { api } from '../data/api';
import { effective } from '../data/outbox';
import { bestStreak, countOnDay, dayStatus, lastDays, topErrors } from '../engine/stats';
import { go } from '../router';
import { INSTRUMENTS, KIND_LABEL, type Assignment, type Exercise } from '../types';
import { Avatar, Empty, fmtDate, Icon, Modal, Ring, Sparkline, Spinner, Streak, toast, useAsync } from '../ui/kit';
import { AssignForm } from './Exercises';
import { withPending } from './studentData';

export default function StudentDetail({ id, self }: { id: string; self?: boolean }) {
  const { data, loading, error, reload } = useAsync(async () => {
    const [students, assignments, exercises, executions] = await Promise.all([
      self ? Promise.resolve([]) : api.listStudents(), api.listAssignments(id), api.listExercises(), api.listExecutions({ studentId: id }),
    ]);
    return { student: students.find((s) => s.id === id), assignments: assignments.map(effective), exercises, executions: withPending(executions, id) };
  }, [id]);
  const [edit, setEdit] = useState<Assignment | null>(null);
  const [assign, setAssign] = useState(false);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <Empty icon="cloudOff" title="Não foi possível carregar">{error}</Empty>;

  const { assignments, exercises, executions } = data;
  const exOf = (a: Assignment) => exercises.find((e) => e.id === a.exerciseId);
  const errs = topErrors(executions);
  const maxErr = errs[0]?.count ?? 1;
  const days = lastDays(14);
  const perfect = executions.filter((e) => e.perfect).length;

  return (
    <>
      <div className="page-head">
        <div className="row" style={{ gap: 14 }}>
          {!self && <button className="btn ghost icon" onClick={() => go('/')}><Icon name="back" /></button>}
          {data.student && <Avatar name={data.student.name} size={52} />}
          <div>
            <h1>{self ? 'Meu progresso' : data.student?.name}</h1>
            {data.student && <p className="muted">{INSTRUMENTS[data.student.instrument].label}</p>}
          </div>
        </div>
        {!self && <button className="btn primary" onClick={() => setAssign(true)}><Icon name="plus" size={18} /> Atribuir exercício</button>}
      </div>

      <div className="grid g4">
        <div className="card stat"><div className="tiny muted">Execuções</div><div className="v">{executions.length}</div></div>
        <div className="card stat"><div className="tiny muted">Perfeitas</div><div className="v" style={{ color: 'var(--ok)' }}>{perfect}</div></div>
        <div className="card stat"><div className="tiny muted">Melhor sequência</div><div className="v">{bestStreak(executions)}</div></div>
        <div className="card stat">
          <div className="tiny muted">Últimos 14 dias</div>
          <div className="week" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            {days.map((d) => { const s = dayStatus(assignments, executions, d).status; return <i key={d} className={s === 'empty' ? '' : s} title={d} />; })}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Exercícios atribuídos</h2>
        {!assignments.length && <div className="card"><Empty title="Nenhum exercício atribuído" /></div>}
        <div className="grid g2">
          {assignments.map((a) => {
            const ex = exOf(a);
            const ax = executions.filter((e) => e.assignmentId === a.id).sort((x, y) => x.performedAt.localeCompare(y.performedAt));
            const done = countOnDay(executions, a.id);
            return (
              <div key={a.id} className="card stack" style={{ opacity: a.active ? 1 : 0.55 }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <span className="pill accent">{ex ? KIND_LABEL[ex.kind] : '—'}</span>
                    <h3 style={{ marginTop: 6 }}>{ex?.title ?? 'Exercício removido'}</h3>
                    <div className="small muted">{a.repsPerDay} rep./dia · +{a.bpmStep} BPM a cada {a.streakRequired} perfeitas{!a.active && ' · pausado'}</div>
                  </div>
                  <Ring value={done} max={a.repsPerDay} size={52} stroke={6}>{done}/{a.repsPerDay}</Ring>
                </div>
                <div className="row between">
                  <div>
                    <div className="tiny muted">Velocidade atual</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }} className="mono">{a.currentBpm} <span className="small muted">/ {a.targetBpm} BPM</span></div>
                  </div>
                  <Sparkline values={ax.filter((e) => e.perfect).map((e) => e.bpm)} />
                </div>
                <div className="row between">
                  <Streak value={a.currentStreak} of={a.streakRequired} />
                  {!self && (
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn sm" onClick={() => setEdit(a)}><Icon name="edit" size={14} /> Parâmetros</button>
                      <button className="btn sm ghost danger icon" title="Remover atribuição" onClick={async () => {
                        if (!confirm('Remover esta atribuição? O histórico de execuções dela também será apagado.')) return;
                        await api.deleteAssignment(a.id); toast('Atribuição removida'); reload();
                      }}><Icon name="trash" size={16} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid g2 section">
        <div className="card">
          <div className="section-title"><h3>Erros mais frequentes por nota</h3></div>
          {!errs.length && <p className="muted small">Nenhum erro registrado. 👏</p>}
          <div className="col">
            {errs.map((e) => (
              <div key={e.note} className="row" style={{ gap: 12 }}>
                <b className="mono" style={{ width: 40 }}>{e.note}</b>
                <div className="bar grow"><div style={{ width: `${(e.count / maxErr) * 100}%`, background: 'linear-gradient(90deg,#fb7185,#e11d48)' }} /></div>
                <span className="mono small muted" style={{ width: 30, textAlign: 'right' }}>{e.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-title"><h3>Histórico de execuções</h3><span className="small muted">{executions.length}</span></div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="t">
              <thead><tr><th>Quando</th><th>Exercício</th><th>BPM</th><th>Nota</th><th>A/E/F</th><th /></tr></thead>
              <tbody>
                {[...executions].sort((x, y) => y.performedAt.localeCompare(x.performedAt)).slice(0, 80).map((e) => (
                  <tr key={e.id}>
                    <td className="muted">{fmtDate(e.performedAt)}</td>
                    <td className="ellipsis" style={{ maxWidth: 160 }}>{exercises.find((x) => x.id === e.exerciseId)?.title ?? '—'}</td>
                    <td className="mono">{e.bpm}</td>
                    <td className="mono">{e.score}</td>
                    <td className="mono small"><span style={{ color: 'var(--ok)' }}>{e.hits}</span>/<span style={{ color: 'var(--bad)' }}>{e.errors}</span>/<span style={{ color: 'var(--warn)' }}>{e.missed}</span></td>
                    <td>{e.perfect && <span className="pill ok">Perfeita</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {edit && (
        <Modal title="Parâmetros da atribuição" onClose={() => setEdit(null)}>
          <ParamsForm a={edit} ex={exOf(edit)} onSaved={() => { setEdit(null); reload(); }} />
        </Modal>
      )}
      {assign && data.student && (
        <Modal title={`Atribuir a ${data.student.name}`} onClose={() => setAssign(false)}>
          <AssignForm exercises={exercises} students={[data.student]} preselectStudent={data.student.id} onDone={() => { setAssign(false); reload(); }} />
        </Modal>
      )}
    </>
  );
}

export function ParamsForm({ a, ex, onSaved }: { a: Assignment; ex?: Exercise; onSaved: () => void }) {
  const [f, setF] = useState(a);
  const num = (k: keyof Assignment) => (e: { target: { value: string } }) => setF({ ...f, [k]: Number(e.target.value) });
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      await api.saveAssignment({ ...f, currentBpm: Math.min(f.currentBpm, f.targetBpm) });
      toast('Parâmetros salvos');
      onSaved();
    }}>
      {ex && <p className="muted small">{ex.title}</p>}
      <div className="form-grid">
        <label className="field"><span>Repetições/dia</span><input className="input" type="number" min={1} value={f.repsPerDay} onChange={num('repsPerDay')} /></label>
        <label className="field"><span>Velocidade atual</span><input className="input" type="number" min={20} max={300} value={f.currentBpm} onChange={num('currentBpm')} /></label>
        <label className="field"><span>Velocidade-alvo</span><input className="input" type="number" min={20} max={300} value={f.targetBpm} onChange={num('targetBpm')} /></label>
        <label className="field"><span>Aumento (BPM)</span><input className="input" type="number" min={1} value={f.bpmStep} onChange={num('bpmStep')} /></label>
        <label className="field"><span>Perfeitas p/ subir</span><input className="input" type="number" min={1} value={f.streakRequired} onChange={num('streakRequired')} /></label>
      </div>
      <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Atribuição ativa</label>
      <button className="btn primary block">Salvar</button>
    </form>
  );
}

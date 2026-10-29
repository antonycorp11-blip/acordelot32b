import { api } from '../data/api';
import { dayKey, dayStatus, lastDays, weekStart } from '../engine/stats';
import { go } from '../router';
import { INSTRUMENTS } from '../types';
import { Avatar, Empty, Icon, Spinner, useAsync } from '../ui/kit';

const STATUS = {
  done: ['ok', 'Cumprido'],
  partial: ['warn', 'Parcial'],
  none: ['bad', 'Pendente'],
  empty: ['', 'Sem exercícios'],
} as const;

export default function TeacherDashboard() {
  const { data, loading, error } = useAsync(async () => {
    const [students, assignments, executions, school] = await Promise.all([
      api.listStudents(), api.listAssignments(), api.listExecutions({ since: weekStart() }), api.school(),
    ]);
    return { students, assignments, executions, school };
  }, []);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <Empty icon="cloudOff" title="Não foi possível carregar">{error}</Empty>;

  const days = lastDays(7);
  const today = dayKey(new Date());
  const rows = data.students.map((s) => {
    const as = data.assignments.filter((a) => a.studentId === s.id);
    const ex = data.executions.filter((e) => e.studentId === s.id);
    return {
      s, as,
      today: dayStatus(as, ex, today),
      week: days.map((d) => dayStatus(as, ex, d).status),
      perfectWeek: ex.filter((e) => e.perfect).length,
      maxBpm: Math.max(0, ...as.map((a) => a.currentBpm)),
    };
  });
  const withWork = rows.filter((r) => r.today.status !== 'empty');
  const doneToday = withWork.filter((r) => r.today.status === 'done').length;
  const perfect = data.executions.filter((e) => e.perfect).length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="tiny muted">{data.school?.name}</div>
          <h1>Painel da turma</h1>
          <p className="muted">Acompanhe o cumprimento diário e semanal de cada aluno.</p>
        </div>
        <button className="btn primary" onClick={() => go('/exercicios/novo')}><Icon name="plus" size={18} /> Novo exercício</button>
      </div>

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="tiny muted">Alunos</div><div className="v">{data.students.length}</div></div>
        <div className="card stat"><div className="tiny muted">Cumpriram hoje</div><div className="v">{doneToday}<small>/ {withWork.length}</small></div></div>
        <div className="card stat"><div className="tiny muted">Execuções na semana</div><div className="v">{data.executions.length}</div></div>
        <div className="card stat"><div className="tiny muted">Perfeitas na semana</div><div className="v grad-text">{perfect}</div></div>
      </div>

      {data.school?.joinCode && (
        <div className="card row wrap" style={{ marginBottom: 18, gap: 18 }}>
          <Icon name="users" />
          <div className="grow small">
            Alunos entram com o código <b className="mono" style={{ fontSize: 16, letterSpacing: '.1em' }}>{data.school.joinCode}</b>
            {data.school.teacherCode && <> · professores com <b className="mono">{data.school.teacherCode}</b></>}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 8 }}>
        {!rows.length && <Empty icon="users" title="Nenhum aluno ainda">Compartilhe o código da escola para os alunos se cadastrarem.</Empty>}
        {rows.map(({ s, as, today: t, week, perfectWeek, maxBpm }) => (
          <div key={s.id} className="list-row click" onClick={() => go('/aluno/' + s.id)}>
            <Avatar name={s.name} />
            <div className="grow">
              <b className="ellipsis" style={{ display: 'block' }}>{s.name}</b>
              <div className="small muted">{INSTRUMENTS[s.instrument].label} · {as.filter((a) => a.active).length} exercícios · {perfectWeek} perfeitas/sem</div>
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
              <span className={'pill ' + STATUS[t.status][0]}>
                <span className="dot" /> {STATUS[t.status][1]}{t.total ? ` ${t.done}/${t.total}` : ''}
              </span>
              <div className="week" title="Últimos 7 dias">
                {week.map((w, i) => <i key={i} className={w === 'empty' ? '' : w} title={days[i]} />)}
              </div>
            </div>
            <div className="mono small muted" style={{ width: 64, textAlign: 'right' }} title="Maior velocidade atual">
              <b style={{ color: 'var(--text)', fontSize: 16 }}>{maxBpm || '—'}</b><br />BPM
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

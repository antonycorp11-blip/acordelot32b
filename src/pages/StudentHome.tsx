import { useUser } from '../App';
import { countOnDay } from '../engine/stats';
import { go } from '../router';
import { INSTRUMENTS, KIND_LABEL } from '../types';
import { Empty, Icon, Ring, Spinner, Streak, useAsync } from '../ui/kit';
import { NoteLane } from '../ui/music';
import { loadStudentDay } from './studentData';

export default function StudentHome() {
  const user = useUser();
  const { data, loading, error } = useAsync(() => loadStudentDay(user.id), [user.id]);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <Empty icon="cloudOff" title="Não foi possível carregar">{error}</Empty>;

  const items = data.assignments
    .map((a) => ({ a, ex: data.exercises.find((e) => e.id === a.exerciseId), done: countOnDay(data.today, a.id) }))
    .filter((x) => x.ex);
  const finished = items.filter((x) => x.done >= x.a.repsPerDay).length;
  const repsDone = items.reduce((s, x) => s + Math.min(x.done, x.a.repsPerDay), 0);
  const repsTotal = items.reduce((s, x) => s + x.a.repsPerDay, 0);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="tiny muted">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{hello}, {user.name.split(' ')[0]}!</h1>
          <p className="muted">{items.length ? 'Estes são os exercícios de hoje.' : 'Nenhum exercício atribuído ainda.'}</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card pad-lg row" style={{ gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
          <Ring value={repsDone} max={repsTotal} size={88} stroke={9}>{repsTotal ? Math.round((repsDone / repsTotal) * 100) : 0}%</Ring>
          <div className="grow">
            <h2>{finished === items.length ? 'Meta do dia cumprida! 🎉' : 'Meta do dia'}</h2>
            <p className="muted" style={{ marginTop: 4 }}>
              {finished} de {items.length} exercícios concluídos · {repsDone}/{repsTotal} repetições
            </p>
          </div>
        </div>
      )}

      {!items.length && <div className="card"><Empty title="Tudo tranquilo por aqui">Quando o professor atribuir exercícios, eles aparecem nesta tela.</Empty></div>}

      <div className="grid g2">
        {items.map(({ a, ex, done }) => {
          const complete = done >= a.repsPerDay;
          const pct = a.targetBpm > a.startBpm ? ((a.currentBpm - a.startBpm) / (a.targetBpm - a.startBpm)) * 100 : 100;
          return (
            <div key={a.id} className="card click stack" onClick={() => go('/treino/' + a.id)}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="row wrap" style={{ gap: 6, marginBottom: 6 }}>
                    <span className="pill accent">{KIND_LABEL[ex!.kind]}</span>
                    <span className="pill">{INSTRUMENTS[ex!.instrument].label}</span>
                  </div>
                  <h3>{ex!.title}</h3>
                </div>
                <Ring value={done} max={a.repsPerDay} size={56} stroke={6}>{complete ? <Icon name="check" size={20} /> : `${done}/${a.repsPerDay}`}</Ring>
              </div>
              <NoteLane notes={ex!.notes} beatsPerBar={ex!.beatsPerBar} compact ppb={22} />
              <div>
                <div className="row between small" style={{ marginBottom: 6 }}>
                  <span><b className="mono">{a.currentBpm}</b> <span className="muted">BPM</span></span>
                  <span className="muted">alvo {a.targetBpm}</span>
                </div>
                <div className="bar"><div style={{ width: `${Math.max(4, pct)}%` }} /></div>
              </div>
              <div className="row between">
                <div className="row small muted"><Streak value={a.currentStreak} of={a.streakRequired} /></div>
                <button className="btn primary sm"><Icon name="play" size={14} /> {complete ? 'Treinar mais' : 'Treinar'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

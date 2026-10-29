import { useState } from 'react';
import { useUser } from '../App';
import { api } from '../data/api';
import { overallRanking, weekStart } from '../engine/stats';
import { Avatar, Empty, Spinner, useAsync } from '../ui/kit';

export default function Ranking() {
  const user = useUser();
  const { data, loading, error } = useAsync(() => api.ranking(weekStart()), []);
  const [tab, setTab] = useState<'geral' | string>('geral');
  const [metric, setMetric] = useState<'perfect' | 'bpm'>('perfect');
  if (loading && !data) return <Spinner />;
  if (error || !data) return <Empty icon="cloudOff" title="Ranking indisponível offline">{error}</Empty>;

  const exercises = [...new Map(data.map((r) => [r.exerciseId, r.exerciseTitle])).entries()];
  const rows = tab === 'geral'
    ? overallRanking(data)
    : data.filter((r) => r.exerciseId === tab).map((r) => ({ studentId: r.studentId, name: r.studentName, perfectWeek: r.perfectWeek, totalWeek: r.totalWeek, maxBpm: r.maxBpm }));
  rows.sort((a, b) => (metric === 'perfect' ? b.perfectWeek - a.perfectWeek || b.maxBpm - a.maxBpm : b.maxBpm - a.maxBpm || b.perfectWeek - a.perfectWeek));
  const val = (r: (typeof rows)[number]) => (metric === 'perfect' ? `${r.perfectWeek}` : `${r.maxBpm}`);
  const unit = metric === 'perfect' ? 'perfeitas' : 'BPM';
  const top = [rows[1], rows[0], rows[2]];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ranking</h1>
          <p className="muted">Últimos 7 dias · maior velocidade considera só execuções perfeitas.</p>
        </div>
        <div className="seg">
          <button className={metric === 'perfect' ? 'on' : ''} onClick={() => setMetric('perfect')}>Mais perfeitas</button>
          <button className={metric === 'bpm' ? 'on' : ''} onClick={() => setMetric('bpm')}>Maior velocidade</button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 18, overflowX: 'auto', paddingBottom: 4 }}>
        <div className="seg" style={{ flexWrap: 'nowrap' }}>
          <button className={tab === 'geral' ? 'on' : ''} onClick={() => setTab('geral')}>Geral</button>
          {exercises.map(([id, t]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} style={{ whiteSpace: 'nowrap' }}>{t}</button>)}
        </div>
      </div>
      {!rows.length ? <div className="card"><Empty icon="trophy" title="Sem execuções ainda" /></div> : (
        <>
          <div className="podium">
            {top.map((r, i) => r ? (
              <div key={r.studentId} className={i === 1 ? 'p1' : ''}>
                <div className="medal">{['🥈', '🥇', '🥉'][i]}</div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}><Avatar name={r.name} size={i === 1 ? 52 : 42} /></div>
                <b className="ellipsis" style={{ display: 'block', fontSize: 14 }}>{r.name.split(' ')[0]}</b>
                <div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>{val(r)}</div>
                <div className="tiny muted">{unit}</div>
              </div>
            ) : <div key={i} style={{ visibility: 'hidden' }} />)}
          </div>
          <div className="card" style={{ padding: 8 }}>
            {rows.map((r, i) => (
              <div key={r.studentId} className="list-row" style={{ paddingInline: 10, background: r.studentId === user.id ? 'rgba(139,92,246,.1)' : undefined, borderRadius: 12 }}>
                <b className="mono" style={{ width: 26, color: i < 3 ? 'var(--warn)' : 'var(--dim)' }}>{i + 1}</b>
                <Avatar name={r.name} size={34} />
                <div className="grow">
                  <b>{r.name}{r.studentId === user.id && <span className="pill accent" style={{ marginLeft: 8 }}>você</span>}</b>
                  <div className="small muted">{r.totalWeek} execuções na semana · máx. {r.maxBpm || '—'} BPM</div>
                </div>
                <div className="mono" style={{ textAlign: 'right' }}><b style={{ fontSize: 18 }}>{val(r)}</b><div className="tiny muted">{unit}</div></div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

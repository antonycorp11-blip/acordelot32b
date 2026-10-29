import { useState } from 'react';
import { api } from '../data/api';
import { INSTRUMENTS, type Instrument, type Profile, type Role } from '../types';
import { Avatar, Banner, Icon, Logo, toast } from '../ui/kit';

function Hero() {
  return (
    <div className="auth-hero">
      <div className="brand"><div className="brand-logo"><Logo /></div><div>Acordelot<small>Treinos musicais</small></div></div>
      <div>
        <h1>Treine no tempo certo.<br /><span className="grad-text">Evolua a cada clique.</span></h1>
        <p className="muted" style={{ marginTop: 16, maxWidth: 480, fontSize: 16 }}>
          Exercícios do seu professor com feedback em tempo real pelo teclado MIDI ou pelo microfone. O metrônomo só acelera quando você está pronto.
        </p>
        <div className="col features" style={{ marginTop: 36, gap: 16, maxWidth: 440 }}>
          {[
            ['piano', 'MIDI + microfone', 'Detecção de nota com latência mínima no teclado.'],
            ['zap', 'Progressão automática', '6 execuções perfeitas seguidas e a velocidade sobe.'],
            ['cloudOff', 'Funciona offline', 'Treine sem internet e sincronize depois.'],
          ].map(([ic, t, d]) => (
            <div className="feature" key={t}>
              <div className="ic"><Icon name={ic} /></div>
              <div><b>{t}</b><div className="small muted">{d}</div></div>
            </div>
          ))}
        </div>
      </div>
      <svg className="hero-wave" width="420" height="200" viewBox="0 0 420 200">
        <defs><linearGradient id="hw" x1="0" x2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
        {Array.from({ length: 34 }, (_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.55) * 120 + Math.sin(i * 1.7) * 30);
          return <rect key={i} x={i * 12.4} y={100 - h / 2} width="6" height={h} rx="3" fill="url(#hw)" opacity={0.25 + (i / 34) * 0.6} />;
        })}
      </svg>
      <div className="small dim">© Escola de Música Acordelot</div>
    </div>
  );
}

function DemoPicker({ onLogin }: { onLogin: (p: Profile) => void }) {
  const profiles = api.demoProfiles!();
  return (
    <div className="stack">
      <div>
        <h2>Entrar na demonstração</h2>
        <p className="muted small" style={{ marginTop: 6 }}>Escolha um perfil. Os dados ficam só neste navegador.</p>
      </div>
      <div className="card" style={{ padding: 8 }}>
        {profiles.map((p) => (
          <div key={p.id} className="list-row click" onClick={() => onLogin(api.demoLogin!(p.id))}>
            <Avatar name={p.name} />
            <div className="grow">
              <b>{p.name}</b>
              <div className="small muted">{p.role === 'teacher' ? 'Professor(a) · painel da escola' : `Aluno(a) · ${INSTRUMENTS[p.instrument].label}`}</div>
            </div>
            <span className={'pill ' + (p.role === 'teacher' ? 'accent' : 'cyan')}>{p.role === 'teacher' ? 'Professor' : 'Aluno'}</span>
          </div>
        ))}
      </div>
      <Banner>
        Modo demonstração: configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> para usar contas reais.
      </Banner>
      <button className="btn ghost sm" onClick={() => { api.demoReset!(); toast('Dados de demonstração restaurados'); }}>Restaurar dados de exemplo</button>
    </div>
  );
}

function AuthForm({ onLogin }: { onLogin: (p: Profile) => void }) {
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [role, setRole] = useState<Role>('student');
  const [f, setF] = useState({ email: '', password: '', name: '', instrument: 'keyboard' as Instrument, schoolName: '', joinCode: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (tab === 'in') onLogin(await api.signIn(f.email, f.password));
      else {
        const p = await api.signUp({ ...f, role, schoolName: f.schoolName || undefined, joinCode: f.joinCode || undefined });
        if (p) onLogin(p);
        else { toast('Confira seu e-mail para confirmar a conta.'); setTab('in'); }
      }
    } catch (x) {
      setErr(String((x as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="seg" style={{ width: '100%' }}>
        <button type="button" className={tab === 'in' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setTab('in')}>Entrar</button>
        <button type="button" className={tab === 'up' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setTab('up')}>Criar conta</button>
      </div>
      {tab === 'up' && (
        <>
          <div className="seg" style={{ width: '100%' }}>
            <button type="button" className={role === 'student' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setRole('student')}>Sou aluno</button>
            <button type="button" className={role === 'teacher' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setRole('teacher')}>Sou professor</button>
          </div>
          <label className="field"><span>Nome completo</span><input className="input" required value={f.name} onChange={set('name')} /></label>
          {role === 'student' ? (
            <div className="form-grid">
              <label className="field"><span>Código da escola</span><input className="input" required value={f.joinCode} onChange={set('joinCode')} placeholder="ex.: ABC123" /></label>
              <label className="field"><span>Instrumento</span>
                <select className="input" value={f.instrument} onChange={set('instrument')}>
                  {Object.entries(INSTRUMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="form-grid">
              <label className="field"><span>Nova escola</span><input className="input" value={f.schoolName} onChange={set('schoolName')} placeholder="Nome da escola" /></label>
              <label className="field"><span>ou código de professor</span><input className="input" value={f.joinCode} onChange={set('joinCode')} placeholder="entrar numa existente" /></label>
            </div>
          )}
        </>
      )}
      <label className="field"><span>E-mail</span><input className="input" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></label>
      <label className="field"><span>Senha</span><input className="input" type="password" required minLength={6} autoComplete={tab === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} /></label>
      {err && <Banner kind="warn">{err}</Banner>}
      <button className="btn primary lg block" disabled={busy}>{busy ? 'Aguarde…' : tab === 'in' ? 'Entrar' : 'Criar conta'}</button>
    </form>
  );
}

export default function Login({ onLogin }: { onLogin: (p: Profile) => void }) {
  return (
    <div className="auth">
      <Hero />
      <div className="auth-panel">
        <div className="auth-box">{api.mode === 'demo' ? <DemoPicker onLogin={onLogin} /> : <AuthForm onLogin={onLogin} />}</div>
      </div>
    </div>
  );
}

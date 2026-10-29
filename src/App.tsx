import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './data/api';
import { outbox } from './data/outbox';
import Exercises from './pages/Exercises';
import ExerciseEditor from './pages/ExerciseEditor';
import Login from './pages/Login';
import Practice from './pages/Practice';
import Ranking from './pages/Ranking';
import StudentDetail from './pages/StudentDetail';
import StudentHome from './pages/StudentHome';
import TeacherDashboard from './pages/TeacherDashboard';
import Tools from './pages/Tools';
import { match, useRoute } from './router';
import { INSTRUMENTS, type Profile } from './types';
import { Avatar, Icon, Logo, Spinner, ToastHost } from './ui/kit';

const UserCtx = createContext<Profile>(null as unknown as Profile);
export const useUser = () => useContext(UserCtx);

function SyncBadge() {
  const [pending, setPending] = useState(outbox.list().length);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const u = outbox.subscribe(() => setPending(outbox.list().length));
    const on = () => setOnline(navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => { u(); removeEventListener('online', on); removeEventListener('offline', on); };
  }, []);
  if (online && !pending) return <span className="pill ok" title="Tudo sincronizado"><Icon name="cloud" size={14} /> Sincronizado</span>;
  return (
    <span className={'pill ' + (online ? 'warn' : 'bad')} title="Execuções guardadas no aparelho">
      <Icon name={online ? 'cloud' : 'cloudOff'} size={14} /> {online ? `${pending} enviando` : `Offline${pending ? ` · ${pending} na fila` : ''}`}
    </span>
  );
}

function Shell({ user, onLogout, children, path }: { user: Profile; onLogout: () => void; children: ReactNode; path: string }) {
  const nav = user.role === 'teacher'
    ? [['/', 'home', 'Painel'], ['/exercicios', 'music', 'Exercícios'], ['/ranking', 'trophy', 'Ranking'], ['/ferramentas', 'tool', 'Ferramentas']]
    : [['/', 'home', 'Hoje'], ['/progresso', 'chart', 'Progresso'], ['/ranking', 'trophy', 'Ranking'], ['/ferramentas', 'tool', 'Ferramentas']];
  const active = (p: string) => (p === '/' ? path === '/' || path.startsWith('/aluno') || path.startsWith('/treino') : path.startsWith(p));
  const brand = (
    <div className="brand">
      <div className="brand-logo"><Logo /></div>
      <div>Acordelot<small>Treinos{api.mode === 'demo' ? ' · demo' : ''}</small></div>
    </div>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        {brand}
        {nav.map(([p, ic, label]) => (
          <a key={p} href={'#' + p} className={'nav-item' + (active(p) ? ' active' : '')}><Icon name={ic} /> {label}</a>
        ))}
        <div className="spacer" />
        <div style={{ marginBottom: 10 }}><SyncBadge /></div>
        <div className="user-chip">
          <Avatar name={user.name} size={36} />
          <div className="who">
            <b>{user.name}</b>
            <span className="small muted">{user.role === 'teacher' ? 'Professor(a)' : INSTRUMENTS[user.instrument].label}</span>
          </div>
          <button className="btn ghost sm icon" onClick={onLogout} title="Sair"><Icon name="logout" size={18} /></button>
        </div>
      </aside>
      <header className="topbar">
        {brand}
        <div className="row">
          <SyncBadge />
          <button className="btn ghost sm icon" onClick={onLogout} title="Sair"><Icon name="logout" size={18} /></button>
        </div>
      </header>
      <main className="main">{children}</main>
      <nav className="tabbar">
        {nav.map(([p, ic, label]) => (
          <a key={p} href={'#' + p} className={active(p) ? 'active' : ''}><Icon name={ic} size={22} />{label}</a>
        ))}
      </nav>
    </div>
  );
}

function Routes({ user, path }: { user: Profile; path: string }) {
  let m: Record<string, string> | null;
  if (path.startsWith('/ranking')) return <Ranking />;
  if (path.startsWith('/ferramentas')) return <Tools />;
  if (user.role === 'teacher') {
    if ((m = match('/aluno/:id', path))) return <StudentDetail id={m.id} />;
    if ((m = match('/exercicios/:id', path))) return <ExerciseEditor id={m.id} key={m.id} />;
    if (path.startsWith('/exercicios')) return <Exercises />;
    return <TeacherDashboard />;
  }
  if ((m = match('/treino/:id', path))) return <Practice assignmentId={m.id} key={m.id} />;
  if (path.startsWith('/progresso')) return <StudentDetail id={user.id} self />;
  return <StudentHome />;
}

export default function App() {
  const [user, setUser] = useState<Profile | null | undefined>(undefined);
  const path = useRoute();
  useEffect(() => {
    api.currentUser().then(setUser, () => setUser(null));
    void outbox.flush();
  }, []);
  if (user === undefined) return <Spinner />;
  if (!user) return <><Login onLogin={(u) => { location.hash = '/'; setUser(u); }} /><ToastHost /></>;
  return (
    <UserCtx.Provider value={user}>
      <Shell user={user} path={path} onLogout={async () => { await api.signOut(); setUser(null); }}>
        <Routes user={user} path={path} />
      </Shell>
      <ToastHost />
    </UserCtx.Provider>
  );
}

import { useEffect, useState } from 'react';

export function useRoute() {
  const get = () => location.hash.slice(1) || '/';
  const [path, set] = useState(get);
  useEffect(() => {
    const f = () => { set(get()); scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return path;
}

export const go = (p: string) => { location.hash = p; };

/** match('/aluno/:id', '/aluno/42') → { id: '42' } */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/'), b = path.split('?')[0].split('/');
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) out[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return out;
}

import type { Assignment, Execution } from '../types';
import { api } from './api';

/*
 * Fila de execuções ainda não enviadas. Cada execução tem um UUID gerado no cliente,
 * então reenviar é idempotente (upsert com ignoreDuplicates no servidor).
 * Junto guardamos o estado otimista da atribuição (BPM/sequência) para o aluno
 * continuar de onde parou mesmo sem conexão.
 */
const KEY = 'outbox:v1';
const LOCAL = 'asg-local:';
type Fn = () => void;
const subs = new Set<Fn>();
let flushing = false;

const read = (): Execution[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};
const write = (l: Execution[]) => {
  localStorage.setItem(KEY, JSON.stringify(l));
  subs.forEach((f) => f());
};

export const outbox = {
  list: read,
  subscribe(f: Fn) {
    subs.add(f);
    return () => { subs.delete(f); };
  },
  add(e: Execution, local: Pick<Assignment, 'currentBpm' | 'currentStreak'>) {
    write([...read(), e]);
    localStorage.setItem(LOCAL + e.assignmentId, JSON.stringify(local));
    void outbox.flush();
  },
  async flush(): Promise<void> {
    if (flushing || !navigator.onLine) return;
    flushing = true;
    try {
      for (const e of read()) {
        await api.insertExecution(e);
        write(read().filter((x) => x.id !== e.id));
      }
    } catch {
      /* sem rede: tenta de novo depois */
    } finally {
      flushing = false;
    }
  },
};

/** Atribuição com o progresso otimista local, enquanto houver execuções pendentes dela. */
export function effective(a: Assignment): Assignment {
  if (!read().some((e) => e.assignmentId === a.id)) {
    localStorage.removeItem(LOCAL + a.id);
    return a;
  }
  try {
    const l = JSON.parse(localStorage.getItem(LOCAL + a.id) || 'null');
    return l ? { ...a, ...l } : a;
  } catch {
    return a;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void outbox.flush());
  setInterval(() => void outbox.flush(), 30000);
}

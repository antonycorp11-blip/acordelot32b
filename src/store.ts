import type { Recording } from './types';

/** Exercícios gravados ficam neste aparelho (localStorage). */
const KEY = 'recordings:v1';

export const store = {
  list(): Recording[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  },
  get(id: string) {
    return store.list().find((r) => r.id === id);
  },
  save(r: Recording) {
    localStorage.setItem(KEY, JSON.stringify([r, ...store.list().filter((x) => x.id !== r.id)]));
  },
  remove(id: string) {
    localStorage.setItem(KEY, JSON.stringify(store.list().filter((x) => x.id !== id)));
  },
};

export const uid = (): string =>
  crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

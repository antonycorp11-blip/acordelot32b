/** Cache local de leituras: permite abrir e treinar offline com os últimos dados baixados. */
const P = 'cache:';

export function readCache<T>(key: string): T | undefined {
  try {
    const v = localStorage.getItem(P + key);
    return v ? (JSON.parse(v) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache(key: string, v: unknown) {
  try {
    localStorage.setItem(P + key, JSON.stringify(v));
  } catch {
    /* cota cheia: segue sem cache */
  }
}

export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  try {
    const v = await fn();
    writeCache(key, v);
    return v;
  } catch (e) {
    const c = readCache<T>(key);
    if (c !== undefined) return c;
    throw e;
  }
}

export function clearCache() {
  Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k));
}

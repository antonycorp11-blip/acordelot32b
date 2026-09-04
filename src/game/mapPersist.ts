/**
 * Publica o layout do mapa direto no código (commit no GitHub via API REST).
 *
 * O site publicado é estático — não há backend pra escrever arquivo. Então o
 * editor comita `src/game/customMapLayout.json` na branch `main` usando um
 * token pessoal (fine-grained PAT) que o usuário cola UMA vez. O token fica só
 * no localStorage do navegador dele e só é enviado para api.github.com.
 *
 * Depois do commit, o deploy do repositório reconstrói o jogo com o novo mapa —
 * a edição vira código de verdade, permanente.
 */
const REPO = 'antonycorp11-blip/acordelot32b';
const FILE_PATH = 'src/game/customMapLayout.json';
const BRANCH = 'main';
const TOKEN_KEY = 'acordelot_gh_token';

export function getGhToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setGhToken(t: string) {
  try {
    const v = t.trim();
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface PublishResult {
  ok: boolean;
  message: string;
  url?: string;
}

export async function publishMapToCode(mapJson: unknown): Promise<PublishResult> {
  const token = getGhToken();
  if (!token) return { ok: false, message: 'sem-token' };

  const body = JSON.stringify(mapJson, null, 2) + '\n';
  const content =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(body)))
      : Buffer.from(body).toString('base64');

  const base = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let sha: string | undefined;
  try {
    const cur = await fetch(`${base}?ref=${BRANCH}`, { headers });
    if (cur.status === 401) return { ok: false, message: 'Token inválido ou expirado (401).' };
    if (cur.status === 403) return { ok: false, message: 'Token sem permissão de escrita (403).' };
    if (cur.ok) sha = (await cur.json()).sha;
  } catch (e) {
    return { ok: false, message: 'Sem conexão com o GitHub.' };
  }

  try {
    const put = await fetch(base, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `mapa: edição pelo editor — ${new Date().toISOString().slice(0, 19)}`,
        content,
        sha,
        branch: BRANCH,
      }),
    });
    if (put.ok) {
      const d = await put.json();
      return { ok: true, message: 'Mapa gravado no código!', url: d.commit?.html_url };
    }
    const txt = (await put.text()).slice(0, 140);
    return { ok: false, message: `Falhou (${put.status}). ${txt}` };
  } catch (e) {
    return { ok: false, message: 'Erro ao enviar o commit.' };
  }
}

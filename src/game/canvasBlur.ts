/**
 * Feather de máscara SEM `ctx.filter`.
 *
 * `CanvasRenderingContext2D.filter` só existe no Safari a partir do iOS 17, e
 * mesmo lá não é confiável. Sem ele, `blur()` vira no-op silencioso: a máscara
 * fica com a borda dura dos tiles de 32px e o mapa inteiro ganha cantos
 * quadrados — no iPhone. No Chrome do Mac funcionava, então o defeito só
 * aparecia no aparelho.
 *
 * A troca é reduzir a máscara e reamostrar para o tamanho cheio: a
 * interpolação bilinear do próprio navegador faz a média dos vizinhos, que é
 * um blur de caixa. Duas passadas aproximam uma gaussiana bem o bastante para
 * borda de terreno, e `drawImage` com suavização é suportado em todo lugar.
 *
 * Usado sempre, mesmo onde `ctx.filter` existiria: assim o que se vê no
 * desktop é o que o aparelho mostra.
 */

const pool: HTMLCanvasElement[] = [];

function scratch(w: number, h: number): HTMLCanvasElement {
  const cv = pool.pop() ?? document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  } else {
    cv.getContext('2d')!.clearRect(0, 0, w, h);
  }
  return cv;
}

function release(cv: HTMLCanvasElement) {
  if (pool.length < 4) pool.push(cv);
}

/**
 * Devolve uma cópia borrada de `src`. `radius` é lido na mesma escala que o
 * `blur(Npx)` do CSS que ele substitui.
 */
export function feather(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = scratch(w, h);
  const oc = out.getContext('2d')!;
  oc.clearRect(0, 0, w, h);

  if (radius < 1) {
    oc.drawImage(src, 0, 0);
    return out;
  }

  // Duas reduções em sequência borram mais que uma só do mesmo tamanho total,
  // e o resultado é mais redondo — dois box blurs já se aproximam de uma
  // gaussiana. O fator é a raiz para que as duas somem o raio pedido.
  const step = Math.max(2, Math.round(Math.sqrt(radius * 1.6)));
  const sw = Math.max(2, Math.round(w / step));
  const sh = Math.max(2, Math.round(h / step));

  const small = scratch(sw, sh);
  const sc = small.getContext('2d')!;
  sc.clearRect(0, 0, sw, sh);
  sc.imageSmoothingEnabled = true;
  sc.imageSmoothingQuality = 'high';
  sc.drawImage(src, 0, 0, w, h, 0, 0, sw, sh);

  const tw = Math.max(2, Math.round(sw / step));
  const th = Math.max(2, Math.round(sh / step));
  const tiny = scratch(tw, th);
  const tc = tiny.getContext('2d')!;
  tc.clearRect(0, 0, tw, th);
  tc.imageSmoothingEnabled = true;
  tc.imageSmoothingQuality = 'high';
  tc.drawImage(small, 0, 0, sw, sh, 0, 0, tw, th);

  oc.imageSmoothingEnabled = true;
  oc.imageSmoothingQuality = 'high';
  oc.drawImage(tiny, 0, 0, tw, th, 0, 0, w, h);

  release(small);
  release(tiny);
  return out;
}

/** Devolve o canvas ao pool depois de usar o resultado de `feather`. */
export function releaseFeather(cv: HTMLCanvasElement) {
  release(cv);
}

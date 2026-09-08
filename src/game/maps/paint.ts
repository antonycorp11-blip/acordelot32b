/**
 * Helpers de pintura procedural de terreno para os mapas de bioma.
 * Contorno com ruído sub-tile (menos "escada de 32px") + trilhas como banda
 * larga. A suavização fina fica com a RegionalTerrain (feather forte).
 */
import type { Rect, WorldProp } from '../types';
import { TILE_SIZE } from '../mapData';

const T = TILE_SIZE;

export interface Painter {
  ground: number[][];
  props: WorldProp[];
  solids: Rect[];
  cols: number;
  rows: number;
  /** rng determinístico 0..1 */
  rng: () => number;
}

export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function fillGround(p: Painter, tile: number) {
  for (let r = 0; r < p.rows; r++) {
    p.ground[r] = new Array(p.cols).fill(tile);
  }
}

export function paintTile(p: Painter, c: number, r: number, tile: number) {
  if (r >= 0 && r < p.rows && c >= 0 && c < p.cols) p.ground[r][c] = tile;
}

/** Elipse com contorno irregular forte (ruído angular de várias frequências). */
export function ellipse(
  p: Painter,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tile: number,
  jitter = 0.14,
) {
  for (let r = Math.floor(cy - ry - 3); r <= cy + ry + 3; r++) {
    for (let c = Math.floor(cx - rx - 3); c <= cx + rx + 3; c++) {
      const a = Math.atan2((r - cy) / ry, (c - cx) / rx);
      const edge =
        1 +
        jitter * Math.sin(a * 5 + cx * 0.7) +
        jitter * 0.7 * Math.cos(a * 9 - cy * 0.5) +
        jitter * 0.4 * Math.sin(a * 17 + cx);
      const d = ((c - cx) / rx) ** 2 + ((r - cy) / ry) ** 2;
      if (d < edge) paintTile(p, c, r, tile);
    }
  }
}

/** Caminho: banda LARGA cujo miolo é `tile` e a borda alterna com ruído. */
export function path(
  p: Painter,
  points: number[][],
  width: number,
  tile: number,
  edgeTile?: number,
) {
  for (let j = 1; j < points.length; j++) {
    const [x0, y0] = points[j - 1];
    const [x1, y1] = points[j];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      const wob = width + Math.sin(px * 0.6 + py * 0.4) * width * 0.28;
      ellipse(p, px, py, wob, wob * 0.82, tile, 0.22);
      if (edgeTile !== undefined) {
        // borda esfarrapada: alguns tiles do anel externo viram edgeTile
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
          const rr = wob * (1.0 + 0.35 * Math.abs(Math.sin(a * 3 + px)));
          const ec = Math.round(px + Math.cos(a) * rr);
          const er = Math.round(py + Math.sin(a) * rr * 0.82);
          if (((ec * 13 + er * 7) & 3) === 0) paintTile(p, ec, er, edgeTile);
        }
      }
    }
  }
}

/** Sobreposição de bioma: espalha `tile` em uma faixa de N tiles ao redor de
 *  onde já existe `neighbor`, dando material pro feather borrar a transição. */
export function featherOverlap(p: Painter, tile: number, neighbor: number, band = 3) {
  const snapshot = p.ground.map((row) => row.slice());
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      if (snapshot[r][c] !== tile) continue;
      for (let dr = -band; dr <= band; dr++) {
        for (let dc = -band; dc <= band; dc++) {
          if (Math.hypot(dc, dr) > band) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (snapshot[nr]?.[nc] !== neighbor) continue;
          // probabilidade cai com a distância — degradê real
          if (p.rng() < 1 - Math.hypot(dc, dr) / (band + 1)) p.ground[nr][nc] = tile;
        }
      }
    }
  }
}

/** Anel irregular de props densos na borda do mapa (some o recorte reto). */
export function borderThicket(p: Painter, type: string, w: number, h: number) {
  const rng = p.rng;
  const stamp = (c: number, r: number) => {
    const x = c * T + Math.round((rng() - 0.5) * 24);
    const y = r * T + Math.round((rng() - 0.5) * 24);
    p.props.push({ id: `edge_${type}_${c}_${r}`, type, x, y, w, h, sortY: y + h - 4 });
  };
  for (let c = 1; c < p.cols - 1; c += 2) {
    const depthTop = 1 + Math.floor(rng() * 3);
    const depthBot = 1 + Math.floor(rng() * 3);
    for (let d = 0; d < depthTop; d++) if (rng() < 0.7) stamp(c, 1 + d);
    for (let d = 0; d < depthBot; d++) if (rng() < 0.7) stamp(c, p.rows - 2 - d);
  }
  for (let r = 1; r < p.rows - 1; r += 2) {
    const depthL = 1 + Math.floor(rng() * 3);
    const depthR = 1 + Math.floor(rng() * 3);
    for (let d = 0; d < depthL; d++) if (rng() < 0.7) stamp(1 + d, r);
    for (let d = 0; d < depthR; d++) if (rng() < 0.7) stamp(p.cols - 2 - d, r);
  }
}

/** Colisores de borda do mundo. */
export function worldEdgeColliders(p: Painter): Rect[] {
  const W = p.cols * T;
  const H = p.rows * T;
  return [
    { x: 0, y: 0, w: W, h: 20 },
    { x: 0, y: H - 20, w: W, h: 20 },
    { x: 0, y: 0, w: 20, h: H },
    { x: W - 20, y: 0, w: 20, h: H },
  ];
}

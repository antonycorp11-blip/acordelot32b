import type { WorldProp } from '../types';
import { TILE_SIZE } from '../mapData';
import type { MapId } from './index';

export interface PortalData {
  to: MapId;
  spawn: { col: number; row: number };
  label: string;
  /** walk = atravessa direto; screen = abre a tela de preparação (DGs) */
  kind: 'walk' | 'screen';
}

/** Cria um prop `portal` centrado no tile (col,row). ~2.5x3 tiles de arco. */
export function portal(id: string, col: number, row: number, data: PortalData): WorldProp {
  const w = 84;
  const h = 104;
  const x = Math.round(col * TILE_SIZE - w / 2);
  const y = Math.round(row * TILE_SIZE - h);
  return {
    id,
    type: 'portal',
    x,
    y,
    w,
    h,
    sortY: y + h - 8,
    // sem colisor: o gatilho de proximidade cuida da viagem
    data,
  };
}

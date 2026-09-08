/**
 * Overworld: Acordelot + arredores + Floresta Sombria.
 * Embrulha o `buildMap()` clássico e planta os portais para as novas regiões.
 */
import { buildMap, type MapGrid } from '../mapData';
import { portal } from './portalProp';

/** Portal norte da cidade → Floresta dos Ecos (na Praça do Santuário ao norte). */
export const OVERWORLD_PORTAL_ECOS = { col: 37, row: 9 };
/** Boca de caverna na clareira fixa da Floresta Sombria → bioma Cavernas de Cristal. */
export const OVERWORLD_PORTAL_CAVERNAS = { col: 60, row: 168 };

export function buildOverworld(): MapGrid {
  const g = buildMap();

  g.props.push(
    portal('portal_floresta_ecos', OVERWORLD_PORTAL_ECOS.col, OVERWORLD_PORTAL_ECOS.row, {
      to: 'floresta_ecos',
      spawn: { col: 150, row: 132 },
      label: 'Santuário dos Ecos',
      kind: 'walk',
    }),
  );
  g.props.push(
    portal('portal_cavernas_cristal', OVERWORLD_PORTAL_CAVERNAS.col, OVERWORLD_PORTAL_CAVERNAS.row, {
      to: 'cavernas_cristal',
      spawn: { col: 140, row: 182 },
      label: 'Cavernas de Cristal',
      kind: 'walk',
    }),
  );

  return g;
}

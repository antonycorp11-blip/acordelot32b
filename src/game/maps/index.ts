/**
 * Registro de mapas (regiões zoneadas estilo Albion).
 *
 * Cada região é um mapa próprio com seu grid, props, colisores e perfil de
 * ambiente. O motor troca o mapa ativo via `engine.travelTo(id, spawn)` e os
 * mapas são ligados por props do tipo `portal`.
 *
 * `build()` é puro (devolve um MapGrid) e NÃO importa o engine — a lógica de
 * spawn de inimigos fica no engine, chaveada por `MapId`.
 */
import { MAP_COLS, MAP_ROWS, type MapGrid } from '../mapData';
import { buildOverworld } from './overworld';
import { buildFlorestaEcos } from './florestaEcos';
import { buildCavernasCristal } from './cavernasCristal';
import { buildDgCristalProfundo } from './dgCristalProfundo';

export type MapId =
  | 'overworld'
  | 'floresta_ecos'
  | 'cavernas_cristal'
  | 'dg_cristal_profundo';

export type MapKind = 'biome' | 'instance';

export interface MapAmbient {
  /** força noite mesmo fora do horário (ex.: floresta sombria) */
  forceNight?: boolean;
  /** clima permitido na região */
  weather?: 'clear' | 'rain' | 'none';
  /** vaga-lumes / borboletas ligados */
  critters?: boolean;
  /** perfil de iluminação: ciclo normal, caverna escura, ou brilho de cristal */
  lighting: 'day-cycle' | 'cave' | 'crystal-glow';
  /** cor do vinhete nas bordas do mapa */
  edgeFog?: string;
}

export interface MapMinimapRegion {
  name: string;
  col: number;
  row: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  kind: MapKind;
  cols: number;
  rows: number;
  /** ponto de nascimento padrão ao entrar sem spawn explícito (tiles) */
  defaultSpawn: { col: number; row: number };
  build(): MapGrid;
  ambient: MapAmbient;
  minimap: { label: string; regions: MapMinimapRegion[] };
}

export const MAP_DEFS: Record<MapId, MapDef> = {
  overworld: {
    id: 'overworld',
    name: 'Acordelot e Arredores',
    kind: 'biome',
    cols: MAP_COLS,
    rows: MAP_ROWS,
    defaultSpawn: { col: 36, row: 30 },
    build: buildOverworld,
    ambient: { lighting: 'day-cycle', weather: 'clear', critters: true, edgeFog: '#0a1410' },
    minimap: {
      label: 'Acordelot',
      regions: [
        { name: 'Vila Encantada', col: 36, row: 19 },
        { name: 'Sentinela do Órgão', col: 168, row: 6 },
        { name: 'Portal do Santuário', col: 37, row: 4 },
        { name: 'Floresta Sombria', col: 72, row: 150 },
        { name: 'Fenda de Cristal', col: 60, row: 172 },
      ],
    },
  },
  floresta_ecos: {
    id: 'floresta_ecos',
    name: 'Floresta dos Ecos',
    kind: 'biome',
    cols: 300,
    rows: 220,
    defaultSpawn: { col: 150, row: 128 },
    build: buildFlorestaEcos,
    ambient: { lighting: 'day-cycle', weather: 'clear', critters: true, edgeFog: '#0c1f1a' },
    minimap: {
      label: 'Floresta dos Ecos',
      regions: [
        { name: 'Clareira do Santuário', col: 150, row: 118 },
        { name: 'Ponte do Santuário', col: 150, row: 135 },
        { name: 'Bosque Cantante', col: 150, row: 46 },
        { name: 'Jardim dos Salgueiros', col: 84, row: 47 },
        { name: 'Pátio Dourado', col: 217, row: 53 },
        { name: 'Recanto das Borboletas', col: 54, row: 102 },
        { name: 'Campina do Entardecer', col: 155, row: 182 },
        { name: 'Ruínas do Conservatório', col: 240, row: 120 },
        { name: 'Lago das Ressonâncias', col: 66, row: 168 },
        { name: 'Fronteira Pétrea', col: 244, row: 190 },
      ],
    },
  },
  cavernas_cristal: {
    id: 'cavernas_cristal',
    name: 'Cavernas de Cristal',
    kind: 'biome',
    cols: 280,
    rows: 200,
    defaultSpawn: { col: 140, row: 176 },
    build: buildCavernasCristal,
    ambient: { lighting: 'crystal-glow', weather: 'none', critters: true, edgeFog: '#0a0f22' },
    minimap: {
      label: 'Cavernas de Cristal',
      regions: [
        { name: 'Entrada Cintilante', col: 140, row: 176 },
        { name: 'Salão das Gemas', col: 140, row: 100 },
        { name: 'Espelho d’Água', col: 70, row: 120 },
        { name: 'Fenda Profunda', col: 214, row: 78 },
        { name: 'Observatório Soterrado', col: 102, row: 52 },
        { name: 'Jardim de Ametistas', col: 222, row: 143 },
        { name: 'Pedreira Ressonante', col: 50, row: 166 },
      ],
    },
  },
  dg_cristal_profundo: {
    id: 'dg_cristal_profundo',
    name: 'Cristal Profundo',
    kind: 'instance',
    cols: 440,
    rows: 220,
    defaultSpawn: { col: 354, row: 46 },
    build: buildDgCristalProfundo,
    ambient: { lighting: 'cave', weather: 'none', critters: false, edgeFog: '#03040a' },
    minimap: {
      label: 'Cristal Profundo',
      regions: [],
    },
  },
};

export const isInstanceMap = (id: MapId) => MAP_DEFS[id].kind === 'instance';

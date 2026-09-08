/** Coordinates are tiles. Shared by terrain, encounters, markers and the gate. */
export const CRYSTAL_GATE = { col: 326, row: 46, barrierCol: 330, minRow: 43, maxRow: 51 };
export const CRYSTAL_ROOMS = [
  { name: 'Vestíbulo das Ressonâncias', col: 354, row: 46, rx: 19, ry: 16 },
  { name: 'Galeria da Pauta Quebrada', col: 411, row: 30, rx: 21, ry: 18 },
  { name: 'Jardim de Ametistas', col: 407, row: 78, rx: 23, ry: 17 },
  { name: 'Arquivo sem Voz', col: 352, row: 94, rx: 19, ry: 18 },
  { name: 'Forja Abandonada', col: 355, row: 141, rx: 21, ry: 17 },
  { name: 'Lago das Notas Mortas', col: 411, row: 126, rx: 20, ry: 17 },
  { name: 'Nave do Último Acorde', col: 410, row: 176, rx: 21, ry: 18 },
  { name: 'Coração Cristalino', col: 351, row: 184, rx: 21, ry: 17 },
] as const;
export const DUNGEON_LAYOUT_VERSION = 2;
export const DUNGEON_ENEMY_PREFIX = 'crystal_enemy_';
export const isDungeonEnemy = (id: string) => id.startsWith(DUNGEON_ENEMY_PREFIX);
export interface DungeonRunSave {
  version: number;
  difficulty: number;
  defeated: string[];
  chests: string[];
  inside?: boolean;
}
export const dungeonChestId = (room: number) => `east_dungeon_chest_${room}`;
export const dungeonEnemyId = (room: number, slot: number) => `${DUNGEON_ENEMY_PREFIX}${room}_${slot}`;
export const DUNGEON_BOSS_ID = dungeonEnemyId(7, 8);
export const DUNGEON_DIFFICULTIES = [
  { id: 1, name: 'I · Ressonância', subtitle: 'Primeira expedição', requiredPower: 180, enemyLevel: 6, rewardMultiplier: 1 },
  { id: 2, name: 'II · Dissonância', subtitle: 'Inimigos veteranos', requiredPower: 420, enemyLevel: 10, rewardMultiplier: 1.6 },
  { id: 3, name: 'III · Silêncio', subtitle: 'Elite resistente', requiredPower: 750, enemyLevel: 15, rewardMultiplier: 2.4 },
  { id: 4, name: 'IV · Abismo', subtitle: 'Acordes implacáveis', requiredPower: 1200, enemyLevel: 21, rewardMultiplier: 3.5 },
];
export type DungeonDifficulty = typeof DUNGEON_DIFFICULTIES[number];

// ============================================================================
// MISSÕES DIÁRIAS — independentes da história. 3 sorteadas por dia (reseta à
// meia-noite local), precisam ser ACEITAS antes do progresso contar.
// ============================================================================

export type QuestKind =
  | 'kill'
  | 'harvest_wood'
  | 'harvest_stone'
  | 'collect_gold'
  | 'collect_crystal'
  | 'collect_clave';

export const QUEST_KIND_LABEL: Record<QuestKind, string> = {
  kill: 'inimigos derrotados',
  harvest_wood: 'madeira coletada',
  harvest_stone: 'pedra coletada',
  collect_gold: 'ouro bruto coletado',
  collect_crystal: 'cristal de eco bruto coletado',
  collect_clave: 'claves musicais juntadas',
};

export interface QuestReward {
  item: string; // chave de ITEM_META, ou 'clave' (moeda — vai pro contador de claves)
  qty: number;
}

export interface QuestDef {
  id: string;
  title: string;
  desc: string; // frase do objetivo, ex. "Derrote 6 inimigos"
  icon: string;
  kind: QuestKind;
  target: number;
  rewards: QuestReward[];
}

export const DAILY_QUEST_POOL: QuestDef[] = [
  {
    id: 'kill_6',
    title: 'Caçada Dissonante',
    desc: 'Derrote 6 inimigos',
    icon: '⚔️',
    kind: 'kill',
    target: 6,
    rewards: [
      { item: 'clave', qty: 25 },
      { item: 'frag_c', qty: 3 },
    ],
  },
  {
    id: 'kill_12',
    title: 'Purga Noturna',
    desc: 'Derrote 12 inimigos',
    icon: '🗡️',
    kind: 'kill',
    target: 12,
    rewards: [
      { item: 'clave', qty: 45 },
      { item: 'partitura_prata', qty: 1 },
    ],
  },
  {
    id: 'wood_10',
    title: 'Lenhador do Dia',
    desc: 'Colete 10 Madeira',
    icon: '🪵',
    kind: 'harvest_wood',
    target: 10,
    rewards: [
      { item: 'gold_raw', qty: 4 },
      { item: 'clave', qty: 10 },
    ],
  },
  {
    id: 'stone_10',
    title: 'Pedreiro do Dia',
    desc: 'Colete 10 Pedra',
    icon: '🪨',
    kind: 'harvest_stone',
    target: 10,
    rewards: [
      { item: 'crystal_blue_raw', qty: 3 },
      { item: 'clave', qty: 10 },
    ],
  },
  {
    id: 'stone_16',
    title: 'Cantaria Afinada',
    desc: 'Colete 16 Pedra',
    icon: '🪨',
    kind: 'harvest_stone',
    target: 16,
    rewards: [
      { item: 'crystal_blue_raw', qty: 4 },
      { item: 'partitura_bronze', qty: 1 },
    ],
  },
  {
    id: 'gold_6',
    title: 'Garimpo Dourado',
    desc: 'Colete 6 Ouro Bruto',
    icon: '🥇',
    kind: 'collect_gold',
    target: 6,
    rewards: [
      { item: 'partitura_bronze', qty: 1 },
      { item: 'clave', qty: 15 },
    ],
  },
  {
    id: 'crystal_6',
    title: 'Eco Cristalino',
    desc: 'Colete 6 Cristal de Eco Bruto',
    icon: '💎',
    kind: 'collect_crystal',
    target: 6,
    rewards: [
      { item: 'frag_g', qty: 3 },
      { item: 'clave', qty: 15 },
    ],
  },
  {
    id: 'clave_30',
    title: 'Bolsos Cheios',
    desc: 'Junte 30 Claves',
    icon: '🎼',
    kind: 'collect_clave',
    target: 30,
    rewards: [
      { item: 'gold_raw', qty: 5 },
      { item: 'frag_a', qty: 2 },
    ],
  },
];

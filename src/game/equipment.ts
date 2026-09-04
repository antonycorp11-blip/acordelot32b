// ============================================================================
// EQUIPAMENTOS — 4 slots (diferente da tela de Ferramentas/machado-picareta e
// da tela de Arma). 3 são só estatística (Catalisador, Anel, Colar); a Aura é
// visual (efeito ao redor do Akles) além de dar um bônus.
// ============================================================================

export type EquipSlot = 'aura' | 'catalisador' | 'anel' | 'colar';

export interface EquipItemDef {
  key: string;
  slot: EquipSlot;
  name: string;
  desc: string;
  visual: boolean;
  maxLevel: number;
  statLabel: string;
  statBase: number;
  statPerLevel: number;
  color: string;
}

export const EQUIP_SLOT_ORDER: EquipSlot[] = ['aura', 'catalisador', 'anel', 'colar'];

export const EQUIP_ITEMS: Record<EquipSlot, EquipItemDef> = {
  aura: {
    key: 'aura_ressonante',
    slot: 'aura',
    name: 'Aura Ressonante',
    desc: 'Brilho musical visível ao redor de Akles — o único equipamento que aparece nele.',
    visual: true,
    maxLevel: 5,
    statLabel: 'Dano de skills',
    statBase: 1,
    statPerLevel: 1,
    color: '#38bdf8',
  },
  catalisador: {
    key: 'catalisador_harmonico',
    slot: 'catalisador',
    name: 'Catalisador Harmônico',
    desc: 'Amplifica a energia canalizada nas skills. Sem efeito visual.',
    visual: false,
    maxLevel: 5,
    statLabel: 'Dano de skills',
    statBase: 2,
    statPerLevel: 2,
    color: '#a855f7',
  },
  anel: {
    key: 'anel_do_compasso',
    slot: 'anel',
    name: 'Anel do Compasso',
    desc: 'Mantém o ritmo dos golpes de Akles. Sem efeito visual.',
    visual: false,
    maxLevel: 5,
    statLabel: 'Velocidade de ataque',
    statBase: 2,
    statPerLevel: 1,
    color: '#f59e0b',
  },
  colar: {
    key: 'colar_da_melodia',
    slot: 'colar',
    name: 'Colar da Melodia',
    desc: 'Protege o portador em combate. Sem efeito visual.',
    visual: false,
    maxLevel: 5,
    statLabel: 'HP máximo',
    statBase: 3,
    statPerLevel: 2,
    color: '#4ade80',
  },
};

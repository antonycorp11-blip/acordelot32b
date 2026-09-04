// ============================================================================
// CATÁLOGO — conjuntos de equipamentos da classe Teclas (Tier 2-5). Apenas
// exibição por enquanto ("quero ver eles no jogo"); o up desses itens usando
// materiais específicos vem em uma etapa futura. Cada conjunto tem 4 peças:
// colar / anel / relíquia / aura.
// ============================================================================

export type CatalogEquipSlot = 'colar' | 'anel' | 'reliquia' | 'aura';

export interface CatalogEquipPiece {
  name: string;
  slot: CatalogEquipSlot;
  slug: string;
}

export interface CatalogEquipSet {
  key: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  pieces: CatalogEquipPiece[];
}

export const CATALOG_EQUIP_SETS: CatalogEquipSet[] = [
  {
    key: 'pianista_solitario',
    name: 'Conjunto do Pianista Solitário',
    tier: 2,
    pieces: [
      { name: 'Colar do Pianista Solitário', slot: 'colar', slug: 'colar_do_pianista_solitario' },
      { name: 'Anel do Pianista Solitário', slot: 'anel', slug: 'anel_do_pianista_solitario' },
      { name: 'Relíquia do Pianista Solitário', slot: 'reliquia', slug: 'reliquia_do_pianista_solitario' },
      { name: 'Aura do Pianista Solitário', slot: 'aura', slug: 'aura_do_pianista_solitario' },
    ],
  },
  {
    key: 'acordeonista',
    name: 'Conjunto do Acordeonista de Acordelot',
    tier: 2,
    pieces: [
      { name: 'Colar do Acordeonista', slot: 'colar', slug: 'colar_do_acordeonista' },
      { name: 'Anel do Acordeonista', slot: 'anel', slug: 'anel_do_acordeonista' },
      { name: 'Relíquia do Acordeonista', slot: 'reliquia', slug: 'reliquia_do_acordeonista' },
      { name: 'Aura do Acordeonista', slot: 'aura', slug: 'aura_do_acordeonista' },
    ],
  },
  {
    key: 'orgao_resonante',
    name: 'Conjunto do Órgão Resonante',
    tier: 3,
    pieces: [
      { name: 'Colar do Órgão Resonante', slot: 'colar', slug: 'colar_do_orgao_resonante' },
      { name: 'Anel do Órgão Resonante', slot: 'anel', slug: 'anel_do_orgao_resonante' },
      { name: 'Relíquia do Órgão Resonante', slot: 'reliquia', slug: 'reliquia_do_orgao_resonante' },
      { name: 'Aura do Órgão Resonante', slot: 'aura', slug: 'aura_do_orgao_resonante' },
    ],
  },
  {
    key: 'celesta_lunar',
    name: 'Conjunto da Celesta Lunar',
    tier: 3,
    pieces: [
      { name: 'Colar da Celesta Lunar', slot: 'colar', slug: 'colar_da_celesta_lunar' },
      { name: 'Anel da Celesta Lunar', slot: 'anel', slug: 'anel_da_celesta_lunar' },
      { name: 'Relíquia da Celesta Lunar', slot: 'reliquia', slug: 'reliquia_da_celesta_lunar' },
      { name: 'Aura da Celesta Lunar', slot: 'aura', slug: 'aura_da_celesta_lunar' },
    ],
  },
  {
    key: 'maestro',
    name: 'Conjunto do Maestro de Acordelot',
    tier: 4,
    pieces: [
      { name: 'Colar do Maestro', slot: 'colar', slug: 'colar_do_maestro' },
      { name: 'Anel do Maestro', slot: 'anel', slug: 'anel_do_maestro' },
      { name: 'Relíquia do Maestro', slot: 'reliquia', slug: 'reliquia_do_maestro' },
      { name: 'Aura do Maestro', slot: 'aura', slug: 'aura_do_maestro' },
    ],
  },
  {
    key: 'catedral_harmonica',
    name: 'Conjunto da Catedral Harmônica',
    tier: 4,
    pieces: [
      { name: 'Colar da Catedral Harmônica', slot: 'colar', slug: 'colar_da_catedral_harmonica' },
      { name: 'Anel da Catedral Harmônica', slot: 'anel', slug: 'anel_da_catedral_harmonica' },
      { name: 'Relíquia da Catedral Harmônica', slot: 'reliquia', slug: 'reliquia_da_catedral_harmonica' },
      { name: 'Aura da Catedral Harmônica', slot: 'aura', slug: 'aura_da_catedral_harmonica' },
    ],
  },
  {
    key: 'virtuose',
    name: 'Conjunto Virtuose',
    tier: 5,
    pieces: [
      { name: 'Colar Virtuose', slot: 'colar', slug: 'colar_virtuose' },
      { name: 'Anel Virtuose', slot: 'anel', slug: 'anel_virtuose' },
      { name: 'Relíquia Virtuose', slot: 'reliquia', slug: 'reliquia_virtuose' },
      { name: 'Aura Virtuose', slot: 'aura', slug: 'aura_virtuose' },
    ],
  },
  {
    key: 'concerto_celestial',
    name: 'Conjunto do Concerto Celestial',
    tier: 5,
    pieces: [
      { name: 'Colar do Concerto Celestial', slot: 'colar', slug: 'colar_do_concerto_celestial' },
      { name: 'Anel do Concerto Celestial', slot: 'anel', slug: 'anel_do_concerto_celestial' },
      { name: 'Relíquia do Concerto Celestial', slot: 'reliquia', slug: 'reliquia_do_concerto_celestial' },
      { name: 'Aura do Concerto Celestial', slot: 'aura', slug: 'aura_do_concerto_celestial' },
    ],
  },
];

export function catalogEquipImg(slug: string): string {
  return `/assets/catalogo/equipamentos/${slug}.png`;
}

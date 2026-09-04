// ============================================================================
// PASSIVAS DE AKLES — 5 níveis de evolução cada. `values[i]` é o efeito no
// nível i+1 (fração, ex.: 0.02 = +2%). `group` organiza a exibição na tela
// (skill a que pertence, ou "geral"). O nível de cada passiva fica em
// `engine.passiveLevels`; por ora todas começam no Nível 1 (ainda não há
// sistema de pontos/gacha para evoluí-las — fica pronto pra quando tiver).
// ============================================================================

export type PassiveGroup = 'basico' | 'ressonancia' | 'amplificacao' | 'pulso' | 'geral';

export interface PassiveDef {
  key: string;
  name: string;
  group: PassiveGroup;
  desc: string; // descrição curta do efeito por nível (%)
  values: [number, number, number, number, number];
  level5Bonus?: string; // texto do bônus extra no nível 5
}

export const PASSIVE_DEFS: Record<string, PassiveDef> = {
  ritmoCrescente: {
    key: 'ritmoCrescente',
    name: 'Ritmo Crescente',
    group: 'basico',
    desc: 'Cada ataque básico consecutivo aumenta o dano dos próximos (máx. 5 acúmulos)',
    values: [0.02, 0.03, 0.04, 0.05, 0.06],
    level5Bonus: 'Ao 5º acúmulo, o próximo ataque libera uma explosão harmônica em área.',
  },
  afinacaoPermanente: {
    key: 'afinacaoPermanente',
    name: 'Afinação Permanente',
    group: 'basico',
    desc: 'Aumenta permanentemente o ATQ',
    values: [0.02, 0.04, 0.06, 0.08, 0.1],
  },
  pulsoAcelerado: {
    key: 'pulsoAcelerado',
    name: 'Pulso Acelerado',
    group: 'ressonancia',
    desc: 'Enquanto Ressonância está ativa, aumenta a velocidade dos ataques básicos',
    values: [0.04, 0.07, 0.1, 0.13, 0.16],
    level5Bonus: 'Ataques básicos reduzem levemente o cooldown da Ressonância.',
  },
  notaPerfeita: {
    key: 'notaPerfeita',
    name: 'Nota Perfeita',
    group: 'basico',
    desc: 'Crítico garantido a cada N ataques',
    values: [7, 6, 5, 4, 3],
  },
  campoHarmonico: {
    key: 'campoHarmonico',
    name: 'Campo Harmônico',
    group: 'amplificacao',
    desc: 'Aumenta o dano da Amplificação ao atingir múltiplos inimigos',
    values: [0.05, 0.1, 0.15, 0.2, 0.25],
    level5Bonus: 'Atingindo 3+ inimigos, libera uma onda harmônica secundária.',
  },
  forcaRessonante: {
    key: 'forcaRessonante',
    name: 'Força Ressonante',
    group: 'amplificacao',
    desc: 'Aumenta permanentemente ATQ e HP máximo',
    values: [0.02, 0.04, 0.06, 0.08, 0.1],
  },
  expansao: {
    key: 'expansao',
    name: 'Expansão',
    group: 'amplificacao',
    desc: 'Aumenta permanentemente a área das habilidades corpo a corpo',
    values: [0.05, 0.1, 0.15, 0.2, 0.25],
    level5Bonus: 'Também aumenta levemente o alcance dos ataques básicos.',
  },
  impactoHarmonico: {
    key: 'impactoHarmonico',
    name: 'Impacto Harmônico',
    group: 'amplificacao',
    desc: 'Amplificação reduz temporariamente a DEF dos inimigos atingidos',
    values: [0.04, 0.07, 0.1, 0.13, 0.16],
    level5Bonus: 'Também aumenta a duração do debuff.',
  },
  reverberacao: {
    key: 'reverberacao',
    name: 'Reverberação',
    group: 'pulso',
    desc: 'Inimigos atingidos pelo Pulso Harmônico recebem uma marca: o próximo ataque básico causa dano adicional',
    values: [0.08, 0.12, 0.16, 0.2, 0.25],
    level5Bonus: 'A marca beneficia os próximos 2 ataques básicos.',
  },
  canalizacao: {
    key: 'canalizacao',
    name: 'Canalização',
    group: 'pulso',
    desc: 'Aumenta permanentemente o dano das skills',
    values: [0.03, 0.06, 0.09, 0.12, 0.15],
  },
  fluxoSonoro: {
    key: 'fluxoSonoro',
    name: 'Fluxo Sonoro',
    group: 'pulso',
    desc: 'Reduz permanentemente o cooldown das habilidades',
    values: [0.02, 0.04, 0.06, 0.08, 0.1],
    level5Bonus: 'Atingir vários inimigos com o Pulso reduz seu próprio cooldown.',
  },
  ecoFinal: {
    key: 'ecoFinal',
    name: 'Eco Final',
    group: 'pulso',
    desc: 'Se o Pulso Harmônico derrotar um inimigo, recupera Energia Harmônica',
    values: [0.02, 0.04, 0.06, 0.08, 0.1],
    level5Bonus: 'Derrotar um inimigo também concede um pequeno bônus de dano temporário.',
  },
  ouvidoAbsoluto: {
    key: 'ouvidoAbsoluto',
    name: 'Ouvido Absoluto',
    group: 'geral',
    desc: 'Aumenta permanentemente a chance de crítico',
    values: [0.02, 0.04, 0.06, 0.08, 0.1],
  },
  corpoEmCompasso: {
    key: 'corpoEmCompasso',
    name: 'Corpo em Compasso',
    group: 'geral',
    desc: 'Aumenta permanentemente a velocidade de movimento',
    values: [0.02, 0.04, 0.06, 0.08, 0.1],
  },
  harmoniaVital: {
    key: 'harmoniaVital',
    name: 'Harmonia Vital',
    group: 'geral',
    desc: 'Aumenta permanentemente o HP máximo',
    values: [0.03, 0.06, 0.09, 0.12, 0.15],
  },
  maestriaDaLamina: {
    key: 'maestriaDaLamina',
    name: 'Maestria da Lâmina',
    group: 'geral',
    desc: 'Aumenta o dano dos ataques básicos',
    values: [0.03, 0.06, 0.09, 0.12, 0.15],
  },
  ressonanciaInterior: {
    key: 'ressonanciaInterior',
    name: 'Ressonância Interior',
    group: 'geral',
    desc: 'Aumenta permanentemente o dano das skills',
    values: [0.03, 0.06, 0.09, 0.12, 0.15],
  },
};

export const PASSIVE_ORDER = Object.keys(PASSIVE_DEFS);

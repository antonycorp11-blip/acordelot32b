// ============================================================================
// CAMPANHA — as missões principais como DADOS, não como código.
//
// As dez primeiras missões do Capítulo 1 nasceram espalhadas pelo engine: três
// máquinas de estado (`echoTutorialStage`, `postEchoStage`, `regionQuestStage`),
// cada etapa costurada numa cadeia de `else if` dentro de um arquivo de dez mil
// linhas, e o texto do objetivo repetido no engine e no saveManager. Funciona
// para dez. O plano do capítulo pede trinta e seis.
//
// Aqui a missão é uma lista de etapas, e cada etapa diz três coisas: o que o
// jogador lê, o que precisa acontecer, e o que ele ganha. Quem decide se a
// etapa terminou é `estaSatisfeita`, uma função PURA sobre um retrato do mundo
// — então dá para percorrer a campanha inteira num teste, sem abrir o jogo,
// sem canvas e sem WebGL.
//
// A corrente antiga continua valendo. Esta campanha começa onde ela termina,
// quando `regionQuestStage` chega a 'completed'.
// ============================================================================

/** O que faz uma etapa avançar. */
export type Gatilho =
  /** Conversar com um NPC (id de `mapData`). */
  | { tipo: 'falar'; npc: string }
  /** Ter N de um item no inventário. */
  | { tipo: 'juntar'; item: string; quantidade: number }
  /** Derrotar N inimigos; `especie` restringe ao tipo. */
  | { tipo: 'derrotar'; especie?: string; quantidade: number }
  /** Pisar a menos de `raio` tiles de um ponto, num mapa. */
  | { tipo: 'chegar'; mapa: string; col: number; linha: number; raio: number }
  /** Ter N notas sintetizadas. */
  | { tipo: 'sintetizar_notas'; quantidade: number }
  /** Ter uma escala montada e N acordes equipados. */
  | { tipo: 'equipar_acordes'; quantidade: number }
  /** Alcançar um nível. */
  | { tipo: 'nivel'; valor: number }
  /** Ter uma arma da classe equipada acima de +N. */
  | { tipo: 'arma_melhorada'; nivel: number }
  /** Ter N peças de equipamento vestidas. */
  | { tipo: 'vestir'; pecas: number }
  /** Estar jogando com um dos heróis listados. A missão da escolha diz "Wins
   *  ou Huans": exigir um só travaria quem preferisse o outro. */
  | { tipo: 'jogar_como'; herois: Array<'akles' | 'wins' | 'huans'> }
  /** Ter subido qualquer skill do herói ativo até o nível N. */
  | { tipo: 'skill_no_nivel'; nivel: number }
  /** Estar num mapa, sem exigir ponto certo. */
  | { tipo: 'estar_em'; mapa: string };

export interface Recompensa {
  xp?: number;
  claves?: number;
  itens?: Array<{ item: string; quantidade: number }>;
}

export interface Etapa {
  id: string;
  /** A frase que o jogador lê no diário. */
  objetivo: string;
  gatilho: Gatilho;
  recompensa?: Recompensa;
  /** Fala que fecha a etapa, na voz de quem a encerra. */
  fala?: { quem: string; linhas: string[] };
}

export interface Missao {
  id: string;
  capitulo: string;
  titulo: string;
  descricao: string;
  etapas: Etapa[];
}

/** Retrato do mundo — só o que a campanha precisa saber para julgar. */
export interface Mundo {
  npcFalado: string | null;
  inventario: Record<string, number>;
  abatidos: Record<string, number>;
  abatidosTotal: number;
  mapa: string;
  col: number;
  linha: number;
  notasSintetizadas: number;
  acordesEquipados: number;
  nivel: number;
  nivelDaArma: number;
  pecasVestidas: number;
  heroiAtivo: string;
  maiorSkill: number;
}

// ---------------------------------------------------------------- as missões

export const CAMPANHA: Missao[] = [
  {
    id: 'MQ_C1_011_A_ARVORE_QUE_CANTA',
    capitulo: 'Capítulo I',
    titulo: 'A Árvore que Canta',
    descricao:
      'Pippo jura ter ouvido uma árvore chorar em nota. Lucian não acredita; o menino quer provar, e não vai sozinho.',
    etapas: [
      {
        id: 'arvore_pippo',
        objetivo: 'Encontre Pippo na oficina de Lucian, a oeste da praça',
        gatilho: { tipo: 'falar', npc: 'story_pippo' },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Você ouviu? Não foi vento. Vento não tem afinação.',
            'Era um lá. Tenho certeza, porque é a nota que o meu pingente faz quando bate na mesa.',
            'Vamos lá ver. Se eu for sozinho meu pai me mata — se eu for com você ele só grita.',
          ],
        },
      },
      {
        id: 'arvore_chegar',
        objetivo: 'Leve Pippo à Clareira do Primeiro Canto, na Floresta dos Ecos',
        gatilho: { tipo: 'chegar', mapa: 'floresta_ecos', col: 150, linha: 44, raio: 12 },
        recompensa: { xp: 60 },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Ali. A que tem o tronco rachado.',
            'Tem um Eco embaixo dela e ele está torto. Está repetindo meio tom abaixo do que devia.',
          ],
        },
      },
      {
        id: 'arvore_fragmentos',
        objetivo: 'Ressoe o Eco ferido e reúna 30 fragmentos de uma mesma nota',
        gatilho: { tipo: 'juntar', item: 'frag_a', quantidade: 30 },
        recompensa: { xp: 90, claves: 40 },
      },
      {
        id: 'arvore_sintetizar',
        objetivo: 'Sintetize a nota Lá na Síntese — 30 fragmentos formam uma nota',
        gatilho: { tipo: 'sintetizar_notas', quantidade: 1 },
        recompensa: { xp: 120, claves: 60 },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Ele parou de chorar.',
            'Toma. Metade do pingente. A outra metade fica comigo — assim a nota tem onde voltar.',
            'Se um dia você ouvir esse lá e eu não estiver junto, vem me procurar.',
          ],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_015_PARTITURA_DE_APRENDIZ',
    capitulo: 'Capítulo I',
    titulo: 'Partitura de Aprendiz',
    descricao:
      'O Sr. Antony não pergunta quantos monstros Akles derrubou. Pergunta o que ele aprendeu com eles.',
    etapas: [
      {
        id: 'partitura_antony',
        objetivo: 'Procure o Sr. Antony na praça de Acordelot',
        gatilho: { tipo: 'falar', npc: 'story_sr_antony' },
        fala: {
          quem: 'Sr. Antony',
          linhas: [
            'Fragmento solto é ruído, rapaz. Fragmento organizado é partitura.',
            'Junte o que tem, escreva uma partitura e leia até o fim. Depois me diga que nível você alcançou.',
          ],
        },
      },
      {
        id: 'partitura_nivel',
        objetivo: 'Sintetize partituras e alcance o nível 8',
        gatilho: { tipo: 'nivel', valor: 8 },
        recompensa: { xp: 150, claves: 80, itens: [{ item: 'partitura_prata', quantidade: 1 }] },
        fala: {
          quem: 'Sr. Antony',
          linhas: [
            'Oito. E os pontos de atributo, já gastou? Não deixe parado — ponto guardado não defende ninguém.',
          ],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_016_A_OFICINA_DE_DORN',
    capitulo: 'Capítulo I',
    titulo: 'A Oficina de Dorn',
    descricao:
      'O ferreiro não entrega arma boa a quem não sabe por que ela é boa. Primeiro a lição, depois o metal.',
    etapas: [
      {
        id: 'dorn_falar',
        objetivo: 'Fale com o ferreiro sobre a sua arma',
        gatilho: { tipo: 'falar', npc: 'npc_ferreiro' },
        fala: {
          quem: 'Ferreiro',
          linhas: [
            'Sua lâmina não é uma lâmina, moço. É um instrumento que corta.',
            'Ela afina junto com você. Leve-a à bancada e suba o registro dela — depois volte aqui.',
          ],
        },
      },
      {
        id: 'dorn_upar',
        objetivo: 'Aprimore a sua arma até +3 na forja',
        gatilho: { tipo: 'arma_melhorada', nivel: 3 },
        recompensa: { xp: 140, claves: 70 },
        fala: {
          quem: 'Ferreiro',
          linhas: ['Agora sim ela responde. Ouviu a diferença no golpe? É isso que você pagou.'],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_017_VESTIR_A_HARMONIA',
    capitulo: 'Capítulo I',
    titulo: 'Vestir a Harmonia',
    descricao:
      'Uma patrulha sai ao amanhecer e Akles vai junto. Ir de roupa de viagem seria um jeito caro de aprender.',
    etapas: [
      {
        id: 'harmonia_vestir',
        objetivo: 'Vista 4 peças de equipamento',
        gatilho: { tipo: 'vestir', pecas: 4 },
        recompensa: { xp: 130, claves: 60 },
      },
      {
        id: 'harmonia_patrulha',
        objetivo: 'Derrote 10 criaturas hostis na patrulha',
        gatilho: { tipo: 'derrotar', quantidade: 10 },
        recompensa: { xp: 180, claves: 90, itens: [{ item: 'partitura_prata', quantidade: 1 }] },
      },
    ],
  },
  {
    id: 'MQ_C1_021_MERCADO_E_RESSONANCIA',
    capitulo: 'Capítulo I',
    titulo: 'Mercado e Ressonância',
    descricao:
      'Pippo faz a lista de suprimentos como quem escreve uma composição: tudo tem quantidade e tudo tem motivo.',
    etapas: [
      {
        id: 'mercado_pippo',
        objetivo: 'Receba a lista de suprimentos com Pippo',
        gatilho: { tipo: 'falar', npc: 'story_pippo' },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Fiz a lista. Está em ordem de urgência, não de preço — meu pai diz que é assim que se erra menos.',
            'Ouro bruto não compra nada. Tem que refinar primeiro. Aprendi caro.',
          ],
        },
      },
      {
        id: 'mercado_ouro',
        objetivo: 'Reúna 12 de ouro bruto para a viagem',
        gatilho: { tipo: 'juntar', item: 'gold_raw', quantidade: 12 },
        recompensa: { xp: 120, claves: 100 },
      },
      {
        id: 'mercado_miro',
        objetivo: 'Feche a compra com Miro, no mercado',
        gatilho: { tipo: 'falar', npc: 'npc_mercador_cidade' },
        recompensa: { xp: 90, itens: [{ item: 'pocao_cura', quantidade: 3 }] },
        fala: {
          quem: 'Miro',
          linhas: [
            'O estoque é por viajante e por dia. Não adianta voltar daqui a pouco fazendo cara de outro.',
            'Leve poção. Quem viaja sem poção volta cedo — ou não volta.',
          ],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_023_DOZE_NOTAS_UMA_ESCALA',
    capitulo: 'Capítulo I',
    titulo: 'Doze Notas, Uma Escala',
    descricao:
      'A coleção cromática de Pippo tem doze lugares e onze estão preenchidos desde antes de Akles chegar.',
    etapas: [
      {
        id: 'doze_coletar',
        objetivo: 'Sintetize 6 notas diferentes das famílias da Floresta dos Ecos',
        gatilho: { tipo: 'sintetizar_notas', quantidade: 6 },
        recompensa: { xp: 200, claves: 120 },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Seis. Metade do círculo.',
            'Repara: de mi pra fá é um passo só. De dó pra ré são dois. O teclado mente pro olho e fala a verdade pro ouvido.',
          ],
        },
      },
      {
        id: 'doze_tonico',
        objetivo: 'Mostre a coleção a Seu Tônico, na Clareira do Primeiro Canto',
        gatilho: { tipo: 'falar', npc: 'npc_tonico' },
        recompensa: { xp: 160, claves: 80 },
        fala: {
          quem: 'Seu Tônico',
          linhas: [
            'Seis notas e nenhuma casa. Escala não é monte de nota, moço — é nota em ordem, com a tônica mandando.',
            'Complete o círculo e volte. Aí a gente conversa sobre acorde.',
          ],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_024_CONSTELACAO_DO_ACORDE',
    capitulo: 'Capítulo I',
    titulo: 'Constelação do Acorde',
    descricao:
      'Uma escala guarda acordes do jeito que um céu guarda constelações: os pontos já estavam lá, faltava traçar.',
    etapas: [
      {
        id: 'acorde_antony',
        objetivo: 'Peça ao Sr. Antony que explique os graus da escala',
        gatilho: { tipo: 'falar', npc: 'story_sr_antony' },
        fala: {
          quem: 'Sr. Antony',
          linhas: [
            'Conte os degraus da sua escala: um, dois, três, quatro, cinco.',
            'Pegue o primeiro, o terceiro e o quinto e toque juntos. Isso é uma tríade. É o acorde mais antigo que existe.',
            'Monte três e equipe. Quero ver soando, não escrito.',
          ],
        },
      },
      {
        id: 'acorde_equipar',
        objetivo: 'Monte uma escala e equipe 3 acordes',
        gatilho: { tipo: 'equipar_acordes', quantidade: 3 },
        recompensa: { xp: 240, claves: 150, itens: [{ item: 'partitura_prata', quantidade: 2 }] },
        fala: {
          quem: 'Sr. Antony',
          linhas: ['Um, três e cinco. Simples assim, e sustenta uma civilização inteira.'],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_025_UMA_MELODIA_PARA_PIPPO',
    capitulo: 'Capítulo I',
    titulo: 'Uma Melodia para Pippo',
    descricao:
      'O menino tem um lugar que não mostrou a ninguém. Hoje mostra, e pede uma música que seja só dos dois.',
    etapas: [
      {
        id: 'melodia_pippo',
        objetivo: 'Encontre Pippo — ele quer mostrar um lugar',
        gatilho: { tipo: 'falar', npc: 'story_pippo' },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Nunca trouxe ninguém aqui. Nem meu pai.',
            'É o único lugar onde eu canto errado e ninguém corrige.',
          ],
        },
      },
      {
        id: 'melodia_lago',
        objetivo: 'Vá com ele até a margem do lago, a oeste da Floresta dos Ecos',
        gatilho: { tipo: 'chegar', mapa: 'floresta_ecos', col: 90, linha: 168, raio: 14 },
        recompensa: { xp: 200, claves: 100 },
        fala: {
          quem: 'Pippo',
          linhas: [
            'Faz a sua parte que eu faço a minha. Se errar, erra junto comigo que fica combinado.',
            'Pronto. Agora essa é nossa. Se alguém tocar ela sem a gente, é porque ouviu escondido.',
            'Guarda ela, Akles. Melodia guardada não se perde igual as outras coisas.',
          ],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_018_DOMINAR_O_PROPRIO_SOM',
    capitulo: 'Capítulo I',
    titulo: 'Dominar o Próprio Som',
    descricao:
      'Todo mundo em Acordelot sabe tocar. Poucos sabem o que estão tocando. O Sr. Antony quer saber em qual grupo Akles está.',
    etapas: [
      {
        id: 'som_antony',
        objetivo: 'Procure o Sr. Antony para a avaliação',
        gatilho: { tipo: 'falar', npc: 'story_sr_antony' },
        fala: {
          quem: 'Sr. Antony',
          linhas: [
            'Não quero ver você bater. Quero ver você escolher.',
            'Toda skill custa alguma coisa e demora alguma coisa. Quem não sabe o custo, gasta na hora errada.',
            'Suba uma das suas até o terceiro nível e volte. Aí conversamos sobre a passiva dela.',
          ],
        },
      },
      {
        id: 'som_upar',
        objetivo: 'Suba uma das suas skills até o nível 3',
        gatilho: { tipo: 'skill_no_nivel', nivel: 3 },
        recompensa: { xp: 170, claves: 90 },
        fala: {
          quem: 'Sr. Antony',
          linhas: ['Agora ela tem passiva. Passiva é o que age quando você não está pensando nela.'],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_019_ESCOLHA_DE_COMPANHEIRO',
    capitulo: 'Capítulo I',
    titulo: 'Escolha de Companheiro',
    descricao:
      'Uma caravana precisa de escolta por duas rotas ao mesmo tempo. Wins conhece uma; Huans conhece a outra. Akles não pode fazer as duas.',
    etapas: [
      {
        id: 'comp_antony',
        objetivo: 'Receba a missão de escolta com o Sr. Antony',
        gatilho: { tipo: 'falar', npc: 'story_sr_antony' },
        fala: {
          quem: 'Sr. Antony',
          linhas: [
            'Duas rotas, um Akles. A conta não fecha sozinha.',
            'Wins abre caminho de longe e limpa o campo. Huans chega antes de todo mundo e não deixa ninguém cercar.',
            'Escolha por quem você é, não por quem bate mais forte. Vocês vão andar juntos um bom tempo.',
          ],
        },
      },
      {
        id: 'comp_trocar',
        objetivo: 'Assuma o controle de Wins ou de Huans na tela de personagens',
        gatilho: { tipo: 'jogar_como', herois: ['wins', 'huans'] },
        recompensa: { xp: 150, claves: 70 },
        fala: {
          quem: 'Wins',
          linhas: [
            'Fico na retaguarda e abro o caminho. Você entra depois que eu limpar.',
            'Se eu gritar pra recuar, recua. Não é sugestão.',
          ],
        },
      },
      {
        id: 'comp_patrulha',
        objetivo: 'Derrote 8 inimigos com o companheiro escolhido',
        gatilho: { tipo: 'derrotar', quantidade: 8 },
        recompensa: { xp: 220, claves: 120, itens: [{ item: 'partitura_prata', quantidade: 1 }] },
      },
    ],
  },
  {
    id: 'MQ_C1_020_PRIMEIRO_COMBATE_EM_DUPLA',
    capitulo: 'Capítulo I',
    titulo: 'Primeiro Combate em Dupla',
    descricao:
      'Duas pessoas batendo no mesmo monstro não é uma dupla. Dupla é quando uma sabe o que a outra vai fazer antes.',
    etapas: [
      {
        id: 'dupla_floresta',
        objetivo: 'Leve a dupla à Floresta dos Ecos',
        gatilho: { tipo: 'estar_em', mapa: 'floresta_ecos' },
      },
      {
        id: 'dupla_limpar',
        objetivo: 'Limpe 12 criaturas hostis da floresta revezando os dois heróis',
        gatilho: { tipo: 'derrotar', quantidade: 12 },
        recompensa: { xp: 260, claves: 140 },
        fala: {
          quem: 'Akles',
          linhas: ['A troca não é fuga. É revezamento — quem está fresco entra.'],
        },
      },
    ],
  },
  {
    id: 'MQ_C1_026_SOMBRAS_SEM_VOZ',
    capitulo: 'Capítulo I',
    titulo: 'Sombras sem Voz',
    descricao:
      'Trechos de Acordelot amanheceram sem som nenhum. Não silêncio de madrugada — silêncio de coisa arrancada.',
    etapas: [
      {
        id: 'sombras_pippo',
        objetivo: 'Pippo notou primeiro. Ouça o que ele viu',
        gatilho: { tipo: 'falar', npc: 'story_pippo' },
        fala: {
          quem: 'Pippo',
          linhas: [
            'A rua do poço está muda. Bati o pingente na pedra e não voltou nada.',
            'E tem uma marca na parede. Parece dos Remanescentes, mas está nova demais. Marca velha descasca.',
            'Não contei pro meu pai. Conto pra você porque você acredita em som.',
          ],
        },
      },
      {
        id: 'sombras_caverna',
        objetivo: 'Procure a origem do silêncio nas Cavernas de Cristal',
        gatilho: { tipo: 'estar_em', mapa: 'cavernas_cristal' },
        recompensa: { xp: 180 },
      },
      {
        id: 'sombras_limpar',
        objetivo: 'Derrote 10 criaturas silenciadas nas cavernas',
        gatilho: { tipo: 'derrotar', quantidade: 10 },
        recompensa: { xp: 280, claves: 160, itens: [{ item: 'partitura_prata', quantidade: 1 }] },
        fala: {
          quem: 'Akles',
          linhas: [
            'Elas não estavam com raiva. Estavam sem nota — e bicho sem nota ataca qualquer coisa que tenha uma.',
          ],
        },
      },
      {
        id: 'sombras_antony',
        objetivo: 'Leve a marca copiada ao Sr. Antony',
        gatilho: { tipo: 'falar', npc: 'story_sr_antony' },
        recompensa: { xp: 200, claves: 120 },
        fala: {
          quem: 'Sr. Antony',
          linhas: [
            'Essa marca é dos Remanescentes, sim. E é isso que me incomoda.',
            'Quem viveu escondido trinta anos não assina a parede com o traço limpo. Isso aqui foi copiado por alguém que viu o símbolo num papel.',
            'Alguém quer que a gente olhe para o lado errado. Fique perto do menino.',
          ],
        },
      },
    ],
  },
];

// ------------------------------------------------------------ funções puras

/** Todas as etapas em ordem, com a missão de cada uma. */
export function todasAsEtapas(): Array<{ missao: Missao; etapa: Etapa; indice: number }> {
  const saida: Array<{ missao: Missao; etapa: Etapa; indice: number }> = [];
  let i = 0;
  for (const missao of CAMPANHA) for (const etapa of missao.etapas) saida.push({ missao, etapa, indice: i++ });
  return saida;
}

/** Índice linear de uma etapa; -1 quando o id não existe. */
export function indiceDaEtapa(id: string): number {
  return todasAsEtapas().findIndex((e) => e.etapa.id === id);
}

/**
 * A etapa aberta agora, dada a ULTIMA CONCLUIDA; null quando a campanha acabou.
 *
 * O parametro e a ultima concluida, nao a corrente. A diferenca parece
 * cosmetica e nao e: guardando a corrente, a ultima etapa da campanha fica
 * corrente para sempre e a ultima missao nunca chega a "completed" — nao ha
 * estado seguinte para onde ir. Guardando a concluida, `null` significa "nada
 * feito ainda" e a ultima etapa concluida significa "acabou", sem valor
 * especial nenhum.
 */
export function proximaEtapa(ultimaConcluida: string | null): Etapa | null {
  const todas = todasAsEtapas();
  if (ultimaConcluida === null) return todas[0]?.etapa ?? null;
  const i = indiceDaEtapa(ultimaConcluida);
  return i < 0 ? null : (todas[i + 1]?.etapa ?? null);
}

/** Quanto do gatilho já foi cumprido, para a barra do diário. */
export function progresso(gatilho: Gatilho, m: Mundo): { feito: number; alvo: number } {
  switch (gatilho.tipo) {
    case 'juntar':
      return { feito: Math.min(gatilho.quantidade, m.inventario[gatilho.item] ?? 0), alvo: gatilho.quantidade };
    case 'derrotar': {
      const n = gatilho.especie ? (m.abatidos[gatilho.especie] ?? 0) : m.abatidosTotal;
      return { feito: Math.min(gatilho.quantidade, n), alvo: gatilho.quantidade };
    }
    case 'sintetizar_notas':
      return { feito: Math.min(gatilho.quantidade, m.notasSintetizadas), alvo: gatilho.quantidade };
    case 'equipar_acordes':
      return { feito: Math.min(gatilho.quantidade, m.acordesEquipados), alvo: gatilho.quantidade };
    case 'nivel':
      return { feito: Math.min(gatilho.valor, m.nivel), alvo: gatilho.valor };
    case 'arma_melhorada':
      return { feito: Math.min(gatilho.nivel, m.nivelDaArma), alvo: gatilho.nivel };
    case 'vestir':
      return { feito: Math.min(gatilho.pecas, m.pecasVestidas), alvo: gatilho.pecas };
    case 'skill_no_nivel':
      return { feito: Math.min(gatilho.nivel, m.maiorSkill), alvo: gatilho.nivel };
    default:
      return { feito: 0, alvo: 1 };
  }
}

/** A etapa terminou? Função pura: o mesmo mundo dá sempre a mesma resposta. */
export function estaSatisfeita(gatilho: Gatilho, m: Mundo): boolean {
  switch (gatilho.tipo) {
    case 'falar':
      return m.npcFalado === gatilho.npc;
    case 'chegar':
      return (
        m.mapa === gatilho.mapa &&
        Math.hypot(m.col - gatilho.col, m.linha - gatilho.linha) <= gatilho.raio
      );
    case 'estar_em':
      return m.mapa === gatilho.mapa;
    case 'jogar_como':
      return gatilho.herois.includes(m.heroiAtivo as 'akles' | 'wins' | 'huans');
    default: {
      const p = progresso(gatilho, m);
      return p.feito >= p.alvo;
    }
  }
}

/** Estado de uma missão, dada a ULTIMA etapa concluída da campanha. */
export function estadoDaMissao(
  missao: Missao,
  ultimaConcluida: string | null,
): 'locked' | 'active' | 'completed' {
  const ids = missao.etapas.map((e) => indiceDaEtapa(e.id));
  const primeira = Math.min(...ids);
  const ultima = Math.max(...ids);
  // -1 quando nada foi concluido: a etapa aberta e a de indice 0.
  const feito = ultimaConcluida === null ? -1 : indiceDaEtapa(ultimaConcluida);
  if (feito >= ultima) return 'completed';
  if (feito >= primeira - 1) return 'active';
  return 'locked';
}

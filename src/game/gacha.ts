// ============================================================================
// CONVERGÊNCIA DOS ECOS — o sorteio.
//
// O plano do capítulo põe cinco condições antes de o tutorial do sorteio entrar
// na campanha: probabilidades VISÍVEIS, garantia definida, histórico, regra de
// duplicatas, e um primeiro sorteio controlado. Diz ainda, com todas as letras,
// que não pode existir botão sem explicação nem sorteio pago obrigatório para
// avançar. Este arquivo existe para que essas cinco coisas sejam verificáveis,
// não prometidas.
//
// TUDO AQUI É FUNÇÃO PURA, com o acaso entrando por parâmetro. Um sorteio que
// se testa é um sorteio em que dá para provar a taxa anunciada: o teste roda
// cem mil convergências com semente fixa e compara o resultado com a tabela que
// o jogador lê na tela. Se um dia alguém mexer nos pesos e esquecer o texto, o
// teste quebra — que é o único jeito honesto de prometer probabilidade.
//
// O que NÃO entra no sorteio: Wins e Huans. O plano é explícito — personagens
// canônicos vêm da história, nunca de moeda.
// ============================================================================

export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario';

export interface Premio {
  id: string;
  nome: string;
  raridade: Raridade;
  /** Item de inventário que o prêmio entrega, e quanto. */
  item: string;
  quantidade: number;
  descricao: string;
}

/** O que se paga por uma convergência. */
export const CUSTO = { item: 'eco_dust', quantidade: 20 } as const;

/**
 * GARANTIA. A cada 10 convergências sem nada acima de comum, a décima vem
 * garantidamente rara ou melhor; a cada 40 sem lendário, a quadragésima é
 * lendária. Números fechados e pequenos, para caberem numa frase que o jogador
 * lê antes de gastar, e não num rodapé.
 */
export const GARANTIA_RARO = 10;
export const GARANTIA_LENDARIO = 40;

/** Taxa BASE de cada raridade — a do acaso puro, antes da garantia. Soma 1. */
export const TAXAS: Record<Raridade, number> = {
  comum: 0.7405,
  raro: 0.22,
  epico: 0.03,
  lendario: 0.0095,
};

/**
 * Taxa EFETIVA — a que o jogador realmente observa, com a garantia incluída.
 * É ESTA que a tela precisa mostrar em destaque.
 *
 * Por que as duas existem: com lendário a 0,95% e garantia a cada 40, a chance
 * de passar 40 sorteios sem lendário é (1-0,0095)^40 ≈ 68%. Ou seja, a garantia
 * dispara na MAIORIA das janelas — ela não é uma rede de segurança rara, é o
 * caminho normal. A taxa observada fica em ~3%, três vezes a base.
 *
 * Anunciar só a base seria mentir, mesmo mentindo a favor do jogador: quem lê
 * "0,95%" e recebe 3% não foi enganado no bolso, mas foi enganado. E quem lê
 * "3%" e entende que são 3% por sorteio independente também estaria errado — daí
 * a tela mostrar as duas, com nome.
 *
 * Os valores vêm de cem mil sorteios medidos, e `test-gacha.mjs` cobra que
 * continuem valendo: mexer nos pesos ou na garantia sem corrigir aqui quebra o
 * teste, que é a única forma honesta de prometer probabilidade.
 */
export const TAXAS_EFETIVAS: Record<Raridade, number> = {
  comum: 0.7134,
  raro: 0.2262,
  epico: 0.0302,
  lendario: 0.0302,
};

export const PREMIOS: Premio[] = [
  { id: 'poeira', nome: 'Poeira de Eco', raridade: 'comum', item: 'eco_dust', quantidade: 8,
    descricao: 'A convergência devolve parte do pó em ressonância aproveitável.' },
  { id: 'claves', nome: 'Punhado de Claves', raridade: 'comum', item: 'clave', quantidade: 60,
    descricao: 'Moeda de combate condensada pela convergência.' },
  { id: 'tom', nome: 'Tom', raridade: 'comum', item: 'tone', quantidade: 2,
    descricao: 'Intervalo de dois semitons, para montar escalas.' },
  { id: 'semitom', nome: 'Semitom', raridade: 'comum', item: 'semitone', quantidade: 3,
    descricao: 'Intervalo de um passo, o menor da escala cromática.' },
  { id: 'partitura', nome: 'Partitura de Prata', raridade: 'raro', item: 'partitura_prata', quantidade: 1,
    descricao: 'Experiência escrita, pronta para ser lida.' },
  { id: 'pocao', nome: 'Reserva do Viajante', raridade: 'raro', item: 'potion_heal', quantidade: 5,
    descricao: 'Cinco poções de cura, para não voltar cedo.' },
  { id: 'minerio', nome: 'Veio Ressonante', raridade: 'raro', item: 'ore', quantidade: 12,
    descricao: 'Minério de forja condensado.' },
  { id: 'essencia', nome: 'Essência do Coletor', raridade: 'epico', item: 'potion_farm', quantidade: 3,
    descricao: 'Três frascos que fazem a terra render mais.' },
  { id: 'escudo', nome: 'Guarda Harmônica', raridade: 'epico', item: 'potion_shield', quantidade: 4,
    descricao: 'Quatro poções de escudo.' },
  { id: 'nucleo', nome: 'Núcleo de Ascensão das Teclas', raridade: 'lendario', item: 'ascension_keys', quantidade: 1,
    descricao: 'A relíquia que o Sentinela do Órgão guarda. A convergência às vezes a encontra sozinha.' },
];

export interface EstadoDoSorteio {
  /** Convergências desde o último prêmio raro ou melhor. */
  desdeRaro: number;
  /** Convergências desde o último lendário. */
  desdeLendario: number;
  /** Quantas vezes cada prêmio já saiu — é o que define duplicata. */
  vistos: Record<string, number>;
  historico: Array<{ premio: string; raridade: Raridade; garantido: boolean; duplicata: boolean }>;
}

export function estadoInicial(): EstadoDoSorteio {
  return { desdeRaro: 0, desdeLendario: 0, vistos: {}, historico: [] };
}

export interface Resultado {
  premio: Premio;
  /** Veio pela garantia, não pelo acaso — a tela diz isso ao jogador. */
  garantido: boolean;
  /** Já tinha saído antes. */
  duplicata: boolean;
  /** Item e quantidade a creditar, já com a regra de duplicata aplicada. */
  entrega: { item: string; quantidade: number };
  /** Compensação por duplicata, quando houver. */
  compensacao: { item: string; quantidade: number } | null;
}

/** Escolhe uma raridade pela taxa anunciada. `sorte` vem de fora, em [0,1). */
function raridadePorSorte(sorte: number): Raridade {
  let acumulado = 0;
  for (const r of ['lendario', 'epico', 'raro'] as Raridade[]) {
    acumulado += TAXAS[r];
    if (sorte < acumulado) return r;
  }
  return 'comum';
}

/**
 * Uma convergência.
 *
 * `sorte` e `escolha` são dois números em [0,1) vindos de fora: o primeiro
 * decide a raridade, o segundo qual prêmio daquela raridade. O acaso fica do
 * lado de quem chama, então o teste pode semear e conferir a taxa.
 *
 * A garantia não é um bônus por cima do acaso: ela SUBSTITUI a raridade
 * sorteada quando o contador estoura. Somar as duas coisas faria a taxa real
 * ficar acima da anunciada — o erro mais comum deste tipo de sistema, e uma
 * mentira mesmo quando favorece o jogador.
 */
export function converger(estado: EstadoDoSorteio, sorte: number, escolha: number): Resultado {
  let raridade = raridadePorSorte(sorte);
  let garantido = false;

  if (estado.desdeLendario + 1 >= GARANTIA_LENDARIO && raridade !== 'lendario') {
    raridade = 'lendario';
    garantido = true;
  } else if (estado.desdeRaro + 1 >= GARANTIA_RARO && raridade === 'comum') {
    raridade = 'raro';
    garantido = true;
  }

  const doTipo = PREMIOS.filter((p) => p.raridade === raridade);
  const premio = doTipo[Math.min(doTipo.length - 1, Math.floor(escolha * doTipo.length))];

  const duplicata = (estado.vistos[premio.id] ?? 0) > 0;
  // DUPLICATA não vira nada perdido: o prêmio continua vindo inteiro, e ainda
  // rende pó de volta, proporcional à raridade. Repetir não pode ser punição.
  const compensacao = duplicata
    ? { item: 'eco_dust', quantidade: raridade === 'lendario' ? 60 : raridade === 'epico' ? 30 : raridade === 'raro' ? 12 : 4 }
    : null;

  return {
    premio,
    garantido,
    duplicata,
    entrega: { item: premio.item, quantidade: premio.quantidade },
    compensacao,
  };
}

/** Aplica o resultado ao estado. Devolve um estado NOVO; não altera o antigo. */
export function registrar(estado: EstadoDoSorteio, r: Resultado): EstadoDoSorteio {
  const raro = r.premio.raridade !== 'comum';
  return {
    desdeRaro: raro ? 0 : estado.desdeRaro + 1,
    desdeLendario: r.premio.raridade === 'lendario' ? 0 : estado.desdeLendario + 1,
    vistos: { ...estado.vistos, [r.premio.id]: (estado.vistos[r.premio.id] ?? 0) + 1 },
    historico: [
      { premio: r.premio.id, raridade: r.premio.raridade, garantido: r.garantido, duplicata: r.duplicata },
      ...estado.historico,
    ].slice(0, 50),
  };
}

/** Quantas faltam para cada garantia — a tela mostra antes de o jogador gastar. */
export function faltamPara(estado: EstadoDoSorteio) {
  return {
    raro: Math.max(0, GARANTIA_RARO - estado.desdeRaro),
    lendario: Math.max(0, GARANTIA_LENDARIO - estado.desdeLendario),
  };
}

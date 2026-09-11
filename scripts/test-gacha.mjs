/**
 * O sorteio entrega o que promete?
 *
 * Prometer probabilidade é fácil; a única forma honesta de fazer isso é medir.
 * Este teste roda cem mil convergências com semente fixa e compara a frequência
 * observada com a TABELA QUE O JOGADOR LÊ NA TELA. Se alguém mexer nos pesos e
 * esquecer o texto, ou vice-versa, isto quebra.
 *
 * Cobre também as outras quatro exigências do plano: garantia que cumpre o
 * prazo, histórico que registra, duplicata que compensa em vez de punir, e
 * nenhum personagem canônico dentro da tabela.
 */
import assert from 'node:assert/strict';
const g = await import('../src/game/gacha.ts');

// Gerador determinístico: o mesmo número em toda máquina, hoje e daqui a um ano.
function semente(s) {
  let x = s >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 0x100000000; };
}

// 1. As taxas anunciadas somam 1. Sem isso, nada mais faz sentido.
const soma = Object.values(g.TAXAS).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(soma - 1) < 1e-9, `as taxas anunciadas somam ${soma}, nao 1`);

// 2. Cem mil convergências: a frequência tem que bater com o anunciado.
const N = 100000;
const rng = semente(0xC0FFEE);
let estado = g.estadoInicial();
const contagem = {comum: 0, raro: 0, epico: 0, lendario: 0};
let garantidos = 0, duplicatas = 0, compensadas = 0;
let maiorJejumRaro = 0, maiorJejumLendario = 0, jejumR = 0, jejumL = 0;

for (let i = 0; i < N; i++) {
  const r = g.converger(estado, rng(), rng());
  contagem[r.premio.raridade]++;
  if (r.garantido) garantidos++;
  if (r.duplicata) { duplicatas++; if (r.compensacao) compensadas++; }
  jejumR = r.premio.raridade === 'comum' ? jejumR + 1 : 0;
  jejumL = r.premio.raridade === 'lendario' ? 0 : jejumL + 1;
  maiorJejumRaro = Math.max(maiorJejumRaro, jejumR);
  maiorJejumLendario = Math.max(maiorJejumLendario, jejumL);
  estado = g.registrar(estado, r);
}

// A TAXA EFETIVA anunciada tem que ser a taxa medida, com folga apertada.
// Este e o teste que importa: e o numero que o jogador le na tela.
//
// A taxa BASE nunca pode ficar ACIMA da efetiva — a garantia so pode ajudar.
for (const [raridade, anunciada] of Object.entries(g.TAXAS_EFETIVAS)) {
  const observada = contagem[raridade] / N;
  assert.ok(Math.abs(observada - anunciada) < 0.004,
    `${raridade}: a tela anuncia ${(anunciada*100).toFixed(2)}% e o sorteio entrega ${(observada*100).toFixed(2)}%`);
  if (raridade !== 'comum') {
    assert.ok(anunciada >= g.TAXAS[raridade] - 1e-9,
      `${raridade}: a taxa efetiva (${anunciada}) ficou abaixo da base (${g.TAXAS[raridade]}) — a garantia esta tirando, nao dando`);
  }
}
const somaEfetiva = Object.values(g.TAXAS_EFETIVAS).reduce((a,b)=>a+b,0);
assert.ok(Math.abs(somaEfetiva - 1) < 0.01, `as taxas efetivas somam ${somaEfetiva}, nao 1`);

// 3. A garantia cumpre o prazo. Nunca pode haver jejum maior que o prometido.
assert.ok(maiorJejumRaro < g.GARANTIA_RARO,
  `jejum de ${maiorJejumRaro} comuns seguidos, mas a garantia promete ${g.GARANTIA_RARO}`);
assert.ok(maiorJejumLendario < g.GARANTIA_LENDARIO,
  `jejum de ${maiorJejumLendario} sem lendario, mas a garantia promete ${g.GARANTIA_LENDARIO}`);
assert.ok(garantidos > 0, 'a garantia nunca disparou em cem mil sorteios — ela existe mesmo?');

// 4. Duplicata compensa SEMPRE, e nunca reduz o premio.
assert.equal(duplicatas, compensadas, 'houve duplicata sem compensacao');
assert.ok(duplicatas > 0, 'nenhuma duplicata em cem mil — o teste nao exercitou a regra');

// 5. Histórico registra e não cresce sem limite.
assert.ok(estado.historico.length > 0, 'o historico ficou vazio');
assert.ok(estado.historico.length <= 50, `historico sem teto: ${estado.historico.length}`);
assert.equal(typeof estado.historico[0].garantido, 'boolean', 'o historico nao marca o que veio por garantia');

// 6. CONTROLE NEGATIVO: sem a garantia, o jejum estoura. Se não estourasse,
//    o item 3 estaria passando por sorte e não por causa da garantia.
let semGarantia = 0, pior = 0;
const rng2 = semente(0xC0FFEE);
for (let i = 0; i < N; i++) {
  // estado sempre zerado = garantia nunca acumula
  const r = g.converger(g.estadoInicial(), rng2(), rng2());
  semGarantia = r.premio.raridade === 'comum' ? semGarantia + 1 : 0;
  pior = Math.max(pior, semGarantia);
}
assert.ok(pior >= g.GARANTIA_RARO,
  `controle negativo furado: sem garantia o pior jejum foi ${pior}, menor que ${g.GARANTIA_RARO} — o acaso sozinho ja bastaria`);

// 7. Nenhum personagem canônico na tabela. O plano é explícito.
const proibidos = ['wins', 'huans', 'akles'];
for (const p of g.PREMIOS) {
  const texto = `${p.id} ${p.item} ${p.nome}`.toLowerCase();
  for (const nome of proibidos) {
    assert.ok(!texto.includes(nome), `"${p.nome}" entrega um personagem canonico (${nome}) pelo sorteio`);
  }
}

// 8. Toda raridade tem prêmio. Uma raridade vazia travaria o sorteio.
for (const r of ['comum', 'raro', 'epico', 'lendario']) {
  assert.ok(g.PREMIOS.some(p => p.raridade === r), `nenhum premio de raridade "${r}"`);
}

const pct = r => (contagem[r] / N * 100).toFixed(2);
console.log(`OK  ${N/1000} mil convergencias: comum ${pct('comum')}%  raro ${pct('raro')}%  epico ${pct('epico')}%  lendario ${pct('lendario')}%`);
console.log(`OK  efetiva anunciada:    comum ${(g.TAXAS_EFETIVAS.comum*100).toFixed(2)}%  raro ${(g.TAXAS_EFETIVAS.raro*100).toFixed(2)}%  epico ${(g.TAXAS_EFETIVAS.epico*100).toFixed(2)}%  lendario ${(g.TAXAS_EFETIVAS.lendario*100).toFixed(2)}%`);
console.log(`OK  base (acaso puro):     comum ${(g.TAXAS.comum*100).toFixed(2)}%  raro ${(g.TAXAS.raro*100).toFixed(2)}%  epico ${(g.TAXAS.epico*100).toFixed(2)}%  lendario ${(g.TAXAS.lendario*100).toFixed(2)}%`);
console.log(`OK  garantia cumprida: pior jejum ${maiorJejumRaro}/${g.GARANTIA_RARO} raro, ${maiorJejumLendario}/${g.GARANTIA_LENDARIO} lendario`);
console.log(`OK  controle negativo: sem garantia o jejum chega a ${pior}`);
console.log(`OK  ${duplicatas} duplicatas, todas compensadas; nenhum personagem canonico na tabela`);

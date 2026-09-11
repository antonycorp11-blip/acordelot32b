/**
 * A campanha inteira, percorrida do começo ao fim SEM abrir o jogo.
 *
 * `campaign.ts` não importa nada e não toca no engine: as regras são funções
 * puras sobre um retrato do mundo. Então este teste simula um jogador que
 * cumpre cada gatilho e cobra que a corrente avance até a última etapa — sem
 * canvas, sem WebGL, em menos de um segundo.
 *
 * É o teste que as dez missões antigas nunca puderam ter, porque estavam
 * costuradas dentro de um arquivo de dez mil linhas.
 */
import assert from 'node:assert/strict';
const c = await import('../src/game/campaign.ts');

const MUNDO_VAZIO = {
  npcFalado: null, inventario: {}, abatidos: {}, abatidosTotal: 0,
  mapa: 'overworld', col: 0, linha: 0, notasSintetizadas: 0,
  acordesEquipados: 0, nivel: 1, nivelDaArma: 0, pecasVestidas: 0, heroiAtivo: 'akles', maiorSkill: 1,
};

/** Devolve um mundo em que ESTE gatilho está cumprido, e só ele. */
function mundoQueCumpre(g) {
  const m = {...MUNDO_VAZIO, inventario: {}, abatidos: {}};
  switch (g.tipo) {
    case 'falar': m.npcFalado = g.npc; break;
    case 'chegar': m.mapa = g.mapa; m.col = g.col; m.linha = g.linha; break;
    case 'juntar': m.inventario[g.item] = g.quantidade; break;
    case 'derrotar':
      if (g.especie) m.abatidos[g.especie] = g.quantidade; else m.abatidosTotal = g.quantidade;
      break;
    case 'sintetizar_notas': m.notasSintetizadas = g.quantidade; break;
    case 'equipar_acordes': m.acordesEquipados = g.quantidade; break;
    case 'nivel': m.nivel = g.valor; break;
    case 'arma_melhorada': m.nivelDaArma = g.nivel; break;
    case 'vestir': m.pecasVestidas = g.pecas; break;
    case 'jogar_como': m.heroiAtivo = g.herois[0]; break;
    case 'skill_no_nivel': m.maiorSkill = g.nivel; break;
    case 'estar_em': m.mapa = g.mapa; break;
    default: throw new Error('gatilho desconhecido no teste: ' + g.tipo);
  }
  return m;
}

const todas = c.todasAsEtapas();
assert.ok(todas.length >= 15, `campanha curta demais: ${todas.length} etapas`);

// 1. Ids únicos. Etapa repetida faria a campanha voltar no tempo.
const ids = todas.map(e => e.etapa.id);
assert.equal(new Set(ids).size, ids.length, 'ha etapas com o mesmo id');
const missaoIds = c.CAMPANHA.map(m => m.id);
assert.equal(new Set(missaoIds).size, missaoIds.length, 'ha missoes com o mesmo id');

// 2. Toda etapa avança quando o gatilho é cumprido, e NÃO avança no mundo vazio.
//    A segunda metade é o controle: sem ela, um gatilho sempre-verdadeiro passaria.
const semGatilhoDeMundoVazio = [];
for (const {etapa} of todas) {
  assert.ok(
    c.estaSatisfeita(etapa.gatilho, mundoQueCumpre(etapa.gatilho)),
    `"${etapa.id}" nao completa nem quando o gatilho e cumprido`,
  );
  if (c.estaSatisfeita(etapa.gatilho, MUNDO_VAZIO)) semGatilhoDeMundoVazio.push(etapa.id);
}
assert.deepEqual(semGatilhoDeMundoVazio, [], 'etapas que ja nascem completas — objetivo que nao pede nada');

// 3. A corrente inteira, do nada até o fim.
let atual = null;
const percorridas = [];
for (let i = 0; i < todas.length; i++) {
  const proxima = c.proximaEtapa(atual);
  assert.ok(proxima, `a corrente parou em "${atual}" com ${todas.length - i} etapas restando`);
  assert.ok(c.estaSatisfeita(proxima.gatilho, mundoQueCumpre(proxima.gatilho)), `travou em ${proxima.id}`);
  atual = proxima.id;
  percorridas.push(atual);
}
assert.equal(percorridas.length, todas.length, 'nem toda etapa foi alcancada');
assert.equal(c.proximaEtapa(atual), null, 'a campanha nao termina — ha etapa depois da ultima');

// 4. Estado das missões ao longo do caminho: nada pode voltar de completed.
for (const missao of c.CAMPANHA) {
  const vistos = [];
  for (const id of [null, ...percorridas]) vistos.push(c.estadoDaMissao(missao, id));
  const ordem = {locked: 0, active: 1, completed: 2};
  for (let i = 1; i < vistos.length; i++) {
    assert.ok(
      ordem[vistos[i]] >= ordem[vistos[i - 1]],
      `"${missao.id}" regrediu de ${vistos[i - 1]} para ${vistos[i]}`,
    );
  }
  assert.equal(vistos[vistos.length - 1], 'completed', `"${missao.id}" nunca completa`);
}

// 5. Objetivo e descrição legíveis — texto vazio vira diário em branco.
for (const {missao, etapa} of todas) {
  assert.ok(etapa.objetivo.length > 10, `objetivo curto demais em "${etapa.id}"`);
  assert.ok(missao.descricao.length > 20, `descricao curta demais em "${missao.id}"`);
}

console.log(`OK  ${c.CAMPANHA.length} missoes, ${todas.length} etapas, percorridas do inicio ao fim`);
console.log(`OK  nenhuma etapa nasce completa, nenhuma missao regride`);

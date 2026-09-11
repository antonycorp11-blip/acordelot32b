/**
 * A Convergência ligada ao jogo: porta fechada, primeiro chamado grátis,
 * custo cobrado depois, prêmio creditado e a missão 022 avançando.
 *
 * O teste puro prova que as taxas são honestas. Este prova que a regra do plano
 * — "nem botão sem explicação, nem sorteio pago obrigatório" — virou código.
 */
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PORTA = process.env.PORTA || '3000';
const browser = await chromium.launch({channel: 'chrome', headless: true});
const page = await browser.newPage({viewport: {width: 844, height: 390}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto(`http://localhost:${PORTA}`);
  await page.evaluate(async () => {
    const {GameEngine} = await import('/src/game/engine.ts');
    const c = document.createElement('canvas');
    c.style.cssText = 'width:844px;height:390px;display:block';
    document.body.replaceChildren(c);
    const e = window.qaEngine = new GameEngine(c);
    e.setViewportSize(844, 390); e.stop();
    e.storyStage = 'complete'; e.storyControlLocked = false;
  });
  await page.waitForFunction(() => window.qaEngine.assetsLoaded, {timeout: 90000});

  const r = await page.evaluate(async () => {
    const e = window.qaEngine;
    const G = await import('/src/game/gacha.ts');
    const out = {};

    // 1. Fechada antes de Lucian apresentar.
    e.regionQuestStage = 'completed';
    e.campanhaConcluida = null;
    out.fechadaAntes = e.convergenciaDisponivel;

    // Avanca ate a etapa em que Lucian apresenta.
    e.campanhaConcluida = 'converg_lucian';
    out.abertaDepois = e.convergenciaDisponivel;

    // 2. O PRIMEIRO e gratis: sem po nenhum, tem que funcionar.
    e.inventory[G.CUSTO.item] = 0;
    e.convergenciaTutorialUsada = false;
    out.podeSemPo = e.podeConvergir().pode;
    const antesPo = e.inventory[G.CUSTO.item] ?? 0;
    const r1 = e.convergir();
    out.primeiro = !!r1;
    out.naoCobrouOPrimeiro = (e.inventory[G.CUSTO.item] ?? 0) >= antesPo;
    out.premioCreditado = r1 ? ((e.inventory[r1.entrega.item] ?? 0) > 0 || r1.entrega.item === 'clave') : false;

    // 3. A partir do segundo, cobra — e barra quem nao tem.
    e.inventory[G.CUSTO.item] = 0;
    out.barraSemPo = !e.podeConvergir().pode;
    out.nadaSaiSemPo = e.convergir() === null;

    // 4. Com po, cobra o preco exato.
    e.inventory[G.CUSTO.item] = 100;
    e.convergir();
    out.cobrou = 100 - (e.inventory[G.CUSTO.item] ?? 0);

    // 5. Historico registra.
    out.historico = e.convergencia.historico.length;

    // 6. A missao 022 aparece e avanca com as convergencias.
    e.campanhaConcluida = 'converg_lucian';
    e.convergenciasFeitas = 0;
    const missao = e.mainQuestLog.find(q => q.id === 'MQ_C1_022_CONVERGENCIA_DOS_ECOS');
    out.missaoExiste = !!missao;
    out.missaoAtiva = missao?.status;
    e.convergenciasFeitas = 1;
    e.avancarCampanha();
    out.avancou = e.campanhaConcluida === 'converg_primeira';
    return out;
  });

  assert.equal(r.fechadaAntes, false, 'a Convergencia abre antes de Lucian apresentar — botao sem explicacao');
  assert.equal(r.abertaDepois, true, 'a Convergencia nao abre nem depois de Lucian apresentar');
  assert.equal(r.podeSemPo, true, 'o primeiro chamado deveria ser gratuito');
  assert.equal(r.primeiro, true, 'o primeiro chamado nao aconteceu');
  assert.equal(r.naoCobrouOPrimeiro, true, 'o tutorial cobrou pelo primeiro chamado');
  assert.equal(r.premioCreditado, true, 'o premio nao foi creditado no inventario');
  assert.equal(r.barraSemPo, true, 'deixou convergir sem ter o custo');
  assert.equal(r.nadaSaiSemPo, true, 'sorteou mesmo sem poder pagar');
  assert.equal(r.cobrou, 20, `cobrou ${r.cobrou} em vez de 20 de Poeira de Eco`);
  assert.ok(r.historico >= 2, `historico registrou ${r.historico}`);
  assert.equal(r.missaoExiste, true, 'a missao 022 nao esta no diario');
  assert.equal(r.missaoAtiva, 'active', `a missao 022 esta "${r.missaoAtiva}"`);
  assert.equal(r.avancou, true, 'convergir nao avancou a missao');
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log('OK  fechada ate Lucian apresentar; aberta depois');
  console.log('OK  primeiro chamado gratis; do segundo em diante cobra 20 e barra quem nao tem');
  console.log(`OK  premio creditado, historico com ${r.historico} registros`);
  console.log('OK  a missao 022 avanca ao convergir');
} finally {
  await browser.close();
}

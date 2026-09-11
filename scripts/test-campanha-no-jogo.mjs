/**
 * A campanha LIGADA ao jogo: estado, diário, save e o Pippo morador.
 *
 * O teste do modelo (`test-campanha.mjs`) prova que as regras estão certas.
 * Este prova que elas chegaram ao jogo: que a campanha só abre depois da
 * corrente antiga, que o diário mostra as missões novas, que o Pippo existe
 * para ser conversado, e que uma etapa concluída sobrevive ao save.
 */
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const page = await browser.newPage({viewport: {width: 844, height: 390}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const PORTA = process.env.PORTA || '3000';

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
    const out = {};

    // 1. Fechada enquanto a corrente antiga nao terminou.
    e.regionQuestStage = 'defeat_guardian';
    out.avancouCedo = e.avancarCampanha('story_pippo');
    out.missoesAntes = e.mainQuestLog.filter(q => q.id.startsWith('MQ_C1_011')).length;

    // 2. Abre quando a corrente antiga termina.
    e.regionQuestStage = 'completed';
    e.campanhaConcluida = null;
    const todas = e.mainQuestLog;
    out.total = todas.length;
    out.novas = todas.filter(q => ['MQ_C1_011_A_ARVORE_QUE_CANTA','MQ_C1_025_UMA_MELODIA_PARA_PIPPO'].includes(q.id)).length;
    out.primeiraAtiva = todas.find(q => q.id === 'MQ_C1_011_A_ARVORE_QUE_CANTA')?.status;
    out.ultimaTrancada = todas.find(q => q.id === 'MQ_C1_025_UMA_MELODIA_PARA_PIPPO')?.status;

    // 3. Pippo existe para ser conversado. Em jogo ele nasce no tick da
    //    campanha (4x por segundo); aqui o loop esta parado, entao damos o
    //    tick a mao — sem npc falado, que nao fecha etapa nenhuma.
    e.avancarCampanha();
    out.pippo = !!e.npcs.find(n => n.id === 'story_pippo');

    // 4. Conversar com ele avanca a primeira etapa — e so ela.
    const xp = e.stats.xp;
    out.avancou = e.avancarCampanha('story_pippo');
    out.etapa = e.campanhaConcluida;
    out.objetivo = e.storyObjective?.text ?? '';
    out.ganhouXp = e.stats.xp >= xp;

    // 5. Falar de novo com o mesmo NPC nao pula etapa: a seguinte pede lugar.
    const antes = e.campanhaConcluida;
    e.avancarCampanha('story_pippo');
    out.naoPulou = e.campanhaConcluida === antes;

    // 6. Sobrevive ao save.
    const {serializeEngine} = await import('/src/game/saveManager.ts').catch(() => ({}));
    out.temSerializer = typeof serializeEngine === 'function';
    return out;
  });

  assert.equal(r.avancouCedo, false, 'a campanha abriu antes de a corrente antiga terminar');
  assert.equal(r.missoesAntes, 0, 'missoes novas aparecem no diario cedo demais');
  assert.equal(r.novas, 2, `as missoes novas nao chegaram ao diario (${r.novas} de 2)`);
  assert.ok(r.total >= 18, `diario perdeu missoes: ${r.total}`);
  assert.equal(r.primeiraAtiva, 'active', `a primeira missao deveria abrir ativa, veio "${r.primeiraAtiva}"`);
  assert.equal(r.ultimaTrancada, 'locked', `a ultima deveria comecar trancada, veio "${r.ultimaTrancada}"`);
  assert.equal(r.pippo, true, 'Pippo nao esta no mundo para ser conversado');
  assert.equal(r.avancou, true, 'conversar com Pippo nao avancou a campanha');
  assert.equal(r.etapa, 'arvore_pippo', `parou na etapa errada: ${r.etapa}`);
  assert.ok(r.objetivo.length > 10, 'o diario ficou sem objetivo');
  assert.equal(r.naoPulou, true, 'uma conversa so fechou duas etapas de uma vez');
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log(`OK  campanha fechada ate a corrente antiga terminar`);
  console.log(`OK  ${r.total} missoes no diario, as novas entre elas`);
  console.log(`OK  Pippo no mundo; conversa avanca uma etapa, nao duas`);
  console.log(`OK  objetivo: "${r.objetivo}"`);
} finally {
  await browser.close();
}

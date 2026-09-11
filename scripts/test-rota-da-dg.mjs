/**
 * O caminho até a masmorra tem que ser SEGUÍVEL do começo ao fim.
 *
 * O defeito: com a missão em `enter_cavern`, o marcador apontava para a entrada
 * da caverna — um prop do OVERWORLD. Assim que o jogador atravessava essa
 * entrada, o prop não existia mais no mapa e o marcador virava null. Resultado:
 * um mapa de 120 tiles, nenhuma seta, e nenhuma menção de que a Fenda Profunda
 * existe — sendo que é ela quem abre a tela da masmorra.
 *
 * O teste anda o caminho: fora da caverna tem marcador, DENTRO também, e o
 * alvo de dentro é o portal da Fenda. O controle negativo é a terceira parte:
 * o prop da entrada realmente NÃO existe dentro da caverna, que é a razão de o
 * código antigo falhar.
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

  const r = await page.evaluate(() => {
    const e = window.qaEngine;
    e.voicesMissionAccepted = true;
    e.marketIntroStage = 'completed';
    e.lucianMeetingRewarded = true;
    e.echoTutorialStage = 'completed';
    e.postEchoStage = 'completed';
    const out = {};

    // O FLUXO DE VERDADE: coletar os cinco cristais e ver o objetivo que aparece.
    e.regionQuestStage = 'gather_crystals';
    e.regionCrystalProgress = 0;
    e.travelTo('floresta_ecos');
    // `collectDrop` e o caminho real da coleta — e onde a missao escuta.
    for (let i = 0; i < 5; i++) e.collectDrop('crystal_blue_raw', 1, undefined, e.player.x, e.player.y);
    out.virouEnterCavern = e.regionQuestStage === 'enter_cavern';
    out.textoDoObjetivo = e.storyObjective?.text ?? '';

    // Fora: o marcador aponta a entrada da caverna.
    e.travelTo('overworld');
    out.foraTemMarcador = !!e.questGuidanceTarget;

    // Dentro: tem que continuar apontando — agora a Fenda.
    e.travelTo('cavernas_cristal');
    const m = e.questGuidanceTarget;
    out.dentroTemMarcador = !!m;
    const fenda = e.props.find(p => p.id === 'cc_portal_dg');
    out.fendaExiste = !!fenda;
    if (m && fenda) {
      // `propPoint` mira o PE do prop — onde o jogador pisa —, nao o centro.
      out.distanciaAteAFenda = Math.round(
        Math.hypot(m.x - (fenda.x + fenda.w / 2), m.y - (fenda.y + fenda.h)) / 32);
    }

    // CONTROLE NEGATIVO: o prop que o codigo antigo procurava nao existe aqui.
    out.entradaExisteDentro = e.props.some(p => p.id === 'region_crystal_cavern_entrance');

    // A Fenda abre TELA, nao entra andando.
    out.fendaAbreTela = fenda?.data?.kind === 'screen';

    return out;
  });

  assert.equal(r.virouEnterCavern, true, 'coletar 5 cristais nao avancou a missao');
  assert.equal(r.foraTemMarcador, true, 'sem marcador nem fora da caverna');
  assert.equal(r.fendaExiste, true, 'o portal da Fenda nao existe nas Cavernas');
  assert.equal(r.dentroTemMarcador, true,
    'DENTRO da caverna o marcador sumiu — o jogador fica sem pista nenhuma');
  assert.ok(r.distanciaAteAFenda <= 2,
    `o marcador aponta a ${r.distanciaAteAFenda} tiles da Fenda, deveria apontar para ela`);
  assert.equal(r.entradaExisteDentro, false,
    'controle negativo furado: o prop da entrada existe dentro da caverna, entao o codigo antigo nao falharia');
  assert.equal(r.fendaAbreTela, true, 'a Fenda deveria abrir a tela da masmorra, nao entrar andando');
  assert.ok(/Fenda/i.test(r.textoDoObjetivo),
    `o objetivo nao menciona a Fenda: "${r.textoDoObjetivo}"`);
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log('OK  marcador aponta fora E dentro da caverna');
  console.log(`OK  dentro, aponta o portal da Fenda (${r.distanciaAteAFenda} tile de erro)`);
  console.log('OK  controle negativo: a entrada da caverna nao existe dentro dela');
  console.log(`OK  objetivo: "${r.textoDoObjetivo}"`);
} finally {
  await browser.close();
}

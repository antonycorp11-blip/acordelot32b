/**
 * Seu Tônico mudou-se de Acordelot para a Floresta dos Ecos.
 *
 * Mudar NPC de mapa erra de dois jeitos, e o teste cobra os dois: ficar nos
 * dois lugares, ou sumir dos dois. Também cobra que a ronda dele fica na
 * Clareira do Primeiro Canto — onde o Eco de Dó mora — e que ela é caminhável,
 * senão ele fica preso numa árvore.
 */
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const page = await browser.newPage({viewport: {width: 844, height: 390}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto('http://localhost:3000');
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
    const {buildMap} = await import('/src/game/mapData.ts');
    const {buildFlorestaEcos} = await import('/src/game/maps/florestaEcos.ts');
    const cidade = buildMap();
    const floresta = buildFlorestaEcos();
    const acha = (m) => m.npcs.find(n => n.id === 'npc_tonico');
    const naFloresta = acha(floresta);

    // Toda a ronda tem que ser pisável.
    const e = window.qaEngine;
    e.travelTo('floresta_ecos');
    const presos = [];
    if (naFloresta) {
      for (const p of naFloresta.route) {
        if (e.checkSolidCollision({x: p.x - 6, y: p.y - 5, w: 12, h: 10})) {
          presos.push([p.x / 32, p.y / 32]);
        }
      }
    }
    return {
      naCidade: !!acha(cidade),
      naFloresta: !!naFloresta,
      pos: naFloresta ? {c: naFloresta.x / 32, r: naFloresta.y / 32} : null,
      presos,
      outrosNaCidade: cidade.npcs.length,
    };
  });

  assert.equal(r.naFloresta, true, 'Seu Tonico nao chegou na Floresta dos Ecos');
  assert.equal(r.naCidade, false, 'Seu Tonico continua em Acordelot — ficou nos dois mapas');
  assert.ok(r.outrosNaCidade > 5, `os outros NPCs sumiram de Acordelot (restaram ${r.outrosNaCidade})`);

  const CLAREIRA = [150, 44];
  const d = Math.hypot(r.pos.c - CLAREIRA[0], r.pos.r - CLAREIRA[1]);
  assert.ok(d < 16, `ele deveria rondar a Clareira do Primeiro Canto, esta a ${d.toFixed(1)} tiles`);
  assert.deepEqual(r.presos, [], 'pontos da ronda dentro de colisor — ele ficaria preso');
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log(`OK  Seu Tonico na Floresta (${r.pos.c}, ${r.pos.r}), a ${d.toFixed(1)} tiles da clareira do Do`);
  console.log(`OK  saiu de Acordelot, e os outros ${r.outrosNaCidade} NPCs ficaram`);
  console.log(`OK  ronda inteira caminhavel`);
} finally {
  await browser.close();
}

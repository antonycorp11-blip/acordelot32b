/**
 * Os doze Ecos tem que nascer ESPALHADOS, um trio por clareira.
 *
 * Antes ficavam todos num raio de dez tiles em volta do altar. Este teste
 * cobra: os doze aparecem, cada um perto da clareira da sua familia, e a
 * distancia entre as familias e grande de verdade — nao adianta "espalhar" 12
 * tiles e chamar de zona.
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
    const e = window.qaEngine;
    e.travelTo('floresta_ecos');
    const {NOTE_KEY} = await import('/src/game/engine.ts');
    const ecos = e.enemies
      .filter(x => typeof x.id === 'string' && x.id.startsWith('sanctuary_echo_'))
      .map(x => ({
        nota: NOTE_KEY[Number(x.id.slice('sanctuary_echo_'.length))],
        idx: Number(x.id.slice('sanctuary_echo_'.length)),
        c: x.x / 32, r: x.y / 32,
      }));
    let maiorVao = 0;
    for (const a of ecos) for (const b of ecos) {
      maiorVao = Math.max(maiorVao, Math.hypot(a.c - b.c, a.r - b.r));
    }
    return {ecos, maiorVao};
  });

  assert.equal(r.ecos.length, 12, `esperado 12 Ecos, nasceram ${r.ecos.length}`);

  // Cada nota tem que estar perto da clareira da sua familia.
  const CLAREIRAS = {
    primeiroCanto: [150, 44], salgueiros: [84, 47],
    folhasDouradas: [217, 53], borboletas: [54, 102],
  };
  const FAMILIA = {
    c: 'primeiroCanto', d: 'primeiroCanto', e: 'primeiroCanto',
    f: 'salgueiros', g: 'salgueiros', a: 'salgueiros',
    b: 'folhasDouradas', cs: 'folhasDouradas', ds: 'folhasDouradas',
    fs: 'borboletas', gs: 'borboletas', as: 'borboletas',
  };
  const longe = [];
  for (const eco of r.ecos) {
    const alvo = CLAREIRAS[FAMILIA[eco.nota]];
    const d = Math.hypot(eco.c - alvo[0], eco.r - alvo[1]);
    if (d > 16) longe.push(`${eco.nota} a ${d.toFixed(1)} tiles da sua clareira`);
  }
  assert.deepEqual(longe, [], 'Ecos fora da clareira da propria familia');

  assert.ok(
    r.maiorVao > 90,
    `as familias precisam ficar em cantos diferentes do mapa — maior vao e so ${r.maiorVao.toFixed(1)} tiles`,
  );
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log(`OK  12 Ecos, cada um na clareira da sua familia`);
  console.log(`OK  maior distancia entre familias: ${r.maiorVao.toFixed(1)} tiles`);
} finally {
  await browser.close();
}

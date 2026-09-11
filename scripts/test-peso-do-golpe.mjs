/**
 * O combate ganhou peso e resposta — isso é verificável?
 *
 * Três coisas foram adicionadas, e cada uma tem um jeito de mentir:
 *  - HITSTOP pode existir no código e nunca disparar.
 *  - TREMOR pode sacudir sempre igual, e aí não diferencia tapa de crítico.
 *  - ESQUIVA pode ter i-frames que não protegem de nada.
 *
 * Cada asserção abaixo tem o seu controle: não basta o número mudar, ele tem
 * que mudar NA DIREÇÃO certa e NÃO mudar quando não deveria.
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
    const out = {};
    const leve = () => { e.hitstopRestante = 0; e.tremor = 0; };

    // --- HITSTOP: existe, e o mundo realmente desacelera ---
    leve();
    e.registrarImpacto(0.5);
    out.hitstopNasce = e.hitstopRestante > 0;
    const tAntes = e.timeElapsed;
    e.update(0.016);
    out.mundoDesacelerou = (e.timeElapsed - tAntes) < 0.016 * 0.5;
    // e passa: nao pode congelar para sempre
    for (let i = 0; i < 30; i++) e.update(0.016);
    out.hitstopAcaba = e.hitstopRestante <= 0;
    const t2 = e.timeElapsed;
    e.update(0.016);
    out.mundoVolta = Math.abs((e.timeElapsed - t2) - 0.016) < 0.0005;

    // --- TREMOR: proporcional, nao fixo ---
    leve(); e.registrarImpacto(0.05); const fraco = e.tremor;
    leve(); e.registrarImpacto(1.0);  const forte = e.tremor;
    out.tremorEscala = forte > fraco * 1.8;
    // e decai sozinho ate zero
    for (let i = 0; i < 60; i++) e.update(0.016);
    out.tremorDecai = e.tremor === 0;

    // --- ESQUIVA ---
    e.stats.hp = e.stats.maxHp;
    e.playerInvuln = 0; e.esquivaCd = 0; e.esquivaT = 0;
    out.podeAntes = e.podeEsquivar;
    const x0 = e.player.x, y0 = e.player.y;
    e.player.direction = 'right';
    out.esquivou = e.esquivar();
    out.deuIframes = e.playerInvuln > 0;
    out.naoPodeDeNovo = !e.podeEsquivar;          // recarga de verdade
    for (let i = 0; i < 8; i++) e.update(0.016);
    out.andouDeVerdade = Math.hypot(e.player.x - x0, e.player.y - y0) > 24;

    // O TESTE QUE IMPORTA: durante os i-frames, o golpe NAO tira vida.
    e.stats.hp = e.stats.maxHp;
    e.esquivaCd = 0; e.esquivaT = 0; e.playerInvuln = 0;
    e.esquivar();
    const hpAntes = e.stats.hp;
    e.damagePlayer(40);
    out.esquivaSalvou = e.stats.hp === hpAntes;

    // CONTROLE: sem esquiva, o MESMO golpe tira vida. Sem isto, "salvou"
    // poderia ser um damagePlayer quebrado, e nao a esquiva funcionando.
    e.playerInvuln = 0; e.esquivaT = 0;
    const hpAntes2 = e.stats.hp;
    e.damagePlayer(40);
    out.semEsquivaDoi = e.stats.hp < hpAntes2;

    // A recarga passa e ela volta.
    for (let i = 0; i < 80; i++) e.update(0.016);
    out.recarregou = e.podeEsquivar;
    return out;
  });

  assert.equal(r.hitstopNasce, true, 'registrarImpacto nao gerou hitstop');
  assert.equal(r.mundoDesacelerou, true, 'o hitstop nao desacelerou o mundo');
  assert.equal(r.hitstopAcaba, true, 'o hitstop nao termina — o jogo ficaria travado');
  assert.equal(r.mundoVolta, true, 'o tempo nao voltou ao normal depois do hitstop');
  assert.equal(r.tremorEscala, true, 'o tremor e igual para tapa e para critico');
  assert.equal(r.tremorDecai, true, 'o tremor nao para — a tela sacudiria para sempre');
  assert.equal(r.podeAntes, true, 'nao da para esquivar em condicao normal');
  assert.equal(r.esquivou, true, 'esquivar() recusou');
  assert.equal(r.deuIframes, true, 'a esquiva nao deu invulnerabilidade');
  assert.equal(r.naoPodeDeNovo, true, 'da para esquivar em sequencia, sem recarga');
  assert.equal(r.andouDeVerdade, true, 'a esquiva nao moveu o jogador');
  assert.equal(r.esquivaSalvou, true, 'levou dano NO MEIO da esquiva — os i-frames nao protegem');
  assert.equal(r.semEsquivaDoi, true, 'controle furado: o golpe nao tira vida nem sem esquiva');
  assert.equal(r.recarregou, true, 'a esquiva nunca recarrega');
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log('OK  hitstop: nasce, desacelera o mundo, termina e devolve o tempo');
  console.log('OK  tremor: escala com a forca do golpe e decai ate zero');
  console.log('OK  esquiva: move, da i-frames, tem recarga e recarrega');
  console.log('OK  o golpe NAO tira vida durante a esquiva — e TIRA sem ela (controle)');
} finally {
  await browser.close();
}

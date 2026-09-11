/**
 * Os efeitos de status valem FORA da masmorra — e aparecem na tela.
 *
 * Antes: só dentro da dungeon, e só para três inimigos. No mundo aberto a Dama
 * do Silêncio brigava igual a um javali. Pior: o veneno podia até ser marcado,
 * mas o tick só rodava na masmorra — um efeito que existia só no nome.
 *
 * O controle negativo aqui é o Javali de Musgo: ele NÃO deve deixar efeito
 * nenhum. Se deixasse, a tabela estaria aplicando status a qualquer coisa e as
 * outras asserções não provariam nada.
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
    const limpar = () => {
      e.playerPoisonUntil = 0; e.playerSilenceUntil = 0; e.playerSlowUntil = 0;
    };
    const bater = (kind) => {
      limpar();
      e.aplicarEfeitoDoGolpe(kind, e.player.x, e.player.y);
      return e.efeitosAtivos.map(x => x.id).sort();
    };

    e.travelTo('overworld');            // FORA da masmorra
    out.naDungeon = e.isDungeon;

    out.aranha = bater('aranha');
    out.dama = bater('dama');
    out.nocturno = bater('nocturno');
    out.maestro = bater('maestro');
    out.colosso = bater('colosso');
    out.cogumelo = bater('grove_mushroom');
    out.javali = bater('moss_boar');     // controle: sem efeito

    // O SILENCIO REALMENTE CALA as skills fora da masmorra.
    limpar();
    e.aplicarEfeitoDoGolpe('dama', e.player.x, e.player.y);
    out.skillBloqueada = e.useSkill ? !e.useSkill(0) : null;

    // O VENENO REALMENTE TIRA VIDA fora da masmorra.
    limpar();
    e.stats.hp = e.stats.maxHp;
    e.aplicarEfeitoDoGolpe('aranha', e.player.x, e.player.y);
    e.playerPoisonTickAt = 0;
    const hpAntes = e.stats.hp;
    e.playerInvuln = 0;
    e.update(0.016);
    out.venenoDoeu = e.stats.hp < hpAntes;

    // CONTROLE: sem veneno, o mesmo tick nao tira nada.
    limpar();
    e.stats.hp = e.stats.maxHp;
    e.playerInvuln = 0;
    const hp2 = e.stats.hp;
    e.update(0.016);
    out.semVenenoNaoDoi = e.stats.hp === hp2;

    // A LENTIDAO e menor fora da masmorra que dentro.
    limpar(); e.aplicarEfeitoDoGolpe('nocturno', 0, 0);
    const fora = e.playerSlowUntil - e.timeElapsed;
    limpar();
    const eraDg = e.isDungeon;
    Object.defineProperty(e, 'isDungeon', {value: true, configurable: true});
    e.aplicarEfeitoDoGolpe('nocturno', 0, 0);
    const dentro = e.playerSlowUntil - e.timeElapsed;
    Object.defineProperty(e, 'isDungeon', {value: eraDg, configurable: true});
    out.foraEMaisLeve = fora < dentro;

    // Os efeitos SOMEM quando o tempo passa.
    limpar();
    e.aplicarEfeitoDoGolpe('nocturno', 0, 0);
    e.timeElapsed += 99;
    out.expiram = e.efeitosAtivos.length === 0;
    return out;
  });

  assert.equal(r.naDungeon, false, 'o teste nao esta no mundo aberto');
  assert.deepEqual(r.aranha, ['veneno'], `aranha deu ${r.aranha}`);
  assert.deepEqual(r.dama, ['silencio'], `dama deu ${r.dama}`);
  assert.deepEqual(r.nocturno, ['lentidao'], `nocturno deu ${r.nocturno}`);
  assert.deepEqual(r.maestro, ['silencio'], `maestro deu ${r.maestro}`);
  assert.deepEqual(r.colosso, ['lentidao'], `colosso deu ${r.colosso}`);
  assert.deepEqual(r.cogumelo, ['veneno'], `cogumelo deu ${r.cogumelo}`);
  assert.deepEqual(r.javali, [], 'controle furado: o Javali de Musgo deixou efeito, mas nao deveria');
  assert.equal(r.venenoDoeu, true, 'o veneno nao tira vida fora da masmorra — existe so no nome');
  assert.equal(r.semVenenoNaoDoi, true, 'controle furado: perdeu vida sem veneno nenhum');
  assert.equal(r.foraEMaisLeve, true, 'o efeito fora da masmorra dura o mesmo que dentro');
  assert.equal(r.expiram, true, 'os efeitos nao expiram');
  if (r.skillBloqueada !== null) {
    assert.equal(r.skillBloqueada, true, 'o Silencio nao bloqueou a skill');
  }
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log('OK  seis inimigos deixam efeito no mundo aberto; o javali nao (controle)');
  console.log('OK  o veneno tira vida fora da masmorra — e nao tira sem veneno (controle)');
  console.log('OK  fora da masmorra os efeitos duram menos, e todos expiram');
} finally {
  await browser.close();
}

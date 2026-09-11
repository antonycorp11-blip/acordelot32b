import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
// A porta pode mudar quando ha outro vite aberto na maquina; 3000 e so o padrao.
const PORTA = process.env.PORTA || '3000';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.TEST_OUTPUT || '/tmp/acordelot-dungeon-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(`http://localhost:${PORTA}/`);
  await page.evaluate(async () => {
    const { GameEngine } = await import('/src/game/engine.ts');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:844px;height:390px;display:block';
    document.body.replaceChildren(canvas);
    document.body.style.cssText = 'margin:0;background:#03040a;overflow:hidden';
    const e = (window.qaEngine = new GameEngine(canvas));
    e.setViewportSize(844, 390);
    e.stop();
    e.storyStage = 'complete';
    e.storyControlLocked = false;
  });
  await page.waitForFunction(() => window.qaEngine.assetsLoaded, { timeout: 90000 });

  // ---- 1. Portais no overworld + viagem ida/volta ----
  const travel = await page.evaluate(() => {
    const e = window.qaEngine;
    const owPortals = e.props.filter((p) => p.type === 'portal').map((p) => p.id);
    e.travelTo('floresta_ecos');
    const fe = {
      map: e.activeMapId, cols: e.mapCols, rows: e.mapRows,
      echoes: e.enemies.filter((n) => n.id.startsWith('sanctuary_echo_')).length,
      portals: e.props.filter((p) => p.type === 'portal').map((p) => p.id),
    };
    e.travelTo('overworld');
    const back = e.activeMapId;
    return { owPortals, fe, back };
  });
  console.log('Travel', travel);
  assert.deepEqual(travel.owPortals.sort(), ['portal_cavernas_cristal', 'portal_floresta_ecos']);
  assert.equal(travel.fe.map, 'floresta_ecos');
  assert.equal(travel.fe.echoes, 12, 'os 12 Ecos vivem na Floresta dos Ecos');
  assert.ok(travel.fe.portals.includes('fe_portal_overworld'));
  assert.equal(travel.back, 'overworld');

  // ---- 2. Bioma Cavernas de Cristal (claro) + DG instanciada (escura) ----
  const dungeon = await page.evaluate(() => {
    const e = window.qaEngine;
    e.travelTo('cavernas_cristal');
    const biome = { map: e.activeMapId, isDungeon: e.isDungeon, dgPortal: e.props.some((p) => p.id === 'cc_portal_dg') };
    e.lastCombatAt = -999;
    e.stats.forca = 4000;
    const entered = e.enterCrystalDungeon(1);
    const dg = {
      ok: entered.ok, map: e.activeMapId, isDungeon: e.isDungeon,
      monsters: e.enemies.filter((n) => n.id.startsWith('crystal_enemy_')).length,
      chests: e.props.filter((p) => p.type === 'dungeonChest').length,
    };
    return { biome, dg };
  });
  console.log('Dungeon', dungeon);
  assert.equal(dungeon.biome.map, 'cavernas_cristal');
  assert.equal(dungeon.biome.isDungeon, false, 'o bioma Cavernas de Cristal é iluminado');
  assert.ok(dungeon.biome.dgPortal, 'portal da Fenda Profunda presente no bioma');
  assert.equal(dungeon.dg.ok, true);
  assert.equal(dungeon.dg.map, 'dg_cristal_profundo');
  assert.equal(dungeon.dg.isDungeon, true, 'a DG instanciada é escura');
  assert.equal(dungeon.dg.monsters, 54);
  assert.equal(dungeon.dg.chests, 8);

  // ---- 3. Alcançabilidade das 8 câmaras da DG ----
  const reach = await page.evaluate(async () => {
    const e = window.qaEngine;
    const cfg = await import('/src/game/crystalDungeon.ts');
    const seen = new Set();
    const q = [[cfg.CRYSTAL_ROOMS[0].col, cfg.CRYSTAL_ROOMS[0].row]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      const k = x + ',' + y;
      if (seen.has(k) || x < 0 || x >= e.mapCols || y < 0 || y >= e.mapRows) continue;
      if (e.checkSolidCollision({ x: x * 32 + 8, y: y * 32 + 8, w: 16, h: 12 })) continue;
      seen.add(k);
      q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return {
      rooms: cfg.CRYSTAL_ROOMS.map((r) => ({ name: r.name, reachable: seen.has(r.col + ',' + r.row) })),
      cells: seen.size,
    };
  });
  console.log('Reach', reach);
  assert.ok(reach.rooms.every((r) => r.reachable), 'todas as 8 câmaras acessíveis');

  // ---- 4. Save preserva a região ativa ----
  const persist = await page.evaluate(async () => {
    const e = window.qaEngine;
    const sm = await import('/src/game/saveManager.ts');
    const save = sm.serializeEngineSave(e, 'qa');
    return { current_map: save.current_map };
  });
  console.log('Persist', persist);
  assert.equal(persist.current_map, 'dg_cristal_profundo');

  // ---- 5. Sair da DG volta pro bioma, não pro overworld ----
  const exit = await page.evaluate(() => {
    const e = window.qaEngine;
    e.leaveCrystalDungeon();
    const a = e.activeMapId;
    e.leaveCrystalDungeon();
    return { afterDg: a, afterBiome: e.activeMapId };
  });
  console.log('Exit', exit);
  assert.equal(exit.afterDg, 'cavernas_cristal');
  assert.equal(exit.afterBiome, 'overworld');

  // ---- 6. Tela de entrada da DG cabe em paisagem ----
  await page.evaluate(async () => {
    const reactMod = await import('/node_modules/.vite/deps/react.js');
    const React = reactMod.default ?? reactMod;
    const client = await import('/node_modules/.vite/deps/react-dom_client.js');
    const createRoot = client.createRoot ?? client.default.createRoot;
    const { DungeonEntranceScreen } = await import('/src/components/DungeonEntranceScreen.tsx');
    const node = document.createElement('div');
    document.body.append(node);
    createRoot(node).render(React.createElement(DungeonEntranceScreen, { open: true, power: 420, onClose: () => {}, onEnter: () => ({ ok: true, message: '' }) }));
  });
  await page.getByRole('dialog').waitFor();
  const layout = await page.evaluate(() => {
    const body = document.querySelector('.dungeon-body');
    const footer = document.querySelector('.dungeon-footer');
    return { bodyH: body.clientHeight, bodyScroll: body.scrollHeight, footerBottom: footer.getBoundingClientRect().bottom, vp: innerHeight };
  });
  console.log('Landscape layout', layout);
  assert.ok(layout.footerBottom <= layout.vp);
  assert.ok(layout.bodyScroll <= layout.bodyH + 1, 'tela de preparação cabe sem clipar');

  assert.deepEqual(errors, []);
  console.log('PASS.');
} finally {
  await browser.close();
}

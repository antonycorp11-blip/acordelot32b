import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=process.env.TEST_OUTPUT || '/tmp/acordelot-dungeon-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto('http://localhost:3000/');
  await page.evaluate(async()=>{
    const {GameEngine}=await import('/src/game/engine.ts');
    const canvas=document.createElement('canvas');
    canvas.style.cssText='width:844px;height:390px;display:block';
    document.body.replaceChildren(canvas);
    document.body.style.cssText='margin:0;background:#03040a;overflow:hidden';
    const e=window.qaEngine=new GameEngine(canvas);
    e.setViewportSize(844,390);
    e.stop();e.storyStage='complete';e.storyControlLocked=false;e.isTalkingToMerchant=false;
    window.qaConfig=await import('/src/game/crystalDungeon.ts');
    window.qaPlace=(col,row,inside=false)=>{
      e.isDungeon=inside;e.player.x=col*32;e.player.y=row*32;
      e.camX=e.player.x-e.viewportW/2;e.camY=e.player.y-e.viewportH/2;e.clampCamera();
      e.sceneFadeUntil=0;e.render();
    };
  });
  await page.waitForFunction(()=>window.qaEngine.assetsLoaded,{timeout:90000});
  const initial=await page.evaluate(()=>{
    const e=window.qaEngine,c=window.qaConfig;
    window.qaGateCount=0;e.onDungeonGate=()=>window.qaGateCount++;
    window.qaPlace(c.CRYSTAL_GATE.col,c.CRYSTAL_GATE.row);
    e.update(.016);
    const first={count:window.qaGateCount,locked:e.storyControlLocked};
    e.cancelDungeonEntry();e.update(.016);
    const afterCancel=window.qaGateCount;
    window.qaPlace(308,54);e.update(.016);
    window.qaPlace(c.CRYSTAL_GATE.col,c.CRYSTAL_GATE.row);e.update(.016);
    const revisit=window.qaGateCount;
    const denied=e.enterCrystalDungeon(4);
    const accepted=e.enterCrystalDungeon(1);
    return {first,afterCancel,revisit,denied,accepted,inside:e.isDungeon,
      echoes:e.enemies.filter(n=>n.id.startsWith('sanctuary_echo_')).length,
      monsters:e.enemies.filter(n=>c.isDungeonEnemy(n.id)).length,
      power:e.combatPower};
  });
  console.log('Gate and population',initial);
  assert.equal(initial.first.count,1);assert.equal(initial.first.locked,true);
  assert.equal(initial.afterCancel,1);assert.equal(initial.revisit,2);
  assert.equal(initial.denied.ok,false);assert.equal(initial.accepted.ok,true);
  assert.equal(initial.inside,true);assert.equal(initial.echoes,12);assert.equal(initial.monsters,54);
  const reachability=await page.evaluate(()=>{
    const e=window.qaEngine,c=window.qaConfig;
    function flood(startCol,startRow,minCol,maxCol){
      const seen=new Set(),queue=[[startCol,startRow]];
      for(let i=0;i<queue.length;i++){
        const [x,y]=queue[i],key=x+','+y;
        if(seen.has(key)||x<minCol||x>=maxCol||y<0||y>=208)continue;
        if(e.checkSolidCollision({x:x*32+8,y:y*32+8,w:16,h:12}))continue;
        seen.add(key);queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
      }
      return seen;
    }
    const interior=flood(354,46,331,440);
    const outside=flood(213,27,184,330);
    return {
      rooms:c.CRYSTAL_ROOMS.map(r=>({name:r.name,reachable:interior.has(r.col+','+r.row)})),
      enemies:e.enemies.filter(n=>c.isDungeonEnemy(n.id)&&!interior.has(Math.floor(n.x/32)+','+Math.floor(n.y/32))).map(n=>n.id),
      gateReachable:outside.has('326,46'),interiorCells:interior.size,outsideCells:outside.size,
      chests:c.CRYSTAL_ROOMS.map((_,i)=>{const p=e.props.find(p=>p.id===c.dungeonChestId(i));return [...interior].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(x*32+20-p.x-p.w/2,y*32+28-p.y-p.h/2)<76;});})
    };
  });
  console.log('Navigation',reachability);
  assert(reachability.rooms.every(r=>r.reachable),'All rooms must be walkable');
  assert.equal(reachability.enemies.length,0,'No unreachable enemy');
  assert(reachability.chests.every(Boolean),'All chests need a reachable interaction point');
  assert(reachability.gateReachable,'Sanctuary must connect to cave via bridge');
  await page.evaluate(()=>window.qaPlace(354,46,true));
  await page.screenshot({path:out+'/interior.png'});
  await page.evaluate(()=>{window.qaEngine.leaveCrystalDungeon();window.qaPlace(202,26);});
  await page.screenshot({path:out+'/sanctuary.png'});
  await page.evaluate(()=>window.qaPlace(287,47));
  await page.screenshot({path:out+'/bridge.png'});
  const persistence=await page.evaluate(()=>{
    const e=window.qaEngine,c=window.qaConfig;
    window.qaPlace(c.CRYSTAL_GATE.col,c.CRYSTAL_GATE.row);
    e.enterCrystalDungeon(1);
    const victim=e.enemies.find(n=>n.dungeonRoom===0);
    e.damageEnemy(victim,999999,victim.x-1,victim.y);
    const id=victim.id, saved=structuredClone(e.dungeonRun);
    e.restoreDungeonRun(saved);
    const persisted=!e.enemies.some(n=>n.id===id);
    e.leaveCrystalDungeon();
    const outside=e.isDungeon===false&&e.player.x===c.CRYSTAL_GATE.col*32;
    e.lastCombatAt=-999;e.stats.forca=2000;
    e.enterCrystalDungeon(4);
    const newRunRestoredEnemy=e.enemies.some(n=>n.id===id);
    const advanced=structuredClone(e.dungeonRun);
    e.restoreDungeonRun(advanced);
    return {persisted,outside,newRunRestoredEnemy,difficulty:e.dungeonRun.difficulty};
  });
  console.log('Persistence',persistence);
  assert(persistence.persisted);assert(persistence.outside);assert(persistence.newRunRestoredEnemy);assert.equal(persistence.difficulty,4);
  await page.evaluate(async()=>{
    const reactMod=await import('/node_modules/.vite/deps/react.js');
    const React=reactMod.default??reactMod;
    const client=await import('/node_modules/.vite/deps/react-dom_client.js');
    const createRoot=client.createRoot??client.default.createRoot;
    const {DungeonEntranceScreen}=await import('/src/components/DungeonEntranceScreen.tsx');
    const node=document.createElement('div');document.body.append(node);
    createRoot(node).render(React.createElement(DungeonEntranceScreen,{open:true,power:420,onClose:()=>{},onEnter:()=>({ok:true,message:''})}));
  });
  await page.getByRole('dialog').waitFor();
  await page.screenshot({path:out+'/entrance.png'});
  const layout=await page.evaluate(()=>{
    const body=document.querySelector('.dungeon-body'),footer=document.querySelector('.dungeon-footer');
    return {bodyHeight:body.clientHeight,bodyScroll:body.scrollHeight,footerBottom:footer.getBoundingClientRect().bottom,viewport:innerHeight};
  });
  console.log('Landscape layout',layout);
  assert(layout.footerBottom<=layout.viewport);assert(layout.bodyScroll<=layout.bodyHeight+1,'Preparation should fit a landscape phone without clipping');
  assert.deepEqual(errors,[]);
  console.log('PASS. Screenshots: '+out);
} finally {await browser.close();}

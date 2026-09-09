import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
// Every Akles direction/frame must end at the same baseline, with no fragment
// detached below the boots. These are the corrected, original character assets.
for(const action of ['idle','walk','run']){
  const p=PNG.sync.read(await readFile(`public/assets/characters/akles/akles_${action}.png`));
  for(let row=0;row<4;row++)for(let col=0;col<10;col++){
    let bottom=-1;
    for(let y=0;y<340;y++){let n=0;for(let x=0;x<156;x++)if(p.data[((row*340+y)*p.width+col*156+x)*4+3]>170)n++;if(n>=6)bottom=y;}
    assert(bottom>=335&&bottom<=338,`${action} ${row}/${col}: foot ${bottom}`);
  }
}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:844,height:390}});
const out='/tmp/acordelot-forest-expansion';await mkdir(out,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://localhost:3000',{waitUntil:'domcontentloaded',timeout:90000});
  await page.evaluate(async()=>{
    // The terrain must still feather with Canvas filter disabled (Safari case).
    Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{configurable:true,get:()=> 'none',set:()=>{}});
    const {GameEngine}=await import('/src/game/engine.ts');
    const canvas=document.createElement('canvas');canvas.style.cssText='width:844px;height:390px;display:block';document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;overflow:hidden';
    const e=window.qaEngine=new GameEngine(canvas);e.stop();e.storyStage='complete';e.setViewportSize(844,390);
  });
  await page.waitForFunction(()=>window.qaEngine.assetsLoaded,{timeout:90000});
  const result=await page.evaluate(async()=>{
    const e=window.qaEngine;
    const cityBoss=e.enemies.filter(n=>n.kind==='organ_sentinel').length;
    e.travelTo('floresta_ecos');
    const {SANCTUARY_ECHO_HOMES}=await import('/src/game/maps/sanctuaryPilot.ts');
    const notes=['c','cs','d','ds','e','f','fs','g','gs','a','as','b'];
    const echoes=e.enemies.filter(n=>n.kind.startsWith('eco_'));
    const grouped=echoes.every(n=>{const home=SANCTUARY_ECHO_HOMES[notes.indexOf(n.kind.slice(4))];return home&&Math.hypot(n.homeX/32-home[0],n.homeY/32-home[1])<7;});
    const stairs=e.props.filter(p=>p.type==='grassTerrace').map(p=>{
      const x=p.x+p.w/2;let clear=true;
      for(let y=p.y;y<p.y+p.h;y+=8)if(e.checkSolidCollision({x:x-8,y,w:16,h:12}))clear=false;
      return {id:p.id,clear};
    });
    return {cityBoss,forestBoss:e.enemies.filter(n=>n.kind==='organ_sentinel').length,echoes:echoes.length,grouped,stairs,
      fauna:e.enemies.filter(n=>['moss_boar','grove_mushroom'].includes(n.kind)).length,
      falls:e.props.filter(p=>p.type==='forestWaterfall').length,
      water:e.ground.flat().filter(t=>t===9000||t===9001).length};
  });
  console.log(result);assert.equal(result.cityBoss,0);assert.equal(result.forestBoss,1);assert(result.grouped);assert.equal(result.echoes,34);assert.equal(result.fauna,18);assert.equal(result.falls,2);assert(result.stairs.every(s=>s.clear));
  for(const [name,c,r] of [['waterfall',103,85],['stairs',149,77],['portal',150,149],['forest-road',150,90],['mountain',249,29],['fauna',122,89]]){
    await page.evaluate(([c,r])=>{const e=window.qaEngine;e.player.x=c*32;e.player.y=r*32;e.camX=e.player.x-e.viewportW/2;e.camY=e.player.y-e.viewportH/2;e.sceneFadeUntil=0;e.setTimeOfDay('day');e.timeElapsed=10;e.render();},[c,r]);
    await page.screenshot({path:out+'/'+name+'.png'});
  }
  assert.deepEqual(errors,[]);console.log('PASS: Akles baseline, note habitats, guardian relocation, woodland fauna, water and stairs. '+out);
}finally{await browser.close();}

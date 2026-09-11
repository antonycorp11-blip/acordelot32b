import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
// A porta pode mudar quando ha outro vite aberto na maquina; 3000 e so o padrao.
const PORTA = process.env.PORTA || '3000';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
const out='/tmp/acordelot-sanctuary-pilot';await mkdir(out,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`http://localhost:${PORTA}`);
  await page.evaluate(async()=>{
    const {GameEngine}=await import('/src/game/engine.ts');
    const canvas=document.createElement('canvas');canvas.style.cssText='width:844px;height:390px;display:block';
    document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#07111a;overflow:hidden';
    const e=window.qaEngine=new GameEngine(canvas);e.stop();e.setViewportSize(844,390);e.storyStage='complete';e.storyControlLocked=false;
  });
  await page.waitForFunction(()=>window.qaEngine.assetsLoaded,{timeout:90000});
  const result=await page.evaluate(async()=>{
    const e=window.qaEngine;e.travelTo('floresta_ecos');
    const {SANCTUARY_WALK,SANCTUARY_PILOT,buildSanctuaryPilot}=await import('/src/game/maps/sanctuaryPilot.ts');
    const fixture={ground:Array.from({length:220},()=>Array(300).fill(56)),props:[{id:'existing-crystal',type:'spot_crystal_blue',x:150*32,y:117*32,w:56,h:60,sortY:118*32}],solids:[],cols:300,rows:220,rng:()=>.5};
    buildSanctuaryPilot(fixture);
    const b=SANCTUARY_PILOT;
    const scopeIntact=fixture.ground.every((row,r)=>row.every((tile,c)=>(c>=b.left&&c<=b.right&&r>=b.top&&r<=b.bottom)||tile===56));
    const resourceIntact=fixture.props.some(p=>p.id==='existing-crystal'&&p.type==='spot_crystal_blue');
    const blocked=[];
    for(let j=1;j<SANCTUARY_WALK.length;j++){
      const a=SANCTUARY_WALK[j-1],b=SANCTUARY_WALK[j],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);
      for(let i=0;i<=n;i++){
        const x=(a[0]+(b[0]-a[0])*i/n)*32+16,y=(a[1]+(b[1]-a[1])*i/n)*32+16;
        if(e.checkSolidCollision({x:x-9,y:y-6,w:18,h:12}))blocked.push([x/32,y/32]);
      }
    }
    const checks={blocked,scopeIntact,resourceIntact,echoes:e.enemies.filter(n=>n.id.startsWith('sanctuary_echo_')).length,
      hero:e.props.some(p=>p.id==='region_echo_sanctuary'&&p.type==='sanctuaryTree'),
      deckBlocked:e.checkSolidCollision({x:150*32,y:135*32,w:18,h:12}),
      waterBlocked:e.checkSolidCollision({x:155*32,y:134*32,w:18,h:12}),
      art:['sanctuaryTree','sanctuaryDressing','sanctuaryBridge'].every(k=>e.assets[k]?.naturalWidth>0)};
    return checks;
  });
  console.log(JSON.stringify(result));assert.deepEqual(result.blocked,[]);assert.equal(result.echoes,12);assert(result.scopeIntact&&result.resourceIntact&&result.hero&&result.art&&result.waterBlocked&&!result.deckBlocked);
  for(const [name,c,r] of [['arrival',150,143],['bridge',150,135],['sanctuary',150,117],['ancient-tree',149,112]]){
    await page.evaluate(([c,r])=>{
      const e=window.qaEngine;e.player.x=c*32;e.player.y=r*32;e.camX=e.player.x-e.viewportW/2;e.camY=e.player.y-e.viewportH/2;
      e.sceneFadeUntil=0;e.timeElapsed=12;e.setTimeOfDay('day');e.render();
    },[c,r]);
    await page.screenshot({path:out+'/'+name+'.png'});
  }
  await page.setViewportSize({width:932,height:430});
  await page.evaluate(()=>{const e=window.qaEngine;e.canvas.style.cssText='width:932px;height:430px';e.setViewportSize(932,430);e.camX=e.player.x-e.viewportW/2;e.camY=e.player.y-e.viewportH/2;e.render();});
  await page.screenshot({path:out+'/sanctuary-wide.png'});
  assert.deepEqual(errors,[]);console.log('PASS: authored path, bridge, 12 echoes, assets and two landscape viewports. '+out);
}finally{await browser.close();}

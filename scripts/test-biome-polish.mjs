import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
// A porta pode mudar quando ha outro vite aberto na maquina; 3000 e so o padrao.
const PORTA = process.env.PORTA || '3000';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
const output=process.env.TEST_OUTPUT||'/tmp/acordelot-biome-qa';
await mkdir(output,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`http://localhost:${PORTA}`);
  await page.evaluate(async()=>{
    const {GameEngine}=await import('/src/game/engine.ts');
    const c=document.createElement('canvas');c.style.cssText='width:844px;height:390px';
    document.body.replaceChildren(c);document.body.style.cssText='margin:0;overflow:hidden;background:#07111a';
    const e=window.qaEngine=new GameEngine(c);e.setViewportSize(844,390);e.stop();e.storyStage='complete';e.storyControlLocked=false;
    window.place=(map,col,row)=>{
      if(e.activeMapId!==map)e.travelTo(map);
      e.player.x=col*32;e.player.y=row*32;e.camX=e.player.x-e.viewportW/2;e.camY=e.player.y-e.viewportH/2;e.clampCamera();
      e.sceneFadeUntil=0;e.timeElapsed=12;e.setTimeOfDay('day');e.render();
    };
  });
  await page.waitForFunction(()=>window.qaEngine.assetsLoaded,{timeout:90000});
  const scope=await page.evaluate(()=>{
    // Inspect the live prototypes: Vite HMR may give a dynamic import a separate
    // module instance from the one already imported by the engine.
    window.place('floresta_ecos',150,118);
    const terrainPrototype=Object.getPrototypeOf(window.qaEngine.regionalTerrain);
    const waterPrototype=Object.getPrototypeOf(window.qaEngine.waterSurface);
    const originalTerrain=terrainPrototype.draw,originalWater=waterPrototype.draw;
    let terrainPasses=0,waterPasses=0;
    terrainPrototype.draw=function(...args){terrainPasses++;return originalTerrain.apply(this,args);};
    waterPrototype.draw=function(...args){waterPasses++;return originalWater.apply(this,args);};
    const sample=(map,c,r)=>{
      terrainPasses=0;waterPasses=0;window.place(map,c,r);
      return {terrainPasses,waterPasses};
    };
    try{return {
      town:sample('overworld',36,30),
      forest:sample('floresta_ecos',150,118),
      returnToTown:sample('overworld',36,30),
    };}finally{terrainPrototype.draw=originalTerrain;waterPrototype.draw=originalWater;}
  });
  assert.equal(scope.town.terrainPasses,0,'Regional textures must not repaint original town tiles');
  assert.equal(scope.returnToTown.terrainPasses,0,'Returning from a biome must not leak its textures into town');
  assert(scope.forest.terrainPasses>0,'New region retains its own terrain renderer');
  assert(Object.values(scope).every(s=>s.waterPasses>0),'Water remains independent of region terrain');
  console.log('PASS: original overworld terrain preserved; water remains active.');
  const checks=await page.evaluate(async()=>{
    const e=window.qaEngine;
    const report=[];
    for(const map of ['floresta_ecos','cavernas_cristal']){
      e.travelTo(map);
      const seed=[Math.floor(e.player.x/32),Math.floor(e.player.y/32)];
      const seen=new Set(),todo=[seed];
      for(let i=0;i<todo.length;i++){
        const [x,y]=todo[i],key=x+','+y;
        if(seen.has(key)||x<1||y<1||x>=e.mapCols-1||y>=e.mapRows-1)continue;
        if(e.checkSolidCollision({x:x*32+8,y:y*32+8,w:16,h:12}))continue;
        seen.add(key);todo.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
      }
      const reachable=(x,y,radius=3)=>{
        for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(seen.has(Math.floor(x)+dx+','+(Math.floor(y)+dy)))return true;
        return false;
      };
      const portals=e.props.filter(p=>p.type==='portal').map(p=>({id:p.id,reachable:reachable((p.x+p.w/2)/32,(p.y+p.h/2)/32)}));
      const landmarks=e.activeMap.minimap.regions.map(r=>({name:r.name,reachable:reachable(r.col,r.row,r.name.includes('Água')||r.name.includes('Lago')?42:8)}));
      const types=[...new Set(e.props.filter(p=>p.id.startsWith('fe_grove_')).map(p=>p.type))];
      const forest=await import('/src/game/maps/florestaEcos.ts');
      const inClearings=e.props.filter(p=>p.id.startsWith('fe_grove_')&&forest.FOREST_CLEARINGS.some(g=>Math.hypot(((p.x+p.w/2)/32-g.c)/g.rx,((p.y+p.h)/32-g.r)/g.ry)<1)).length;
      report.push({map,cells:seen.size,portals,landmarks,types,inClearings,props:e.props.length});
    }
    return report;
  });
  console.log(JSON.stringify(checks,null,2));
  for(const r of checks){assert(r.cells>1000);assert(r.portals.every(p=>p.reachable));assert(r.landmarks.every(p=>p.reachable));assert.equal(r.inClearings,0);}
  assert(checks[0].types.length>=5);
  for(const [name,map,c,r] of [
    ['forest-glade','floresta_ecos',84,47],
    ['forest-trail','floresta_ecos',124,49],
    ['lake-shore','floresta_ecos',97,165],
    ['sanctuary','floresta_ecos',150,118],
    ['crystal-garden','cavernas_cristal',222,143],
    ['crystal-pool','cavernas_cristal',86,120],
  ]){
    await page.evaluate(([m,c,r])=>window.place(m,c,r),[map,c,r]);
    await page.screenshot({path:output+'/'+name+'.png'});
  }
  const gpu=await page.evaluate(()=>window.qaEngine.waterSurface.gpuReady);assert(gpu,'The real GLSL water shader must compile');
  const animation=await page.evaluate(()=>{
    const e=window.qaEngine;
    const target=document.createElement('canvas');target.width=400;target.height=200;
    const ctx=target.getContext('2d');
    e.waterSurface.draw(ctx,e.ground,58*32,115*32,400,200,0,true);
    const a=ctx.getImageData(0,0,400,200).data;
    ctx.clearRect(0,0,400,200);e.waterSurface.draw(ctx,e.ground,58*32,115*32,400,200,2,true);
    const b=ctx.getImageData(0,0,400,200).data;
    let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])>2)changed++;
    return changed;
  });assert(animation>1000,'Water must animate, not be a static overlay');
  const fallback=await page.evaluate(()=>{
    const e=window.qaEngine,surface=e.waterSurface,program=surface.program;
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const c=canvas.getContext('2d');
    surface.program=undefined;
    surface.draw(c,e.ground,60*32,115*32,320,180,0,true);
    const a=c.getImageData(0,0,320,180).data;
    c.clearRect(0,0,320,180);surface.draw(c,e.ground,60*32,115*32,320,180,2,true);
    const b=c.getImageData(0,0,320,180).data;
    surface.program=program;
    let wet=0,changed=0;for(let i=0;i<a.length;i+=4){if(a[i+3]>0)wet++;if(a[i]!==b[i]||a[i+1]!==b[i+1])changed++;}
    return {wet,changed};
  });assert(fallback.wet>1000&&fallback.changed>100,'Canvas fallback also remains animated');
  await page.evaluate(async()=>{
    window.place('floresta_ecos',150,118);
    const rm=await import('/node_modules/.vite/deps/react.js'),React=rm.default??rm;
    const cm=await import('/node_modules/.vite/deps/react-dom_client.js'),createRoot=cm.createRoot??cm.default.createRoot;
    const {WorldMapScreen}=await import('/src/components/WorldMapScreen.tsx');
    const node=document.createElement('div');document.body.append(node);
    createRoot(node).render(React.createElement(WorldMapScreen,{open:true,engine:window.qaEngine,onClose:()=>{}}));
  });
  await page.getByRole('dialog',{name:'Mapa da região'}).waitFor();
  await page.screenshot({path:output+'/atlas.png'});
  await page.getByRole('button',{name:'Centralizar no jogador'}).click();
  await page.getByRole('button',{name:'Aproximar mapa'}).click();
  await page.getByRole('button',{name:'Recursos',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Recursos',exact:true}).getAttribute('aria-pressed'),'false');
  const bounds=await page.getByRole('dialog').boundingBox();assert(bounds.x>=10&&bounds.x+bounds.width<=834&&bounds.y+bounds.height<=380);
  await page.screenshot({path:output+'/atlas-zoom.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: biome access, glades, shader animation and mobile atlas. '+output);
}finally{await browser.close();}

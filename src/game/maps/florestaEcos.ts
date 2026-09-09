/** The forest is a set of readable groves and meadows, not a tree-filled grid. */
import type { MapGrid } from '../mapData';
import { TERRAIN_TILES as TT, TILE_SIZE as T } from '../mapData';
import type { Rect, WorldProp } from '../types';
import {makeRng,fillGround,ellipse,path,worldEdgeColliders,waterColliders,type Painter} from './paint';
import {portal} from './portalProp';
import {buildSanctuaryPilot} from './sanctuaryPilot';

const COLS=300,ROWS=220;
const SANCTUARY={c:150,r:118},WOODS={c:150,r:44},RUINS={c:242,r:120};
const LAKE={c:66,r:168},PETREA={c:244,r:192};
export const FOREST_CLEARINGS=[
  {c:150,r:44,rx:15,ry:11,name:'Clareira do Primeiro Canto'},
  {c:84,r:47,rx:13,ry:10,name:'Jardim dos Salgueiros'},
  {c:217,r:53,rx:14,ry:12,name:'Pátio das Folhas Douradas'},
  {c:54,r:102,rx:12,ry:10,name:'Recanto das Borboletas'},
  {c:155,r:182,rx:13,ry:10,name:'Campina do Entardecer'},
];
export const FOREST_TRAILS=[
  [[150,148],[150,118],[153,91],[145,72],[150,44]],
  [[150,44],[119,38],[84,47]],
  [[150,44],[184,61],[217,53]],
  [[150,118],[186,121],[209,113],[242,120]],
  [[150,118],[123,137],[113,156],[105,168],[91,168]],
  [[123,137],[95,119],[75,106],[54,102]],
  [[150,148],[167,161],[155,182],[196,185],[244,192]],
  [[242,120],[232,151],[244,175],[244,192]],
];
function roadDistance(c:number,r:number){
  let best=Infinity;
  for(const line of FOREST_TRAILS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((c-a[0])*dx+(r-a[1])*dy)/(dx*dx+dy*dy)));
    best=Math.min(best,Math.hypot(c-a[0]-dx*t,r-a[1]-dy*t));
  }return best;
}
export function buildFlorestaEcos():MapGrid{
  const ground:number[][]=[],props:WorldProp[]=[],solids:Rect[]=[];
  const rng=makeRng(0x5eed3c0),p:Painter={ground,props,solids,cols:COLS,rows:ROWS,rng};
  fillGround(p,TT.GRASS_BASE);
  // Overlapping organic groves, with open country between them.
  for(const [c,r,rx,ry] of [[54,40,45,34],[143,44,57,34],[235,47,48,37],[50,103,31,32],[204,84,26,20],[199,165,24,30]])
    ellipse(p,c,r,rx,ry,TT.SINGING_WOODS,.12);
  ellipse(p,150,118,43,32,TT.ECHO_MEADOW,.12);
  ellipse(p,242,120,27,24,TT.CRYSTAL_FLOOR,.12);
  ellipse(p,242,120,17,14,TT.ECHO_PATH,.14);
  ellipse(p,244,192,35,24,TT.FRONTIER_GROUND,.13);
  for(const glade of FOREST_CLEARINGS)ellipse(p,glade.c,glade.r,glade.rx,glade.ry,TT.ECHO_MEADOW,.10);
  ellipse(p,66,168,40,31,TT.WATER_SHALLOW,.08);
  ellipse(p,66,168,32,24,TT.WATER_DEEP,.08);
  // An island beside the east bank is actually connected by a walkable bridge.
  ellipse(p,90,168,8,7,TT.ECHO_MEADOW,.10);
  for(const points of FOREST_TRAILS)path(p,points,1.8,TT.ECHO_PATH);
  const prop=(id:string,type:string,c:number,r:number,w:number,h:number)=>{
    const x=c*T-w/2,y=r*T-h;props.push({id,type,x,y,w,h,sortY:y+h-4});
  };
  const dry=(c:number,r:number)=>{
    const v=ground[Math.floor(r)]?.[Math.floor(c)];
    return v!==undefined&&v!==TT.WATER_DEEP&&v!==TT.WATER_SHALLOW;
  };
  // RESTOS DE CALCADA. A trilha era so uma faixa de terra pintada; lajes soltas
  // ao longo dela contam que aqui houve estrada antes de a mata voltar. Ficam
  // sempre DE LADO, nunca no miolo — no caminho elas viravam obstaculo.
  for(const line of FOREST_TRAILS)for(let j=1;j<line.length;j++){
    const [x0,y0]=line[j-1],[x1,y1]=line[j];
    const comp=Math.hypot(x1-x0,y1-y0),passos=Math.max(1,Math.floor(comp/2.4));
    for(let i=0;i<=passos;i++){
      if(rng()<.42)continue;
      const t=i/passos,px=x0+(x1-x0)*t,py=y0+(y1-y0)*t;
      const nx=-(y1-y0)/comp,ny=(x1-x0)/comp,lado=rng()<.5?-1:1;
      const dist=2.2+rng()*1.4;
      const c=px+nx*dist*lado,r=py+ny*dist*lado;
      if(!dry(c,r))continue;
      const grande=rng()<.3,w=grande?46:32,h=grande?30:21;
      props.push({id:`fe_calcada_${j}_${i}_${lado}`,type:'rockFlatSlab',
        x:c*T-w/2,y:r*T-h,w,h,sortY:r*T-3});
    }
  }
  const open=(c:number,r:number)=>{
    if(roadDistance(c,r)<4.2)return true;
    if(Math.hypot((c-150)/24,(r-118)/21)<1)return true;
    if(Math.hypot((c-242)/24,(r-120)/22)<1)return true;
    if(Math.hypot((c-244)/15,(r-192)/13)<1)return true;
    if(Math.hypot((c-90)/11,(r-168)/9)<1)return true;
    return FOREST_CLEARINGS.some(g=>Math.hypot((c-g.c)/g.rx,(r-g.r)/g.ry)<1);
  };
  for(let r=7;r<ROWS-7;r+=4)for(let c=7;c<COLS-7;c+=4){
    const x=c+(rng()-.5)*2.6,y=r+(rng()-.5)*2.6;
    if(!dry(x,y)||!dry(x-2,y)||!dry(x+2,y)||open(x,y))continue;
    const grove=ground[Math.floor(y)][Math.floor(x)]===TT.SINGING_WOODS;
    const cluster=.5+.5*Math.sin(x*.09+Math.cos(y*.075)*2)*Math.cos(y*.11);
    if(rng()>(grove?.32+cluster*.22:.09+cluster*.18))continue;
    const q=rng(),willows=x<112,pink=x>186&&y<96;
    const type=q<.18?'singingTree':q<.40?'silverWillow':q<.66?(pink?'forestBlossom':'forestOak'):q<.88?'forestPine':(willows?'silverWillow':'forestBlossom');
    const scale=.78+rng()*.40;
    const w=(type==='forestPine'?94:type==='singingTree'?142:130)*scale;
    const h=(type==='forestPine'?158:148)*scale;
    prop(`fe_grove_${c}_${r}`,type,x,y,w,h);
    if(rng()<.24)prop(`fe_understory_${c}_${r}`,rng()<.5?'bush':'rockFlatSlab',x+2.3,y+1,28,20);
  }
  prop('region_echo_sanctuary','echoAltar',150,116,200,156);
  prop('fe_echo_arch','echoArch',148,140,180,172);
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,c=150+Math.cos(a)*17,r=118+Math.sin(a)*13;
    if(roadDistance(c,r)<3)continue;
    prop('fe_stele_'+i,i%2?'echoSteles':'spot_crystal_blue',c,r,i%2?105:58,i%2?102:62);
  }
  FOREST_CLEARINGS.forEach((g,i)=>{
    prop('fe_glade_landmark_'+i,i===1?'echoSteles':i===2?'musicalRuin':i===3?'shrine':'rockMonolith',g.c-5,g.r-3,i===2?165:90,i===2?156:86);
    for(let k=0;k<7;k++){
      const a=k*2.399,c=g.c+Math.cos(a)*(g.rx+3),r=g.r+Math.sin(a)*(g.ry+3);
      if(roadDistance(c,r)<4)continue;
      prop(`fe_glade_ring_${i}_${k}`,i===1?'silverWillow':i===2?'forestBlossom':k%2?'forestOak':'singingTree',c,r,120,145);
    }
  });
  prop('fe_ruin_main','musicalRuin',242,116,210,192);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+.4,c=242+Math.cos(a)*20,r=120+Math.sin(a)*17;
    if(roadDistance(c,r)<3)continue;
    prop('fe_ruin_col_'+i,i%2?'organColumn':'crystalPillar',c,r,88,140);
  }
  // Scattered remnants make the approach read as an abandoned conservatory.
  for(let i=0;i<18;i++){
    const a=rng()*6.28,c=242+Math.cos(a)*(20+rng()*10),r=120+Math.sin(a)*(17+rng()*9);
    if(roadDistance(c,r)<4)continue;
    prop('fe_ruin_debris_'+i,i%3?'rockFlatSlab':'rockMonolith',c,r,35+rng()*30,24+rng()*32);
  }
  props.push({id:'fe_lake_bridge',type:'frontierBridge',x:97*T,y:165.8*T,w:512,h:232,sortY:165.8*T+8});
  // Deck uses land collision but water continues below the bridge arches visually.
  for(let r=167;r<=169;r++)for(let c=97;c<=113;c++)ground[r][c]=TT.ECHO_PATH;
  prop('fe_lake_islet_crystal','spot_crystal_blue',90,165,72,80);
  for(let i=0;i<24;i++){
    const a=i*2.399,c=66+Math.cos(a)*43,r=168+Math.sin(a)*34;
    if(!dry(c,r)||roadDistance(c,r)<4)continue;
    prop('fe_lake_garden_'+i,i%3===0?'silverWillow':i%3===1?'bush':'rockPair',c,r,i%3===0?135:40,i%3===0?160:30);
  }
  for(let i=0;i<65;i++){
    const c=12+rng()*(COLS-24),r=12+rng()*(ROWS-24);
    if(!dry(c,r)||open(c,r))continue;
    const type=i%5===0?'spot_gold':i%3===0?'spot_crystal_red':'spot_crystal_blue';
    prop('fe_resource_'+i,type,c,r,54,58);
  }
  for(let i=0;i<26;i++){
    const a=rng()*6.28,c=244+Math.cos(a)*(20+rng()*12),r=192+Math.sin(a)*(15+rng()*6);
    if(roadDistance(c,r)<4)continue;
    prop('fe_petrea_'+i,i%3?'dark_bigrock':'crystalPillar',c,r,65+rng()*50,65+rng()*50);
  }
  prop('fe_bldg_guardians','bldgLodgeEast',104,88,116,124);
  prop('fe_bldg_luthier','bldgHerbalistWest',194,92,116,120);
  props.push(portal('fe_portal_overworld',150,148,{to:'overworld',spawn:{col:37,row:8},label:'Acordelot',kind:'walk'}));
  props.push(portal('fe_portal_cavernas',244,196,{to:'cavernas_cristal',spawn:{col:140,row:182},label:'Cavernas de Cristal',kind:'walk'}));
  for(let i=0;i<220;i++){
    const side=i%4,c=side===0?3+rng()*3:side===1?COLS-4-rng()*3:8+rng()*(COLS-16);
    const r=side===2?4+rng()*3:side===3?ROWS-4-rng()*3:8+rng()*(ROWS-16);
    prop('fe_edge_'+i,i%3===0?'silverWillow':i%3===1?'forestPine':'forestOak',c,r,110,145);
  }
  buildSanctuaryPilot(p);
  solids.push(...worldEdgeColliders(p),...waterColliders(p));
  return {ground,solidColliders:solids,props,npcs:[]};
}
export const FLORESTA_ECOS_SPAWNS={sanctuary:SANCTUARY,woods:WOODS,ruins:RUINS};

import type { Rect, WorldProp } from './types';
import { CRYSTAL_GATE, CRYSTAL_ROOMS, dungeonChestId } from './crystalDungeon';

export const FRONTIER_ROAD = [[205,26],[225,28],[240,37],[250,47],[265,43],[280,47],[294,47],[309,54],[326,47],[337,46]];
const T = 32;
export function buildEasternRegions(ground: number[][], props: WorldProp[], solids: Rect[], tiles: Record<string, number>) {
  const rows = ground.length, cols = ground[0].length;
  // The city/editor layout is preserved to the west of the new territories.
  for (let i = props.length - 1; i >= 0; i--) if (props[i].x + props[i].w > 184*T && (props[i].y < 110*T || props[i].x >= 330*T)) props.splice(i,1);
  const cut: Rect = {x:184*T,y:0,w:(cols-184)*T,h:rows*T};
  for (let i = solids.length - 1; i >= 0; i--) {
    const s = solids[i];
    if (s.x+s.w <= cut.x) continue;
    // Preserve southern forest collision until the dungeon's western wall.
    const left = s.y >= 110*T ? 330*T : cut.x;
    if (s.x+s.w <= left) continue;
    solids.splice(i,1);
    if (s.x < left) solids.push({...s,w:left-s.x});
  }
  const paint = (c:number,r:number,id:number) => { if (ground[r]?.[c] !== undefined) ground[r][c]=id; };
  const ellipse = (cx:number,cy:number,rx:number,ry:number,id:number) => {
    for(let r=Math.floor(cy-ry-2);r<=cy+ry+2;r++) for(let c=Math.floor(cx-rx-2);c<=cx+rx+2;c++) {
      const a=Math.atan2((r-cy)/ry,(c-cx)/rx);
      const edge=1+.035*Math.sin(a*5+cx)+.025*Math.cos(a*9+cy);
      if(((c-cx)/rx)**2+((r-cy)/ry)**2<edge) paint(c,r,id);
    }
  };
  const path = (points:number[][],width:number,id:number) => {
    for(let j=1;j<points.length;j++) {
      const [x0,y0]=points[j-1], [x1,y1]=points[j];
      const steps=Math.ceil(Math.hypot(x1-x0,y1-y0)*2);
      for(let i=0;i<=steps;i++) ellipse(x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps,width,width*.8,id);
    }
  };
  const prop=(id:string,type:string,c:number,r:number,w:number,h:number,solid=false) => {
    const x=c*T,y=r*T;
    props.push({id,type,x,y,w,h,sortY:y+h-4,collider:solid?{x:x+w*.35,y:y+h*.79,w:w*.3,h:h*.17}:undefined});
  };
  for(let r=0;r<110;r++) for(let c=184;c<330;c++) paint(c,r,tiles.GRASS_BASE);
  ellipse(203,24,22,23,tiles.ECHO_MEADOW);
  path([[184,26],[202,26],[213,27]],2.3,tiles.ECHO_PATH);
  ellipse(202,23,6.2,5.4,tiles.ECHO_PATH);
  // A forest hike separates the sanctuary from the rocky border.
  path(FRONTIER_ROAD.slice(1,6),16,9012);
  path(FRONTIER_ROAD.slice(4,9),13,tiles.FRONTIER_GROUND);
  ellipse(314,50,17,28,tiles.FRONTIER_GROUND);
  path(FRONTIER_ROAD,2.1,tiles.FRONTIER_PATH);
  // A real chasm: only the bridge deck can be crossed.
  for(let r=0;r<109;r++) {
    const left=283+Math.round(Math.sin(r*.08)*2), right=left+9;
    for(let c=left;c<right;c++) paint(c,r,(r>=45&&r<=49)?tiles.FRONTIER_PATH:tiles.DUNGEON_VOID);
  }
  prop('east_frontier_bridge','frontierBridge',279,43.7,512,232);
  prop('region_crystal_cavern_entrance','crystalCaveGate',321,37.7,308,288);
  prop('region_echo_sanctuary','echoAltar',199,18.5,192,150,true);
  prop('east_echo_arch','echoArch',187,22.8,180,172);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    const c=202+Math.cos(a)*10.5, r=23+Math.sin(a)*10;
    if(i!==0&&i!==6) prop(`east_echo_stone_${i}`,i%3===0?'echoSteles':'spot_crystal_blue',c,r,i%3===0?100:58,i%3===0?100:62,true);
  }
  for(let i=0;i<26;i++) {
    const a=i*2.39996,c=202+Math.cos(a)*(17+i%4),r=24+Math.sin(a)*(19+i%3);
    if(Math.abs(r-26)<4) continue;
    prop(`east_sacred_tree_${i}`,'singingTree',c,r,140+(i%3)*20,160+(i%3)*22,true);
  }
  const distToRoad=(c:number,r:number) => Math.min(...FRONTIER_ROAD.slice(1).map((p,i)=>{
    const a=FRONTIER_ROAD[i],dx=p[0]-a[0],dy=p[1]-a[1];
    const u=Math.max(0,Math.min(1,((c-a[0])*dx+(r-a[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(c-a[0]-u*dx,r-a[1]-u*dy);
  }));
  for(let r=9;r<91;r+=4) for(let c=221;c<328;c+=4) {
    const h=Math.abs(Math.sin(c*13.13+r*71.73)*43758.54)%1;
    const x=c+h*2,y=r+(h*7%2);
    if(c>=279&&c<=297||distToRoad(x,y)<6||h>.52) continue;
    const forest=c<266;
    prop(`east_woodland_${c}_${r}`,forest?(h<.28?'dark_bigpine':'singingTree'):(h<.36?'frontierTree':'dark_bigrock'),x,y,forest?130+h*80:110+h*65,forest?160+h*85:115+h*70,true);
  }
  // All underground space is black until rooms/corridors are carved into it.
  for(let r=0;r<rows;r++) for(let c=330;c<cols;c++) paint(c,r,tiles.DUNGEON_VOID);
  CRYSTAL_ROOMS.forEach(room=>ellipse(room.col,room.row,room.rx,room.ry,tiles.CRYSTAL_FLOOR));
  path([[326,47],[337,46],[354,46]],3.5,tiles.CRYSTAL_FLOOR);
  for(let i=1;i<CRYSTAL_ROOMS.length;i++) {
    const a=CRYSTAL_ROOMS[i-1],b=CRYSTAL_ROOMS[i];
    const elbow=[(a.col+b.col)/2,(a.row+b.row)/2];
    path([[a.col,a.row],elbow,[b.col,b.row]],3.5,tiles.CRYSTAL_FLOOR);
  }
  // Continuous cliff silhouettes sit behind the walkable northern room edges.
  for(let r=3;r<rows-2;r++) for(let c=332;c<cols-4;c+=4) {
    if(ground[r][c]===tiles.CRYSTAL_FLOOR&&ground[r-1][c]===tiles.DUNGEON_VOID)
      prop(`east_cliff_${c}_${r}`,'caveRim',c-.8,r-2.6,164,113);
  }
  CRYSTAL_ROOMS.forEach((room,index)=>{
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4+.3,c=room.col+Math.cos(a)*room.rx*.73,r=room.row+Math.sin(a)*room.ry*.73;
      prop(`east_dungeon_resource_${index}_${i}`,i%4===0?'spot_gold':i%3===0?'spot_crystal_red':'spot_crystal_blue',c,r,64,70,true);
    }
    for(let i=0;i<5;i++) {
      const a=i*1.25+.6;
      prop(`east_dungeon_pillar_${index}_${i}`,index%2?'organColumn':'crystalPillar',room.col+Math.cos(a)*(room.rx-4),room.row+Math.sin(a)*(room.ry-3),index%2?88:110,index%2?140:160,true);
    }
    prop(`east_dungeon_ruin_${index}`,'musicalRuin',room.col-10,room.row-5,165,156,true);
    prop(dungeonChestId(index),'dungeonChest',room.col+4,room.row+6,96,84,true);
  });
  // Black space is impassable, including the chasm. Use horizontal runs.
  for(let r=0;r<rows;r++) {
    let start=-1;
    for(let c=279;c<=cols;c++) {
      const blocked=c<cols&&ground[r][c]===tiles.DUNGEON_VOID;
      if(blocked&&start<0) start=c;
      if(!blocked&&start>=0) {solids.push({x:start*T,y:r*T,w:(c-start)*T,h:T});start=-1;}
    }
  }
  const g=CRYSTAL_GATE;
  solids.push({x:g.barrierCol*T,y:0,w:T,h:g.minRow*T});
  solids.push({x:g.barrierCol*T,y:(g.maxRow+1)*T,w:T,h:(rows-g.maxRow-1)*T});
  props.push({id:'crystal_dungeon_barrier',type:'dungeonBarrier',x:g.barrierCol*T,y:g.minRow*T,w:T,h:(g.maxRow-g.minRow+1)*T,sortY:g.maxRow*T,collider:{x:g.barrierCol*T,y:g.minRow*T,w:T,h:(g.maxRow-g.minRow+1)*T}});
}

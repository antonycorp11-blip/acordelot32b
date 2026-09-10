import {TERRAIN_TILES as TT} from '../mapData';
import {ellipse,path,type Painter} from './paint';
import {forestTerraceGeometry} from './forestTerrace';

export const FOREST_LANDFORMS = [
  {name:'Cascata dos Salgueiros',col:103,row:86},
  {name:'Lagoa das Libélulas',col:108,row:101},
  {name:'Escadaria das Raízes',col:149,row:80},
  {name:'Lagoa do Entardecer',col:201,row:160},
  {name:'Mirante das Teclas',col:235,row:103},
  {name:'Fendas do Bosque',col:183,row:164},
];

export function buildForestLandforms(p:Painter){
  const before=p.ground.map(r=>r.slice());
  const wet=(c:number,r:number)=>[TT.WATER_SHALLOW,TT.WATER_DEEP].includes(p.ground[r]?.[c]);
  const prop=(id:string,type:string,c:number,r:number,w:number,h:number)=>p.props.push({id,type,x:c*32-w/2,y:r*32-h,w,h,sortY:r*32-4});
  // Watersheds instead of disconnected rectangular pools. All water is the
  // existing animated surface and participates in collision/minimap data.
  ellipse(p,104,90,11,7,TT.WATER_SHALLOW,.10);
  ellipse(p,105,91,6,3,TT.WATER_DEEP,.10);
  path(p,[[106,95],[108,105],[105,117],[99,132],[103,147],[94,160],[88,166]],1.8,TT.WATER_SHALLOW);
  ellipse(p,108,104,9,6,TT.WATER_SHALLOW,.1);
  ellipse(p,109,105,4,2.5,TT.WATER_DEEP,.1);
  ellipse(p,201,160,17,11,TT.WATER_SHALLOW,.12);
  ellipse(p,202,161,10,6,TT.WATER_DEEP,.10);
  path(p,[[205,169],[208,178],[219,185],[230,189]],1.4,TT.WATER_SHALLOW);
  ellipse(p,262,65,10,7,TT.WATER_SHALLOW,.12);
  ellipse(p,262,65,5,3,TT.WATER_DEEP,.08);
  // Keep all established roads crossing the new rivers; each crossing receives
  // an actual bridge. Never silently strand a mission destination behind water.
  const crossings:number[][]=[];
  for(let r=1;r<p.rows-1;r++)for(let c=1;c<p.cols-1;c++)if(wet(c,r)&&before[r][c]===TT.ECHO_PATH){p.ground[r][c]=TT.ECHO_PATH;crossings.push([c,r]);}
  const remaining=new Set(crossings.map(([c,r])=>c+','+r));let bi=0;
  while(remaining.size){
    const key=remaining.values().next().value!,queue=[key.split(',').map(Number)],group:number[][]=[];remaining.delete(key);
    for(let i=0;i<queue.length;i++){
      const [c,r]=queue[i];group.push([c,r]);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(remaining.delete((c+dx)+','+(r+dy)))queue.push([c+dx,r+dy]);
    }
    const xs=group.map(v=>v[0]),ys=group.map(v=>v[1]),l=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    const horizontal=right-l>bottom-top;
    p.props.push({id:'forest_river_bridge_'+bi++,type:horizontal?'frontierBridge':'sanctuaryBridge',x:(l-1)*32,y:(top-1)*32,w:(right-l+3)*32,h:(bottom-top+3)*32,sortY:(top-1)*32-4});
  }
  // Clear vegetation out of the new water, retaining resource IDs on dry banks.
  for(let i=p.props.length-1;i>=0;i--){
    const q=p.props[i],c=Math.floor((q.x+q.w/2)/32),r=Math.floor((q.y+q.h)/32);
    if(!wet(c,r)||q.type.includes('Bridge')||q.type==='portal')continue;
    if(q.type.startsWith('spot_')){
      let found=false;
      for(let d=1;d<22&&!found;d++)for(const [dx,dy] of [[d,0],[-d,0],[0,d],[0,-d]]){
        if(c+dx<3||c+dx>=p.cols-3||r+dy<3||r+dy>=p.rows-3||wet(c+dx,r+dy))continue;
        q.x+=dx*32;q.y+=dy*32;q.sortY+=dy*32;found=true;break;
      }
    }else p.props.splice(i,1);
  }
  prop('forest_falls_west','forestWaterfall',103,88,330,396);
  prop('forest_falls_east','forestWaterfall',202,153,270,324);
  // Raised lawns with a continuous exposed soil wall and a lateral stair.
  for(const [i,c,r,w] of [[0,149,80,768],[1,235,104,640],[2,74,136,576]]){
    const h=w/1.75,x=c*32-w/2,y=r*32-h;
    // Clear the entire lawn and lateral access, not just the old centre stair.
    // Resource IDs are preserved on a dry bank outside this landform.
    for(let j=p.props.length-1;j>=0;j--){
      const q=p.props[j];
      if(q.type==='portal'||q.type==='grassTerrace')continue;
      if(q.x+q.w<x-32||q.x>x+w+48||q.y+q.h<y-32||q.y>y+h+32)continue;
      if(q.type.startsWith('spot_')){
        for(let d=0;d<30;d++){
          const nc=Math.floor((x-80)/32)-d,nr=Math.floor((q.y+q.h)/32);
          if(nc>2&&nr>2&&!wet(nc,nr)){q.x=nc*32-q.w/2;break;}
        }
      }
      else p.props.splice(j,1);
    }
    // Remove the former straight road that pointed into the front cliff.
    for(let row=Math.floor(y/32)-1;row<=r+2;row++)for(let col=Math.floor(x/32)-1;col<=(x+w)/32+1;col++){
      if(p.ground[row]?.[col]===TT.ECHO_PATH)p.ground[row][col]=TT.ECHO_MEADOW;
    }
    prop('forest_terrace_'+i,'grassTerrace',c,r,w,h);
    const geometry=forestTerraceGeometry(x,y,w,h);
    p.solids.push(...geometry.walls);
    path(p,[[c,r+4],...geometry.route.map(([px,py])=>[px/32,py/32])],1.2,TT.ECHO_PATH);
  }
  // Visible sinkholes have matching collision; grass never remains walkable
  // over the hole. Their rendering is a local shaded depression, not a portal.
  for(const [i,c,r,rx,ry] of [[0,183,164,3.2,2.1],[1,180,173,2,1.5],[2,258,148,3,2]]){
    prop('forest_sinkhole_'+i,'forestSinkhole',c,r,rx*64,ry*64);
    p.solids.push({x:(c-rx*.65)*32,y:(r-ry*1.5)*32,w:rx*1.3*32,h:ry*1.1*32});
  }
  prop('forest_mountain_north','forestMountain',249,35,540,490);
  prop('forest_mountain_ridge','forestMountain',274,132,430,390);
  p.solids.push({x:243*32,y:27*32,w:12*32,h:7*32},{x:270*32,y:126*32,w:8*32,h:5*32});
  // Modest riverbank gardens; no collectible-resource inflation.
  for(const [i,c,r] of [[0,96,88],[1,115,95],[2,116,105],[3,98,114],[4,93,135],[5,110,148],[6,186,156],[7,218,163],[8,214,179],[9,254,63]]){
    prop('forest_bank_'+i,'sanctuaryBed'+(i%2?3:0),c,r,116,78);
    prop('forest_bank_willow_'+i,'silverWillow',c-2,r-1,128,150);
  }
}

/** Authored sanctuary approach. Changes are confined to this forest envelope. */
import { TERRAIN_TILES as TT } from '../mapData';
import { ellipse, path, makeRng, type Painter } from './paint';

export const SANCTUARY_PILOT = { left:126, top:102, right:174, bottom:150 };
export const SANCTUARY_WALK = [[150,148],[155,144],[150,139],[150,131],[146,127],[146,120],[143,114],[145,108],[153,102]];
export const SANCTUARY_BRIDGE = { x:147.25*32, y:130.5*32, w:5.5*32, h:9*32 };
export const SANCTUARY_ECHO_HOMES = [[147,119],[150,121],[155,122],[159,120],[161,116],[158,111],[150,112],[141,119],[140,124],[153,126],[160,125],[145,123]];

export function buildSanctuaryPilot(p:Painter){
  const b=SANCTUARY_PILOT, rng=makeRng(0x99173);
  // A local painter cannot leak terrain edits into neighbouring groves.
  const original=p.ground.map(row=>row.slice());
  for(let r=b.top;r<=b.bottom;r++)for(let c=b.left;c<=b.right;c++)p.ground[r][c]=TT.GRASS_BASE;
  ellipse(p,151,119,17,14,TT.ECHO_MEADOW,.10);
  for(const [c,r,rx,ry] of [[133,111,10,10],[168,111,10,9],[135,143,10,7],[169,146,8,8]])ellipse(p,c,r,rx,ry,TT.SINGING_WOODS,.08);
  path(p,SANCTUARY_WALK,1.65,TT.ECHO_PATH);
  path(p,[[146,120],[158,121],[174,121]],1.7,TT.ECHO_PATH);
  path(p,[[146,127],[138,131],[126,135]],1.6,TT.ECHO_PATH);
  // Stream cuts across the route; only the stone bridge is walkable over water.
  path(p,[[126,129],[133,130],[140,133],[150,135],[159,134],[166,137],[174,136]],1.5,TT.WATER_SHALLOW);
  ellipse(p,169,137,5,3.3,TT.WATER_SHALLOW,.08);
  ellipse(p,170,137,2.5,1.6,TT.WATER_DEEP,.05);
  for(let r=131;r<=139;r++)for(let c=149;c<=151;c++)p.ground[r][c]=TT.ECHO_PATH;
  for(let r=0;r<p.rows;r++)for(let c=0;c<p.cols;c++)if(c<b.left||c>b.right||r<b.top||r>b.bottom)p.ground[r][c]=original[r][c];
  const resources:typeof p.props=[];
  for(let i=p.props.length-1;i>=0;i--){
    const q=p.props[i],c=(q.x+q.w/2)/32,r=(q.y+q.h)/32;
    if(q.type!=='portal'&&c>=b.left&&c<=b.right&&r>=b.top&&r<=b.bottom){
      if(q.type.startsWith('spot_'))resources.push(q);
      p.props.splice(i,1);
    }
  }
  const prop=(id:string,type:string,c:number,r:number,w:number,h:number)=>p.props.push({id,type,x:c*32-w/2,y:r*32-h,w,h,sortY:r*32-4});
  prop('region_echo_sanctuary','sanctuaryTree',154,118,310,326);
  // Planted groups frame the route, not a uniform scatter or a ring of clones.
  const trees:[string,number,number,number][]=[
    ['forestOak',133,109,1.3],['forestPine',129,112,1.2],['forestOak',136,115,1.05],
    ['silverWillow',166,113,1.25],['forestOak',171,110,1.2],['forestPine',170,118,1.05],
    ['forestBlossom',139,121,1.0],['silverWillow',164,126,1.05],
    ['forestOak',132,145,1.3],['forestPine',136,148,1.2],['forestOak',141,144,1.1],
    ['forestOak',164,147,1.2],['forestPine',170,149,1.3],['forestBlossom',163,142,1.05],
    ['silverWillow',134,134,1.1],['silverWillow',172,141,1.2],
    ['forestOak',130,121,1.15],['forestPine',172,105,1.3],['forestOak',137,105,1.2],
  ];
  trees.forEach(([type,c,r,s],i)=>prop('pilot_tree_'+i,type,c,r,130*s,155*s));
  p.props.push({id:'pilot_bridge',type:'sanctuaryBridge',...SANCTUARY_BRIDGE,sortY:SANCTUARY_BRIDGE.y-4});
  // Rails keep the character on the actual deck; water collision protects banks.
  p.solids.push({x:147.8*32,y:132*32,w:1.1*32,h:6*32},{x:152.1*32,y:132*32,w:.7*32,h:6*32});
  const beds=[
    [130,129,0],[137,132,3],[143,134,0],[156,135,3],[163,136,0],[173,138,3],
    [132,127,1],[139,130,2],[159,132,1],[165,134,2],[169,140,3],
    [137,118,1],[141,122,1],[161,119,1],[158,114,1],[145,113,2],
    [151,123,1],[160,123,0],[141,127,2],[153,146,1],[158,143,1],
    [143,140,0],[159,140,2],[138,145,1],[169,146,2],[134,140,1],
  ];
  beds.forEach(([c,initialR,frame],i)=>{
    let r=initialR;
    // Place the base on dry ground: rocks and reeds must not float mid-stream.
    const wet=(row:number)=>[-1,0,1].some(dx=>[-1,0,1].some(dy=>[TT.WATER_SHALLOW,TT.WATER_DEEP].includes(p.ground[Math.floor(row)+dy]?.[c+dx])));
    if(wet(r))for(let d=1;d<=8;d++){
      if(!wet(r-d)){r-=d;break;}
      if(!wet(r+d)){r+=d;break;}
    }
    prop('pilot_bed_'+i,'sanctuaryBed'+frame,c,r,100+rng()*42,66+rng()*22);
  });
  // Preserve existing resource IDs/counts/rewards so the crystal quest is not
  // lost when decorative props in the pilot are replaced.
  const veins=[[139,125],[161,127],[168,123],[135,119],[160,109],[144,106],[169,128],[132,125]];
  resources.forEach((q,i)=>{
    const [c,r]=veins[i%veins.length];
    q.x=(c+Math.floor(i/veins.length)*2)*32-q.w/2;q.y=r*32-q.h;q.sortY=r*32-4;p.props.push(q);
  });
  // Small ancient markers give the grove history without filling it with buildings.
  prop('pilot_stele_west','echoSteles',140,116,82,79);
  prop('pilot_stele_east','echoSteles',164,119,77,74);
}

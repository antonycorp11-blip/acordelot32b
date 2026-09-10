import type {Rect} from '../types';

// Normalized to grass_terrace_v2: broad upper lawn, continuous soil face,
// and the stair climbing the right flank. Collision follows the illustration.
export function forestTerraceGeometry(x:number,y:number,w:number,h:number){
  const point=(u:number,v:number)=>[x+u*w,y+v*h];
  const route=[point(.94,1.05),point(.94,.82),point(.89,.67),point(.84,.50),point(.78,.42),point(.5,.35),point(.5,-.08)];
  const profile=[[.045,.52,.75],[.16,.59,.84],[.36,.63,.88],[.60,.63,.89],[.78,.59,.85],[.81,.58,.81]];
  const walls:Rect[]=[];
  // Narrow strips follow the sloping grass lip; no invisible central opening.
  for(let i=1;i<profile.length;i++){
    const a=profile[i-1],b=profile[i],count=Math.ceil((b[0]-a[0])*w/16);
    for(let j=0;j<count;j++){
      const t=j/count,u=a[0]+(b[0]-a[0])*t;
      const top=a[1]+(b[1]-a[1])*t,bottom=a[2]+(b[2]-a[2])*t;
      walls.push({x:x+u*w,y:y+top*h,w:(b[0]-a[0])*w/count+1,h:(bottom-top)*h});
    }
  }
  return {route,walls};
}

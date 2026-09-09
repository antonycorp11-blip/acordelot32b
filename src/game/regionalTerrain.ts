import type { LoadedAssets } from './assetLoader';
import { feather, releaseFeather } from './canvasBlur';
const SIZE=512, PAD=112, EXT=SIZE+PAD*2;
const canvas=()=>Object.assign(document.createElement('canvas'),{width:EXT,height:EXT});
const natural=(id:number)=>id>=9000||id===56||id===92||id===128;
/** Cached splat-map terrain: a single coherent undercoat, with feathered
 * material masks. Padding is >3σ, so blur cannot expose chunk boundaries. */
export class RegionalTerrain {
  private chunks=new Map<string,HTMLCanvasElement>();
  constructor(private ground:number[][],private assets:LoadedAssets,private startChunkX=0,private cave=false){}
  clear(){this.chunks.clear();}
  draw(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(let cy=Math.max(0,Math.floor(y/SIZE));cy<=Math.floor((y+h)/SIZE);cy++)
      for(let cx=Math.max(this.startChunkX,Math.floor(x/SIZE));cx<=Math.floor((x+w)/SIZE);cx++){
        if(cx*SIZE>=this.ground[0].length*32||cy*SIZE>=this.ground.length*32)continue;
        const key=cx+','+cy;
        let chunk=this.chunks.get(key);
        if(!chunk){chunk=this.build(cx,cy);this.chunks.set(key,chunk);if(this.chunks.size>24)this.chunks.delete(this.chunks.keys().next().value!);}
        ctx.drawImage(chunk,PAD,PAD,SIZE,SIZE,cx*SIZE-x,cy*SIZE-y,SIZE,SIZE);
      }
    ctx.restore();
  }
  private texture(c:CanvasRenderingContext2D,img:HTMLImageElement|undefined,x:number,y:number,size:number,tint:string){
    if(img?.naturalWidth){
      for(let py=Math.floor(y/size)*size;py<y+EXT;py+=size)
        for(let px=Math.floor(x/size)*size;px<x+EXT;px+=size)c.drawImage(img,px-x,py-y,size,size);
      // Different world-space frequency and offset: no mirror axes or tile hashes.
      const s=size*1.713;c.globalAlpha=.16;
      for(let py=Math.floor((y+173)/s)*s-173;py<y+EXT;py+=s)
        for(let px=Math.floor((x+291)/s)*s-291;px<x+EXT;px+=s)c.drawImage(img,px-x,py-y,s,s);
      c.globalAlpha=1;
    }
    c.fillStyle=tint;c.fillRect(0,0,EXT,EXT);
  }
  private build(cx:number,cy:number){
    const output=canvas(),out=output.getContext('2d')!,x=cx*SIZE-PAD,y=cy*SIZE-PAD;
    const forest=this.assets.forestFloor??this.assets.echoGrass;
    this.texture(out,this.cave?this.assets.crystalFloor:forest,x,y,this.cave?320:480,this.cave?'rgba(16,24,36,.28)':'rgba(48,72,38,.16)');
    const layers=[
      {id:128,img:forest,size:480,tint:'rgba(29,53,30,.25)',blur:25},
      {id:9002,img:this.assets.frontierGround,size:430,tint:'rgba(43,37,29,.42)',blur:30},
      {id:9003,img:this.assets.crystalFloor,size:240,tint:'rgba(27,33,35,.42)',blur:24},
      {id:9004,img:forest,size:440,tint:'rgba(22,43,27,.55)',blur:30},
      {id:9005,img:this.assets.frontierGround,size:320,tint:'rgba(104,89,66,.60)',blur:22},
      {id:9007,img:forest,size:480,tint:'rgba(54,123,102,.19)',blur:30},
      {id:9012,img:forest,size:480,tint:'rgba(20,48,37,.36)',blur:32},
      {id:9008,img:this.assets.frontierGround,size:470,tint:'rgba(22,24,29,.40)',blur:32},
      {id:9006,img:this.assets.crystalFloor,size:320,tint:'rgba(20,24,35,.24)',blur:30},
      // Trilha: era bege areia a 75% (166,155,119), que lavava a textura e
      // puxava amarelo no meio de um bioma verde — a estrada nao pertencia ao
      // cenario. Pedra cinza-esverdeada, e mais fraca, deixa o desenho da
      // pedra aparecer e o musgo casar com a grama em volta.
      {id:9010,img:this.cave?this.assets.crystalFloor:this.assets.oldStonePath,size:this.cave?165:290,tint:this.cave?'rgba(104,112,94,.52)':'rgba(49,67,41,.16)',blur:23},
      {id:9011,img:this.assets.frontierGround,size:270,tint:'rgba(118,105,84,.70)',blur:24},
      {id:9009,img:undefined,size:320,tint:'#04060f',blur:23},
    ];
    const mask=canvas(),mc=mask.getContext('2d')!,paint=canvas(),pc=paint.getContext('2d')!;
    const maskFor=(predicate:(id:number)=>boolean)=>{
      mc.clearRect(0,0,EXT,EXT);mc.fillStyle='#fff';let found=false;
      for(let r=Math.floor(y/32);r<Math.ceil((y+EXT)/32);r++)for(let c=Math.floor(x/32);c<Math.ceil((x+EXT)/32);c++){
        const id=this.ground[r]?.[c];if(id!==undefined&&predicate(id)){mc.fillRect(c*32-x,r*32-y,32,32);found=true;}
      }return found;
    };
    for(const l of layers){
      if(!maskFor(id=>id===l.id))continue;
      pc.globalCompositeOperation='source-over';pc.clearRect(0,0,EXT,EXT);
      this.texture(pc,l.img,x,y,l.size,l.tint);
      const soft=feather(mask,l.blur);
      pc.globalCompositeOperation='destination-in';pc.drawImage(soft,0,0);releaseFeather(soft);
      out.drawImage(paint,0,0);
    }
    maskFor(natural);
    const borda=feather(mask,3);
    out.globalCompositeOperation='destination-in';out.drawImage(borda,0,0);releaseFeather(borda);
    return output;
  }
}

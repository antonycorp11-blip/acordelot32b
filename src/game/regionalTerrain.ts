import type { LoadedAssets } from './assetLoader';

const SIZE=512, PAD=64, EXT=SIZE+PAD*2;
const canvas=()=>Object.assign(document.createElement('canvas'),{width:EXT,height:EXT});
/** Coherent world-space texture sampling, feathered biome edges, bounded cache. */
export class RegionalTerrain {
  private chunks=new Map<string,HTMLCanvasElement>();
  /** startChunkX: pula chunks a oeste (11 = só regiões orientais do overworld; 0 = mapa todo). */
  constructor(private ground:number[][], private assets:LoadedAssets, private startChunkX=0) {}
  clear(){this.chunks.clear();}
  draw(ctx:CanvasRenderingContext2D,camX:number,camY:number,w:number,h:number){
    for(let y=Math.max(0,Math.floor(camY/SIZE));y<=Math.floor((camY+h)/SIZE);y++)
      for(let x=Math.max(this.startChunkX,Math.floor(camX/SIZE));x<=Math.floor((camX+w)/SIZE);x++){
        if(x*SIZE>=this.ground[0].length*32) continue;
        const key=`${x},${y}`;
        let chunk=this.chunks.get(key);
        if(!chunk){chunk=this.build(x,y);this.chunks.set(key,chunk);if(this.chunks.size>48)this.chunks.delete(this.chunks.keys().next().value!);}
        ctx.drawImage(chunk,PAD,PAD,SIZE,SIZE,x*SIZE-camX,y*SIZE-camY,SIZE,SIZE);
      }
  }
  private build(cx:number,cy:number){
    const output=canvas(),out=output.getContext('2d')!;
    const wx=cx*SIZE-PAD,wy=cy*SIZE-PAD;
    // blur ALTO em todas as camadas: dissolve a escada de 32px das fronteiras
    // de bioma / margem de rio (o usuário reclamou da "quadratização").
    const layers=[
      {id:9007,img:this.assets.echoGrass,blur:40,tint:'rgba(70,92,50,.34)'},
      {id:9012,img:this.assets.echoGrass,blur:46,tint:'rgba(46,58,38,.70)'},
      {id:9008,img:this.assets.frontierGround,blur:50,tint:'rgba(22,24,29,.40)'},
      {id:9010,img:this.assets.crystalFloor,blur:34,tint:'rgba(170,160,120,.58)'},
      {id:9011,img:this.assets.frontierGround,blur:34,tint:'rgba(118,105,84,.64)'},
      {id:9009,img:null,blur:32,tint:'#04060f'},
      {id:9006,img:this.assets.crystalFloor,blur:26,tint:'rgba(20,24,35,.16)'},
    ];
    for(const layer of layers){
      const mask=canvas(),mc=mask.getContext('2d')!;
      let found=false;
      mc.fillStyle='#fff';
      for(let r=Math.floor(wy/32);r<Math.ceil((wy+EXT)/32);r++) for(let c=Math.floor(wx/32);c<Math.ceil((wx+EXT)/32);c++)
        if(this.ground[r]?.[c]===layer.id){mc.fillRect(c*32-wx,r*32-wy,32,32);found=true;}
      if(!found)continue;
      const paint=canvas(),pc=paint.getContext('2d')!;
      const tex=layer.img;
      if(tex?.naturalWidth){
        const tw=tex.naturalWidth,th=tex.naturalHeight;
        // Ladrilho contínuo em coordenadas de mundo. NÃO espelha: as texturas
        // já são quase sem emenda e o espelhamento por paridade criava uma
        // simetria de caleidoscópio muito evidente (piso da caverna).
        const bx=Math.floor(wx/tw)*tw,by=Math.floor(wy/th)*th;
        for(let ty=by;ty<wy+EXT;ty+=th) for(let tx=bx;tx<wx+EXT;tx+=tw)
          pc.drawImage(tex,tx-wx,ty-wy,tw,th);
        // Passada extra numa escala incomensurável quebra a repetição óbvia do
        // grid em áreas abertas sem introduzir eixo de simetria.
        const s=1.53, bw=tw*s,bh=th*s,ox=Math.floor(wx/bw)*bw,oy=Math.floor(wy/bh)*bh;
        pc.globalAlpha=0.3;
        for(let ty=oy;ty<wy+EXT;ty+=bh) for(let tx=ox;tx<wx+EXT;tx+=bw)
          pc.drawImage(tex,tx-wx,ty-wy,bw,bh);
        pc.globalAlpha=1;
      }
      pc.fillStyle=layer.tint;pc.fillRect(0,0,EXT,EXT);
      pc.globalCompositeOperation='destination-in';pc.filter=`blur(${layer.blur}px)`;pc.drawImage(mask,0,0);pc.filter='none';
      out.drawImage(paint,0,0);
    }
    return output;
  }
}

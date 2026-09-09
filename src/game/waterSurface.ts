/** One continuous GPU surface, in world coordinates. The grid is only a shoreline
 * distance texture; it never controls the phase or color of individual waves. */
import { feather, releaseFeather } from './canvasBlur';
const VERTEX = `attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const FRAGMENT = `
precision highp float;
uniform sampler2D uShore;
uniform vec2 uMapSize,uCamera,uViewport,uResolution;
uniform float uTime,uCave,uCalm;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float field(vec2 uv){
  vec2 d=.36/uMapSize;
  return (texture2D(uShore,uv).r*.4+
    (texture2D(uShore,uv+vec2(d.x,0)).r+texture2D(uShore,uv-vec2(d.x,0)).r+
     texture2D(uShore,uv+vec2(0,d.y)).r+texture2D(uShore,uv-vec2(0,d.y)).r)*.15-.5)*16.;
}
void main(){
  vec2 p=uCamera+vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y)/uResolution*uViewport;
  vec2 uv=p/(uMapSize*32.);
  float shore=field(uv);
  if(shore<-.65)discard;
  vec2 q=p*.039;
  float t=uTime*.42;
  float n=noise(q*.73+vec2(t*.13,-t*.1));
  float ripple=sin(q.x*2.8+q.y*1.6+t*2.+n*3.)*.48+
    sin(q.x*-1.5+q.y*3.9-t*1.4+n*2.)*.27+
    sin(q.x*.8-q.y*.9+t*.63)*.25;
  float edge=shore+(noise(p*.042)-.5)*.18+sin(t*1.8+n*5.)*.025;
  float alpha=smoothstep(-.30,.18,edge);
  float deep=texture2D(uShore,uv).g;
  float depth=smoothstep(.0,5.,max(shore,0.))*.55+deep*.45;
  vec3 shallow=mix(vec3(.19,.51,.43),vec3(.19,.49,.59),uCave);
  vec3 bottom=mix(vec3(.025,.16,.22),vec3(.045,.10,.24),uCave);
  vec3 color=mix(shallow,bottom,depth);
  // Refracted caustics visible on the shallow bed, softer in deep water.
  float caustic=pow(max(0.,1.-abs(sin(q.x*2.+n*3.+t)+sin(q.y*2.3-t*.8+n*2.))*.65),9.);
  color+=vec3(.17,.27,.22)*caustic*(1.-depth)*.48;
  color+=ripple*vec3(.019,.038,.041);
  float glint=pow(max(0.,ripple),15.)*(.25+.75*noise(p*.027+3.));
  color+=mix(vec3(.75,.87,.79),vec3(.46,.75,1.),uCave)*glint*.55;
  float foam=(1.-smoothstep(.04,.36,abs(edge-.12)))*(.4+.6*noise(q*1.8-t*.4));
  color=mix(color,vec3(.66,.81,.71),foam*.50);
  // Sheltered sanctuary stream: muted reflections, no tiled-looking caustic net.
  // Local profile leaves the original city and cave water unchanged.
  vec3 calm=mix(vec3(.22,.40,.32),vec3(.045,.21,.22),depth);
  calm+=noise(p*.008+vec2(t*.06,0.))*.035;
  calm+=ripple*vec3(.009,.017,.018);
  float streak=pow(max(0.,sin(p.y*.14+p.x*.018+n*2.-t*1.1)),24.);
  calm+=vec3(.12,.19,.16)*streak*noise(p*.06)*.25;
  calm=mix(calm,vec3(.50,.62,.48),foam*.19);
  color=mix(color,calm,uCalm);
  // A transparent wet shore blends into the land, rather than a square border.
  color=mix(vec3(.17,.26,.22),color,alpha);
  float wet=(1.-smoothstep(.10,.65,-shore))*.24;
  gl_FragColor=vec4(color,max(alpha*.96,wet));
}`;

function distances(w:number,h:number,source:Uint8Array,target:number) {
  const a=new Float32Array(w*h);
  for(let i=0;i<a.length;i++)a[i]=source[i]===target?0:999;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    if(x)a[i]=Math.min(a[i],a[i-1]+1);
    if(y)a[i]=Math.min(a[i],a[i-w]+1);
    if(x&&y)a[i]=Math.min(a[i],a[i-w-1]+1.414);
    if(x+1<w&&y)a[i]=Math.min(a[i],a[i-w+1]+1.414);
  }
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
    const i=y*w+x;
    if(x+1<w)a[i]=Math.min(a[i],a[i+1]+1);
    if(y+1<h)a[i]=Math.min(a[i],a[i+w]+1);
    if(x+1<w&&y+1<h)a[i]=Math.min(a[i],a[i+w+1]+1.414);
    if(x&&y+1<h)a[i]=Math.min(a[i],a[i+w-1]+1.414);
  }
  return a;
}
export class WaterSurface {
  private canvas=document.createElement('canvas');
  private gl:WebGLRenderingContext|null;
  private program?:WebGLProgram;
  private texture?:WebGLTexture;
  private locations:Record<string,WebGLUniformLocation|null>={};
  private ground?:number[][];
  private waterCells:{x:number,y:number}[]=[];
  private fallbackMask?:HTMLCanvasElement;
  private fallbackCanvas=document.createElement('canvas');
  private cols=0;private rows=0;
  constructor(){
    this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.program=undefined;});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.init();this.ground=undefined;});
    this.init();
  }
  get gpuReady(){return !!this.program && !this.gl?.isContextLost();}
  private init(){
    const gl=this.gl;if(!gl)return;
    try{
      const compile=(type:number,source:string)=>{
        const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Water shader');
        return shader;
      };
      const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
      const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Water program linking failed');
      this.program=program;gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      this.texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,this.texture);
      for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
      for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
      for(const name of ['uMapSize','uCamera','uViewport','uResolution','uTime','uCave','uCalm','uShore'])this.locations[name]=gl.getUniformLocation(program,name);
    }catch(error){console.warn('Using continuous Canvas water fallback',error);this.program=undefined;}
  }
  private setGround(ground:number[][]){
    if(ground===this.ground)return;
    this.ground=ground;this.cols=ground[0].length;this.rows=ground.length;this.waterCells=[];
    const binary=new Uint8Array(this.cols*this.rows);
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const v=ground[y][x];if(v===9000||v===9001){binary[y*this.cols+x]=1;this.waterCells.push({x:x*32,y:y*32});}
    }
    const land=distances(this.cols,this.rows,binary,0),water=distances(this.cols,this.rows,binary,1);
    const deep=new Uint8Array(binary.length);
    for(let i=0;i<deep.length;i++)deep[i]=ground[Math.floor(i/this.cols)][i%this.cols]===9000?1:0;
    const fromDeep=distances(this.cols,this.rows,deep,1),fromShallow=distances(this.cols,this.rows,deep,0);
    const data=new Uint8Array(binary.length*4);
    for(let i=0;i<binary.length;i++){
      const signed=binary[i]?land[i]-.5:-(water[i]-.5);
      data[i*4]=Math.round((Math.max(-8,Math.min(8,signed))/16+.5)*255);
      // Deep/shallow is also a smooth field, never a binary square color switch.
      data[i*4+1]=Math.round(Math.max(0,Math.min(1,.5+(deep[i]?fromShallow[i]-.5:-(fromDeep[i]-.5))/7))*255);
      data[i*4+3]=255;
    }
    if(this.gpuReady){const gl=this.gl!;gl.bindTexture(gl.TEXTURE_2D,this.texture!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.cols,this.rows,0,gl.RGBA,gl.UNSIGNED_BYTE,data);}
    this.fallbackMask=undefined;
  }
  draw(ctx:CanvasRenderingContext2D,ground:number[][],camX:number,camY:number,w:number,h:number,time:number,cave:boolean,calm=false){
    this.setGround(ground);
    if(!this.waterCells.some(p=>p.x>camX-64&&p.x<camX+w+64&&p.y>camY-64&&p.y<camY+h+64))return;
    if(!this.gpuReady){this.drawFallback(ctx,camX,camY,w,h,time);return;}
    const gl=this.gl!,u=this.locations;
    const scale=Math.min(.8,1000/w);
    const rw=Math.max(1,Math.round(w*scale)),rh=Math.max(1,Math.round(h*scale));
    if(this.canvas.width!==rw||this.canvas.height!==rh){this.canvas.width=rw;this.canvas.height=rh;}
    gl.viewport(0,0,rw,rh);gl.useProgram(this.program!);
    gl.uniform2f(u.uMapSize,this.cols,this.rows);gl.uniform2f(u.uCamera,camX,camY);
    gl.uniform2f(u.uViewport,w,h);gl.uniform2f(u.uResolution,rw,rh);
    gl.uniform1f(u.uTime,time%10000);gl.uniform1f(u.uCave,cave?1:0);gl.uniform1i(u.uShore,0);
    gl.uniform1f(u.uCalm,calm?1:0);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(this.canvas,0,0,w,h);ctx.restore();
  }
  private drawFallback(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,t:number){
    if(!this.fallbackMask){
      const mask=this.fallbackMask=document.createElement('canvas');mask.width=this.cols*4;mask.height=this.rows*4;
      const c=mask.getContext('2d')!;c.fillStyle='#fff';
      const raw=document.createElement('canvas');raw.width=mask.width;raw.height=mask.height;
      const r=raw.getContext('2d')!;r.fillStyle='#fff';for(const p of this.waterCells)r.fillRect(p.x/8,p.y/8,4,4);
      // Mesmo motivo do terreno: `ctx.filter` nao existe no Safari antigo e a
      // margem da agua ficava serrilhada justamente onde nao ha WebGL.
      const soft=feather(raw,2);c.drawImage(soft,0,0);releaseFeather(soft);
    }
    const canvas=this.fallbackCanvas;
    if(canvas.width!==Math.round(w)||canvas.height!==Math.round(h)){canvas.width=Math.round(w);canvas.height=Math.round(h);}
    const c=canvas.getContext('2d')!;c.globalCompositeOperation='source-over';c.clearRect(0,0,w,h);
    c.fillStyle='#205663';c.fillRect(0,0,w,h);c.strokeStyle='#88cbb733';c.lineWidth=1;
    for(let r=Math.floor(y/20)*20;r<y+h;r+=20){
      c.beginPath();for(let col=x;col<x+w;col+=8){const yy=r-y+Math.sin(col*.018+t+r)*3;col===x?c.moveTo(col-x,yy):c.lineTo(col-x,yy);}c.stroke();
    }
    c.globalCompositeOperation='destination-in';c.drawImage(this.fallbackMask,0,0,this.cols*4,this.rows*4,-x,-y,this.cols*32,this.rows*32);
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(canvas,0,0,w,h);ctx.restore();
  }
}

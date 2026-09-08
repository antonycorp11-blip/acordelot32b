import React,{useEffect,useRef,useState} from 'react';
import {Compass,LocateFixed,Minus,Plus,X,RotateCcw} from 'lucide-react';
import type {GameEngine} from '../game/engine';
import {CRYSTAL_ROOMS} from '../game/crystalDungeon';
import './worldMap.css';
interface Props{open:boolean;onClose:()=>void;engine:GameEngine|null}
const RESOURCE_COLORS:Record<string,string>={spot_wood:'#b7a474',spot_mineral:'#c8ccda',spot_gold:'#f0c454',spot_crystal_blue:'#64dbe8',spot_crystal_red:'#ed85a9',spot_eco_essence:'#c593ed',dark_icecrystal:'#81bded'};
function color(v:number):string{
  if(v===9000)return '#164651';if(v===9001)return '#34777a';
  if(v===9009)return '#060912';if(v===9006)return '#3c435c';
  if(v===9007)return '#5d8971';if(v===9012)return '#2e5343';
  if(v===9008)return '#423947';if(v===9010)return '#b6a889';
  if(v===9011||v===9005)return '#8b775c';
  if(v>=9002&&v<=9004)return '#283e34';
  if(v===128)return '#436342';if(v!==56&&v!==92)return '#a09a80';
  return '#6d8757';
}
export function WorldMapScreen({open,onClose,engine}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null),viewportRef=useRef<HTMLDivElement>(null);
  const view=useRef({x:0,y:0,zoom:1,scale:1});
  const [resources,setResources]=useState(true),[places,setPlaces]=useState(true);
  const [zoomLabel,setZoomLabel]=useState(1);
  const dragging=useRef<{x:number,y:number}|null>(null);
  const mapId=engine?.activeMapId;
  const regions=engine?.isDungeon?CRYSTAL_ROOMS.map(r=>({name:r.name,col:r.col,row:r.row})):engine?.activeMap.minimap.regions??[];
  const fit=()=>{
    if(!engine)return;
    const left=engine.isDungeon?330:0;
    view.current={...view.current,x:(left+engine.mapCols)/2,y:engine.mapRows/2,zoom:1};setZoomLabel(1);
  };
  const focus=(x:number,y:number,zoom=2.6)=>{view.current.x=x;view.current.y=y;view.current.zoom=zoom;setZoomLabel(zoom);};
  const zoom=(factor:number)=>{view.current.zoom=Math.max(1,Math.min(6,view.current.zoom*factor));setZoomLabel(view.current.zoom);};
  useEffect(()=>{if(open)fit();},[open,mapId]);
  useEffect(()=>{
    if(!open||!engine)return;
    const canvas=canvasRef.current!,host=viewportRef.current!;
    const left=engine.isDungeon?330:0,cols=engine.mapCols-left,rows=engine.mapRows;
    const base=document.createElement('canvas');base.width=cols*3;base.height=rows*3;
    const b=base.getContext('2d')!;
    const raw=document.createElement('canvas');raw.width=cols;raw.height=rows;
    const rctx=raw.getContext('2d')!;
    for(let r=0;r<rows;r++)for(let c=left;c<engine.mapCols;c++){rctx.fillStyle=color(engine.ground[r][c]);rctx.fillRect(c-left,r,1,1);}
    b.imageSmoothingEnabled=true;b.drawImage(raw,0,0,base.width,base.height);
    b.fillStyle='#16372965';
    for(const p of engine.props)if(/tree|willow|pine|oak|bush/i.test(p.type)){
      b.beginPath();b.ellipse((p.x+p.w/2)/32*3-left*3,(p.y+p.h)/32*3,3.5,2.6,0,0,Math.PI*2);b.fill();
    }
    let w=1,h=1;
    const resize=()=>{w=host.clientWidth;h=host.clientHeight;canvas.width=w*2;canvas.height=h*2;};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    const draw=()=>{
      const ctx=canvas.getContext('2d')!,v=view.current;
      const scale=Math.min((w-30)/cols,(h-28)/rows)*v.zoom;v.scale=scale;
      v.x=Math.max(left,Math.min(engine.mapCols,v.x));v.y=Math.max(0,Math.min(rows,v.y));
      const point=(x:number,y:number)=>({x:w/2+(x-v.x)*scale,y:h/2+(y-v.y)*scale});
      ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#0b171b';ctx.fillRect(0,0,w,h);
      const origin=point(left,0);ctx.imageSmoothingEnabled=true;
      ctx.drawImage(base,origin.x,origin.y,cols*scale,rows*scale);
      const dot=(x:number,y:number,fill:string,radius:number)=>{
        const p=point(x,y);if(p.x<-20||p.y<-20||p.x>w+20||p.y>h+20)return;
        ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#07101ecc';ctx.stroke();
      };
      if(resources)for(const p of engine.props){
        const tint=RESOURCE_COLORS[p.type];if(tint)dot((p.x+p.w/2)/32,(p.y+p.h)/32,tint,v.zoom>1.4?3:1.8);
      }
      for(const p of engine.props)if(p.type==='portal'){
        const q=point((p.x+p.w/2)/32,(p.y+p.h/2)/32);
        ctx.strokeStyle='#cf9bf6';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,5,7,0,0,Math.PI*2);ctx.stroke();
      }
      for(const ally of engine.remotePlayers.values())dot((ally.x+12)/32,(ally.y+20)/32,'#70afff',3);
      if(places){
        // Fixed screen-size labels, with collision avoidance as the map zooms.
        const occupied:{x:number,y:number,w:number,h:number}[]=[];
        ctx.font='600 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
        for(const region of regions){
          const p=point(region.col,region.row);
          if(p.x<0||p.y<0||p.x>w||p.y>h)continue;
          const tw=ctx.measureText(region.name).width+12;
          const rect={x:p.x-tw/2,y:p.y-18,w:tw,h:18};
          if(occupied.some(o=>rect.x<o.x+o.w&&rect.x+rect.w>o.x&&rect.y<o.y+o.h&&rect.y+rect.h>o.y))continue;
          occupied.push(rect);ctx.fillStyle='#07111cda';ctx.beginPath();ctx.roundRect(rect.x,rect.y,tw,18,5);ctx.fill();
          ctx.fillStyle='#e5dec8';ctx.fillText(region.name,p.x,p.y-9);
        }
        for(const n of engine.npcs)dot((n.x+12)/32,(n.y+20)/32,'#ffd897',3);
      }
      const hero=point((engine.player.x+12)/32,(engine.player.y+20)/32);
      ctx.strokeStyle='#ffeab7';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(hero.x,hero.y,9,0,Math.PI*2);ctx.stroke();
      ctx.save();ctx.translate(hero.x,hero.y);
      const angle={up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[engine.player.direction];
      ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fillStyle='#fff2bd';ctx.fill();ctx.restore();
      // North and scale remain legible at every zoom.
      ctx.textAlign='left';ctx.font='bold 11px system-ui';ctx.fillStyle='#e5dec8';ctx.fillText('N ↑',12,19);
    };
    draw();const timer=window.setInterval(draw,100);
    return ()=>{observer.disconnect();window.clearInterval(timer);};
  },[open,engine,mapId,resources,places]);
  if(!open||!engine)return null;
  return <div className="atlas-backdrop">
    <section className="world-atlas" role="dialog" aria-modal="true" aria-label="Mapa da região">
      <header><Compass size={22}/><div><small>ATLAS DE ACORDELOT</small><h2>{engine.activeMap.minimap.label}</h2></div><button onClick={onClose} aria-label="Fechar mapa"><X size={23}/></button></header>
      <div className="atlas-body">
        <div className="atlas-viewport" ref={viewportRef}>
          <canvas ref={canvasRef} aria-label="Mapa navegável: arraste para explorar" onPointerDown={e=>{dragging.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
            onPointerMove={e=>{const p=dragging.current;if(!p)return;view.current.x-=(e.clientX-p.x)/view.current.scale;view.current.y-=(e.clientY-p.y)/view.current.scale;dragging.current={x:e.clientX,y:e.clientY};}}
            onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}}
            onWheel={e=>zoom(e.deltaY>0?.85:1.15)}/>
          <div className="atlas-tools"><button onClick={()=>zoom(1.35)} aria-label="Aproximar mapa"><Plus size={19}/></button><span>{zoomLabel.toFixed(1)}×</span><button onClick={()=>zoom(1/1.35)} aria-label="Afastar mapa"><Minus size={19}/></button><button onClick={()=>focus(engine.player.x/32,engine.player.y/32)} aria-label="Centralizar no jogador"><LocateFixed size={19}/></button><button onClick={fit} aria-label="Ver região inteira"><RotateCcw size={17}/></button></div>
        </div>
        <aside><div className="atlas-filters"><button aria-pressed={resources} onClick={()=>setResources(!resources)}>Recursos</button><button aria-pressed={places} onClick={()=>setPlaces(!places)}>Locais</button></div>
          <p>Toque em um destino para localizar. Arraste o mapa para explorar.</p>
          <nav aria-label="Locais da região">{engine.props.filter(p=>p.type==='portal').map(p=><button key={p.id} onClick={()=>focus((p.x+p.w/2)/32,(p.y+p.h)/32)} style={{color:'#d49cff'}}>◉ {String(p.data?.label??'Portal')}<span>↗</span></button>)}{regions.map(r=><button key={r.name} onClick={()=>focus(r.col,r.row)}>{r.name}<span>↗</span></button>)}</nav>
          <div className="atlas-legend"><span>▲ Você e direção</span><span style={{color:'#d49cff'}}>◉ Portais</span><span style={{color:'#f0c454'}}>● Ouro</span><span style={{color:'#64dbe8'}}>● Cristais</span><span style={{color:'#ffd897'}}>● NPCs</span></div>
        </aside>
      </div>
    </section>
  </div>;
}

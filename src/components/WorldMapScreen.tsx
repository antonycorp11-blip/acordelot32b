import React, { useEffect, useRef } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { MAP_COLS, MAP_ROWS, TILE_SIZE, TERRAIN_TILES } from '../game/mapData';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
}

const MAP_SCALE = 4;
const RESOURCE_COLORS: Record<string, string> = {
  spot_wood: '#d6a85f',
  spot_mineral: '#cbd5e1',
  spot_gold: '#facc15',
  spot_crystal_blue: '#38bdf8',
  spot_crystal_red: '#fb7185',
  spot_eco_essence: '#c084fc',
  dark_icecrystal: '#7dd3fc',
};

function terrainColor(tile: number): string {
  if (tile === TERRAIN_TILES.WATER_DEEP) return '#164e63';
  if (tile === TERRAIN_TILES.WATER_SHALLOW) return '#0e7490';
  if (tile === TERRAIN_TILES.DARK_SOIL) return '#17231d';
  if (tile === TERRAIN_TILES.DARK_MOSS) return '#263c2b';
  if (tile === TERRAIN_TILES.DARK_PATH) return '#66513b';
  if (tile === TERRAIN_TILES.DARK_STONE) return '#37364a';
  if (
    tile === TERRAIN_TILES.STONE_CENTER ||
    tile === TERRAIN_TILES.STONE_CENTER_VAR ||
    tile === TERRAIN_TILES.STONE_TOP ||
    tile === TERRAIN_TILES.STONE_BOTTOM ||
    tile === TERRAIN_TILES.STONE_LEFT ||
    tile === TERRAIN_TILES.STONE_RIGHT ||
    tile === TERRAIN_TILES.STONE_TL ||
    tile === TERRAIN_TILES.STONE_TR ||
    tile === TERRAIN_TILES.STONE_BL ||
    tile === TERRAIN_TILES.STONE_BR
  ) return '#a69b80';
  return tile === TERRAIN_TILES.GRASS_DARK ? '#42633a' : '#638b43';
}

export const WorldMapScreen: React.FC<Props> = ({ open, onClose, engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticMapRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open || !engine) return;
    const staticMap = document.createElement('canvas');
    staticMap.width = MAP_COLS * MAP_SCALE;
    staticMap.height = MAP_ROWS * MAP_SCALE;
    const sctx = staticMap.getContext('2d');
    if (!sctx) return;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        sctx.fillStyle = terrainColor(engine.ground[row]?.[col] ?? TERRAIN_TILES.GRASS_BASE);
        sctx.fillRect(col * MAP_SCALE, row * MAP_SCALE, MAP_SCALE, MAP_SCALE);
      }
    }

    for (const prop of engine.props) {
      const x = ((prop.x + prop.w / 2) / TILE_SIZE) * MAP_SCALE;
      const y = ((prop.y + prop.h / 2) / TILE_SIZE) * MAP_SCALE;
      const resourceColor = RESOURCE_COLORS[prop.type];
      if (resourceColor) {
        sctx.fillStyle = resourceColor;
        sctx.beginPath();
        sctx.arc(x, y, 3.2, 0, Math.PI * 2);
        sctx.fill();
      } else if (/oak|pine|tree|bush|blossom/i.test(prop.type)) {
        sctx.fillStyle = prop.type.startsWith('dark_') ? '#183425' : '#285b2d';
        sctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
      } else if (/bldg|house|bakery|hall|smith|lodge|herbalist|residential|apothecary/i.test(prop.type)) {
        sctx.fillStyle = '#6b3f2b';
        sctx.fillRect(x - 3, y - 2.5, 6, 5);
      }
    }
    staticMapRef.current = staticMap;

    const draw = () => {
      const canvas = canvasRef.current;
      const base = staticMapRef.current;
      if (!canvas || !base) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);

      const label = (text: string, col: number, row: number, color = '#fef3c7') => {
        const x = col * MAP_SCALE, y = row * MAP_SCALE;
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(2,6,23,.9)';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
      };
      label('Vila Encantada', 36, 19);
      label('Domínio do Órgão', 169, 4, '#e9d5ff');
      label('Floresta Sombria', 72, 137, '#d1fae5');

      for (const remote of engine.remotePlayers.values()) {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc((remote.x / TILE_SIZE) * MAP_SCALE, (remote.y / TILE_SIZE) * MAP_SCALE, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      const px = ((engine.player.x + engine.player.width / 2) / TILE_SIZE) * MAP_SCALE;
      const py = ((engine.player.y + engine.player.height / 2) / TILE_SIZE) * MAP_SCALE;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(px, py, 4.2, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();
    const timer = window.setInterval(draw, 180);
    return () => window.clearInterval(timer);
  }, [open, engine]);

  if (!open || !engine) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-[96vw] max-h-[94vh] flex gap-3 items-stretch bg-slate-950/95 border border-amber-500/45 rounded-2xl p-3 shadow-2xl overflow-hidden">
        <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-[#17231d]">
          <canvas
            ref={canvasRef}
            width={MAP_COLS * MAP_SCALE}
            height={MAP_ROWS * MAP_SCALE}
            className="block h-[min(88vh,704px)] w-auto max-w-[70vw] object-contain"
          />
        </div>
        <aside className="w-44 max-w-[24vw] flex flex-col gap-3 text-[10px] text-slate-300">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h2 className="font-black text-amber-200 flex items-center gap-1.5"><MapIcon className="w-4 h-4" /> Mapa</h2>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-slate-500 leading-relaxed">Estradas claras conectam as áreas. Sua posição acompanha o personagem em tempo real.</p>
          <div className="grid grid-cols-1 gap-1.5">
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" />Você</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 mr-1.5" />Aliado online</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-green-700 mr-1.5" />Árvore</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 mr-1.5" />Pedra</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1.5" />Ouro</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 mr-1.5" />Cristal</span>
          </div>
          <div className="mt-auto rounded-lg border border-purple-500/30 bg-purple-950/30 p-2 text-purple-200 leading-relaxed">
            O Sentinela do Órgão aguarda na arena do extremo nordeste.
          </div>
        </aside>
      </div>
    </div>
  );
};

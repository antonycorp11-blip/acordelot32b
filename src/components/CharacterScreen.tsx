import React from 'react';
import { X, Swords } from 'lucide-react';
import type { PlayerStats } from '../game/engine';

interface CharacterScreenProps {
  open: boolean;
  onClose: () => void;
  stats: PlayerStats;
  power: number;
}

const ATTRS: Array<[keyof PlayerStats, string, string]> = [
  ['forca', 'Força', '💪'],
  ['agilidade', 'Agilidade', '🏃'],
  ['vitalidade', 'Vitalidade', '🛡️'],
  ['inteligencia', 'Inteligência', '📖'],
  ['sorte', 'Sorte', '🍀'],
];

/** Ficha do personagem: retrato recortado, atributos e poder de luta. */
export const CharacterScreen: React.FC<CharacterScreenProps> = ({ open, onClose, stats, power }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/70 bg-slate-950/50">
          <h3 className="text-sm font-bold text-amber-200 tracking-wide">Ficha — {stats.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex gap-4">
          {/* Retrato recortado */}
          <div className="shrink-0">
            <div className="w-28 h-36 rounded-xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-slate-800 to-slate-950 shadow-lg">
              <img
                src="/icons/icon-512.png"
                alt={stats.name}
                className="w-full h-full object-cover object-top scale-110"
              />
            </div>
            <p className="text-center text-[11px] text-slate-400 mt-1.5">{stats.className}</p>
            <p className="text-center text-xs font-bold text-amber-300">Nível {stats.level}</p>
          </div>

          {/* Atributos */}
          <div className="flex-1 space-y-1.5">
            {ATTRS.map(([key, label, icon]) => (
              <div
                key={key}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-[12px] text-slate-300">
                  {icon} {label}
                </span>
                <span className="text-sm font-bold text-slate-100 tabular-nums">
                  {stats[key] as number}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-[12px] text-slate-300">❤️ Vida</span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {Math.round(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-[12px] text-slate-300">⭐ XP</span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {stats.xp} / {stats.xpNext}
              </span>
            </div>
          </div>
        </div>

        {/* Poder de luta */}
        <div className="mx-4 mb-4 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-rose-950/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-200">
            <Swords className="w-5 h-5" />
            <span className="text-sm font-bold tracking-wide">Poder de Luta</span>
          </div>
          <span className="text-2xl font-black text-amber-300 tabular-nums drop-shadow">{power}</span>
        </div>
        <p className="px-4 pb-3 -mt-2 text-[10px] text-slate-500 leading-snug">
          Poder = Força×2,4 + Agilidade×1,8 + Vitalidade×2,0 + Inteligência×1,5 + Sorte×1,1 +
          Nível×6 + VidaMáx×0,25
        </p>
      </div>
    </div>
  );
};

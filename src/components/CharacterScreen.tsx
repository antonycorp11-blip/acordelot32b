import React from 'react';
import { X, Swords, Plus, ChevronsUp } from 'lucide-react';
import type { PlayerStats, AttrKey } from '../game/engine';

interface CharacterScreenProps {
  open: boolean;
  onClose: () => void;
  stats: PlayerStats;
  power: number;
  canLevelUp: boolean;
  onLevelUp: () => void;
  onSpend: (attr: AttrKey) => void;
}

const ATTRS: Array<[AttrKey, string, string, string]> = [
  ['forca', 'Força', '💪', 'dano corpo-a-corpo'],
  ['agilidade', 'Agilidade', '🏃', 'velocidade de movimento'],
  ['vitalidade', 'Vitalidade', '🛡️', '+5 vida máx. por ponto'],
  ['inteligencia', 'Inteligência', '📖', 'dano do Canhão de Luz'],
  ['sorte', 'Sorte', '🍀', 'chance de drops raros'],
];

/** Ficha em paisagem: retrato à esquerda, atributos à direita, poder embaixo. */
export const CharacterScreen: React.FC<CharacterScreenProps> = ({
  open,
  onClose,
  stats,
  power,
  canLevelUp,
  onLevelUp,
  onSpend,
}) => {
  if (!open) return null;
  const hasPoints = stats.attrPoints > 0;
  const xpPct = Math.min(100, (stats.xp / stats.xpNext) * 100);
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[96vh] flex flex-col bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-amber-200 tracking-wide">Ficha — {stats.name}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 flex gap-3">
          {/* Coluna esquerda: retrato + vida/xp */}
          <div className="w-44 shrink-0 flex flex-col gap-2">
            <div className="rounded-xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-slate-800 to-slate-950 shadow-lg aspect-[3/4]">
              <img src="/icons/icon-512.png" alt={stats.name} className="w-full h-full object-cover object-top scale-110" />
            </div>
            <p className="text-center text-[11px] text-slate-400 -mt-1">{stats.className}</p>
            <p className="text-center text-sm font-bold text-amber-300">Nível {stats.level}</p>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
                <span>❤️ Vida</span>
                <span>{Math.round(stats.hp)}/{stats.maxHp}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400" style={{ width: `${hpPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
                <span>⭐ XP</span>
                <span>{stats.xp}/{stats.xpNext}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <button
              type="button"
              onClick={onLevelUp}
              disabled={!canLevelUp}
              className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                canLevelUp
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ChevronsUp className="w-4 h-4" />
              Subir de Nível
            </button>
          </div>

          {/* Coluna direita: atributos + poder */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {hasPoints && (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/50 px-2.5 py-1 text-center text-[12px] font-bold text-emerald-300">
                {stats.attrPoints} ponto{stats.attrPoints > 1 ? 's' : ''} para distribuir
              </div>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {ATTRS.map(([key, label, icon, hint]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg pl-2.5 pr-1.5 py-1.5"
                >
                  <span className="text-[13px] w-5 text-center">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-slate-200 font-semibold">{label}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">{hint}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-100 tabular-nums w-7 text-right">{stats[key]}</span>
                  <button
                    type="button"
                    onClick={() => onSpend(key)}
                    disabled={!hasPoints}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      hasPoints
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-90'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-auto rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-rose-950/60 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-200">
                <Swords className="w-5 h-5" />
                <span className="text-sm font-bold tracking-wide">Poder de Luta</span>
              </div>
              <span className="text-2xl font-black text-amber-300 tabular-nums drop-shadow">{power}</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-snug">
              Força×2,4 + Agilidade×1,8 + Vitalidade×2,0 + Inteligência×1,5 + Sorte×1,1 + Nível×6 +
              VidaMáx×0,25
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

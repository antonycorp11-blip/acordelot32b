import React from 'react';
import { X, Sword, ArrowUpCircle } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { ITEM_META } from '../game/engine';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  inventory: Record<string, number>;
}

/** Tela da arma equipada — upar com ouro e cristais (simples/refinados). */
export const WeaponScreen: React.FC<Props> = ({ open, onClose, engine, inventory }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  if (!open || !engine) return null;

  const def = engine.weaponDef;
  const level = engine.weaponLevel;
  const atk = engine.weaponAtk;
  const maxed = level >= def.maxLevel;
  const cost = !maxed ? def.upgradeCost(level) : null;
  const canUpgrade = engine.canUpgradeWeapon();

  const doUpgrade = () => {
    if (engine.upgradeWeapon()) force();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-slate-900/96 border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/60 shrink-0">
          <h3 className="text-[13px] font-bold text-blue-200 tracking-wide flex items-center gap-1.5">
            <Sword className="w-4 h-4" /> Arma
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 flex flex-col gap-3">
          <div className="flex gap-3 items-center rounded-xl border border-blue-500/30 bg-slate-950/60 p-3">
            <div className="relative w-20 h-24 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20" />
              <img
                src={`/assets/weapons/${def.key}.png`}
                alt={def.name}
                className="relative max-w-full max-h-full object-contain"
                style={{ filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.5))' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-100">{def.name}</p>
              <p className="text-[10px] text-blue-300 font-semibold">
                Tier {def.tier} · {def.rarity}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Nível <span className="text-slate-100 font-bold">{level}</span>
                {!maxed && <span className="text-slate-600"> / {def.maxLevel}</span>}
              </p>
              <p className="text-[11px] text-amber-300 font-bold mt-0.5">ATQ +{atk}</p>
            </div>
          </div>

          {maxed ? (
            <div className="text-center text-[12px] text-slate-400 py-3">
              Nível máximo alcançado. Novas armas T3+ virão em breve.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex flex-col gap-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Custo para Nível {level + 1}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {cost &&
                  Object.entries(cost).map(([k, n]) => {
                    const have = inventory[k] ?? 0;
                    const ok = have >= n;
                    const meta = ITEM_META[k];
                    return (
                      <div
                        key={k}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                          ok ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-rose-600/40 bg-rose-950/20'
                        }`}
                      >
                        {meta?.img ? (
                          <img src={meta.img} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <span className="text-base">{meta?.icon ?? '◆'}</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-200 truncate">
                            {meta?.name ?? k}
                          </p>
                          <p className={`text-[10px] tabular-nums ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {have}/{n}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <button
                type="button"
                onClick={doUpgrade}
                disabled={!canUpgrade}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  canUpgrade
                    ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/25'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Upar arma
              </button>
            </div>
          )}
          <p className="text-[9px] text-slate-600 leading-snug">
            As habilidades pertencem a Akles — a arma só dá atributos. Novas armas (T3+, sazonais,
            especiais) poderão ser equipadas sem trocar as animações do personagem.
          </p>
        </div>
      </div>
    </div>
  );
};

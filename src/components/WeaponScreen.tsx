import React from 'react';
import { X, Sword, ArrowUpCircle, Lock } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { ITEM_META, WEAPON_DEFS } from '../game/engine';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  inventory: Record<string, number>;
}

// Slots de arma — só a Acordelâmina existe hoje; os demais ficam reservados
// (a lista cresce sozinha conforme WEAPON_DEFS ganhar novas armas).
const FUTURE_SLOTS = 3;

/** Tela de Arma, em paisagem: lista de armas à esquerda, detalhe grande à direita. */
export const WeaponScreen: React.FC<Props> = ({ open, onClose, engine, inventory }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const weaponKeys = React.useMemo(() => Object.keys(WEAPON_DEFS), []);
  const [selected, setSelected] = React.useState(weaponKeys[0]);
  if (!open || !engine) return null;

  const equippedKey = engine.equippedWeaponKey;
  const viewingEquipped = selected === equippedKey;
  const def = WEAPON_DEFS[selected];
  const level = viewingEquipped ? engine.weaponLevel : 1;
  const atk = viewingEquipped ? engine.weaponAtk : def.baseAtk;
  const maxed = level >= def.maxLevel;
  const cost = !maxed ? def.upgradeCost(level) : null;
  const canUpgrade = viewingEquipped && engine.canUpgradeWeapon();

  const doUpgrade = () => {
    if (engine.upgradeWeapon()) force();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-blue-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-blue-200 tracking-wide flex items-center gap-1.5">
            <Sword className="w-4 h-4" /> Armas
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0 p-3 gap-3">
          {/* Coluna esquerda: lista de armas (slots) */}
          <div className="w-40 shrink-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {weaponKeys.map((k) => {
              const d = WEAPON_DEFS[k];
              const isEquipped = k === equippedKey;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelected(k)}
                  className={`flex items-center gap-2 rounded-xl border p-2 transition-all text-left ${
                    selected === k
                      ? 'bg-blue-950/50 border-blue-400/70 ring-1 ring-blue-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={`/assets/weapons/${d.key}.png`}
                    alt={d.name}
                    className="w-9 h-11 object-contain shrink-0"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-100 truncate">{d.name}</p>
                    <p className="text-[9px] text-blue-300">Tier {d.tier}</p>
                    {isEquipped && (
                      <span className="text-[8px] font-black text-emerald-300 bg-emerald-950/60 px-1 rounded">
                        EQUIPADA
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {Array.from({ length: FUTURE_SLOTS }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-2 opacity-50"
              >
                <div className="w-9 h-11 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-slate-600" />
                </div>
                <p className="text-[10px] text-slate-600">Em breve</p>
              </div>
            ))}
          </div>

          {/* Coluna direita: detalhe grande da arma selecionada */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex gap-4 items-center rounded-xl border border-blue-500/30 bg-slate-950/60 p-4">
              <div className="relative w-24 h-32 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full blur-2xl bg-blue-500/25" />
                <img
                  src={`/assets/weapons/${def.key}.png`}
                  alt={def.name}
                  className="relative max-w-full max-h-full object-contain"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(96,165,250,0.55))' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-slate-100">{def.name}</p>
                <p className="text-[11px] text-blue-300 font-semibold">
                  Tier {def.tier} · {def.rarity}
                </p>
                <div className="flex items-center gap-4 mt-1.5">
                  <p className="text-[12px] text-slate-400">
                    Nível <span className="text-slate-100 font-bold">{level}</span>
                    {!maxed && <span className="text-slate-600"> / {def.maxLevel}</span>}
                  </p>
                  <p className="text-[12px] font-bold text-amber-300">ATQ +{atk}</p>
                </div>
                {!viewingEquipped && (
                  <p className="text-[10px] text-slate-500 mt-1.5">Ainda não desbloqueada.</p>
                )}
              </div>
            </div>

            {viewingEquipped &&
              (maxed ? (
                <div className="flex-1 flex items-center justify-center text-[12px] text-slate-400">
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
                              <p className="text-[10px] font-bold text-slate-200 truncate">{meta?.name ?? k}</p>
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
              ))}

            <p className="text-[9px] text-slate-600 leading-snug mt-auto">
              As habilidades pertencem a Akles — a arma só dá atributos. Novas armas (T3+, sazonais,
              especiais) poderão ser equipadas sem trocar as animações do personagem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

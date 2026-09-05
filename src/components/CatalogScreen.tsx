import React from 'react';
import { X, Library, Sword, CheckCircle2 } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { WEAPON_DEFS } from '../game/engine';
import { weaponClass } from '../game/weapons';
import { equipSetClass } from '../game/catalogData';
import { EQUIP_SETS, EQUIP_SLOT_ORDER, STAT_LABELS } from '../game/engine';
import type { StatKey } from '../game/engine';

function firstStat(stats: Partial<Record<StatKey, number>>): string {
  const entry = Object.entries(stats)[0] as [StatKey, number] | undefined;
  if (!entry) return '';
  return `${STAT_LABELS[entry[0]]} +${entry[1]}%`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
}

const TIERS = [1, 2, 3, 4, 5] as const;
const TIER_COLOR: Record<number, string> = {
  1: 'text-slate-300 border-slate-600',
  2: 'text-emerald-300 border-emerald-600/60',
  3: 'text-blue-300 border-blue-600/60',
  4: 'text-purple-300 border-purple-600/60',
  5: 'text-amber-300 border-amber-500/60',
};

/**
 * Catálogo — tela TEMPORÁRIA pra visualizar todas as armas e equipamentos da
 * classe Teclas, divididos por tier. Armas já podem ser equipadas de fato;
 * equipamentos aqui são só exibição (o up deles com materiais vem depois).
 */
export const CatalogScreen: React.FC<Props> = ({ open, onClose, engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [tier, setTier] = React.useState<number>(2);
  if (!open || !engine) return null;

  const weaponsInTier = Object.values(WEAPON_DEFS).filter((d) => d.tier === tier && d.catalogVisible !== false && weaponClass(d) === engine.characterClassKey);
  const setsInTier = EQUIP_SETS.filter((s) => s.tier === tier && equipSetClass(s) === engine.characterClassKey);
  const equippedKey = engine.equippedWeaponKey;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-[560px] max-h-[92vh] flex flex-col bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
            <Library className="w-4 h-4" /> Catálogo
            <span className="text-[9px] font-semibold text-slate-500 ml-1">(prévia — em construção)</span>
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs de tier */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 shrink-0">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                tier === t
                  ? `bg-slate-800/80 ${TIER_COLOR[t]} ring-1 ring-current`
                  : 'border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              Tier {t}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-4">
          {/* Armas */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sword className="w-3 h-3" /> Armas
            </p>
            {weaponsInTier.length === 0 ? (
              <p className="text-[11px] text-slate-600">Nenhuma arma neste tier ainda.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {weaponsInTier.map((d) => {
                  const isEquipped = d.key === equippedKey;
                  return (
                    <div
                      key={d.key}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${
                        isEquipped ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/50'
                      }`}
                    >
                      <img
                        src={d.img}
                        alt={d.name}
                        className="w-12 h-16 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <p className="text-[9px] font-bold text-slate-200 text-center leading-tight">{d.name}</p>
                      <p className="text-[8px] text-amber-300/90 -mt-0.5">ATQ {d.baseAtk}</p>
                      {isEquipped ? (
                        <span className="text-[8px] font-black text-emerald-300 bg-emerald-950/60 px-1 rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Equipada
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            engine.equipWeapon(d.key);
                            force();
                          }}
                          className="text-[8px] font-bold text-blue-300 bg-blue-950/50 hover:bg-blue-900/60 px-1.5 py-0.5 rounded"
                        >
                          Equipar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Equipamentos */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Conjuntos de Equipamento
            </p>
            {setsInTier.length === 0 ? (
              <p className="text-[11px] text-slate-600">Nenhum conjunto neste tier ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {setsInTier.map((s) => (
                  <div key={s.key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                    <p className="text-[10px] font-bold text-slate-300 mb-0.5">{s.name}</p>
                    <p className="text-[8px] text-slate-500 mb-1.5">{s.identity}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {EQUIP_SLOT_ORDER.map((slot) => {
                        const p = s.pieces[slot];
                        return (
                          <div key={p.key} className="flex flex-col items-center gap-1">
                            {p.img ? (
                              <img
                                src={p.img}
                                alt={p.name}
                                className="w-12 h-12 object-contain"
                                style={{ imageRendering: 'pixelated' }}
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-[9px] font-bold"
                                style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }}
                              >
                                {slot.slice(0, 3)}
                              </div>
                            )}
                            <p className="text-[8px] text-slate-400 text-center leading-tight capitalize">{slot}</p>
                            <p className="text-[7px] text-slate-500 text-center leading-tight">{firstStat(p.stats)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px] text-slate-600 mt-2">
              Pra equipar peças e ver o bônus de conjunto ativo, use a aba Equipamentos na Ficha do
              personagem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

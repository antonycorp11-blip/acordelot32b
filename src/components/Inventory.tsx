import React from 'react';
import { X } from 'lucide-react';
import { ITEM_META, MAX_CARRY_WEIGHT, inventoryWeight } from '../game/engine';

interface InventoryProps {
  open: boolean;
  onClose: () => void;
  items: Record<string, number>;
}

const SLOT_COUNT = 12;

/** Protótipo de inventário: grade de slots com ícone + quantidade. */
export const Inventory: React.FC<InventoryProps> = ({ open, onClose, items }) => {
  if (!open) return null;

  const entries = (Object.entries(items) as Array<[string, number]>).filter(([, q]) => q > 0);
  const slots: Array<[string, number] | null> = [
    ...entries,
    ...Array(Math.max(0, SLOT_COUNT - entries.length)).fill(null),
  ].slice(0, Math.max(SLOT_COUNT, entries.length));

  const weight = inventoryWeight(items);
  const pct = Math.min(100, (weight / MAX_CARRY_WEIGHT) * 100);
  const full = weight >= MAX_CARRY_WEIGHT - 0.05;
  const barColor = full ? '#f87171' : pct > 80 ? '#fbbf24' : '#4ade80';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-2 border-b border-slate-700/70 pb-2">
          <h3 className="text-sm font-bold text-amber-200 tracking-wide">🎒 Mochila</h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Peso transportado */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
            <span className="text-slate-400">Peso</span>
            <span className={full ? 'text-rose-400' : 'text-slate-300'}>
              {weight.toFixed(1)} / {MAX_CARRY_WEIGHT} kg
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
            <div
              className="h-full transition-all duration-200"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          {full && (
            <p className="text-[10px] text-rose-400 font-semibold mt-1">
              Mochila cheia — solte itens para carregar mais.
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot, i) => (
            <div
              key={i}
              title={
                slot
                  ? `${ITEM_META[slot[0]]?.name ?? slot[0]} · ${ITEM_META[slot[0]]?.weight ?? 1} kg/un${
                      ITEM_META[slot[0]]?.heal ? ` · cura +${ITEM_META[slot[0]]?.heal}` : ''
                    }`
                  : undefined
              }
              className="aspect-square rounded-xl border border-slate-700 bg-slate-950/70 flex flex-col items-center justify-center relative"
            >
              {slot ? (
                <>
                  <span className="text-2xl leading-none">
                    {ITEM_META[slot[0]]?.icon ?? '❓'}
                  </span>
                  <span className="absolute bottom-1 right-1.5 text-[11px] font-bold text-amber-300 tabular-nums">
                    {slot[1]}
                  </span>
                </>
              ) : (
                <span className="text-slate-700 text-xs">—</span>
              )}
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <p className="text-center text-[11px] text-slate-500 mt-3">
            Colha árvores e pedras por madeira, pedra e minério.
            <br />
            Arbustos dão 🍓 frutinhas (curam vida).
          </p>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ITEM_META, inventoryWeight, inventorySellOffer } from '../game/engine';

interface InventoryProps {
  open: boolean;
  onClose: () => void;
  items: Record<string, number>;
  coins: number;
  maxCarryWeight: number;
  onSell: (item: string) => { ok: boolean; message: string } | undefined;
  onDiscard: (item: string) => { ok: boolean; message: string } | undefined;
}

const SLOT_COUNT = 32;

/** Inventário em paisagem: grade larga + painel de detalhe do item. */
export const Inventory: React.FC<InventoryProps> = ({ open, onClose, items, coins, maxCarryWeight, onSell, onDiscard }) => {
  const [active, setActive] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'sell' | 'discard' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    setPendingAction(null);
    setMessage(null);
  }, [active]);

  if (!open) return null;

  const entries = (Object.entries(items) as Array<[string, number]>).filter(([, q]) => q > 0);
  const slots: Array<[string, number] | null> = [
    ...entries,
    ...Array(Math.max(0, SLOT_COUNT - entries.length)).fill(null),
  ].slice(0, Math.max(SLOT_COUNT, entries.length));

  const weight = inventoryWeight(items);
  const pct = Math.min(100, (weight / maxCarryWeight) * 100);
  const full = weight >= maxCarryWeight - 0.05;
  const barColor = full ? '#f87171' : pct > 80 ? '#fbbf24' : '#4ade80';
  const meta = active ? ITEM_META[active] : null;
  const sellOffer = active ? inventorySellOffer(active) : null;

  const runConfirmedAction = (kind: 'sell' | 'discard') => {
    if (!active) return;
    if (pendingAction !== kind) {
      setPendingAction(kind);
      setMessage('Toque novamente para confirmar.');
      return;
    }
    const result = kind === 'sell' ? onSell(active) : onDiscard(active);
    setPendingAction(null);
    setMessage(result?.message ?? null);
    if (kind === 'discard' && (items[active] || 0) <= 1) setActive(null);
    if (kind === 'sell' && sellOffer && (items[active] || 0) <= sellOffer.quantity) setActive(null);
  };

  const holdStart = (key: string) => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setActive(key), 260);
  };
  const holdEnd = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[96vh] flex flex-col bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[13px] font-bold text-amber-200 tracking-wide">🎒 Mochila</h3>
            <span
              className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300"
              title="Claves musicais — moeda de combate"
            >
              <img src="/assets/items/clave.png" alt="clave" className="w-4 h-4 object-contain" />
              {coins}
            </span>
            <span className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-200" title="Ouro bruto coletado">
              <img src="/assets/items/props/gold_raw.png" alt="ouro bruto" className="w-4 h-4 object-contain" />
              {items.gold_raw || 0}
            </span>
            <span className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-yellow-100/10 border border-yellow-100/30 text-yellow-100" title="Ouro sintetizado">
              <img src="/assets/items/props/gold_refined.png" alt="ouro sintetizado" className="w-4 h-4 object-contain" />
              {items.gold_refined || 0}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-40">
              <span className={`text-[10px] font-bold ${full ? 'text-rose-400' : 'text-slate-400'}`}>
                {weight.toFixed(1)}/{maxCarryWeight}kg
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
            </div>
            <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-3 overflow-hidden">
          {/* Grade */}
          <div className="flex-1 overflow-y-auto grid grid-cols-8 gap-1.5 content-start">
            {slots.map((slot, i) => {
              const m = slot ? ITEM_META[slot[0]] : null;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => slot && setActive(slot[0])}
                  onPointerDown={() => slot && holdStart(slot[0])}
                  onPointerUp={holdEnd}
                  onPointerLeave={holdEnd}
                  onClick={() => slot && setActive(slot[0])}
                  className={`aspect-square rounded-lg border flex items-center justify-center relative transition-colors ${
                    slot
                      ? active === slot[0]
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'
                      : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  {slot ? (
                    <>
                      {m?.img ? (
                        <img src={m.img} alt="" className="w-7 h-7 object-contain drop-shadow" />
                      ) : (
                        <span className="text-xl leading-none">{m?.icon ?? '❓'}</span>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-amber-300 tabular-nums">
                        {slot[1]}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-700 text-[10px]">·</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Painel de detalhe */}
          <div className="w-52 shrink-0 rounded-xl border border-slate-700 bg-slate-950/60 p-3 flex flex-col">
            {meta ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  {meta.img ? (
                    <img src={meta.img} alt="" className="w-10 h-10 object-contain" />
                  ) : (
                    <span className="text-3xl">{meta.icon}</span>
                  )}
                  <div>
                    <p className="text-[13px] font-bold text-amber-200 leading-tight">{meta.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {items[active!] ?? 0} un · {meta.weight} kg/un
                      {meta.heal ? ` · cura +${meta.heal}` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{meta.desc ?? '—'}</p>
                <div className="mt-auto pt-3 space-y-1.5">
                  {sellOffer ? (
                    <button
                      type="button"
                      disabled={(items[active!] || 0) < sellOffer.quantity}
                      onClick={() => runConfirmedAction('sell')}
                      className={`w-full rounded-lg py-1.5 text-[10px] font-black transition disabled:bg-slate-800 disabled:text-slate-600 ${pendingAction === 'sell' ? 'bg-amber-300 text-slate-950' : 'bg-emerald-700 text-white'}`}
                    >
                      {pendingAction === 'sell' ? 'Confirmar venda?' : `Vender ${sellOffer.quantity} por ◈ ${sellOffer.goldRaw}`}
                    </button>
                  ) : (
                    <p className="text-[9px] text-center text-slate-600">Moedas não podem ser vendidas</p>
                  )}
                  <button
                    type="button"
                    onClick={() => runConfirmedAction('discard')}
                    className={`w-full rounded-lg py-1.5 text-[10px] font-bold transition ${pendingAction === 'discard' ? 'bg-rose-400 text-slate-950' : 'bg-rose-950/70 text-rose-300 border border-rose-900'}`}
                  >
                    {pendingAction === 'discard' ? 'Confirmar descarte?' : 'Descartar 1'}
                  </button>
                  {message && <p className="text-[9px] text-center text-slate-400 leading-tight">{message}</p>}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 m-auto text-center">
                Passe o dedo (ou segure) num item para ver os detalhes.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

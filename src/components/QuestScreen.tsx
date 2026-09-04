import React from 'react';
import { X, ScrollText, CheckCircle2, Gift } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { ITEM_META } from '../game/engine';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
}

function rewardMeta(item: string) {
  if (item === 'clave') return { name: 'Claves', icon: '🎼', img: ITEM_META['clave']?.img };
  const meta = ITEM_META[item];
  return { name: meta?.name ?? item, icon: meta?.icon ?? '◆', img: meta?.img };
}

/** Missões diárias — independentes da história. Precisa aceitar antes do progresso contar. */
export const QuestScreen: React.FC<Props> = ({ open, onClose, engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  if (!open || !engine) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-emerald-200 tracking-wide flex items-center gap-1.5">
            <ScrollText className="w-4 h-4" /> Missões Diárias
            <span className="text-[9px] font-semibold text-slate-500 ml-1">renovam à meia-noite</span>
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
          {engine.dailyQuests.map((q) => {
            const { def, accepted, progress, claimed } = q;
            const ready = progress >= def.target;
            const pct = Math.min(100, (progress / def.target) * 100);

            const accept = () => {
              if (engine.acceptQuest(def.id)) force();
            };
            const claim = () => {
              if (engine.claimQuestReward(def.id)) force();
            };

            return (
              <div
                key={def.id}
                className={`rounded-xl border p-3 flex flex-col gap-2 ${
                  claimed ? 'border-slate-800 bg-slate-950/30 opacity-60' : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-emerald-500/10 border border-emerald-500/30 shrink-0">
                    {def.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-100">{def.title}</p>
                    <p className="text-[11px] text-slate-400">{def.desc}</p>
                  </div>
                  {claimed ? (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
                    </span>
                  ) : !accepted ? (
                    <button
                      type="button"
                      onClick={accept}
                      className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 shadow-lg shadow-blue-600/25"
                    >
                      Aceitar
                    </button>
                  ) : ready ? (
                    <button
                      type="button"
                      onClick={claim}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 shadow-lg shadow-emerald-600/25 animate-pulse"
                    >
                      <Gift className="w-3.5 h-3.5" /> Coletar
                    </button>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold text-slate-400 tabular-nums">
                      {progress}/{def.target}
                    </span>
                  )}
                </div>

                {accepted && (
                  <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all ${ready ? 'bg-emerald-400' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recompensas:</span>
                  {def.rewards.map((r) => {
                    const meta = rewardMeta(r.item);
                    return (
                      <div key={r.item} className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/70 px-1.5 py-0.5">
                        {meta.img ? (
                          <img src={meta.img} alt="" className="w-4 h-4 object-contain" />
                        ) : (
                          <span className="text-[11px]">{meta.icon}</span>
                        )}
                        <span className="text-[10px] font-bold text-amber-200">{r.qty}x</span>
                        <span className="text-[9px] text-slate-400">{meta.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

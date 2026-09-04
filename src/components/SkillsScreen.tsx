import React from 'react';
import { X, Sparkles, RefreshCw, Zap, Plus } from 'lucide-react';
import type { GameEngine, PassiveGroup } from '../game/engine';
import { PASSIVE_DEFS, PASSIVE_ORDER } from '../game/engine';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
}

const GROUPS: Array<{ key: PassiveGroup; label: string; color: string; icon: React.ReactNode }> = [
  { key: 'basico', label: 'Ataque Básico — Compasso da Lâmina', color: '#f87171', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'ressonancia', label: 'Skill 1 — Ressonância (H)', color: '#60a5fa', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'amplificacao', label: 'Skill 2 — Amplificação', color: '#818cf8', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { key: 'pulso', label: 'Skill 3 — Pulso Harmônico', color: '#22d3ee', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'geral', label: 'Passivas Gerais', color: '#fbbf24', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

const fmt = (id: string, v: number) => {
  if (id === 'notaPerfeita') return `crítico a cada ${v}`;
  return `+${Math.round(v * 100)}%`;
};

/** Tela de Skills — texto das passivas (5 níveis) e botão pra upar cada uma. */
export const SkillsScreen: React.FC<Props> = ({ open, onClose, engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  if (!open || !engine) return null;

  const levelUp = (id: string) => {
    const cur = engine.getPassiveLevel(id);
    if (cur >= 5) return;
    engine.setPassiveLevel(id, cur + 1);
    force();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-slate-900/96 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/60 shrink-0">
          <h3 className="text-[13px] font-bold text-indigo-200 tracking-wide flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Skills de Akles
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 flex flex-col gap-3">
          {GROUPS.map((g) => {
            const ids = PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === g.key);
            if (!ids.length) return null;
            return (
              <div key={g.key} className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
                <div
                  className="px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5"
                  style={{ color: g.color, background: g.color + '14' }}
                >
                  {g.icon} {g.label}
                </div>
                <div className="p-2 flex flex-col gap-1.5">
                  {ids.map((id) => {
                    const def = PASSIVE_DEFS[id];
                    const lvl = engine.getPassiveLevel(id);
                    const val = engine.passiveValue(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-100">{def.name}</span>
                            <span className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <span
                                  key={n}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: n <= lvl ? g.color : '#334155' }}
                                />
                              ))}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug">{def.desc}</p>
                          {lvl > 0 && (
                            <p className="text-[10px] font-bold mt-0.5" style={{ color: g.color }}>
                              Nível {lvl}: {fmt(id, val)}
                              {lvl >= 5 && def.level5Bonus ? ` — ${def.level5Bonus}` : ''}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => levelUp(id)}
                          disabled={lvl >= 5}
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            lvl >= 5
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-90'
                          }`}
                          title="Upar"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-[9px] text-slate-600 leading-snug px-1">
            Upando de graça por enquanto — quando definir a moeda/recurso de evolução das skills, eu
            troco o botão pra gastar o que você quiser.
          </p>
        </div>
      </div>
    </div>
  );
};

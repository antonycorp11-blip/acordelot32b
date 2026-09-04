import React from 'react';
import { X, Sparkles, RefreshCw, Zap, Plus, Swords } from 'lucide-react';
import type { GameEngine, PassiveGroup } from '../game/engine';
import { PASSIVE_DEFS, PASSIVE_ORDER } from '../game/engine';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
}

const GROUPS: Array<{ key: PassiveGroup; label: string; color: string; icon: React.ReactNode }> = [
  { key: 'basico', label: 'Ataque Básico', color: '#f87171', icon: <Swords className="w-3.5 h-3.5" /> },
  { key: 'ressonancia', label: 'Skill 1 · Ressonância', color: '#60a5fa', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'amplificacao', label: 'Skill 2 · Amplificação', color: '#818cf8', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { key: 'pulso', label: 'Skill 3 · Pulso Harmônico', color: '#22d3ee', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'geral', label: 'Gerais', color: '#fbbf24', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

const fmt = (id: string, v: number) => (id === 'notaPerfeita' ? `crítico a cada ${v}` : `+${Math.round(v * 100)}%`);

/** Tela de Skills, em paisagem: colunas por skill, um card por passiva. */
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
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900/96 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/60 shrink-0">
          <h3 className="text-[13px] font-bold text-indigo-200 tracking-wide flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Skills de Akles
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 items-start">
            {GROUPS.map((g) => {
              const ids = PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === g.key);
              if (!ids.length) return null;
              return (
                <div key={g.key} className="flex flex-col gap-2">
                  <div
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shrink-0"
                    style={{ color: g.color, background: g.color + '18', border: `1px solid ${g.color}33` }}
                  >
                    {g.icon} {g.label}
                  </div>
                  {ids.map((id) => {
                    const def = PASSIVE_DEFS[id];
                    const lvl = engine.getPassiveLevel(id);
                    const val = engine.passiveValue(id);
                    return (
                      <div
                        key={id}
                        className="rounded-xl border bg-slate-950/60 p-2.5 flex flex-col gap-1.5"
                        style={{ borderColor: g.color + '35' }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-slate-100 leading-tight">{def.name}</span>
                          <button
                            type="button"
                            onClick={() => levelUp(id)}
                            disabled={lvl >= 5}
                            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              lvl >= 5
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-90'
                            }`}
                            title="Upar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className="flex-1 h-1 rounded-full"
                              style={{ background: n <= lvl ? g.color : '#334155' }}
                            />
                          ))}
                        </span>
                        <p className="text-[9px] text-slate-500 leading-snug">{def.desc}</p>
                        {lvl > 0 ? (
                          <p className="text-[10px] font-bold" style={{ color: g.color }}>
                            Nv.{lvl}: {fmt(id, val)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-600">Não aprendida</p>
                        )}
                        {lvl >= 5 && def.level5Bonus && (
                          <p className="text-[9px] text-amber-300/90 leading-snug border-t border-slate-800 pt-1">
                            ★ {def.level5Bonus}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-600 leading-snug px-1 mt-3">
            Upando de graça por enquanto — quando definir a moeda/recurso de evolução das skills, eu
            troco o botão pra gastar o que você quiser.
          </p>
        </div>
      </div>
    </div>
  );
};

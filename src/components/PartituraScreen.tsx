import React from 'react';
import { X, Music, ChevronsUp } from 'lucide-react';
import type { GameEngine, PartituraTier } from '../game/engine';
import { PARTITURA_DEFS, PARTITURA_TIERS } from '../game/engine';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  coins: number;
  fragments: number[];
  inventory: Record<string, number>;
}

const TIER_META: Record<PartituraTier, { label: string; color: string; img: string }> = {
  bronze: { label: 'Bronze', color: '#c2843e', img: '/assets/items/notes/note_c.png' },
  prata: { label: 'Prata', color: '#cbd5e1', img: '/assets/items/notes/note_g.png' },
  ouro: { label: 'Ouro', color: '#fbbf24', img: '/assets/items/notes/note_a.png' },
};

/** Síntese de Partituras: claves (+fragmentos) -> partituras -> XP p/ subir de nível. */
export const PartituraScreen: React.FC<Props> = ({
  open,
  onClose,
  engine,
  coins,
  fragments,
  inventory,
}) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  if (!open || !engine) return null;

  const totalFrags = fragments.reduce((a, b) => a + b, 0);
  const craft = (tier: PartituraTier) => {
    if (engine.synthPartitura(tier)) force();
  };
  const doLevel = () => {
    engine.levelUpWithPartituras();
    force();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[96vh] flex flex-col bg-slate-900/96 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/60 shrink-0">
          <h3 className="text-[13px] font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
            <Music className="w-4 h-4" /> Síntese de Partituras
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-300 flex items-center gap-2">
              <img src="/assets/items/clave.png" alt="" className="w-4 h-4 object-contain" />
              {coins}
              <span className="text-slate-600">·</span>
              <span title="fragmentos de nota soltos">◆ {totalFrags} frag</span>
            </span>
            <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 flex flex-col gap-3">
          <p className="text-[10px] text-slate-400 leading-snug">
            Monstros dissonantes soltam <b>claves</b>. Componha partituras e use-as na ficha para
            subir de nível — cada tier vale mais XP. Missões também concedem partituras e claves.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {PARTITURA_TIERS.map((tier) => {
              const d = PARTITURA_DEFS[tier];
              const m = TIER_META[tier];
              const can = engine.canSynthPartitura(tier);
              const have = inventory[d.key] ?? 0;
              return (
                <div
                  key={tier}
                  className="rounded-xl border bg-slate-950/60 p-2.5 flex flex-col items-center gap-1.5"
                  style={{ borderColor: m.color + '55' }}
                >
                  <div className="relative">
                    <img
                      src={m.img}
                      alt={m.label}
                      className="w-14 h-16 object-contain"
                      style={{ filter: `drop-shadow(0 0 6px ${m.color}88)` }}
                    />
                    {have > 0 && (
                      <span
                        className="absolute -top-1 -right-1 text-[10px] font-black px-1 rounded-full"
                        style={{ background: m.color, color: '#0b1220' }}
                      >
                        ×{have}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: m.color }}>
                    {m.label}
                  </span>
                  <span className="text-[10px] text-amber-300/90 font-semibold">+{d.xp} XP</span>
                  <div className="text-[9px] text-slate-400 text-center leading-tight">
                    <div className={coins >= d.claves ? 'text-slate-300' : 'text-rose-400'}>
                      {d.claves} claves
                    </div>
                    {d.frags > 0 && (
                      <div className={totalFrags >= d.frags ? 'text-slate-300' : 'text-rose-400'}>
                        + {d.frags} fragmentos
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => craft(tier)}
                    disabled={!can}
                    className={`w-full rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                      can
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    Compor
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={doLevel}
            disabled={engine.partituraXpAvailable <= 0 && engine.stats.xp < engine.stats.xpNext}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              engine.partituraXpAvailable > 0 || engine.stats.xp >= engine.stats.xpNext
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-600/25'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <ChevronsUp className="w-4 h-4" />
            Usar partituras e subir de nível
          </button>
        </div>
      </div>
    </div>
  );
};

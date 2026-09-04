import React from 'react';
import { X } from 'lucide-react';
import { NOTE_NAMES, NOTE_COLORS, NOTE_KEY, FRAGMENTS_PER_NOTE, ITEM_META } from '../game/engine';

interface SynthesisScreenProps {
  open: boolean;
  onClose: () => void;
  fragments: number[];
  built: number[];
}

/** Tela de Síntese em paisagem — as 12 notas cromáticas e seus fragmentos. */
export const SynthesisScreen: React.FC<SynthesisScreenProps> = ({
  open,
  onClose,
  fragments,
  built,
}) => {
  if (!open) return null;

  const totalBuilt = built.reduce((a, b) => a + b, 0);
  const totalFrags = fragments.reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[96vh] flex flex-col bg-slate-900/95 border border-fuchsia-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-fuchsia-200 tracking-wide">
            ♪ Síntese — Fragmentos de Notas
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              {totalBuilt} nota{totalBuilt !== 1 && 's'} completa{totalBuilt !== 1 && 's'} ·{' '}
              {totalFrags} fragmento{totalFrags !== 1 && 's'}
            </span>
            <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 grid grid-cols-4 gap-2">
          {NOTE_NAMES.map((name, i) => {
            const frag = fragments[i] ?? 0;
            const done = built[i] ?? 0;
            const pct = (frag / FRAGMENTS_PER_NOTE) * 100;
            const color = NOTE_COLORS[i];
            const img = ITEM_META['frag_' + NOTE_KEY[i]]?.img;
            return (
              <div
                key={i}
                className="rounded-xl border bg-slate-950/60 p-2 flex flex-col items-center"
                style={{ borderColor: color + (done > 0 ? 'cc' : '44') }}
              >
                <div className="relative w-12 h-12 flex items-center justify-center mb-1">
                  {img ? (
                    <img
                      src={img}
                      alt={name}
                      className="w-11 h-11 object-contain"
                      style={{ filter: `drop-shadow(0 0 6px ${color}${done > 0 ? '' : '66'})` }}
                    />
                  ) : (
                    <span
                      className="w-5 h-5 rotate-45 rounded-[3px]"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                  )}
                  {done > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-[10px] font-black px-1 rounded-full"
                      style={{ background: color, color: '#0b1220' }}
                    >
                      ×{done}
                    </span>
                  )}
                </div>
                <span className="text-[12px] font-bold text-slate-100">{name}</span>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-1">
                  <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
                </div>
                <p className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                  {frag} / {FRAGMENTS_PER_NOTE}
                </p>
              </div>
            );
          })}
        </div>

        <p className="px-4 py-1.5 text-[10px] text-slate-500 border-t border-slate-800/70 shrink-0">
          Joias comutativas: some os fragmentos em qualquer ordem. {FRAGMENTS_PER_NOTE} montam uma
          nota. Ecos musicais no nordeste soltam fragmentos da sua nota.
        </p>
      </div>
    </div>
  );
};

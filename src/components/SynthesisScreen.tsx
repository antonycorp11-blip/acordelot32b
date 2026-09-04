import React from 'react';
import { X } from 'lucide-react';
import { NOTE_NAMES, NOTE_COLORS, FRAGMENTS_PER_NOTE } from '../game/engine';

interface SynthesisScreenProps {
  open: boolean;
  onClose: () => void;
  fragments: number[];
  built: number[];
}

/** Tela de Síntese: as 12 notas cromáticas montadas a partir dos fragmentos. */
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[94vh] flex flex-col bg-slate-900/95 border border-fuchsia-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-fuchsia-200 tracking-wide">
            ♪ Síntese — Fragmentos de Notas
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 text-[11px] text-slate-400 border-b border-slate-800/70 shrink-0">
          {totalBuilt} nota{totalBuilt !== 1 && 's'} completa{totalBuilt !== 1 && 's'} · {totalFrags}{' '}
          fragmento{totalFrags !== 1 && 's'} soltos · {FRAGMENTS_PER_NOTE} fragmentos = 1 nota
        </div>

        <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
          {NOTE_NAMES.map((name, i) => {
            const frag = fragments[i] ?? 0;
            const done = built[i] ?? 0;
            const pct = (frag / FRAGMENTS_PER_NOTE) * 100;
            const color = NOTE_COLORS[i];
            return (
              <div
                key={i}
                className="rounded-xl border bg-slate-950/60 p-2.5"
                style={{ borderColor: color + (done > 0 ? 'aa' : '44') }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rotate-45 rounded-[3px] shrink-0"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    <span className="text-[13px] font-bold text-slate-100">{name}</span>
                  </div>
                  {done > 0 && (
                    <span
                      className="text-[10px] font-black px-1.5 rounded-full"
                      style={{ background: color, color: '#0b1220' }}
                    >
                      ×{done}
                    </span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 tabular-nums text-right">
                  {frag} / {FRAGMENTS_PER_NOTE}
                </p>
              </div>
            );
          })}
        </div>

        <p className="px-4 py-2 text-[10px] text-slate-500 border-t border-slate-800/70 shrink-0">
          Joias comutativas: some os fragmentos em qualquer ordem — a nota final é a mesma.
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { X } from 'lucide-react';
import { NOTE_NAMES, NOTE_COLORS, NOTE_KEY, FRAGMENTS_PER_NOTE, ITEM_META } from '../game/engine';

interface SynthesisScreenProps {
  open: boolean;
  onClose: () => void;
  fragments: number[];
  built: number[];
}

const noteArt = (i: number) => `/assets/items/notes/note_${NOTE_KEY[i]}.png`;

/** Síntese de fragmentos: grade dos 12 montes à esquerda, NOTA FORMADA à direita. */
export const SynthesisScreen: React.FC<SynthesisScreenProps> = ({
  open,
  onClose,
  fragments,
  built,
}) => {
  const [sel, setSel] = React.useState(0);
  if (!open) return null;

  const totalBuilt = built.reduce((a, b) => a + b, 0);
  const totalFrags = fragments.reduce((a, b) => a + b, 0);
  const color = NOTE_COLORS[sel];
  const frag = fragments[sel] ?? 0;
  const done = built[sel] ?? 0;
  const pct = Math.min(100, (frag / FRAGMENTS_PER_NOTE) * 100);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[96vh] flex flex-col bg-slate-900/95 border border-fuchsia-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-fuchsia-200 tracking-wide">
            ♪ Síntese — Fragmentos de Notas
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              {totalBuilt} nota{totalBuilt !== 1 && 's'} · {totalFrags} fragmento
              {totalFrags !== 1 && 's'}
            </span>
            <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Grade dos 12 montes de fragmentos */}
          <div className="overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1 min-w-0">
            {NOTE_NAMES.map((name, i) => {
              const f = fragments[i] ?? 0;
              const d = built[i] ?? 0;
              const p = (f / FRAGMENTS_PER_NOTE) * 100;
              const c = NOTE_COLORS[i];
              const img = ITEM_META['frag_' + NOTE_KEY[i]]?.img;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSel(i)}
                  className={`rounded-xl border p-2 flex flex-col items-center transition-all ${
                    sel === i ? 'bg-slate-800 ring-2 ring-fuchsia-400/60' : 'bg-slate-950/60 hover:bg-slate-900'
                  }`}
                  style={{ borderColor: c + (d > 0 ? 'cc' : '44') }}
                >
                  <div className="relative w-11 h-11 flex items-center justify-center mb-1">
                    {img ? (
                      <img
                        src={img}
                        alt={name}
                        className="w-10 h-10 object-contain"
                        style={{ filter: `drop-shadow(0 0 6px ${c}${d > 0 ? '' : '66'})` }}
                      />
                    ) : (
                      <span
                        className="w-5 h-5 rotate-45 rounded-[3px]"
                        style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                      />
                    )}
                    {d > 0 && (
                      <span
                        className="absolute -top-1 -right-1 text-[10px] font-black px-1 rounded-full"
                        style={{ background: c, color: '#0b1220' }}
                      >
                        ×{d}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] font-bold text-slate-100">{name}</span>
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-1">
                    <div className="h-full transition-all duration-300" style={{ width: `${p}%`, background: c }} />
                  </div>
                  <p className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                    {f} / {FRAGMENTS_PER_NOTE}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Painel da NOTA FORMADA */}
          <div
            className="w-56 shrink-0 border-l border-slate-800 bg-slate-950/50 p-4 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Nota formada
            </span>
            <div className="relative flex items-center justify-center py-2">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: color + '33' }}
              />
              <img
                src={noteArt(sel)}
                alt={NOTE_NAMES[sel]}
                className="relative w-28 h-36 object-contain transition-all"
                style={{
                  filter: `drop-shadow(0 0 12px ${color}${done > 0 ? 'cc' : '55'})`,
                  opacity: done > 0 ? 1 : 0.72,
                }}
              />
            </div>
            <span className="text-lg font-black" style={{ color }}>
              {NOTE_NAMES[sel]}
            </span>
            {done > 0 ? (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: color, color: '#0b1220' }}
              >
                {done} completa{done !== 1 && 's'}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">ainda não formada</span>
            )}
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mt-1 border border-slate-800">
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
            </div>
            <p className="text-[11px] text-slate-400 tabular-nums">
              {frag} / {FRAGMENTS_PER_NOTE} fragmentos
            </p>
            <p className="text-[9px] text-slate-600 leading-snug text-center mt-1">
              Joias comutativas: some em qualquer ordem. {FRAGMENTS_PER_NOTE} montam a nota.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

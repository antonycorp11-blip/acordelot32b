import React from 'react';
import { X } from 'lucide-react';
import { NOTE_NAMES, NOTE_COLORS, NOTE_KEY, FRAGMENTS_PER_NOTE, ITEM_META } from '../game/engine';
import type { GameEngine } from '../game/engine';

interface SynthesisScreenProps {
  open: boolean;
  onClose: () => void;
  fragments: number[];
  built: number[];
  engine: GameEngine | null;
}

const noteArt = (i: number) => `/assets/items/notes/note_${NOTE_KEY[i]}.png`;

export const SynthesisScreen: React.FC<SynthesisScreenProps> = ({ open, onClose, fragments, built, engine }) => {
  const [sel, setSel] = React.useState(0);
  const [tab, setTab] = React.useState<'notes' | 'scales'>('notes');
  const [, refresh] = React.useReducer((n) => n + 1, 0);

  React.useEffect(() => {
    if (!open || !engine) return;
    if (engine.echoTutorialStage === 'synthesize_note') { setTab('notes'); setSel(0); }
    if (engine.echoTutorialStage === 'synthesize_scale') { setTab('scales'); setSel(0); }
  }, [open, engine?.echoTutorialStage]);

  if (!open) return null;
  const totalBuilt = built.reduce((a, b) => a + b, 0);
  const totalFrags = fragments.reduce((a, b) => a + b, 0);
  const color = NOTE_COLORS[sel];
  const frag = fragments[sel] ?? 0;
  const done = built[sel] ?? 0;
  const scaleNotes = engine?.majorScaleNotes(sel) ?? [];
  const canScale = !!engine?.canSynthesizeMajorScale(sel);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-fuchsia-500/40 bg-slate-900/95 shadow-2xl">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-700/70 bg-slate-950/60 px-3">
          <h3 className="mr-auto text-[13px] font-black tracking-wide text-fuchsia-200">♪ Síntese Harmônica</h3>
          <button type="button" onClick={() => setTab('notes')} className={`rounded-lg px-3 py-1 text-[10px] font-black ${tab === 'notes' ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400'}`}>Fragmentos → Notas</button>
          <button type="button" onClick={() => setTab('scales')} className={`rounded-lg px-3 py-1 text-[10px] font-black ${tab === 'scales' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>Notas → Escalas</button>
          <button type="button" onClick={onClose} className="p-1 text-slate-400"><X className="h-4 w-4" /></button>
        </div>

        {tab === 'notes' ? (
          <div className="flex min-h-0 flex-1">
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5 overflow-y-auto p-2">
              {NOTE_NAMES.map((name, i) => {
                const f = fragments[i] ?? 0, d = built[i] ?? 0, c = NOTE_COLORS[i];
                return (
                  <button key={i} type="button" onClick={() => setSel(i)} className={`flex flex-col items-center rounded-lg border p-1.5 ${sel === i ? 'bg-slate-800 ring-2 ring-fuchsia-400/60' : 'bg-slate-950/60'}`} style={{ borderColor: c + (d > 0 ? 'cc' : '44') }}>
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      <img src={ITEM_META['frag_' + NOTE_KEY[i]]?.img} alt="" className="h-7 w-7 object-contain" />
                      {d > 0 && <span className="absolute -right-1 -top-1 rounded-full px-1 text-[8px] font-black" style={{ background: c, color: '#08111f' }}>×{d}</span>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-100">{name}</span>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded bg-slate-900"><div className="h-full" style={{ width: `${Math.min(100, f / FRAGMENTS_PER_NOTE * 100)}%`, background: c }} /></div>
                    <span className="mt-0.5 text-[8px] text-slate-500">{f}/{FRAGMENTS_PER_NOTE}</span>
                  </button>
                );
              })}
            </div>
            <aside className="flex w-40 shrink-0 flex-col items-center border-l border-slate-800 bg-slate-950/55 p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nota selecionada</span>
              <img src={noteArt(sel)} alt={NOTE_NAMES[sel]} className="my-1 h-20 w-16 object-contain" style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
              <span className="text-sm font-black" style={{ color }}>{NOTE_NAMES[sel]}</span>
              <span className="text-[9px] text-slate-400">{done} pronta(s) · {frag} fragmentos</span>
              <button type="button" disabled={!engine || frag < FRAGMENTS_PER_NOTE} onClick={() => { if (engine?.synthesizeNote(sel)) refresh(); }} className="mt-3 w-full rounded-xl bg-fuchsia-500 py-2 text-[10px] font-black text-white disabled:bg-slate-800 disabled:text-slate-500">Sintetizar nota</button>
              <p className="mt-2 text-center text-[8px] leading-relaxed text-slate-500">Trinta fragmentos da mesma frequência formam uma nota completa.</p>
              <span className="mt-auto text-[8px] text-slate-600">{totalBuilt} notas · {totalFrags} fragmentos</span>
            </aside>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-3 p-3">
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-2 overflow-y-auto">
              {NOTE_NAMES.map((name, i) => {
                const can = !!engine?.canSynthesizeMajorScale(i);
                return <button key={i} type="button" onClick={() => setSel(i)} className={`rounded-xl border p-2 text-left ${sel === i ? 'border-amber-300 bg-amber-950/40' : 'border-slate-700 bg-slate-950/50'}`}><p className="text-[10px] font-black text-white">{name} Maior</p><p className={`text-[8px] ${can ? 'text-emerald-300' : 'text-slate-500'}`}>{can ? 'Pronta para montar' : 'Faltam notas'}</p></button>;
              })}
            </div>
            <aside className="flex w-56 shrink-0 flex-col rounded-xl border border-amber-400/30 bg-slate-950/60 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">Escala de {NOTE_NAMES[sel]} Maior</p>
              <p className="mt-1 text-[10px] text-slate-400">Tom · Tom · Semitom · Tom · Tom · Tom · Semitom</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {scaleNotes.map((note, index) => <span key={index} className={`rounded-lg border px-2 py-1 text-[9px] font-black ${(built[note] || 0) > 0 ? 'border-emerald-500/50 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}>{NOTE_NAMES[note]} ×{built[note] || 0}</span>)}
              </div>
              <button type="button" disabled={!canScale} onClick={() => { if (engine?.synthesizeMajorScale(sel)) refresh(); }} className="mt-auto rounded-xl bg-amber-400 py-2.5 text-[10px] font-black text-slate-950 disabled:bg-slate-800 disabled:text-slate-500">Montar escala</button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

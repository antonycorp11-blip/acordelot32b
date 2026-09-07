import React from 'react';
import { Check, Music2, RotateCcw, X } from 'lucide-react';
import {
  NOTE_NAMES, NOTE_COLORS, NOTE_KEY, FRAGMENTS_PER_NOTE, ITEM_META,
  MAJOR_SCALE_PATTERN, INTERVAL_LABEL, chordsForMajorScale, scaleBaseBonus,
} from '../game/engine';
import type { GameEngine, ScaleInterval } from '../game/engine';

interface Props { open: boolean; onClose: () => void; fragments: number[]; built: number[]; engine: GameEngine | null }
const noteArt = (i: number) => `/assets/items/notes/note_${NOTE_KEY[i]}.png`;
const stepValue = (step: ScaleInterval) => step === 'tone' ? 2 : 1;
const qualityLabel = { major: 'Maior', minor: 'Menor', diminished: 'Diminuto' } as const;

export const SynthesisScreen: React.FC<Props> = ({ open, onClose, fragments, built, engine }) => {
  const [sel, setSel] = React.useState(0);
  const [tab, setTab] = React.useState<'notes' | 'forge' | 'compose'>('notes');
  const [steps, setSteps] = React.useState<ScaleInterval[]>([]);
  const [newScale, setNewScale] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState('');
  const [, refresh] = React.useReducer((n) => n + 1, 0);

  React.useEffect(() => {
    if (!open || !engine) return;
    if (engine.echoTutorialStage === 'synthesize_note') { setTab('notes'); setSel(0); }
    if (engine.echoTutorialStage === 'synthesize_scale') { setTab('forge'); setSel(0); setSteps([]); }
  }, [open, engine?.echoTutorialStage]);
  React.useEffect(() => { setSteps([]); setNewScale(null); setChosen([]); setMessage(''); }, [sel]);
  if (!open) return null;

  const color = NOTE_COLORS[sel], frag = fragments[sel] ?? 0, done = built[sel] ?? 0;
  const travelled = steps.reduce((sum, step) => sum + stepValue(step), 0);
  const path = [sel]; let cursor = sel;
  for (const step of steps) { cursor = (cursor + stepValue(step)) % 12; path.push(cursor); }
  const expected = MAJOR_SCALE_PATTERN[steps.length];
  const patternCorrect = steps.every((step, i) => step === MAJOR_SCALE_PATTERN[i]);
  const scaleChords = chordsForMajorScale(sel, NOTE_KEY);
  const count = (key: ScaleInterval) => steps.filter((step) => step === key).length;

  const addStep = (step: ScaleInterval) => {
    if (travelled + stepValue(step) > 12 || steps.length >= 7) return;
    setSteps((old) => [...old, step]);
    setMessage(step === expected ? `${INTERVAL_LABEL[step]}: você chegou em ${NOTE_NAMES[(cursor + stepValue(step)) % 12]}.` : 'Esse passo foge do desenho da escala maior. Você pode desfazer e ouvir de novo.');
  };
  const forge = () => {
    if (!engine) return;
    const result = engine.forgeMajorScale(sel, steps); setMessage(result.message);
    if (result.ok && result.scaleKey) { setNewScale(result.scaleKey); setChosen([]); refresh(); }
  };
  const chooseChord = (id: string) => setChosen((old) => old.includes(id) ? old.filter((v) => v !== id) : old.length < 3 ? [...old, id] : old);
  const confirmChords = () => {
    if (!engine || !newScale || !engine.claimScaleChords(newScale, chosen)) return;
    setNewScale(null); setChosen([]); setSteps([]); setTab('compose'); setMessage('A composição está ativa no personagem atual.'); refresh();
  };
  const tabs = [['notes', 'Fragmentos → Notas'], ['forge', 'Forjar Escala'], ['compose', 'Composição']] as const;

  return <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} />
    <div className="relative flex h-[min(88vh,560px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-400/35 bg-[#071326]/[.98] shadow-[0_0_50px_rgba(217,70,239,.15)]">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-700/70 bg-slate-950/55 px-3">
        <Music2 className="h-4 w-4 text-amber-300" /><h3 className="mr-auto text-[13px] font-black tracking-wide text-amber-100">Síntese Harmônica</h3>
        {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg px-3 py-1 text-[9px] font-black ${tab === id ? 'bg-amber-400 text-slate-950 shadow-[0_0_14px_#fbbf2455]' : 'bg-slate-800/80 text-slate-400'}`}>{label}</button>)}
        <button type="button" onClick={onClose} className="p-1 text-slate-400"><X className="h-4 w-4" /></button>
      </header>

      {tab === 'notes' && <div className="flex min-h-0 flex-1">
        <div className="grid min-w-0 flex-1 grid-cols-6 gap-1.5 overflow-y-auto p-2">{NOTE_NAMES.map((name, i) => {
          const f = fragments[i] ?? 0, d = built[i] ?? 0, c = NOTE_COLORS[i];
          return <button key={i} type="button" onClick={() => setSel(i)} className={`flex min-h-20 flex-col items-center justify-center rounded-xl border p-1.5 ${sel === i ? 'bg-slate-800 ring-2 ring-fuchsia-400/60' : 'bg-slate-950/60'}`} style={{ borderColor: c + (d > 0 ? 'cc' : '44') }}>
            <div className="relative flex h-9 w-9 items-center justify-center"><img src={ITEM_META['frag_' + NOTE_KEY[i]]?.img} alt="" className="h-8 w-8 object-contain" />{d > 0 && <span className="absolute -right-1 -top-1 rounded-full px-1 text-[8px] font-black" style={{ background: c, color: '#08111f' }}>×{d}</span>}</div>
            <span className="text-[10px] font-bold text-slate-100">{name}</span><div className="mt-1 h-1 w-full overflow-hidden rounded bg-slate-900"><div className="h-full" style={{ width: `${Math.min(100, f / FRAGMENTS_PER_NOTE * 100)}%`, background: c }} /></div><span className="mt-0.5 text-[8px] text-slate-500">{f}/{FRAGMENTS_PER_NOTE}</span>
          </button>;
        })}</div>
        <aside className="flex w-44 shrink-0 flex-col items-center border-l border-slate-800 bg-slate-950/55 p-3"><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nota selecionada</span><img src={noteArt(sel)} alt={NOTE_NAMES[sel]} className="my-1 h-20 w-16 object-contain" style={{ filter: `drop-shadow(0 0 10px ${color})` }} /><span className="text-sm font-black" style={{ color }}>{NOTE_NAMES[sel]}</span><span className="text-[9px] text-slate-400">{done} pronta(s) · {frag} fragmentos</span><button type="button" disabled={!engine || frag < FRAGMENTS_PER_NOTE} onClick={() => { if (engine?.synthesizeNote(sel)) refresh(); }} className="mt-3 w-full rounded-xl bg-fuchsia-500 py-2 text-[10px] font-black text-white disabled:bg-slate-800 disabled:text-slate-500">Sintetizar nota</button><p className="mt-2 text-center text-[8px] leading-relaxed text-slate-500">30 fragmentos da mesma frequência formam uma nota.</p></aside>
      </div>}

      {tab === 'forge' && <div className="flex min-h-0 flex-1">
        <aside className="w-36 shrink-0 overflow-y-auto border-r border-slate-800 p-2"><p className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-500">Escolha a tônica</p><div className="grid grid-cols-2 gap-1">{NOTE_NAMES.map((name, i) => <button key={i} type="button" onClick={() => setSel(i)} className={`rounded-lg border px-1 py-2 text-[9px] font-black ${sel === i ? 'border-amber-300 bg-amber-400/15 text-amber-200' : 'border-slate-800 text-slate-400'}`}>{name}</button>)}</div></aside>
        <main className="flex min-w-0 flex-1 flex-col p-3"><div className="flex items-start gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-amber-300">Escala de {NOTE_NAMES[sel]} Maior</p><p className="text-[10px] text-slate-400">Construa o caminho. O jogo não completa os passos por você.</p></div><div className="ml-auto flex gap-2 text-[9px]"><span className="rounded-lg bg-slate-900 px-2 py-1 text-amber-200">Tom: {engine?.inventory.tone || 0}</span><span className="rounded-lg bg-slate-900 px-2 py-1 text-cyan-200">Semitom: {engine?.inventory.semitone || 0}</span></div></div>
          <div className="mt-3 flex min-h-20 items-center gap-1 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/55 p-2">{path.map((note, index) => <React.Fragment key={`${note}_${index}`}>{index > 0 && <span className={`min-w-11 text-center text-[8px] font-black ${steps[index - 1] === MAJOR_SCALE_PATTERN[index - 1] ? 'text-emerald-300' : 'text-rose-300'}`}>{INTERVAL_LABEL[steps[index - 1]]}<br />+{stepValue(steps[index - 1])}</span>}<div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border bg-slate-900" style={{ borderColor: NOTE_COLORS[note], boxShadow: `0 0 12px ${NOTE_COLORS[note]}33` }}><b className="text-[11px] text-white">{NOTE_NAMES[note]}</b><span className="text-[7px] text-slate-500">{index === 0 ? 'tônica' : travelled >= 12 && index === path.length - 1 ? 'oitava' : 'nota'}</span></div></React.Fragment>)}</div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-gradient-to-r from-fuchsia-500 via-amber-300 to-cyan-300 transition-all" style={{ width: `${Math.min(100, travelled / 12 * 100)}%` }} /></div><div className="mt-1 flex text-[8px] text-slate-500"><span>{travelled}/12 semitons</span><span className="ml-auto">Modelo maior: T · T · S · T · T · T · S</span></div>
          <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2"><button type="button" onClick={() => addStep('tone')} disabled={travelled + 2 > 12 || steps.length >= 7} className={`rounded-xl border py-2 text-[10px] font-black ${expected === 'tone' ? 'border-amber-300 bg-amber-400/15 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'} disabled:opacity-30`}>Tom <span className="text-[8px] opacity-60">(+2)</span></button><button type="button" onClick={() => addStep('semitone')} disabled={travelled + 1 > 12 || steps.length >= 7} className={`rounded-xl border py-2 text-[10px] font-black ${expected === 'semitone' ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300'} disabled:opacity-30`}>Semitom <span className="text-[8px] opacity-60">(+1)</span></button><button type="button" onClick={() => setSteps((old) => old.slice(0, -1))} disabled={!steps.length} className="rounded-xl border border-slate-700 px-3 text-slate-400 disabled:opacity-30"><RotateCcw className="h-4 w-4" /></button></div>
          <button type="button" onClick={forge} disabled={travelled !== 12 || steps.length !== 7 || !patternCorrect} className="mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 py-2.5 text-[10px] font-black text-slate-950 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500">Forjar com {count('tone')} Tons + {count('semitone')} Semitons</button>{message && <p className={`mt-1 text-center text-[8px] ${patternCorrect ? 'text-slate-400' : 'text-rose-300'}`}>{message}</p>}
        </main>
      </div>}

      {tab === 'compose' && <div className="grid min-h-0 flex-1 grid-cols-[190px_1fr]">
        <aside className="overflow-y-auto border-r border-slate-800 p-2"><p className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-500">Escalas forjadas · máximo 3</p>{NOTE_NAMES.map((name, tonic) => { const key = `scale_${NOTE_KEY[tonic]}_major`, owned = engine?.scalesBuilt[key] || 0, equipped = engine?.equippedScales.includes(key); return <button key={key} type="button" disabled={!owned} onClick={() => { const result = engine?.toggleScaleEquip(key); setMessage(result?.message || ''); refresh(); }} className={`mb-1 flex w-full items-center gap-2 rounded-lg border p-2 text-left ${equipped ? 'border-amber-300 bg-amber-400/10' : 'border-slate-800 bg-slate-950/40'} disabled:opacity-30`}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-amber-300">♪</span><span className="min-w-0"><b className="block truncate text-[9px] text-white">{name} Maior ×{owned}</b><small className="block truncate text-[7px] text-slate-400">{scaleBaseBonus(tonic).label}</small></span>{equipped && <Check className="ml-auto h-3 w-3 text-emerald-300" />}</button>; })}</aside>
        <main className="min-w-0 overflow-y-auto p-3"><div className="mb-2 flex items-center"><div><p className="text-[10px] font-black text-amber-200">Composição de {engine?.stats.name || 'personagem'}</p><p className="text-[8px] text-slate-400">A escala dá um bônus. Cada acorde acrescenta sua função harmônica.</p></div><span className="ml-auto rounded-lg border border-amber-400/30 px-2 py-1 text-[8px] text-amber-200">{engine?.equippedScales.length || 0}/3 escalas</span></div>
          {!engine?.equippedScales.length && <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500">Forje e equipe uma escala para começar sua composição.</div>}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{engine?.equippedScales.map((key) => { const tonic = NOTE_KEY.indexOf(key.replace('scale_', '').replace('_major', '')), chords = chordsForMajorScale(tonic, NOTE_KEY), equipped = engine.equippedChordsByScale[key] || []; return <section key={key} className="rounded-xl border border-amber-400/25 bg-slate-950/45 p-2"><div className="flex items-center"><div><b className="text-[10px] text-white">{NOTE_NAMES[tonic]} Maior</b><p className="text-[8px] text-emerald-300">Ativo: {scaleBaseBonus(tonic).label}</p></div><span className="ml-auto text-[8px] text-slate-500">{equipped.length}/3 acordes</span></div><div className="mt-2 grid grid-cols-2 gap-1">{chords.map((chord) => { const owned = engine.ownedChords[chord.id] || 0, active = equipped.includes(chord.id); return <button key={chord.id} type="button" disabled={!owned} onClick={() => { const result = engine.toggleChordEquip(key, chord.id); setMessage(result.message); refresh(); }} className={`rounded-lg border p-1.5 text-left ${active ? 'border-fuchsia-300 bg-fuchsia-400/15' : 'border-slate-800 bg-slate-900/60'} disabled:opacity-25`}><b className="text-[8px] text-white">{chord.roman} · {NOTE_NAMES[chord.root]} {qualityLabel[chord.quality]}</b><p className="text-[7px] text-amber-200">{chord.functionName}</p><p className="text-[7px] text-slate-400">{chord.effect}</p></button>; })}</div></section>; })}</div>{message && <p className="mt-2 text-center text-[8px] text-cyan-200">{message}</p>}
        </main>
      </div>}

      {newScale && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 p-4"><div className="w-full max-w-xl rounded-2xl border border-amber-300/40 bg-[#0a1830] p-4 shadow-2xl"><div><p className="text-sm font-black text-amber-200">A escala revelou seu campo harmônico</p><p className="text-[9px] text-slate-400">Escolha 3 dos 7 acordes agora. Depois você poderá equipar ou remover cada um livremente; para obter os demais, forje a escala novamente.</p></div><div className="mt-3 grid grid-cols-4 gap-2">{scaleChords.map((chord) => <button key={chord.id} type="button" onClick={() => chooseChord(chord.id)} className={`rounded-xl border p-2 text-left ${chosen.includes(chord.id) ? 'border-fuchsia-300 bg-fuchsia-400/15 ring-1 ring-fuchsia-300' : 'border-slate-700 bg-slate-950/50'}`}><b className="text-[10px] text-white">{chord.roman} · {NOTE_NAMES[chord.root]}</b><p className="text-[8px] text-amber-200">{qualityLabel[chord.quality]} · {chord.functionName}</p><p className="mt-1 text-[7px] text-slate-400">{chord.effect}</p></button>)}</div><button type="button" disabled={chosen.length !== 3} onClick={confirmChords} className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-[10px] font-black text-white disabled:bg-slate-800">Confirmar {chosen.length}/3 acordes</button></div></div>}
    </div>
  </div>;
};

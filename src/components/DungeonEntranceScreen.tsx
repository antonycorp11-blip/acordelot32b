import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Gem, LockKeyhole, Shield, Skull, Sparkles, Swords, Trophy, X } from 'lucide-react';
import { CRYSTAL_DUNGEON_DIFFICULTIES } from '../game/engine';

interface Props {
  open: boolean;
  power: number;
  onClose: () => void;
  onEnter: (difficultyId: number) => { ok: boolean; message: string } | undefined;
}

const MONSTERS = [
  { name: 'Aranha de Ônix', role: 'Veneno', img: '/assets/monsters/aranha.png' },
  { name: 'Nocturno', role: 'Emboscada', img: '/assets/monsters/nocturno.png' },
  { name: 'Maestro Partido', role: 'Resistência', img: '/assets/monsters/maestro.png' },
  { name: 'Guardião Cristalino', role: 'Chefe', img: '/assets/monsters/colosso.png', boss: true },
];

export const DungeonEntranceScreen: React.FC<Props> = ({ open, power, onClose, onEnter }) => {
  const [selected, setSelected] = useState(1);
  const [message, setMessage] = useState('');
  const difficulty = useMemo(() => CRYSTAL_DUNGEON_DIFFICULTIES.find((entry) => entry.id === selected)!, [selected]);
  if (!open) return null;
  const locked = power < difficulty.requiredPower;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/82 px-[max(12px,env(safe-area-inset-left))] py-[max(8px,env(safe-area-inset-top))] backdrop-blur-md pointer-events-auto">
      <div className="relative flex h-[min(94vh,670px)] w-[min(96vw,1180px)] flex-col overflow-hidden rounded-[24px] border border-violet-400/55 bg-[#070b18] shadow-[0_0_90px_rgba(124,58,237,.32)]">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_70%_10%,rgba(124,58,237,.34),transparent_36%),linear-gradient(125deg,rgba(15,23,42,.4),transparent_55%)]" />
        <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-violet-300/20 px-6">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.3em] text-violet-300">Fronteira Oriental · Dungeon</p>
            <h2 className="truncate font-serif text-[clamp(21px,3vw,34px)] font-black text-white">Caverna de Cristal</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-300/25 bg-amber-950/25 px-3 py-1 text-right">
              <span className="block text-[8px] font-black uppercase tracking-widest text-amber-200/65">Poder de combate</span>
              <span className="text-lg font-black text-amber-300">{power}</span>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-300 active:scale-90"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <main className="relative grid min-h-0 flex-1 grid-cols-[.92fr_1.08fr] gap-4 p-4">
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-700/70 bg-slate-950/65 p-4">
            <div className="mb-2 flex items-center gap-2 text-violet-200"><Skull className="h-4 w-4" /><h3 className="text-xs font-black uppercase tracking-[.15em]">Inimigos encontrados</h3></div>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
              {MONSTERS.map((monster) => (
                <div key={monster.name} className={`relative flex min-h-0 items-center gap-2 overflow-hidden rounded-xl border p-2 ${monster.boss ? 'border-fuchsia-400/50 bg-fuchsia-950/20' : 'border-slate-700 bg-slate-900/55'}`}>
                  <img src={monster.img} alt="" className="h-[min(11vh,76px)] w-[min(11vh,76px)] shrink-0 object-contain drop-shadow-[0_0_14px_rgba(167,139,250,.35)]" />
                  <div className="min-w-0"><p className="text-[10px] font-black text-white">{monster.name}</p><p className="text-[8px] font-bold uppercase tracking-wider text-violet-300">{monster.role}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-2 text-center"><Shield className="mx-auto h-4 w-4 text-cyan-300"/><p className="mt-1 text-[8px] text-slate-300">Defesa física</p></div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-2 text-center"><Sparkles className="mx-auto h-4 w-4 text-violet-300"/><p className="mt-1 text-[8px] text-slate-300">Resist. musical</p></div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-2 text-center"><Swords className="mx-auto h-4 w-4 text-rose-300"/><p className="mt-1 text-[8px] text-slate-300">Efeitos hostis</p></div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col gap-3">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-3">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[.15em] text-white">Selecione o nível</h3><span className="text-[9px] font-bold text-slate-400">Inimigos Nv. {difficulty.enemyLevel}–{difficulty.enemyLevel + 6}</span></div>
              <div className="grid grid-cols-2 gap-2">
                {CRYSTAL_DUNGEON_DIFFICULTIES.map((entry) => {
                  const unavailable = power < entry.requiredPower;
                  return <button key={entry.id} type="button" onClick={() => { setSelected(entry.id); setMessage(''); }} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${selected === entry.id ? 'border-amber-300 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,.15)]' : 'border-slate-700 bg-slate-900/55'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${unavailable ? 'bg-slate-800 text-slate-500' : 'bg-violet-500/15 text-violet-200'}`}>{unavailable ? <LockKeyhole className="h-4 w-4"/> : selected === entry.id ? <Check className="h-4 w-4"/> : entry.id}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-white">{entry.name}</span><span className="block text-[8px] text-slate-400">{entry.subtitle} · Poder {entry.requiredPower}</span></span>
                  </button>;
                })}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[1fr_.8fr] gap-3">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-3">
                <div className="mb-2 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-300"/><h3 className="text-xs font-black text-white">Recompensas possíveis</h3></div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-200">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2">🪙 Ouro bruto</div>
                  <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2">💎 Cristais azuis</div>
                  <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-2">📜 Partituras</div>
                  <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/20 p-2">✦ Núcleo de chefe</div>
                </div>
                <p className="mt-2 text-[8px] leading-relaxed text-slate-400">Multiplicador de recompensa: <b className="text-amber-300">×{difficulty.rewardMultiplier}</b>. Os baús de cada câmara só abrem após derrotar seus guardiões.</p>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-950/45 to-slate-950 p-3">
                <div><Gem className="h-6 w-6 text-violet-300"/><p className="mt-2 text-[10px] font-black text-white">Seis câmaras · Chefe final</p><p className="mt-1 text-[8px] leading-relaxed text-slate-400">Sem teleporte: atravesse a fronteira, explore cada sala e alcance o coração da caverna.</p></div>
                <button type="button" onClick={() => { const result = onEnter(selected); if (result && !result.ok) setMessage(result.message); }} className={`mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black transition active:scale-95 ${locked ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_rgba(168,85,247,.35)]'}`}>
                  {locked ? <LockKeyhole className="h-4 w-4"/> : <Swords className="h-4 w-4"/>}{locked ? `Requer ${difficulty.requiredPower}` : 'Entrar na DG'}<ChevronRight className="h-4 w-4"/>
                </button>
                {message && <p className="mt-1 text-center text-[8px] font-bold text-rose-300">{message}</p>}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowUp, Gem, Hammer, Pickaxe, Sparkles, Sword, X } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { ITEM_META } from '../game/engine';
import type { ToolTier } from '../game/types';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  inventory: Record<string, number>;
}

type ForgeTab = 'refine' | 'tools' | 'weapon';

const RECIPES = [
  { key: 'gold' as const, label: 'Ouro sintetizado', raw: 'gold_raw', refined: 'gold_refined', need: 5 },
  { key: 'crystal_blue' as const, label: 'Cristal azul lapidado', raw: 'crystal_blue_raw', refined: 'crystal_blue_refined', need: 3 },
  { key: 'crystal_red' as const, label: 'Cristal rubro lapidado', raw: 'crystal_red_raw', refined: 'crystal_red_refined', need: 3 },
];

const MaterialCost: React.FC<{ cost: Record<string, number>; inventory: Record<string, number> }> = ({ cost, inventory }) => (
  <div className="flex flex-wrap gap-1.5">
    {Object.entries(cost).map(([key, need]) => {
      const meta = ITEM_META[key];
      const have = inventory[key] ?? 0;
      return <span key={key} className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[9px] font-bold ${have >= need ? 'border-emerald-500/45 bg-emerald-950/35 text-emerald-200' : 'border-rose-500/45 bg-rose-950/35 text-rose-200'}`}>
        {meta?.img ? <img src={meta.img} alt="" className="h-4 w-4 object-contain" /> : <span>{meta?.icon ?? '◆'}</span>}
        {have}/{need}
      </span>;
    })}
  </div>
);

export const ForgeScreen: React.FC<Props> = ({ open, onClose, engine, inventory }) => {
  const [tab, setTab] = React.useState<ForgeTab>('refine');
  const [message, setMessage] = React.useState('Dório: “Escolha o trabalho. A bigorna não gosta de indecisão.”');
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => { if (open) setMessage('Dório: “Escolha o trabalho. A bigorna não gosta de indecisão.”'); }, [open]);
  if (!open || !engine) return null;

  const tabs: Array<[ForgeTab, string, React.ComponentType<{ className?: string }>, string]> = [
    ['refine', 'Sintetizar', Gem, 'Purificar ouro e cristais'],
    ['tools', 'Ferramentas', Pickaxe, 'Forjar machados e picaretas'],
    ['weapon', 'Arma equipada', Sword, 'Aprimorar +1, +2 e além'],
  ];
  const weaponCost = engine.weaponLevel < engine.weaponDef.maxLevel ? engine.weaponDef.upgradeCost(engine.weaponLevel) : null;

  return <div className="fixed inset-0 z-50 grid place-items-center p-[max(8px,env(safe-area-inset-top))] pointer-events-auto">
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
    <section className="relative flex h-[min(620px,94vh)] w-[min(1080px,96vw)] flex-col overflow-hidden rounded-2xl border border-amber-500/65 bg-[#120d0a] shadow-[0_24px_80px_#000,0_0_45px_rgba(245,158,11,.18)]">
      <img src="/assets/interiors/blacksmith_interior.jpg" alt="Interior da Ferraria Harmônica" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#110b08]/95 via-[#160e09]/80 to-[#080b12]/94" />
      <header className="relative flex h-14 shrink-0 items-center border-b border-amber-700/45 px-5">
        <Hammer className="mr-3 h-6 w-6 text-amber-400" />
        <div><h2 className="text-lg font-black text-amber-100">Ferraria Harmônica</h2><p className="text-[10px] text-amber-300/70">Dório · Mestre Ferreiro</p></div>
        <button type="button" onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-[230px_minmax(0,1fr)] max-[760px]:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="border-r border-amber-800/35 bg-black/25 p-3">
          <div className="space-y-2">{tabs.map(([key, label, Icon, desc]) => <button key={key} type="button" onClick={() => setTab(key)} className={`w-full rounded-xl border p-3 text-left transition active:scale-[.98] ${tab === key ? 'border-amber-400 bg-amber-950/65 shadow-[0_0_18px_rgba(245,158,11,.16)]' : 'border-white/10 bg-black/25 hover:border-amber-700/70'}`}>
            <span className="flex items-center gap-2 text-sm font-black text-amber-100"><Icon className="h-5 w-5 text-amber-400" />{label}</span>
            <span className="mt-1 block text-[10px] leading-snug text-slate-400">{desc}</span>
          </button>)}</div>
          <img src="/assets/buildings/forge_station.png" alt="" className="mx-auto mt-3 max-h-[190px] w-[85%] object-contain drop-shadow-[0_0_18px_rgba(249,115,22,.35)]" />
        </aside>

        <main className="min-h-0 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tab === 'refine' && <div>
            <h3 className="text-xl font-black text-white">Síntese de materiais</h3>
            <p className="mt-1 text-xs text-slate-300">Materiais brutos só podem ser refinados no calor controlado desta ferraria.</p>
            <div className="mt-4 grid grid-cols-3 gap-3 max-[820px]:grid-cols-2">{RECIPES.map((recipe) => {
              const have = inventory[recipe.raw] ?? 0;
              const can = have >= recipe.need;
              return <article key={recipe.key} className="rounded-xl border border-amber-800/40 bg-black/45 p-3">
                <div className="flex items-center gap-3"><img src={ITEM_META[recipe.refined]?.img} alt="" className="h-12 w-12 object-contain" /><div><h4 className="text-sm font-black text-amber-100">{recipe.label}</h4><p className="text-[10px] text-slate-400">{recipe.need} brutos → 1 refinado</p></div></div>
                <div className="mt-3"><MaterialCost cost={{ [recipe.raw]: recipe.need }} inventory={inventory} /></div>
                <button type="button" disabled={!can} onClick={() => { const result = engine.forgeMaterial(recipe.key); setMessage(result.message); refresh(); }} className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-xs font-black text-[#1b1005] disabled:bg-slate-800 disabled:text-slate-500">Sintetizar</button>
              </article>;
            })}</div>
          </div>}

          {tab === 'tools' && <div>
            <h3 className="text-xl font-black text-white">Forja de ferramentas</h3>
            <p className="mt-1 text-xs text-slate-300">Cada tier exige o anterior. A ferramenta recém-forjada já fica equipada.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">{(['axe', 'pick'] as const).map((kind) => <section key={kind} className="rounded-xl border border-amber-800/40 bg-black/45 p-3"><h4 className="flex items-center gap-2 text-sm font-black text-amber-100">{kind === 'axe' ? '🪓 Machado' : '⛏️ Picareta'}</h4><div className="mt-3 space-y-2">{(['gold', 'crystal'] as ToolTier[]).map((tier) => {
              const owned = (kind === 'axe' ? engine.ownedAxes : engine.ownedPicks).includes(tier);
              const cost = engine.toolForgeCost(tier)!;
              const can = engine.canForgeTool(kind, tier);
              return <div key={tier} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/55 p-2"><img src={`/assets/tools/${kind}_${tier}.png`} alt="" className="h-12 w-12 object-contain" /><div className="min-w-0 flex-1"><p className="text-xs font-black capitalize text-white">Tier {tier}</p><MaterialCost cost={cost} inventory={inventory} /></div><button type="button" disabled={owned || !can} onClick={() => { if (engine.forgeTool(kind, tier)) { setMessage(`Dório: “Pronto. ${kind === 'axe' ? 'Machado' : 'Picareta'} de ${tier} afinado e equipado.”`); refresh(); } }} className="rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-black text-white disabled:bg-slate-800 disabled:text-slate-500">{owned ? 'Forjada' : 'Forjar'}</button></div>;
            })}</div></section>)}</div>
          </div>}

          {tab === 'weapon' && <div>
            <h3 className="text-xl font-black text-white">Aprimoramento de arma</h3>
            <p className="mt-1 text-xs text-slate-300">O nível físico da arma é trabalho de ferraria. Skills e passivas continuam evoluindo nos respectivos painéis.</p>
            <div className="mt-4 flex items-center gap-5 rounded-2xl border border-amber-700/50 bg-black/50 p-5">
              <div className="relative grid h-36 w-32 shrink-0 place-items-center"><div className="absolute inset-0 rounded-full bg-orange-500/15 blur-2xl" /><img src={engine.weaponDef.img} alt={engine.weaponDef.name} className="relative max-h-full max-w-full object-contain drop-shadow-[0_0_16px_rgba(251,191,36,.45)]" /></div>
              <div className="min-w-0 flex-1"><h4 className="text-lg font-black text-amber-100">{engine.weaponDef.name}</h4><p className="text-xs text-amber-300">+{engine.weaponLevel} · ATQ {engine.weaponAtk}</p>{weaponCost ? <><div className="mt-3"><MaterialCost cost={weaponCost} inventory={inventory} /></div><button type="button" disabled={!engine.canUpgradeWeapon()} onClick={() => { if (engine.upgradeWeaponAtForge()) { setMessage(`Dório: “Agora sim. ${engine.weaponDef.name} chegou a +${engine.weaponLevel}.”`); refresh(); } }} className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-3 text-sm font-black text-white disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500"><ArrowUp className="h-4 w-4" />Aprimorar para +{engine.weaponLevel + 1}</button></> : <p className="mt-4 text-sm font-bold text-emerald-300">Nível máximo alcançado.</p>}</div>
            </div>
          </div>}
        </main>
      </div>

      <footer className="relative flex min-h-11 shrink-0 items-center gap-2 border-t border-amber-800/40 bg-black/45 px-4 py-2"><Sparkles className="h-4 w-4 shrink-0 text-amber-400" /><p className="text-[11px] italic text-amber-100/85">{message}</p></footer>
    </section>
  </div>;
};

import React from 'react';
import { ArrowUp, Flame, Gem, Hammer, Pickaxe, Sparkles, Sword, X } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { ITEM_META } from '../game/engine';
import type { ToolTier } from '../game/types';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  inventory: Record<string, number>;
  openOnTools?: boolean;
}

type ForgeTab = 'refine' | 'tools' | 'weapon';

const RECIPES = [
  { key: 'gold' as const, label: 'Ouro sintetizado', icon: '◈', raw: 'gold_raw', refined: 'gold_refined', need: 5, color: '#fbbf24' },
  { key: 'crystal_blue' as const, label: 'Cristal Azul', icon: '💎', raw: 'crystal_blue_raw', refined: 'crystal_blue_refined', need: 3, color: '#60a5fa' },
  { key: 'crystal_red' as const, label: 'Cristal Rubro', icon: '🔮', raw: 'crystal_red_raw', refined: 'crystal_red_refined', need: 3, color: '#f87171' },
];

const MatBadge: React.FC<{ itemKey: string; have: number; need: number }> = ({ itemKey, have, need }) => {
  const meta = ITEM_META[itemKey];
  const ok = have >= need;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border ${ok ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' : 'border-rose-500/50 bg-rose-950/40 text-rose-300'}`}>
      {meta?.img ? <img src={meta.img} alt="" className="h-3 w-3 object-contain" /> : <span>{meta?.icon ?? '◆'}</span>}
      {have}/{need}
    </span>
  );
};

const CostRow: React.FC<{ cost: Record<string, number>; inventory: Record<string, number> }> = ({ cost, inventory }) => (
  <div className="flex flex-wrap gap-1">
    {Object.entries(cost).map(([k, n]) => <MatBadge key={k} itemKey={k} have={inventory[k] ?? 0} need={n} />)}
  </div>
);

export const ForgeScreen: React.FC<Props> = ({ open, onClose, engine, inventory, openOnTools }) => {
  const [tab, setTab] = React.useState<ForgeTab>('refine');
  const [message, setMessage] = React.useState('Dório: "Escolha o trabalho. A bigorna não gosta de indecisão."');
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  const [showGift, setShowGift] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      const firstForge = openOnTools || engine?.marketIntroStage === 'collecting';
      setTab(firstForge ? 'tools' : 'refine');
      setShowGift(!!firstForge);
      setMessage('Dório: "Escolha o trabalho. A bigorna não gosta de indecisão."');
    }
  }, [open]);

  if (!open || !engine) return null;

  const weaponCost = engine.weaponLevel < engine.weaponDef.maxLevel
    ? engine.weaponDef.upgradeCost(engine.weaponLevel)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — full-screen on mobile, modal on desktop */}
      <section
        className="relative flex flex-col w-full sm:w-[min(860px,96vw)] h-[100dvh] sm:h-[min(580px,92vh)] overflow-hidden sm:rounded-2xl border-0 sm:border border-amber-500/60 bg-[#100c09]"
        style={{ boxShadow: '0 32px 96px #000, 0 0 56px rgba(245,158,11,.15)' }}
      >
        {/* Interior bg */}
        <img
          src="/assets/interiors/blacksmith_interior.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 select-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#100c09]/85 via-[#140f0a]/70 to-[#100c09]/95" />

        {/* ── HEADER ── */}
        <header className="relative flex h-12 shrink-0 items-center border-b border-amber-800/40 px-4 gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30">
            <Hammer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-amber-100 leading-none">Ferraria Harmônica</h2>
            <p className="text-[10px] text-amber-400/70 mt-0.5">Dório · Mestre Ferreiro</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* ── TAB BAR ── */}
        <div className="relative flex shrink-0 border-b border-amber-800/30 bg-black/20">
          {([
            ['refine', 'Sintetizar', Gem],
            ['tools', 'Ferramentas', Pickaxe],
            ['weapon', 'Arma', Sword],
          ] as [ForgeTab, string, React.FC<{ className?: string }>][]).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition border-b-2 ${tab === key ? 'border-amber-400 text-amber-200 bg-amber-950/30' : 'border-transparent text-slate-400 hover:text-amber-300'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* — SINTETIZAR — */}
          {tab === 'refine' && (
            <div>
              <p className="text-[11px] text-slate-400 mb-3">Materiais brutos só podem ser refinados no calor desta ferraria.</p>
              <div className="grid grid-cols-1 gap-2.5">
                {RECIPES.map((r) => {
                  const have = inventory[r.raw] ?? 0;
                  const can = have >= r.need;
                  return (
                    <div key={r.key} className="flex items-center gap-3 rounded-xl border border-amber-800/35 bg-black/40 p-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10 text-xl">
                        {r.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-amber-100">{r.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{r.need} brutos → 1 refinado</p>
                        <div className="mt-1.5">
                          <MatBadge itemKey={r.raw} have={have} need={r.need} />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!can}
                        onClick={() => {
                          const result = engine.forgeMaterial(r.key);
                          setMessage(`Dório: "${result.message}"`);
                          refresh();
                        }}
                        className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: can ? r.color : '#1e293b', color: can ? '#0b0a08' : '#64748b' }}
                      >
                        Sintetizar
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* forge_station decorativa */}
              <div className="mt-4 flex justify-center">
                <img src="/assets/buildings/forge_station.png" alt="" className="h-24 object-contain opacity-60 drop-shadow-[0_0_16px_rgba(249,115,22,.4)]" />
              </div>
            </div>
          )}

          {/* — FERRAMENTAS — */}
          {tab === 'tools' && (
            <div>
              {showGift && (
                <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-950/40 p-3">
                  <span className="text-2xl shrink-0">🎁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-amber-200">Presente de Dório recebido!</p>
                    <p className="text-[10px] text-amber-300/80 mt-0.5">Madeira ×10 · Pedra ×10 · Ouro refinado ×2 — suficiente para forjar machado e picareta dourados.</p>
                  </div>
                  <button type="button" onClick={() => setShowGift(false)} className="shrink-0 text-amber-400/60 hover:text-amber-200 text-lg leading-none">×</button>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mb-3">Cada tier exige o anterior. A ferramenta recém-forjada fica equipada.</p>
              <div className="grid grid-cols-1 gap-3">
                {(['axe', 'pick'] as const).map((kind) => (
                  <div key={kind} className="rounded-xl border border-amber-800/35 bg-black/40 p-3">
                    <h3 className="text-xs font-black text-amber-200 mb-2">{kind === 'axe' ? '🪓 Machado' : '⛏️ Picareta'}</h3>
                    <div className="space-y-2">
                      {(['gold', 'crystal'] as ToolTier[]).map((tier) => {
                        const owned = (kind === 'axe' ? engine.ownedAxes : engine.ownedPicks).includes(tier);
                        const cost = engine.toolForgeCost(tier)!;
                        const can = engine.canForgeTool(kind, tier);
                        const label = tier === 'gold' ? 'Dourado' : 'Cristalino';
                        return (
                          <div key={tier} className="flex items-center gap-3 rounded-lg border border-white/8 bg-slate-950/50 p-2">
                            <img src={`/assets/tools/${kind}_${tier}.png`} alt="" className="h-10 w-10 object-contain shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-white">{label}</p>
                              <div className="mt-1"><CostRow cost={cost} inventory={inventory} /></div>
                            </div>
                            <button
                              type="button"
                              disabled={owned || !can}
                              onClick={() => {
                                if (engine.forgeTool(kind, tier)) {
                                  setMessage(`Dório: "Pronto. ${kind === 'axe' ? 'Machado' : 'Picareta'} ${label} afinado e equipado."`);
                                  refresh();
                                }
                              }}
                              className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black transition active:scale-95 ${owned ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/40 cursor-default' : can ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                              {owned ? '✓ Forjada' : 'Forjar'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* — ARMA — */}
          {tab === 'weapon' && (
            <div>
              <p className="text-[11px] text-slate-400 mb-3">Nível físico da arma forjado aqui. Skills e passivas evoluem nos painéis próprios.</p>
              <div className="rounded-2xl border border-amber-700/40 bg-black/50 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-24 w-20 shrink-0 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-2xl" />
                    <img
                      src={engine.weaponDef.img}
                      alt={engine.weaponDef.name}
                      className="relative max-h-full max-w-full object-contain drop-shadow-[0_0_14px_rgba(251,191,36,.5)]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-amber-100">{engine.weaponDef.name}</h3>
                    <p className="text-xs text-amber-300 mt-0.5">+{engine.weaponLevel} · ATQ {engine.weaponAtk}</p>
                    {weaponCost ? (
                      <>
                        <div className="mt-2"><CostRow cost={weaponCost} inventory={inventory} /></div>
                        <button
                          type="button"
                          disabled={!engine.canUpgradeWeapon()}
                          onClick={() => {
                            if (engine.upgradeWeaponAtForge()) {
                              setMessage(`Dório: "Agora sim. ${engine.weaponDef.name} chegou a +${engine.weaponLevel}."`);
                              refresh();
                            }
                          }}
                          className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition active:scale-95 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500"
                          style={{ background: engine.canUpgradeWeapon() ? 'linear-gradient(135deg,#ea580c,#f59e0b)' : undefined }}
                        >
                          <ArrowUp className="h-4 w-4" />
                          Aprimorar para +{engine.weaponLevel + 1}
                        </button>
                      </>
                    ) : (
                      <p className="mt-3 text-sm font-bold text-emerald-300">✓ Nível máximo alcançado!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER / DÓRIO SPEECH ── */}
        <footer className="relative flex shrink-0 items-center gap-2 border-t border-amber-800/35 bg-black/50 px-4 py-2.5">
          <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400 animate-pulse" />
          <p className="text-[10px] italic text-amber-200/80 leading-snug">{message}</p>
        </footer>
      </section>
    </div>
  );
};

import React from 'react';
import {
  X,
  Swords,
  Sword,
  Plus,
  ChevronsUp,
  Hammer,
  Gem,
  Zap,
  User,
  Sparkles,
  RefreshCw,
  ArrowUpCircle,
  CheckCircle2,
  Heart,
  Shield,
  ShieldCheck,
  Target,
  Flame,
  Timer,
  Maximize2,
  Battery,
  BatteryCharging,
  Music2,
  CircleDot,
  FlaskConical,
  ListFilter,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';
import type { PlayerStats, AttrKey, GameEngine, PassiveGroup, EquipSlotKey, StatKey } from '../game/engine';
import { PASSIVE_DEFS, PASSIVE_ORDER, EQUIP_SETS, EQUIP_SLOT_ORDER, EQUIP_SLOT_LABEL, STAT_LABELS } from '../game/engine';
import { ITEM_META } from '../game/engine';
import type { ToolTier } from '../game/types';

const STAT_ICON: Record<StatKey, React.ComponentType<{ className?: string }>> = {
  hpPct: Heart,
  defPct: Shield,
  atkPct: Sword,
  basicDmgPct: Swords,
  skillDmgPct: Sparkles,
  critChancePct: Target,
  critDmgPct: Flame,
  atkSpeedPct: Zap,
  cooldownReductionPct: Timer,
  areaPct: Maximize2,
  resistPct: ShieldCheck,
  energyMaxPct: Battery,
  energyRegenPct: BatteryCharging,
  harmonicPowerPct: Music2,
};

const SLOT_ICON: Record<EquipSlotKey, React.ComponentType<{ className?: string }>> = {
  colar: Gem,
  anel: CircleDot,
  aura: Sparkles,
  catalisador: FlaskConical,
};

interface CharacterScreenProps {
  open: boolean;
  onClose: () => void;
  stats: PlayerStats;
  power: number;
  canLevelUp: boolean;
  onLevelUp: () => void;
  onSpend: (attr: AttrKey) => void;
  engine?: GameEngine | null;
  inventory?: Record<string, number>;
  initialTab?: Tab;
}

type Tab = 'ficha' | 'ferramentas' | 'equipamentos' | 'skills';

const PARTITURA_ROWS: Array<[string, string, string]> = [
  ['partitura_bronze', 'Bronze', '#b45309'],
  ['partitura_prata', 'Prata', '#94a3b8'],
  ['partitura_ouro', 'Ouro', '#fbbf24'],
];

const TIER_META: Record<ToolTier, { label: string; ring: string; dot: string }> = {
  wood: { label: 'Madeira', ring: 'border-amber-700/70', dot: 'bg-amber-600' },
  gold: { label: 'Ouro', ring: 'border-yellow-500/70', dot: 'bg-yellow-400' },
  crystal: { label: 'Cristal', ring: 'border-cyan-400/70', dot: 'bg-cyan-300' },
};

const ATTRS: Array<[AttrKey, string, string, string]> = [
  ['forca', 'Força', '💪', 'dano corpo-a-corpo'],
  ['agilidade', 'Agilidade', '🏃', 'velocidade de movimento'],
  ['vitalidade', 'Vitalidade', '🛡️', '+5 vida máx. por ponto'],
  ['inteligencia', 'Inteligência', '📖', 'dano do Canhão de Luz'],
  ['sorte', 'Sorte', '🍀', 'chance de drops raros'],
];

// ============================================================================
// Aba: FERRAMENTAS (machado / picareta)
// ============================================================================
const FerramentasTab: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const pick = (kind: 'axe' | 'pick', tier: ToolTier) => {
    engine.equipTool(kind, tier);
    force();
  };
  const rows: Array<{ kind: 'axe' | 'pick'; title: string; icon: string; owned: ToolTier[]; equipped: ToolTier; src: (t: ToolTier) => string }> = [
    { kind: 'axe', title: 'Machado (madeira)', icon: '🪓', owned: engine.ownedAxes, equipped: engine.equippedAxe, src: (t) => `/assets/tools/axe_${t}.png` },
    { kind: 'pick', title: 'Picareta (pedra)', icon: '⛏️', owned: engine.ownedPicks, equipped: engine.equippedPick, src: (t) => `/assets/tools/pick_${t}.png` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {rows.map((r) => (
        <div key={r.kind} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex flex-col gap-2">
          <p className="text-[12px] font-bold text-slate-200">
            {r.icon} {r.title}
          </p>
          <div className="grid grid-cols-3 gap-2 flex-1">
            {(['wood', 'gold', 'crystal'] as ToolTier[]).map((t) => {
              const has = r.owned.includes(t);
              const on = r.equipped === t;
              const m = TIER_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!has}
                  onClick={() => pick(r.kind, t)}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-1 py-2 transition-all ${
                    on
                      ? `${m.ring} bg-slate-800 ring-2 ring-cyan-400/60`
                      : has
                        ? 'border-slate-700 bg-slate-900 hover:border-slate-500 active:scale-95'
                        : 'border-slate-800 bg-slate-950 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <img src={r.src(t)} alt={m.label} className="h-12 w-12 object-contain" style={{ imageRendering: 'pixelated' }} />
                  <span className="text-[9px] font-semibold text-slate-300 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                    {m.label}
                  </span>
                  {on && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-cyan-400 text-slate-950 rounded-full px-1 py-px">
                      EQUIP
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="col-span-2 text-[9px] text-slate-500 leading-snug">
        A ferramenta equipada aparece ao lado do Akles e bate no recurso durante a coleta. Ele já
        tem os 3 tiers de cada.
      </p>
    </div>
  );
};

// ============================================================================
// Aba: EQUIPAMENTOS (Colar / Anel / Aura / Catalisador) — mesmo layout da
// tela de Arma: lista à esquerda, detalhe grande à direita.
// ============================================================================
type PieceRow = { key: string; slot: EquipSlotKey; name: string; img?: string; setName: string; setColor: string; setKey: string };

function statLines(stats: Partial<Record<StatKey, number>>): string[] {
  return (Object.keys(stats) as StatKey[])
    .filter((k) => stats[k])
    .map((k) => `${STAT_LABELS[k]}: +${stats[k]}%`);
}

const EquipamentosTab: React.FC<{ engine: GameEngine; inventory: Record<string, number> }> = ({ engine, inventory }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [slotFilter, setSlotFilter] = React.useState<EquipSlotKey>('colar');
  const [showAll, setShowAll] = React.useState(false);

  const allPieces: PieceRow[] = React.useMemo(() => {
    const rows: PieceRow[] = [];
    for (const set of EQUIP_SETS) {
      for (const slot of EQUIP_SLOT_ORDER) {
        const p = set.pieces[slot];
        rows.push({ key: p.key, slot, name: p.name, img: p.img, setName: set.name, setColor: set.color, setKey: set.key });
      }
    }
    return rows;
  }, []);

  const findEntry = (key: string) => {
    for (const set of EQUIP_SETS) {
      for (const slot of EQUIP_SLOT_ORDER) {
        if (set.pieces[slot].key === key) return { set, piece: set.pieces[slot], slot };
      }
    }
    return null;
  };

  const [selectedKey, setSelectedKey] = React.useState(allPieces.find((p) => p.slot === 'colar')!.key);
  const selected = findEntry(selectedKey)!;
  const piece = selected.piece;
  const set = selected.set;
  const slot = selected.slot;

  const equippedInSlot = engine.equippedPieces[slot];
  const isEquipped = equippedInSlot === piece.key;
  const level = engine.getPieceLevel(piece.key);
  const maxed = level >= 15;
  const setCount = engine.activeSetCounts[set.key] ?? 0;
  const cost = engine.pieceUpgradeCost(piece.key);
  const canUpgrade = engine.canUpgradePiece(piece.key);

  const doEquip = () => {
    if (engine.equipPiece(piece.key)) force();
  };
  const doUnequip = () => {
    engine.unequipSlot(slot);
    force();
  };
  const doUpgrade = () => {
    if (engine.upgradePiece(piece.key)) force();
  };

  const visiblePieces = showAll ? allPieces : allPieces.filter((r) => r.slot === slotFilter);

  return (
    <div className="flex h-full gap-3">
      {/* Coluna esquerda: filtro por slot + lista de peças */}
      <div className="w-52 shrink-0 flex flex-col gap-2 min-h-0">
        <div className="grid grid-cols-4 gap-1">
          {EQUIP_SLOT_ORDER.map((s) => {
            const Icon = SLOT_ICON[s];
            const active = !showAll && slotFilter === s;
            const key = engine.equippedPieces[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSlotFilter(s);
                  setShowAll(false);
                  setSelectedKey(key ?? allPieces.find((p) => p.slot === s)!.key);
                }}
                title={EQUIP_SLOT_LABEL[s]}
                className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-all ${
                  active ? 'border-amber-400/70 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[8px] font-bold">{EQUIP_SLOT_LABEL[s]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 pr-1">
          {visiblePieces.map((row) => {
            const eq = engine.equippedPieces[row.slot] === row.key;
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => setSelectedKey(row.key)}
                className={`flex items-center gap-1.5 rounded-lg border p-1.5 text-left transition-all ${
                  selectedKey === row.key
                    ? 'bg-blue-950/50 border-blue-400/70 ring-1 ring-blue-400/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                {row.img ? (
                  <img src={row.img} alt="" className="w-7 h-7 object-contain shrink-0" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <div
                    className="w-7 h-7 rounded shrink-0 flex items-center justify-center text-[7px] font-bold"
                    style={{ background: row.setColor + '22', color: row.setColor }}
                  >
                    {row.slot.slice(0, 3)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-slate-100 truncate">{row.name}</p>
                  <p className="text-[8px] text-slate-500 truncate">Aprim. +{engine.getPieceLevel(row.key)}</p>
                </div>
                {eq && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 py-1"
        >
          <ListFilter className="w-3 h-3" />
          {showAll ? 'Ver por slot' : 'Ver todos os equipamentos'}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Coluna direita: detalhe da peça selecionada */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto pr-1">
        {/* linha 1: peça + bônus de conjunto */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 flex gap-3 items-center rounded-xl border p-3" style={{ borderColor: set.color + '40', background: 'rgba(2,6,23,0.6)' }}>
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0 rounded-lg border" style={{ borderColor: set.color + '35' }}>
              <span
                className="absolute -top-1.5 -left-1.5 text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{ background: set.color + '30', color: set.color, border: `1px solid ${set.color}55` }}
              >
                Tier {set.tier}
              </span>
              <div className="absolute inset-0 rounded-lg blur-xl" style={{ background: set.color + '25' }} />
              {piece.img ? (
                <img src={piece.img} alt={piece.name} className="relative max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <Gem className="relative w-9 h-9" style={{ color: set.color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-100">{piece.name}</p>
              <p className="text-[10px] font-semibold" style={{ color: set.color }}>
                {EQUIP_SLOT_LABEL[slot]} · Tier {set.tier} · {set.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Aprimoramento <span className="text-slate-100 font-bold">+{level}</span>
                <span className="text-slate-600"> / +15</span>
              </p>
              {isEquipped ? (
                <button
                  type="button"
                  onClick={doUnequip}
                  className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5"
                >
                  Desequipar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={doEquip}
                  className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 shadow-lg shadow-blue-600/25"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Equipar
                </button>
              )}
            </div>
          </div>

          <div className="w-56 shrink-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 flex flex-col gap-1">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Bônus do Conjunto
            </p>
            <p className="text-[10px] font-semibold text-slate-300 leading-snug">
              {set.name} ({setCount}/4)
            </p>
            <div className={`text-[10px] leading-snug ${setCount >= 2 ? 'text-emerald-300' : 'text-slate-600'}`}>
              2 peças: {statLines(set.bonus2).join(' · ') || '—'}
            </div>
            <div className={`text-[10px] leading-snug ${setCount >= 4 ? 'text-emerald-300' : 'text-slate-600'}`}>
              4 peças: {[...statLines(set.bonus4), set.bonus4Extra].filter(Boolean).join(' · ') || '—'}
            </div>
            {set.aklesExtra && <p className="text-[9px] text-amber-300/90 mt-0.5 leading-snug">★ Com Akles: {set.aklesExtra}</p>}
          </div>
        </div>

        {/* linha 2: atributos + materiais */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" /> Atributos
            </p>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(piece.stats) as StatKey[])
                .filter((k) => piece.stats[k])
                .map((k) => {
                  const Icon = STAT_ICON[k];
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-300 flex-1">{STAT_LABELS[k]}</span>
                      <span className="text-[11px] font-bold text-slate-100">+{piece.stats[k]}%</span>
                    </div>
                  );
                })}
            </div>
            {piece.passive && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <p className="text-[10px] font-bold" style={{ color: set.color }}>
                  ★ {piece.passive.name}
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">{piece.passive.desc}</p>
              </div>
            )}
          </div>

          <div className="w-56 shrink-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Materiais de Aprimoramento</p>
            {cost ? (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(cost).map(([k, n]) => {
                  const have = inventory[k] ?? 0;
                  const ok = have >= n;
                  const meta = ITEM_META[k];
                  return (
                    <div
                      key={k}
                      className={`flex items-center gap-1 rounded-md border px-1.5 py-1 ${
                        ok ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-rose-600/40 bg-rose-950/20'
                      }`}
                    >
                      {meta?.img ? (
                        <img src={meta.img} alt="" className="w-4 h-4 object-contain shrink-0" />
                      ) : (
                        <span className="text-[10px] shrink-0">{meta?.icon ?? '◆'}</span>
                      )}
                      <span className={`text-[9px] tabular-nums font-bold ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {have}/{n}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-slate-600">Nível máximo alcançado.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-500 leading-snug">
            Aprimoramento sobe os atributos-base em +8%/nível (não afeta passiva nem bônus de conjunto).
            {set.identity && <span className="text-slate-600"> {set.identity}</span>}
          </p>
          <button
            type="button"
            onClick={doUpgrade}
            disabled={!canUpgrade}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
              !canUpgrade ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" /> {maxed ? 'Máximo' : 'Aprimorar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Aba: SKILLS — card por skill; clica pra ver/upar as passivas dela
// ============================================================================
const SKILL_GROUPS: Array<{ key: PassiveGroup; label: string; blurb: string; color: string; icon: React.ReactNode }> = [
  { key: 'basico', label: 'Ataque Básico', blurb: 'Compasso da Lâmina — combo de 4 golpes', color: '#f87171', icon: <Swords className="w-5 h-5" /> },
  { key: 'ressonancia', label: 'Ressonância', blurb: 'Skill 1 — buff + arma energizada', color: '#60a5fa', icon: <Zap className="w-5 h-5" /> },
  { key: 'amplificacao', label: 'Amplificação', blurb: 'Skill 2 — arma gigante em área', color: '#818cf8', icon: <RefreshCw className="w-5 h-5" /> },
  { key: 'pulso', label: 'Pulso Harmônico', blurb: 'Skill 3 — feixe à distância', color: '#22d3ee', icon: <Sparkles className="w-5 h-5" /> },
  { key: 'geral', label: 'Gerais', blurb: 'Passivas permanentes de Akles', color: '#fbbf24', icon: <Sparkles className="w-5 h-5" /> },
];
const fmtPassive = (id: string, v: number) => (id === 'notaPerfeita' ? `crítico a cada ${v}` : `+${Math.round(v * 100)}%`);

// Mesmo layout da tela de Arma: lista à esquerda (todas as passivas, com a
// cor do grupo), detalhe grande com nível/valor/descrição à direita.
const SkillsTab: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [selectedId, setSelectedId] = React.useState(PASSIVE_ORDER[0]);

  const groupOf = (id: string) => SKILL_GROUPS.find((g) => g.key === PASSIVE_DEFS[id].group)!;
  const def = PASSIVE_DEFS[selectedId];
  const g = groupOf(selectedId);
  const lvl = engine.getPassiveLevel(selectedId);
  const val = engine.passiveValue(selectedId);
  const maxed = lvl >= 5;

  const levelUp = () => {
    if (lvl < 5) {
      engine.setPassiveLevel(selectedId, lvl + 1);
      force();
    }
  };

  return (
    <div className="flex h-full gap-3">
      {/* Coluna esquerda: todas as passivas */}
      <div className="w-48 shrink-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {PASSIVE_ORDER.map((id) => {
          const d = PASSIVE_DEFS[id];
          const gg = groupOf(id);
          const l = engine.getPassiveLevel(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`flex items-center gap-2 rounded-xl border p-2 transition-all text-left ${
                selectedId === id
                  ? 'bg-blue-950/50 border-blue-400/70 ring-1 ring-blue-400/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: gg.color + '18', color: gg.color }}>
                {gg.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-100 truncate">{d.name}</p>
                <span className="flex gap-0.5 mt-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="flex-1 h-1 rounded-full" style={{ background: n <= l ? gg.color : '#334155' }} />
                  ))}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Coluna direita: detalhe grande da passiva selecionada */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto pr-1">
        {/* linha 1: card principal + atributos/efeito */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 flex gap-4 items-center rounded-xl border p-4" style={{ borderColor: g.color + '35', background: 'rgba(2,6,23,0.6)' }}>
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0 rounded-full" style={{ background: g.color + '18', boxShadow: `0 0 20px ${g.color}25` }}>
              <div style={{ color: g.color }}>{g.icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-slate-100">{def.name}</p>
              <span
                className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5"
                style={{ background: g.color + '18', color: g.color }}
              >
                {g.label}
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[12px] text-slate-400">
                  Nível <span className="text-slate-100 font-bold">{lvl}</span>
                  <span className="text-slate-600"> / 5</span>
                </p>
                {lvl > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: g.color + '18', color: g.color }}>
                    {fmtPassive(selectedId, val)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-56 shrink-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Atributos / Efeito
            </p>
            <p className="text-[11px] text-slate-300 leading-snug">{def.desc}</p>
          </div>
        </div>

        {/* progressão da passiva */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Progressão da Passiva
          </p>
          <div className="flex items-center gap-1">
            {def.values.map((v, i) => {
              const isCurrent = i === lvl - 1;
              const reached = i < lvl;
              return (
                <React.Fragment key={i}>
                  <div
                    className={`flex-1 rounded-lg border px-1.5 py-1.5 text-center ${
                      isCurrent ? 'bg-slate-900/80' : reached ? 'bg-slate-900/50' : 'border-slate-800 bg-slate-950/40 opacity-50'
                    }`}
                    style={isCurrent ? { borderColor: g.color, boxShadow: `0 0 0 1px ${g.color}` } : reached ? { borderColor: g.color + '55' } : undefined}
                  >
                    <p className="text-[8px] text-slate-500">Nv.{i + 1}</p>
                    <p className="text-[11px] font-bold" style={reached ? { color: g.color } : undefined}>
                      {fmtPassive(selectedId, v)}
                    </p>
                    {isCurrent && (
                      <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[7px] font-black" style={{ color: g.color }}>
                        <CheckCircle2 className="w-2.5 h-2.5" /> ATIVO
                      </span>
                    )}
                  </div>
                  {i < def.values.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
          {maxed && def.level5Bonus && (
            <p className="text-[10px] text-amber-300/90 leading-snug border-t border-slate-800 pt-2 mt-2">
              ★ {def.level5Bonus}
            </p>
          )}
        </div>

        {/* ação */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 flex items-center gap-2">
          <p className="flex-1 text-[10px] text-slate-500 leading-snug">
            Passiva de Akles — sem custo de material, só XP de nível de personagem.
          </p>
          <button
            type="button"
            onClick={levelUp}
            disabled={maxed}
            className={`shrink-0 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              maxed ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg shadow-emerald-600/25'
            }`}
          >
            <Plus className="w-4 h-4" />
            {maxed ? 'Nível máximo' : 'Aumentar passiva'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Aba: FICHA (conteúdo original — atributos, vida, XP, partituras, poder)
// ============================================================================
const FichaTab: React.FC<{
  stats: PlayerStats;
  power: number;
  canLevelUp: boolean;
  onLevelUp: () => void;
  onSpend: (attr: AttrKey) => void;
  inventory?: Record<string, number>;
  engine?: GameEngine | null;
}> = ({ stats, power, canLevelUp, onLevelUp, onSpend, inventory, engine }) => {
  const [, forceTick] = React.useReducer((n) => n + 1, 0);
  const hasPoints = stats.attrPoints > 0;
  const xpPct = Math.min(100, (stats.xp / stats.xpNext) * 100);
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));

  return (
    <div className="flex gap-3 h-full">
      <div className="w-44 shrink-0 flex flex-col gap-2">
        <div className="rounded-xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-slate-800 to-slate-950 shadow-lg aspect-[3/4]">
          <img
            src={engine?.activeCharacterPortrait ?? '/icons/icon-512.png'}
            alt={stats.name}
            className="w-full h-full object-cover object-top scale-110"
          />
        </div>
        <p className="text-center text-[11px] text-slate-400 -mt-1">{stats.className}</p>
        <p className="text-center text-sm font-bold text-amber-300">Nível {stats.level}</p>

        <div>
          <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
            <span>❤️ Vida</span>
            <span>{Math.round(stats.hp)}/{stats.maxHp}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
            <span>⭐ XP</span>
            <span>{stats.xp}/{stats.xpNext}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onLevelUp();
            forceTick();
          }}
          disabled={!canLevelUp}
          className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
            canLevelUp
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <ChevronsUp className="w-4 h-4" />
          Subir de Nível
        </button>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400">🎵 Partituras</span>
            {engine && <span className="text-[9px] text-amber-300/90">+{engine.partituraXpAvailable} XP</span>}
          </div>
          <div className="flex gap-1.5">
            {PARTITURA_ROWS.map(([key, label, color]) => (
              <div key={key} className="flex-1 rounded-md border bg-slate-900/70 py-1 text-center" style={{ borderColor: color + '55' }} title={label}>
                <div className="text-[10px] font-black" style={{ color }}>
                  {inventory?.[key] ?? 0}
                </div>
                <div className="text-[8px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {hasPoints && (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/50 px-2.5 py-1 text-center text-[12px] font-bold text-emerald-300">
            {stats.attrPoints} ponto{stats.attrPoints > 1 ? 's' : ''} para distribuir
          </div>
        )}
        <div className="grid grid-cols-1 gap-1.5">
          {ATTRS.map(([key, label, icon, hint]) => (
            <div key={key} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg pl-2.5 pr-1.5 py-1.5">
              <span className="text-[13px] w-5 text-center">{icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] text-slate-200 font-semibold">{label}</span>
                <span className="text-[10px] text-slate-500 ml-1.5">{hint}</span>
              </div>
              <span className="text-sm font-bold text-slate-100 tabular-nums w-7 text-right">{stats[key]}</span>
              <button
                type="button"
                onClick={() => onSpend(key)}
                disabled={!hasPoints}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  hasPoints ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-90' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-auto rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-rose-950/60 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-200">
            <Swords className="w-5 h-5" />
            <span className="text-sm font-bold tracking-wide">Poder de Luta</span>
          </div>
          <span className="text-2xl font-black text-amber-300 tabular-nums drop-shadow">{power}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Tela principal — hub em paisagem com barra de abas embaixo
// ============================================================================
export const CharacterScreen: React.FC<CharacterScreenProps> = ({
  open,
  onClose,
  stats,
  power,
  canLevelUp,
  onLevelUp,
  onSpend,
  engine,
  inventory,
  initialTab,
}) => {
  const [tab, setTab] = React.useState<Tab>('ficha');
  React.useEffect(() => {
    if (open) setTab(initialTab ?? 'ficha');
  }, [open, initialTab]);
  if (!open) return null;

  const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'ficha', label: 'Ficha', icon: <User className="w-4 h-4" /> },
    { key: 'ferramentas', label: 'Ferramentas', icon: <Hammer className="w-4 h-4" /> },
    { key: 'equipamentos', label: 'Equipamentos', icon: <Gem className="w-4 h-4" /> },
    { key: 'skills', label: 'Skills', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[620px] max-h-[92vh] flex flex-col bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-amber-200 tracking-wide">Ficha — {stats.name}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {tab === 'ficha' && (
            <FichaTab stats={stats} power={power} canLevelUp={canLevelUp} onLevelUp={onLevelUp} onSpend={onSpend} inventory={inventory} engine={engine} />
          )}
          {tab === 'ferramentas' && (engine ? <FerramentasTab engine={engine} /> : null)}
          {tab === 'equipamentos' && (engine ? <EquipamentosTab engine={engine} inventory={inventory ?? {}} /> : null)}
          {tab === 'skills' && (engine ? <SkillsTab engine={engine} /> : null)}
        </div>

        {/* Barra inferior de sub-abas — mantém tudo dentro da mesma tela */}
        <div className="shrink-0 flex border-t border-slate-800 bg-slate-950/70">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
                tab === t.key ? 'text-amber-300 bg-amber-500/10 border-t-2 border-amber-400' : 'text-slate-500 hover:text-slate-300 border-t-2 border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

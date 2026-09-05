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
import { PASSIVE_DEFS, PASSIVE_ORDER, CLASS_PASSIVE_DEFS, EQUIP_SETS, EQUIP_SLOT_ORDER, EQUIP_SLOT_LABEL, STAT_LABELS } from '../game/engine';
import { equipSetClass } from '../game/catalogData';
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
const RESONANCE_ATTR: [AttrKey, string, string, string] = ['ressonancia', 'Ressonância Máxima', '🎼', '+8 de Energia para usar mais Skills'];

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
    for (const set of EQUIP_SETS.filter((s) => equipSetClass(s) === engine.characterClassKey)) {
      for (const slot of EQUIP_SLOT_ORDER) {
        const p = set.pieces[slot];
        rows.push({ key: p.key, slot, name: p.name, img: p.img, setName: set.name, setColor: set.color, setKey: set.key });
      }
    }
    return rows;
  }, [engine.characterClassKey]);

  const findEntry = (key: string) => {
    for (const set of EQUIP_SETS.filter((s) => equipSetClass(s) === engine.characterClassKey)) {
      for (const slot of EQUIP_SLOT_ORDER) {
        if (set.pieces[slot].key === key) return { set, piece: set.pieces[slot], slot };
      }
    }
    return null;
  };

  const [selectedKey, setSelectedKey] = React.useState(allPieces.find((p) => p.slot === 'colar')!.key);
  React.useEffect(() => {
    if (!allPieces.some((p) => p.key === selectedKey)) setSelectedKey(allPieces.find((p) => p.slot === slotFilter)?.key ?? allPieces[0].key);
  }, [allPieces, selectedKey, slotFilter]);
  const selected = findEntry(selectedKey) ?? findEntry(allPieces[0].key)!;
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

const CLASS_KITS = {
  wins: [
    ['Passiva · Ressonância Vocal', 'Skills aplicam até 3 Notas. Na terceira, explodem em área, restauram 4% da Energia e deixam o alvo Resonante por 5s.'],
    ['Skill 1 · Nota Perfurante', '135% do Poder Harmônico · 15 Energia · 5s. Atravessa inimigos e aplica 1 Nota Vocal. +20% contra Resonante.'],
    ['Skill 2 · Coro Dissonante', 'Área por 5s · 28 Energia · 11s. 80% inicial + 35%/s, lentidão de 20% e Silenciamento após 3s.'],
    ['Skill 3 · Ária do Clímax', '320% do Poder Harmônico · 45 Energia · 18s. Grande onda frontal; consome Notas e ganha +10% de dano por Nota.'],
  ],
  huans: [
    ['Passiva · Instinto do Caçador', 'Ataques e Skills aplicam até 5 Marcas da Presa: +2% de dano por marca e +8% de crítico contra Presa Marcada.'],
    ['Skill 1 · Flecha Resonante', '150% do ATQ · 14 Energia · 5s. Atravessa 2 inimigos, aplica 2 marcas e causa +20% contra Presa Marcada.'],
    ['Skill 2 · Passo do Caçador', '20 Energia · 9s. Desloca, esquiva e concede por 5s +20% ataque e +10% movimento; próximos 3 ataques aplicam 2 marcas.'],
    ['Skill 3 · Chuva das Cordas', '280% do ATQ · 40 Energia · 17s. Múltiplos impactos, 3 marcas e lentidão; +25% contra marcada e +30% se houver só um alvo.'],
  ],
} as const;

type SkillInfo = { key: string; name: string; kind: string; explanation: string; damage: string; cooldown: string; cost: string; attributes: string[]; passiveIds: string[] };
const SKILLS_BY_CHARACTER: Record<'akles' | 'wins' | 'huans', SkillInfo[]> = {
  akles: [
    { key: 'basic', name: 'Compasso da Lâmina', kind: 'Ataque Básico', explanation: 'Combo próximo de quatro golpes. Mantém Ritmo Crescente e aproveita crítico, velocidade e ATQ.', damage: 'ATQ + Força + arma', cooldown: 'Velocidade de Ataque', cost: 'Sem custo', attributes: ['Dano Básico', 'ATQ', 'Chance/Dano Crítico'], passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'basico') },
    { key: 'skill1', name: 'Ressonância', kind: 'Skill 1', explanation: 'Energiza a arma durante 6 segundos, acelerando o combate e ativando efeitos de Ressonância.', damage: 'Buff ofensivo', cooldown: '14s', cost: 'Sem custo', attributes: ['Velocidade de Ataque', 'Duração', 'Redução de Recarga'], passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'ressonancia') },
    { key: 'skill2', name: 'Amplificação', kind: 'Skill 2', explanation: 'Amplia somente a arma do Akles e desfere um golpe frontal em área.', damage: 'Força × 220% + arma × 130%', cooldown: 'Animação de ataque', cost: 'Sem custo', attributes: ['Área', 'Dano Básico/Skill', 'Redução de DEF'], passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'amplificacao') },
    { key: 'skill3', name: 'Pulso Harmônico', kind: 'Skill 3', explanation: 'Dispara o grande feixe harmônico progressivo na direção escolhida pelo jogador.', damage: '14 + Inteligência × 250% + nível × 2', cooldown: '3,5s', cost: 'Sem custo', attributes: ['Dano de Skill', 'Inteligência', 'Alcance'], passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'pulso') },
    { key: 'general', name: 'Maestrias Gerais', kind: 'Passivas', explanation: 'Atributos permanentes que afetam todo o kit do Akles.', damage: '—', cooldown: 'Sempre ativo', cost: 'Passivo', attributes: ['HP', 'ATQ', 'Movimento', 'Crítico', 'Dano'], passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'geral') },
  ],
  wins: [
    { key: 'general', name: 'Ressonância Vocal', kind: 'Passiva', explanation: 'Skills aplicam até 3 Notas. A terceira explode em área, recupera Energia e deixa o alvo Resonante.', damage: '60% do Poder Harmônico', cooldown: 'Automática em 3 Notas', cost: 'Sem custo', attributes: ['Explosão em área', 'Recuperação de Energia', 'Dano recebido por Resonante'], passiveIds: ['winsRessonanciaVocal'] },
    { key: 'skill1', name: 'Nota Perfurante', kind: 'Skill 1', explanation: 'Onda vocal em linha reta que atravessa inimigos e aplica 1 Nota Vocal.', damage: '135% do Poder Harmônico', cooldown: '5s', cost: '15 Energia', attributes: ['Perfuração', '1 Nota Vocal', 'Bônus contra Resonante'], passiveIds: ['winsNotaPerfurante'] },
    { key: 'skill2', name: 'Coro Dissonante', kind: 'Skill 2', explanation: 'Cria uma área por 5 segundos, causa dano periódico, lentidão e Silenciamento.', damage: '80% inicial + 35%/s', cooldown: '11s', cost: '28 Energia', attributes: ['Área 5s', 'Lentidão', 'Silêncio após 3s'], passiveIds: ['winsCoroDissonante'] },
    { key: 'skill3', name: 'Ária do Clímax', kind: 'Skill 3', explanation: 'Grande finalizador frontal. Consome Notas e aumenta o dano para cada Nota acumulada.', damage: '320% do Poder Harmônico', cooldown: '18s', cost: '45 Energia', attributes: ['Grande área frontal', 'Dano por Nota', 'Explosão com 3 Notas'], passiveIds: ['winsAriaClimax'] },
  ],
  huans: [
    { key: 'general', name: 'Instinto do Caçador', kind: 'Passiva', explanation: 'Ataques aplicam até 5 Marcas da Presa. Cada marca aumenta o dano; 5 marcas concedem crítico.', damage: '+2% por Marca', cooldown: 'Expira após 6s sem atacar', cost: 'Sem custo', attributes: ['Dano por Marca', 'Chance Crítica', 'Presa Marcada'], passiveIds: ['huansInstinto'] },
    { key: 'skill1', name: 'Flecha Resonante', kind: 'Skill 1', explanation: 'Flecha veloz que atravessa até 2 inimigos e aplica 2 Marcas da Presa.', damage: '150% do ATQ', cooldown: '5s', cost: '14 Energia', attributes: ['Perfura 2 alvos', '2 Marcas', 'Bônus contra Presa'], passiveIds: ['huansFlecha'] },
    { key: 'skill2', name: 'Passo do Caçador', kind: 'Skill 2', explanation: 'Deslocamento na direção escolhida, com esquiva e preparação dos próximos ataques.', damage: 'Mobilidade / buff', cooldown: '9s', cost: '20 Energia', attributes: ['Velocidade de Ataque', 'Velocidade de Movimento', 'Crítico ao esquivar'], passiveIds: ['huansPasso'] },
    { key: 'skill3', name: 'Chuva das Cordas', kind: 'Skill 3', explanation: 'Chuva de flechas na área escolhida. Concentra o dano quando existe apenas um alvo.', damage: '280% do ATQ', cooldown: '17s', cost: '40 Energia', attributes: ['3 Marcas', 'Lentidão', '+30% em alvo único'], passiveIds: ['huansChuva'] },
  ],
};

const UnifiedSkillsTab: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  const character = engine.activeCharacter;
  const skills = SKILLS_BY_CHARACTER[character];
  const [skillKey, setSkillKey] = React.useState(skills[0].key);
  const skill = skills.find((item) => item.key === skillKey) ?? skills[0];
  const slot = skill.key.startsWith('skill') ? Number(skill.key.slice(-1)) - 1 : null;
  const skillLevel = slot === null ? 0 : engine.getSkillLevel(slot);
  const baseEnergy = character === 'wins' ? [15, 28, 45] : character === 'huans' ? [14, 20, 40] : [0, 0, 0];
  const shownCost = slot !== null && baseEnergy[slot] ? `${engine.skillEnergyCost(baseEnergy[slot], slot)} Energia` : skill.cost;
  const skillCost = slot === null ? null : engine.skillUpgradeCost(slot);
  const skillRequirement = slot === null ? null : engine.skillUpgradeRequirement(slot);
  const [passiveId, setPassiveId] = React.useState(skill.passiveIds[0]);
  React.useEffect(() => { setSkillKey(SKILLS_BY_CHARACTER[character][0].key); }, [character]);
  React.useEffect(() => { setPassiveId(skill.passiveIds[0]); }, [skill.key]);

  const aklesDef = PASSIVE_DEFS[passiveId];
  const classDef = CLASS_PASSIVE_DEFS[passiveId];
  const passive = aklesDef ?? classDef;
  const level = passive ? engine.getAnyPassiveLevel(passiveId) : 0;
  const values = passive?.values ?? [0, 0, 0, 0, 0];
  const formatValue = (value: number) => aklesDef && passiveId === 'notaPerfeita' ? `a cada ${value} ataques` : `+${Math.round(value * 1000) / 10}%`;
  const cost = passive ? engine.passiveUpgradeCost(passiveId) : null;
  const canUpgrade = passive ? engine.canUpgradePassive(passiveId) : false;
  const upgrade = () => { if (engine.upgradePassive(passiveId)) refresh(); };

  return (
    <div className="h-full min-h-0 grid grid-cols-[180px_minmax(0,1fr)_280px] gap-3">
      <div className="overflow-y-auto space-y-1.5 pr-1">
        {skills.map((item) => <button key={item.key} type="button" onClick={() => setSkillKey(item.key)} className={`w-full text-left rounded-xl border p-2.5 ${item.key === skill.key ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
          <p className="text-[9px] uppercase font-black tracking-wider text-amber-300">{item.kind}</p><p className="text-[11px] font-bold text-white">{item.name}</p>
        </button>)}
      </div>

      <div className="min-w-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">{skill.kind}</p>
        <h4 className="text-xl font-black text-white mt-1">{skill.name}</h4>
        <p className="text-[11px] leading-relaxed text-slate-300 mt-2">{skill.explanation}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[['Dano', `${skill.damage}${slot !== null ? ` · +${(skillLevel - 1) * 10}%` : ''}`], ['Recarga', skill.cooldown], ['Custo', shownCost]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2"><p className="text-[8px] uppercase font-bold text-slate-500">{label}</p><p className="text-[10px] font-bold text-slate-100 mt-1">{value}</p></div>)}
        </div>
        <p className="text-[9px] uppercase font-black tracking-wider text-slate-500 mt-4 mb-2">Atributos e efeitos da Skill</p>
        <div className="grid grid-cols-2 gap-2">{skill.attributes.map((attr) => <div key={attr} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5 text-[10px] font-semibold text-cyan-100">✦ {attr}</div>)}</div>
        {slot !== null && <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-2.5">
          <div className="flex items-center justify-between"><p className="text-[10px] font-black text-emerald-200">Nível da Skill {skillLevel}/5</p><p className="text-[9px] text-slate-400">Dano +10% por nível</p></div>
          {skillRequirement && skillLevel < 5 && <p className={`mt-1.5 text-[9px] font-bold ${skillRequirement.met ? 'text-emerald-300' : 'text-rose-300'}`}>Requisito: {skillRequirement.label} {skillRequirement.current}/{skillRequirement.required}</p>}
          <div className="flex flex-wrap gap-1 mt-2">{skillCost ? Object.entries(skillCost).map(([key, qty]) => <span key={key} className={`rounded-md border px-1.5 py-1 text-[8px] ${(engine.inventory[key] || 0) >= qty ? 'border-emerald-500/30 text-emerald-200' : 'border-rose-500/30 text-rose-200'}`}>{ITEM_META[key]?.icon} {engine.inventory[key] || 0}/{qty}</span>) : <span className="text-[9px] text-amber-300">Nível máximo</span>}</div>
          <button type="button" disabled={slot === null || !engine.canUpgradeSkill(slot)} onClick={() => { if (slot !== null && engine.upgradeSkill(slot)) refresh(); }} className={`mt-2 w-full rounded-lg py-1.5 text-[9px] font-black ${slot !== null && engine.canUpgradeSkill(slot) ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>APRIMORAR SKILL</button>
          {character !== 'akles' && skillLevel < 5 && <p className="mt-1.5 text-[8px] text-slate-500">Ao subir: o dano aumenta e o consumo passa para {engine.skillEnergyCost(baseEnergy[slot], slot) + Math.ceil(baseEnergy[slot] * .08)} de Ressonância.</p>}
        </div>}
        <p className="text-[9px] uppercase font-black tracking-wider text-slate-500 mt-4 mb-2">Passivas vinculadas</p>
        <div className="space-y-1.5">{skill.passiveIds.map((id) => { const def = PASSIVE_DEFS[id] ?? CLASS_PASSIVE_DEFS[id]; const lvl = engine.getAnyPassiveLevel(id); return <button key={id} type="button" onClick={() => setPassiveId(id)} className={`w-full rounded-lg border px-2.5 py-2 text-left flex justify-between ${id === passiveId ? 'border-violet-400 bg-violet-500/10' : 'border-slate-800 bg-slate-900/60'}`}><span className="text-[10px] font-bold text-slate-100">{def.name}</span><span className="text-[9px] text-violet-300">Nv. {lvl}/5</span></button>; })}</div>
      </div>

      <div className="overflow-y-auto rounded-2xl border border-violet-500/30 bg-slate-950/70 p-3">
        {passive && <>
          <p className="text-[9px] uppercase font-black tracking-wider text-violet-300">Passiva selecionada</p>
          <h5 className="text-base font-black text-white mt-1">{passive.name}</h5>
          <p className="text-[10px] leading-relaxed text-slate-400 mt-1.5">{passive.desc}</p>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
            <div className="flex justify-between"><span className="text-[9px] text-slate-500">Atributo da passiva</span><span className="text-[10px] font-black text-violet-200">Nv. {level}/5</span></div>
            <p className="text-[11px] font-bold text-white mt-1">{'attribute' in passive ? passive.attribute : passive.desc}</p>
            <div className="flex gap-1 mt-2">{values.map((value, i) => <div key={i} className={`flex-1 rounded-md border py-1 text-center ${i < level ? 'border-violet-400/60 bg-violet-500/15' : 'border-slate-800 opacity-45'}`}><p className="text-[7px] text-slate-500">{i + 1}</p><p className="text-[8px] font-bold text-slate-200">{formatValue(value)}</p></div>)}</div>
            {level < 5 && <p className="text-[9px] text-emerald-300 mt-2">Próximo: {formatValue(values[level])}</p>}
            {level === 5 && passive.level5Bonus && <p className="text-[9px] text-amber-300 mt-2">★ {passive.level5Bonus}</p>}
          </div>
          <p className="text-[9px] uppercase font-black tracking-wider text-slate-500 mt-3 mb-1.5">Itens para aprimorar</p>
          <div className="space-y-1">{cost ? Object.entries(cost).map(([key, qty]) => <div key={key} className="flex items-center justify-between rounded-lg bg-slate-900/70 border border-slate-800 px-2 py-1.5"><span className="text-[9px] text-slate-300">{ITEM_META[key]?.icon} {ITEM_META[key]?.name ?? key}</span><span className={`text-[9px] font-bold ${(engine.inventory[key] || 0) >= qty ? 'text-emerald-300' : 'text-rose-300'}`}>{engine.inventory[key] || 0}/{qty}</span></div>) : <p className="text-[10px] text-amber-300">Nível máximo alcançado.</p>}</div>
          <button type="button" disabled={!canUpgrade} onClick={upgrade} className={`w-full mt-3 rounded-xl py-2 text-[11px] font-black ${canUpgrade ? 'bg-violet-500 text-white hover:bg-violet-400' : 'bg-slate-800 text-slate-500'}`}>{level >= 5 ? 'PASSIVA NO MÁXIMO' : 'APRIMORAR PASSIVA'}</button>
        </>}
      </div>
    </div>
  );
};

const AKLES_ACTIVE_KIT = [
  ['Skill 1 · Ressonância', '6s de arma energizada e ataques acelerados · Recarga 14s. As passivas ampliam duração, dano, crítico e redução de recarga.'],
  ['Skill 2 · Amplificação', 'A Acordelâmina cresce e golpeia uma área frontal de 92px. Escala com Força, nível, ATQ da arma, dano básico e dano de Skill.'],
  ['Skill 3 · Pulso Harmônico', 'Feixe direcional de longo alcance · Recarga 3,5s. Escala com Inteligência, nível e dano de Skill; agora usa animação progressiva de 16 quadros.'],
] as const;

const ClassSkillsTab: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const char = engine.activeCharacter as 'wins' | 'huans';
  const kit = CLASS_KITS[char];
  const isWins = char === 'wins';
  return (
    <div className="h-full min-h-0 flex gap-3 p-1">
      <aside className={`w-48 shrink-0 rounded-2xl border ${isWins ? 'border-fuchsia-500/35' : 'border-emerald-500/35'} bg-slate-950/65 p-3 flex flex-col`}>
        <div className="h-52 rounded-xl bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.25),rgba(2,6,23,.95)_72%)] overflow-hidden">
          <img src={`/assets/characters/portraits/${char}.webp`} alt={isWins ? 'Wins' : 'Huans'} className="w-full h-full object-contain" />
        </div>
        <p className="mt-2 text-base font-black text-white">{isWins ? 'Wins' : 'Huans'}</p>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${isWins ? 'text-fuchsia-300' : 'text-emerald-300'}`}>
          {isWins ? 'Vocal · Maga Burst / Área' : 'Cordas · Caçador / Crítico'}
        </p>
        <div className="mt-2 text-[9px] leading-relaxed text-slate-400 space-y-1">
          {isWins ? (
            <><p>HP 90 · ATQ 9 · PH 18 · DEF 8</p><p>Crítico 5% / 150% · Energia 120</p><p>Mov. 100% · Ataque 95%</p></>
          ) : (
            <><p>HP 105 · ATQ 16 · PH 8 · DEF 10</p><p>Crítico 8% / 150% · Energia 100</p><p>Mov. 108% · Ataque 108%</p></>
          )}
        </div>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto grid grid-cols-2 gap-3">
        {kit.map(([name, desc], i) => (
          <div key={name} className={`rounded-xl border ${isWins ? 'border-fuchsia-500/30' : 'border-emerald-500/30'} bg-slate-950/60 p-4`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isWins ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{i === 0 ? <Sparkles className="w-5 h-5" /> : <Zap className="w-5 h-5" />}</div>
            <p className="text-sm font-black text-slate-100">{name}</p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{desc}</p>
            {i > 0 && <p className="mt-2 text-[9px] font-bold text-cyan-300/80">Segure o botão · arraste para mirar · solte para lançar</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

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
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {AKLES_ACTIVE_KIT.map(([name, desc], i) => (
            <div key={name} className="rounded-xl border border-cyan-500/25 bg-slate-950/65 p-2.5">
              <p className="text-[10px] font-black text-cyan-200">{i + 1} · {name.replace(/^Skill \d · /, '')}</p>
              <p className="mt-1 text-[9px] leading-snug text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
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
  const shownAttrs = engine?.activeCharacter === 'wins'
    ? [RESONANCE_ATTR, ['inteligencia', 'Poder Harmônico', '🎤', '+2 PH por ponto'] as [AttrKey, string, string, string], ...ATTRS.filter(([key]) => !['inteligencia'].includes(key))]
    : engine?.activeCharacter === 'huans'
      ? [ATTRS.find(([key]) => key === 'agilidade')!, ...ATTRS.filter(([key]) => key !== 'agilidade')]
      : ATTRS;
  const attrValue = (key: AttrKey) => key === 'ressonancia' ? stats.maxEnergy : stats[key];

  return (
    <div className="flex gap-3 h-full">
      <div className="w-52 shrink-0 flex flex-col gap-2">
        <div className="rounded-xl overflow-hidden border-2 border-amber-400/60 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,.2),rgba(2,6,23,.95)_72%)] shadow-lg h-60">
          <img
            src={engine ? `/assets/characters/portraits/${engine.activeCharacter}.webp` : '/icons/icon-512.png'}
            alt={stats.name}
            className="w-full h-full object-contain object-center drop-shadow-[0_12px_18px_rgba(0,0,0,.7)]"
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
          {shownAttrs.map(([key, label, icon, hint]) => (
            <div key={key} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg pl-2.5 pr-1.5 py-1.5">
              <span className="text-[13px] w-5 text-center">{icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] text-slate-200 font-semibold">{label}</span>
                <span className="text-[10px] text-slate-500 ml-1.5">{hint}</span>
              </div>
              <span className="text-sm font-bold text-slate-100 tabular-nums w-9 text-right">{attrValue(key)}</span>
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
      <div className="relative w-full max-w-6xl h-[620px] max-h-[94vh] flex flex-col bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
          {tab === 'skills' && (engine ? <UnifiedSkillsTab engine={engine} /> : null)}
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

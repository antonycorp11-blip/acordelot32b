import React from 'react';
import {
  X,
  Swords,
  Plus,
  ChevronsUp,
  Hammer,
  Gem,
  Zap,
  ChevronLeft,
  User,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { PlayerStats, AttrKey, GameEngine, PassiveGroup, EquipSlot } from '../game/engine';
import { PASSIVE_DEFS, PASSIVE_ORDER, EQUIP_ITEMS, EQUIP_SLOT_ORDER } from '../game/engine';
import type { ToolTier } from '../game/types';

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
// Aba: EQUIPAMENTOS (Aura visual + Catalisador/Anel/Colar só estatística)
// ============================================================================
const EquipamentosTab: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const levelUp = (slot: EquipSlot) => {
    if (engine.levelUpEquip(slot)) force();
  };
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {EQUIP_SLOT_ORDER.map((slot) => {
        const def = EQUIP_ITEMS[slot];
        const lvl = engine.getEquipLevel(slot);
        const equipped = lvl > 0;
        const bonus = engine.equipStatBonus(slot);
        return (
          <div
            key={slot}
            className="rounded-xl border bg-slate-950/50 p-3 flex flex-col items-center gap-1.5 text-center"
            style={{ borderColor: def.color + (equipped ? '66' : '2a') }}
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: def.color }}>
                {def.slot}
              </span>
              {def.visual && (
                <span className="text-[8px] font-black bg-sky-500/20 text-sky-300 px-1 rounded">VISUAL</span>
              )}
            </div>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: def.color + '18', border: `2px solid ${def.color}55` }}
            >
              <Gem className="w-6 h-6" style={{ color: def.color }} />
            </div>
            <p className="text-[11px] font-bold text-slate-100 leading-tight">{def.name}</p>
            <p className="text-[9px] text-slate-500 leading-snug">{def.desc}</p>
            <span className="flex gap-0.5 mt-0.5">
              {Array.from({ length: def.maxLevel }).map((_, i) => (
                <span key={i} className="w-2 h-1 rounded-full" style={{ background: i < lvl ? def.color : '#334155' }} />
              ))}
            </span>
            {equipped ? (
              <p className="text-[10px] font-bold" style={{ color: def.color }}>
                Nv.{lvl} · {def.statLabel} +{bonus}
              </p>
            ) : (
              <p className="text-[10px] text-slate-600">Não equipado</p>
            )}
            <button
              type="button"
              onClick={() => levelUp(slot)}
              disabled={lvl >= def.maxLevel}
              className={`w-full mt-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                lvl >= def.maxLevel
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : equipped
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95'
              }`}
            >
              {lvl >= def.maxLevel ? 'Máximo' : equipped ? 'Upar' : 'Equipar'}
            </button>
          </div>
        );
      })}
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

const SkillsTab: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [group, setGroup] = React.useState<PassiveGroup | null>(null);

  if (group) {
    const g = SKILL_GROUPS.find((x) => x.key === group)!;
    const ids = PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === group);
    return (
      <div className="flex flex-col gap-2 h-full">
        <button
          type="button"
          onClick={() => setGroup(null)}
          className="self-start flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white mb-1"
        >
          <ChevronLeft className="w-4 h-4" /> Skills
        </button>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto pr-1">
          {ids.map((id) => {
            const def = PASSIVE_DEFS[id];
            const lvl = engine.getPassiveLevel(id);
            const val = engine.passiveValue(id);
            return (
              <div key={id} className="rounded-xl border bg-slate-950/60 p-2.5 flex flex-col gap-1.5" style={{ borderColor: g.color + '35' }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-100 leading-tight">{def.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = engine.getPassiveLevel(id);
                      if (cur < 5) {
                        engine.setPassiveLevel(id, cur + 1);
                        force();
                      }
                    }}
                    disabled={lvl >= 5}
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      lvl >= 5 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-90'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="flex-1 h-1 rounded-full" style={{ background: n <= lvl ? g.color : '#334155' }} />
                  ))}
                </span>
                <p className="text-[9px] text-slate-500 leading-snug">{def.desc}</p>
                {lvl > 0 ? (
                  <p className="text-[10px] font-bold" style={{ color: g.color }}>
                    Nv.{lvl}: {fmtPassive(id, val)}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-600">Não aprendida</p>
                )}
                {lvl >= 5 && def.level5Bonus && (
                  <p className="text-[9px] text-amber-300/90 leading-snug border-t border-slate-800 pt-1">★ {def.level5Bonus}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {SKILL_GROUPS.map((g) => {
        const ids = PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === g.key);
        const totalLvls = ids.reduce((s, id) => s + engine.getPassiveLevel(id), 0);
        const maxLvls = ids.length * 5;
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            className="rounded-xl border bg-slate-950/60 p-3 flex flex-col items-center gap-1.5 text-center hover:bg-slate-900 transition-all active:scale-95"
            style={{ borderColor: g.color + '45' }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: g.color + '18', color: g.color }}>
              {g.icon}
            </div>
            <p className="text-[12px] font-bold text-slate-100">{g.label}</p>
            <p className="text-[9px] text-slate-500 leading-snug">{g.blurb}</p>
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-1">
              <div className="h-full" style={{ width: `${(totalLvls / maxLvls) * 100}%`, background: g.color }} />
            </div>
            <p className="text-[9px] text-slate-600">{ids.length} passivas</p>
          </button>
        );
      })}
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
          <img src="/icons/icon-512.png" alt={stats.name} className="w-full h-full object-cover object-top scale-110" />
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
      <div className="relative w-full max-w-3xl h-[560px] max-h-[92vh] flex flex-col bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
          {tab === 'equipamentos' && (engine ? <EquipamentosTab engine={engine} /> : null)}
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

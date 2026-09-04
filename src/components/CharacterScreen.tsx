import React from 'react';
import { X, Swords, Plus, ChevronsUp, Hammer } from 'lucide-react';
import type { PlayerStats, AttrKey, GameEngine } from '../game/engine';
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
}

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

/** Subtela de equipamentos — camada sobre a ficha, sem alterar a ficha em si. */
const EquipmentSubscreen: React.FC<{ engine: GameEngine; onClose: () => void }> = ({
  engine,
  onClose,
}) => {
  const [, force] = React.useReducer((n) => n + 1, 0);
  const pick = (kind: 'axe' | 'pick', tier: ToolTier) => {
    engine.equipTool(kind, tier);
    force();
  };
  const rows: Array<{
    kind: 'axe' | 'pick';
    title: string;
    icon: string;
    owned: ToolTier[];
    equipped: ToolTier;
    src: (t: ToolTier) => string;
  }> = [
    {
      kind: 'axe',
      title: 'Machado (madeira)',
      icon: '🪓',
      owned: engine.ownedAxes,
      equipped: engine.equippedAxe,
      src: (t) => `/assets/tools/axe_${t}.png`,
    },
    {
      kind: 'pick',
      title: 'Picareta (pedra)',
      icon: '⛏️',
      owned: engine.ownedPicks,
      equipped: engine.equippedPick,
      src: (t) => `/assets/tools/pick_${t}.png`,
    },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-2">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-md flex flex-col bg-slate-900/97 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/60">
          <h3 className="text-[13px] font-bold text-cyan-200 tracking-wide flex items-center gap-1.5">
            <Hammer className="w-4 h-4" /> Equipamentos
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-3">
          <p className="text-[10px] text-slate-400 leading-snug">
            A ferramenta equipada aparece ao lado do Akles e bate no recurso durante a coleta.
          </p>
          {rows.map((r) => (
            <div key={r.kind} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
              <p className="text-[11px] font-bold text-slate-200 mb-1.5">
                {r.icon} {r.title}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
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
                      className={`relative flex flex-col items-center gap-1 rounded-lg border-2 px-1 py-1.5 transition-all ${
                        on
                          ? `${m.ring} bg-slate-800 ring-2 ring-cyan-400/60`
                          : has
                            ? 'border-slate-700 bg-slate-900 hover:border-slate-500 active:scale-95'
                            : 'border-slate-800 bg-slate-950 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <img
                        src={r.src(t)}
                        alt={m.label}
                        className="h-12 w-12 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
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
        </div>
      </div>
    </div>
  );
};

const ATTRS: Array<[AttrKey, string, string, string]> = [
  ['forca', 'Força', '💪', 'dano corpo-a-corpo'],
  ['agilidade', 'Agilidade', '🏃', 'velocidade de movimento'],
  ['vitalidade', 'Vitalidade', '🛡️', '+5 vida máx. por ponto'],
  ['inteligencia', 'Inteligência', '📖', 'dano do Canhão de Luz'],
  ['sorte', 'Sorte', '🍀', 'chance de drops raros'],
];

/** Ficha em paisagem: retrato à esquerda, atributos à direita, poder embaixo. */
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
}) => {
  const [showEquip, setShowEquip] = React.useState(false);
  const [, forceTick] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => {
    if (!open) setShowEquip(false);
  }, [open]);
  if (!open) return null;
  const hasPoints = stats.attrPoints > 0;
  const xpPct = Math.min(100, (stats.xp / stats.xpNext) * 100);
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[96vh] flex flex-col bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/70 bg-slate-950/50 shrink-0">
          <h3 className="text-[13px] font-bold text-amber-200 tracking-wide">Ficha — {stats.name}</h3>
          <div className="flex items-center gap-1">
            {engine && (
              <button
                type="button"
                onClick={() => setShowEquip(true)}
                className="cursor-pointer flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 hover:border-cyan-400/70 rounded-md px-2 py-1 transition-colors"
                title="Equipamentos"
              >
                <Hammer className="w-3.5 h-3.5" /> Equipar
              </button>
            )}
            <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 flex gap-3">
          {/* Coluna esquerda: retrato + vida/xp */}
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

            {/* Partituras — consumidas ao subir de nível */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400">🎵 Partituras</span>
                {engine && (
                  <span className="text-[9px] text-amber-300/90">
                    +{engine.partituraXpAvailable} XP
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {PARTITURA_ROWS.map(([key, label, color]) => (
                  <div
                    key={key}
                    className="flex-1 rounded-md border bg-slate-900/70 py-1 text-center"
                    style={{ borderColor: color + '55' }}
                    title={label}
                  >
                    <div className="text-[10px] font-black" style={{ color }}>
                      {inventory?.[key] ?? 0}
                    </div>
                    <div className="text-[8px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-slate-600 leading-tight mt-1">
                Sintetize partituras com claves na Síntese de Partituras.
              </p>
            </div>
          </div>

          {/* Coluna direita: atributos + poder */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {hasPoints && (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/50 px-2.5 py-1 text-center text-[12px] font-bold text-emerald-300">
                {stats.attrPoints} ponto{stats.attrPoints > 1 ? 's' : ''} para distribuir
              </div>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {ATTRS.map(([key, label, icon, hint]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg pl-2.5 pr-1.5 py-1.5"
                >
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
                      hasPoints
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-90'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
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
            <p className="text-[9px] text-slate-500 leading-snug">
              Força×2,4 + Agilidade×1,8 + Vitalidade×2,0 + Inteligência×1,5 + Sorte×1,1 + Nível×6 +
              VidaMáx×0,25
            </p>
          </div>
        </div>

        {engine && showEquip && (
          <EquipmentSubscreen engine={engine} onClose={() => setShowEquip(false)} />
        )}
      </div>
    </div>
  );
};

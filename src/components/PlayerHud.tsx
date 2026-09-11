import React from 'react';
import { Target } from 'lucide-react';
import type { PlayerStats } from '../game/engine';

export type EfeitoAtivo = { id: 'veneno' | 'silencio' | 'lentidao'; restante: number };

/**
 * Os efeitos que o jogador esta sofrendo AGORA.
 *
 * Antes eles so apareciam num popup no instante do golpe. Depois disso, o
 * jogador andava envenenado, calado ou lento sem nenhum jeito de saber — e
 * descobria pela skill que nao saia ou pela vida que caia sozinha. Efeito que
 * pune sem se mostrar nao e dificuldade, e confusao.
 */
const EFEITO: Record<EfeitoAtivo['id'], { nome: string; icone: string; cor: string; aro: string }> = {
  veneno:   { nome: 'Veneno',   icone: '☠', cor: 'text-lime-300',  aro: 'border-lime-400/60 bg-lime-950/80' },
  silencio: { nome: 'Silêncio', icone: '✖', cor: 'text-violet-300', aro: 'border-violet-400/60 bg-violet-950/80' },
  lentidao: { nome: 'Lentidão', icone: '❄', cor: 'text-sky-300',   aro: 'border-sky-400/60 bg-sky-950/80' },
};

interface PlayerHudProps {
  stats: PlayerStats;
  efeitos?: EfeitoAtivo[];
  onOpenSheet: () => void;
  questObjective?: { title: string; text: string; ready: boolean } | null;
  onOpenQuests?: () => void;
  portraitSrc?: string;
  coins?: number;
  goldRaw?: number;
  goldRefined?: number;
}

/** Canto superior esquerdo: retrato + barra de vida + barra de XP + objetivo da missão ativa. */
export const PlayerHud: React.FC<PlayerHudProps> = ({ stats, efeitos = [], onOpenSheet, questObjective, onOpenQuests, portraitSrc, coins = 0, goldRaw = 0, goldRefined = 0 }) => {
  const [objectiveExpanded, setObjectiveExpanded] = React.useState(false);
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const xpPct = Math.max(0, Math.min(100, (stats.xp / stats.xpNext) * 100));
  const energyPct = Math.max(0, Math.min(100, (stats.energy / stats.maxEnergy) * 100));

  return (
    <div
      className="fixed z-30 flex items-center gap-2 pointer-events-auto"
      style={{
        top: 'calc(10px + env(safe-area-inset-top))',
        left: 'calc(10px + env(safe-area-inset-left))',
      }}
    >
      {/* Retrato */}
      <button
        type="button"
        onClick={onOpenSheet}
        className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400/70 bg-slate-900 shadow-lg shrink-0 active:scale-95 transition-transform"
        title="Ficha do personagem (C)"
      >
        <img
          src={portraitSrc ?? '/icons/icon-192.png'}
          alt={stats.name}
          className="w-full h-full object-cover object-top"
        />
        <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-amber-300 text-[10px] font-bold text-center leading-tight">
          Lv {stats.level}
        </span>
      </button>

      {/* Barras */}
      <div className="w-32 sm:w-48">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-100 mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <span>{stats.name}</span>
          <span className="tabular-nums">
            {Math.round(stats.hp)}/{stats.maxHp}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-950/85 border border-slate-700 overflow-hidden shadow">
          <div
            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        {efeitos.length > 0 && (
          <div className="mt-1 flex gap-1">
            {efeitos.map((ef) => {
              const meta = EFEITO[ef.id];
              return (
                <span key={ef.id} title={meta.nome}
                  className={`flex items-center gap-0.5 rounded border px-1 py-px text-[9px] font-bold leading-none ${meta.aro} ${meta.cor}`}>
                  <span className="text-[10px]">{meta.icone}</span>
                  <span className="tabular-nums">{Math.ceil(ef.restante)}s</span>
                </span>
              );
            })}
          </div>
        )}
        <div className="mt-1 h-1.5 rounded-full bg-slate-950/80 border border-slate-700/70 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-300"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center gap-1">
          <div className="flex-1 h-1.5 rounded-full bg-slate-950/80 border border-violet-900/80 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-300 transition-all duration-200" style={{ width: `${energyPct}%` }} />
          </div>
          <span className="text-[8px] font-bold text-fuchsia-200 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">{Math.round(stats.energy)}/{Math.round(stats.maxEnergy)}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[8px] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">
          <span className="flex items-center gap-0.5 rounded bg-slate-950/80 border border-amber-500/30 px-1 text-amber-300" title="Claves">
            <img src="/assets/items/clave.png" alt="" className="w-3 h-3 object-contain" /> {coins}
          </span>
          <span className="flex items-center gap-0.5 rounded bg-slate-950/80 border border-yellow-600/30 px-1 text-yellow-300" title="Ouro bruto">
            <img src="/assets/items/props/gold_raw.png" alt="" className="w-3 h-3 object-contain" /> {goldRaw}
          </span>
          <span className="flex items-center gap-0.5 rounded bg-slate-950/80 border border-yellow-100/30 px-1 text-yellow-100" title="Ouro sintetizado">
            <img src="/assets/items/props/gold_refined.png" alt="" className="w-3 h-3 object-contain" /> {goldRefined}
          </span>
        </div>

        {/* Objetivo ativo: primeiro expande; o segundo toque abre o diário. */}
        {questObjective && (
          <div className={`mt-1 w-full rounded-md bg-slate-950/88 border transition-all ${
              questObjective.ready ? 'border-emerald-500/60' : 'border-slate-700/70'
            }`}>
            <button type="button" onClick={() => setObjectiveExpanded((value) => !value)} className="flex w-full items-center gap-1 px-1.5 py-1 text-left">
              <Target className={`w-3 h-3 shrink-0 ${questObjective.ready ? 'text-emerald-400' : 'text-emerald-300/80'}`} />
              <span className={`text-[9px] font-semibold text-slate-200 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${objectiveExpanded ? '' : 'truncate'}`}>
                {objectiveExpanded ? questObjective.title : questObjective.text}
              </span>
              <span className="ml-auto text-[8px] text-slate-500">{objectiveExpanded ? '▲' : '▼'}</span>
            </button>
            {objectiveExpanded && (
              <div className="border-t border-slate-800 px-2 py-1.5">
                <p className="text-[9px] leading-snug text-slate-300">{questObjective.text}</p>
                <button type="button" onClick={onOpenQuests} className="mt-1 w-full rounded bg-violet-600/80 py-1 text-[9px] font-black text-white active:scale-95">Abrir Missões</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

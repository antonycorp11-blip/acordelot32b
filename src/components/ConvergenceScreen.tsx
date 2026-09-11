import React, { useState } from 'react';
import { Sparkles, X, History, ShieldCheck, Info } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import { ITEM_META } from '../game/engine';
import * as Gacha from '../game/gacha';

interface Props {
  open: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  inventory: Record<string, number>;
}

const COR: Record<Gacha.Raridade, string> = {
  comum: '#94a3b8',
  raro: '#60a5fa',
  epico: '#c084fc',
  lendario: '#fbbf24',
};
const NOME_RARIDADE: Record<Gacha.Raridade, string> = {
  comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
};
const pct = (n: number) => `${(n * 100).toFixed(2).replace('.', ',')}%`;

/**
 * A CONVERGÊNCIA DOS ECOS.
 *
 * O plano proíbe "botão sem explicação". Então a tela mostra, ANTES de o
 * jogador gastar: as duas taxas (a do acaso e a que ele realmente observa), o
 * que cada garantia promete e quanto falta para ela, a regra de duplicata, e o
 * histórico com a marca de quando foi a garantia que trouxe o prêmio.
 *
 * As duas taxas aparecem juntas de propósito. A garantia de lendário dispara na
 * maioria das janelas, então a chance observada é o triplo da base — mostrar só
 * a base seria mentira, e mostrar só a efetiva faria o jogador pensar que cada
 * chamado tem 3% independentes. As duas, com nome, é o que é verdade.
 */
export const ConvergenceScreen: React.FC<Props> = ({ open, onClose, engine, inventory }) => {
  const [ultimo, setUltimo] = useState<Gacha.Resultado | null>(null);
  const [verTaxas, setVerTaxas] = useState(false);
  const [, forcar] = useState(0);
  if (!open || !engine) return null;

  const estado = engine.convergencia;
  const faltam = Gacha.faltamPara(estado);
  const gratis = !engine.convergenciaTutorialUsada;
  const { pode, motivo } = engine.podeConvergir();
  const pó = inventory[Gacha.CUSTO.item] ?? 0;

  const convergir = () => {
    const r = engine.convergir();
    if (r) { setUltimo(r); forcar((n) => n + 1); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3">
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-600/40 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl">

        <header className="flex items-center gap-3 border-b border-amber-600/25 bg-amber-950/20 px-4 py-3">
          <Sparkles className="h-6 w-6 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <h2 className="truncate font-serif text-lg text-amber-200">Convergência dos Ecos</h2>
            <p className="text-[11px] text-slate-400">A partitura que chama em vez de tocar</p>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            className="ml-auto rounded-full border border-rose-500/40 bg-rose-950/40 p-2 text-rose-200 transition hover:bg-rose-900/60">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">

          {/* GARANTIAS — o que está prometido e quanto falta */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {([['raro', faltam.raro, Gacha.GARANTIA_RARO], ['lendario', faltam.lendario, Gacha.GARANTIA_LENDARIO]] as const).map(
              ([r, falta, total]) => (
                <div key={r} className="rounded-lg border px-3 py-2"
                  style={{ borderColor: `${COR[r as Gacha.Raridade]}55`, background: `${COR[r as Gacha.Raridade]}12` }}>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: COR[r as Gacha.Raridade] }}>
                    <ShieldCheck className="h-3 w-3" /> Garantia {NOME_RARIDADE[r as Gacha.Raridade]}
                  </div>
                  <div className="mt-1 text-sm text-slate-200">
                    {falta === 0 ? 'No próximo chamado' : `Faltam ${falta}`}
                    <span className="text-slate-500"> · a cada {total}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${((total - falta) / total) * 100}%`, background: COR[r as Gacha.Raridade] }} />
                  </div>
                </div>
              ),
            )}
          </div>

          {/* RESULTADO */}
          {ultimo && (
            <div className="mb-3 rounded-xl border-2 p-4 text-center"
              style={{ borderColor: COR[ultimo.premio.raridade], background: `${COR[ultimo.premio.raridade]}14` }}>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COR[ultimo.premio.raridade] }}>
                {NOME_RARIDADE[ultimo.premio.raridade]}
                {ultimo.garantido && ' · pela garantia'}
              </div>
              {ITEM_META[ultimo.premio.item]?.img && (
                <img src={ITEM_META[ultimo.premio.item].img} alt="" className="mx-auto my-2 h-16 w-16 object-contain" />
              )}
              <div className="font-serif text-xl text-white">{ultimo.premio.nome}</div>
              <div className="mt-0.5 text-sm text-slate-300">
                ×{ultimo.entrega.quantidade}
              </div>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-400">{ultimo.premio.descricao}</p>
              {ultimo.duplicata && ultimo.compensacao && (
                <div className="mt-2 inline-block rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] text-cyan-200">
                  Repetido — o prêmio veio inteiro, e ainda devolveu {ultimo.compensacao.quantidade} de Poeira de Eco
                </div>
              )}
            </div>
          )}

          {/* AÇÃO */}
          <button onClick={convergir} disabled={!pode}
            className={`w-full rounded-xl py-3.5 font-serif text-base tracking-wide transition ${
              pode ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 hover:brightness-110 active:scale-[.99]'
                   : 'cursor-not-allowed bg-slate-800 text-slate-500'}`}>
            {gratis ? 'CONVERGIR — o primeiro é por conta de Lucian'
                    : pode ? `CONVERGIR — ${Gacha.CUSTO.quantidade} de Poeira de Eco`
                           : motivo}
          </button>
          <div className="mt-1.5 text-center text-[11px] text-slate-500">
            Você tem {pó} de Poeira de Eco
          </div>

          {/* TAXAS */}
          <button onClick={() => setVerTaxas((v) => !v)}
            className="mt-3 flex w-full items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-slate-800/60">
            <Info className="h-3.5 w-3.5" /> Probabilidades {verTaxas ? '▴' : '▾'}
          </button>
          {verTaxas && (
            <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <span>Raridade</span><span className="text-right">Acaso</span><span className="text-right">Com garantia</span>
              </div>
              {(['lendario', 'epico', 'raro', 'comum'] as Gacha.Raridade[]).map((r) => (
                <div key={r} className="grid grid-cols-[1fr_auto_auto] gap-x-3 py-1 text-xs">
                  <span style={{ color: COR[r] }}>{NOME_RARIDADE[r]}</span>
                  <span className="text-right tabular-nums text-slate-500">{pct(Gacha.TAXAS[r])}</span>
                  <span className="text-right font-bold tabular-nums text-slate-200">{pct(Gacha.TAXAS_EFETIVAS[r])}</span>
                </div>
              ))}
              <p className="mt-2 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-400">
                A coluna <b className="text-slate-300">com garantia</b> é a chance que você observa de verdade, já contando
                as garantias acima. A coluna <b>acaso</b> é o sorteio puro, sem elas.
                Prêmio repetido vem inteiro e ainda devolve Poeira de Eco.
                Wins e Huans não saem daqui — companheiros vêm da história.
              </p>
            </div>
          )}

          {/* HISTÓRICO */}
          {estado.historico.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <History className="h-3 w-3" /> Histórico ({estado.historico.length})
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40">
                {estado.historico.map((h, i) => {
                  const premio = Gacha.PREMIOS.find((p) => p.id === h.premio);
                  return (
                    <div key={i} className="flex items-center gap-2 border-b border-slate-800/60 px-2.5 py-1.5 text-xs last:border-0">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: COR[h.raridade] }} />
                      <span className="truncate text-slate-300">{premio?.nome ?? h.premio}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-slate-500">
                        {h.garantido && 'garantia'}{h.garantido && h.duplicata && ' · '}{h.duplicata && 'repetido'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

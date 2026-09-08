import React, { useState } from 'react';
import { LockKeyhole, Swords, X } from 'lucide-react';
import { DUNGEON_DIFFICULTIES } from '../game/crystalDungeon';
import './dungeonEntrance.css';

interface Props {
  open: boolean;
  power: number;
  onClose: () => void;
  onEnter: (difficultyId: number) => { ok: boolean; message: string } | undefined;
}
const MONSTERS = [
  { name: 'Aranha da Pauta', role: 'Veneno persistente', image: 'aranha' },
  { name: 'Nocturno Alado', role: 'Lentidão', image: 'nocturno' },
  { name: 'Maestro Esqueleto', role: 'Armadura elevada', image: 'maestro' },
  { name: 'Dama do Silêncio', role: 'Silencia habilidades', image: 'dama' },
  { name: 'Guardião Cristalino', role: 'Chefe · ataques sinalizados · fúria', image: 'colosso' },
];
export function DungeonEntranceScreen({open,power,onClose,onEnter}:Props) {
  const [selected,setSelected]=useState(1);
  const [message,setMessage]=useState('');
  if(!open)return null;
  const difficulty=DUNGEON_DIFFICULTIES.find(d=>d.id===selected)!;
  const locked=power<difficulty.requiredPower;
  return <div className="dungeon-backdrop">
    <section className="dungeon-entry" role="dialog" aria-modal="true" aria-labelledby="dungeon-title">
      <header className="dungeon-header">
        <div><small>ALÉM DA FRONTEIRA ORIENTAL</small><h2 id="dungeon-title">Caverna de Cristal</h2></div>
        <span className="dungeon-power"><Swords size={18}/><span>Seu poder <b>{power}</b></span></span>
        <button onClick={onClose} aria-label="Fechar preparação da caverna"><X size={22}/></button>
      </header>
      <main className="dungeon-body">
        <section className="dungeon-bestiary">
          <h3>O que espreita no escuro</h3>
          <div className="dungeon-monsters">{MONSTERS.map(m=><div className={`dungeon-monster ${m.image==='colosso'?'dungeon-boss':''}`} key={m.image}>
            <span className="dungeon-sprite" style={{backgroundImage:`url(/assets/monsters/${m.image}.png)`}}/>
            <span><b>{m.name}</b><small>{m.role}</small></span>
          </div>)}</div>
          <p className="dungeon-lore">O som dos seus passos retorna… mas nem sempre no mesmo ritmo.</p>
        </section>
        <section className="dungeon-preparation">
          <div className="dungeon-section-heading"><h3>Escolha a expedição</h3><span>Nv. {difficulty.enemyLevel}–{difficulty.enemyLevel+6}</span></div>
          <div className="dungeon-levels">{DUNGEON_DIFFICULTIES.map(d=><button key={d.id} aria-pressed={selected===d.id} onClick={()=>{setSelected(d.id);setMessage('');}}>
            {power<d.requiredPower?<LockKeyhole size={15}/>:<span className="dungeon-level-number">{d.id}</span>}
            <span><b>{d.name}</b><small>Poder mínimo {d.requiredPower}</small></span>
          </button>)}</div>
          <div className="dungeon-loot"><h3>Tesouros das oito câmaras</h3>
            <p>Ouro bruto · Cristais azuis · Partituras<br/><strong>Baú final:</strong> cristal refinado e Partitura de Prata.</p>
            <small>54 inimigos, incluindo o chefe. Baús protegidos pelos guardiões de cada sala. Recompensas ×{difficulty.rewardMultiplier}.</small>
          </div>
        </section>
      </main>
      <footer className="dungeon-footer">
        <p role="status">{message || (locked ? `Faltam ${difficulty.requiredPower-power} pontos de poder.` : 'Você entrará em um interior separado. Sair e voltar preserva a expedição; trocar a dificuldade inicia outra.')}</p>
        <button className="dungeon-enter" disabled={locked} onClick={()=>{const result=onEnter(selected);if(result&&!result.ok)setMessage(result.message);}}><Swords size={18}/>{locked?'Poder insuficiente':'Entrar na caverna'}</button>
      </footer>
    </section>
  </div>;
}

import React from 'react';
import {
  X, User, Gem, Zap, Sparkles, Swords, Sword, Shield, Heart, Target,
  BatteryCharging, ChevronRight, Lock, CircleDot, FlaskConical, Music2,
  ArrowUp, CheckCircle2, Hammer, Wind, Star, ShieldCheck, Gauge, Layers,
} from 'lucide-react';
import type { PlayerStats, AttrKey, GameEngine, EquipSlotKey, StatKey, PlayerCharacterKey } from '../game/engine';
import {
  PASSIVE_DEFS, PASSIVE_ORDER, CLASS_PASSIVE_DEFS, EQUIP_SETS,
  EQUIP_SLOT_ORDER, EQUIP_SLOT_LABEL, STAT_LABELS, ITEM_META,
} from '../game/engine';
import { equipSetClass } from '../game/catalogData';
import type { ToolTier } from '../game/types';

type Tab = 'ficha' | 'ferramentas' | 'equipamentos' | 'skills';

interface Props {
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

const GOLD = '#f7c84b';
const PORTRAIT: Record<PlayerCharacterKey, string> = {
  akles: '/assets/characters/hero_base.png',
  wins: '/assets/characters/portraits/wins.webp',
  huans: '/assets/characters/portraits/huans.webp',
};
const CHARACTER_COPY: Record<PlayerCharacterKey, { title: string; role: string; quote: string; tags: string[] }> = {
  akles: { title: 'Cavaleiro Errante', role: 'Teclas', quote: 'Cada nota é um novo começo.', tags: ['Teclas', 'Humano', 'Aventureiro'] },
  wins: { title: 'Arauto da Voz', role: 'Vocal', quote: 'A voz encontra aquilo que o silêncio esconde.', tags: ['Vocal', 'Maga', 'Controle'] },
  huans: { title: 'Caçador das Cordas', role: 'Cordas', quote: 'Uma presa, uma corda, um único compasso.', tags: ['Cordas', 'Caçador', 'Crítico'] },
};

const SLOT_ICON: Record<EquipSlotKey, React.ComponentType<{ className?: string }>> = {
  colar: CircleDot, anel: Gem, aura: Wind, catalisador: FlaskConical,
};
const STAT_ICON: Partial<Record<StatKey, React.ComponentType<{ className?: string }>>> = {
  hpPct: Heart, atkPct: Sword, defPct: Shield, critChancePct: Target,
  energyMaxPct: BatteryCharging, skillDmgPct: Sparkles, atkSpeedPct: Gauge,
};
const TABS: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'ficha', label: 'Personagem', icon: User },
  { key: 'equipamentos', label: 'Equipamentos', icon: Hammer },
  { key: 'skills', label: 'Skills', icon: Zap },
  { key: 'ferramentas', label: 'Atributos Avançados', icon: Sparkles },
];

type SkillInfo = {
  key: string; name: string; kind: string; explanation: string; damage: string;
  cooldown: string; cost: string; color: string; passiveIds: string[];
};
const SKILLS: Record<PlayerCharacterKey, SkillInfo[]> = {
  akles: [
    { key: 'basic', name: 'Compasso da Lâmina', kind: 'Ataque Básico', explanation: 'Executa uma sequência rítmica de golpes. Ataques consecutivos mantêm o compasso e pressionam inimigos próximos.', damage: '100%', cooldown: 'Ataque', cost: 'Sem custo', color: '#f6c746', passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'basico') },
    { key: 'skill1', name: 'Ressonância', kind: 'Habilidade', explanation: 'Energiza a arma e acelera o combate durante 6 segundos.', damage: 'Buff', cooldown: '14s', cost: 'Sem custo', color: '#38bdf8', passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'ressonancia') },
    { key: 'skill2', name: 'Amplificação', kind: 'Habilidade', explanation: 'Amplia a Acordelâmina e desfere um poderoso golpe frontal em área.', damage: '220%', cooldown: 'Ataque', cost: 'Sem custo', color: '#8b5cf6', passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'amplificacao') },
    { key: 'skill3', name: 'Pulso Harmônico', kind: 'Especial', explanation: 'Dispara um feixe harmônico progressivo na direção escolhida.', damage: '250%', cooldown: '3,5s', cost: 'Sem custo', color: '#f59e0b', passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'pulso') },
    { key: 'general', name: 'Afinação Permanente', kind: 'Passiva', explanation: 'Maestrias permanentes que fortalecem todo o kit de Akles.', damage: 'Contínuo', cooldown: 'Sempre', cost: 'Passivo', color: '#a78bfa', passiveIds: PASSIVE_ORDER.filter((id) => PASSIVE_DEFS[id].group === 'geral') },
  ],
  wins: [
    { key: 'general', name: 'Ressonância Vocal', kind: 'Passiva', explanation: 'Skills aplicam até 3 Notas. A terceira explode, recupera Energia e deixa o alvo Resonante.', damage: '60% PH', cooldown: 'Automática', cost: 'Passivo', color: '#d946ef', passiveIds: ['winsRessonanciaVocal'] },
    { key: 'skill1', name: 'Nota Perfurante', kind: 'Habilidade', explanation: 'Onda vocal em linha reta que atravessa inimigos e aplica 1 Nota Vocal.', damage: '135% PH', cooldown: '5s', cost: '15 Energia', color: '#38bdf8', passiveIds: ['winsNotaPerfurante'] },
    { key: 'skill2', name: 'Coro Dissonante', kind: 'Controle', explanation: 'Cria uma área sonora que causa dano periódico, lentidão e Silenciamento.', damage: '80% + 35%/s', cooldown: '11s', cost: '28 Energia', color: '#8b5cf6', passiveIds: ['winsCoroDissonante'] },
    { key: 'skill3', name: 'Ária do Clímax', kind: 'Especial', explanation: 'Grande finalizador frontal. Consome Notas e amplifica o dano por acúmulo.', damage: '320% PH', cooldown: '18s', cost: '45 Energia', color: '#f59e0b', passiveIds: ['winsAriaClimax'] },
  ],
  huans: [
    { key: 'general', name: 'Instinto do Caçador', kind: 'Passiva', explanation: 'Ataques aplicam até 5 Marcas da Presa, aumentando dano e chance crítica.', damage: '+2%/Marca', cooldown: '6s', cost: 'Passivo', color: '#22c55e', passiveIds: ['huansInstinto'] },
    { key: 'skill1', name: 'Flecha Resonante', kind: 'Habilidade', explanation: 'Flecha veloz que atravessa dois inimigos e aplica 2 Marcas da Presa.', damage: '150% ATQ', cooldown: '5s', cost: '14 Energia', color: '#38bdf8', passiveIds: ['huansFlecha'] },
    { key: 'skill2', name: 'Passo do Caçador', kind: 'Mobilidade', explanation: 'Deslocamento com esquiva que prepara os próximos ataques básicos.', damage: 'Buff', cooldown: '9s', cost: '20 Energia', color: '#8b5cf6', passiveIds: ['huansPasso'] },
    { key: 'skill3', name: 'Chuva das Cordas', kind: 'Especial', explanation: 'Chuva de flechas que se concentra quando existe apenas um alvo.', damage: '280% ATQ', cooldown: '17s', cost: '40 Energia', color: '#f59e0b', passiveIds: ['huansChuva'] },
  ],
};

const Panel: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`ac-panel rounded-[14px] border border-[#263854] bg-[#071326]/82 shadow-[inset_0_1px_rgba(255,255,255,.025)] ${className}`}>{children}</div>
);

const MaterialCards: React.FC<{ cost: Record<string, number> | null; inventory: Record<string, number> }> = ({ cost, inventory }) => {
  const [selected, setSelected] = React.useState<string | null>(null);
  const selectedNeed = selected && cost ? cost[selected] : 0;
  const selectedMeta = selected ? ITEM_META[selected] : null;
  return <div className="relative flex min-w-0 gap-2">
    {selected && selectedMeta && <button type="button" aria-label="Fechar detalhes do material" onClick={() => setSelected(null)} className="absolute bottom-[calc(100%+7px)] left-0 z-40 w-[245px] rounded-xl border border-[#d2a83d]/60 bg-[#071326]/98 p-3 text-left shadow-[0_12px_35px_rgba(0,0,0,.65),0_0_18px_rgba(247,200,75,.12)]">
      <span className="flex items-center gap-3">{selectedMeta.img ? <img src={selectedMeta.img} alt="" className="h-10 w-10 object-contain" /> : <span className="text-2xl">{selectedMeta.icon}</span>}<span><b className="block text-xs text-[#ffe176]">{selectedMeta.name}</b><span className="text-[10px] text-[#a8b7ce]">Você tem {inventory[selected] ?? 0} · Necessário {selectedNeed}</span></span></span>
      <span className="mt-2 block text-[10px] leading-relaxed text-[#91a3bf]">{selectedMeta.desc ?? 'Material usado no aprimoramento e evolução.'}</span>
    </button>}
    {cost ? Object.entries(cost).slice(0, 4).map(([key, need], i) => {
      const meta = ITEM_META[key];
      const have = inventory[key] ?? 0;
      const ok = have >= need;
      return <button key={key} type="button" aria-label={`Ver ${meta?.name ?? key}`} onClick={() => setSelected(selected === key ? null : key)} className={`ac-material min-w-0 flex-1 rounded-[10px] border p-1.5 text-center transition active:scale-95 ${selected === key ? 'border-[#ffe176] bg-[#5a4012]/40 ring-2 ring-[#f7c84b]/30' : ok ? 'border-emerald-500/55 bg-emerald-950/25' : i === 0 ? 'border-sky-400/60 bg-sky-950/25' : 'border-violet-500/45 bg-violet-950/20'}`}>
        <div className="mx-auto flex h-9 items-center justify-center">
          {meta?.img ? <img src={meta.img} alt="" className="h-9 w-9 object-contain" /> : <span className="text-2xl">{meta?.icon ?? '◆'}</span>}
        </div>
        <p className={`text-[10px] font-black tabular-nums ${ok ? 'text-white' : 'text-rose-300'}`}>{have}/{need}</p>
      </button>;
    }) : <div className="flex h-16 flex-1 items-center justify-center text-xs font-bold text-amber-300">Nível máximo alcançado</div>}
  </div>;
};

function findPiece(engine: GameEngine, key: string | null) {
  if (!key) return null;
  for (const set of EQUIP_SETS.filter((s) => equipSetClass(s) === engine.characterClassKey)) {
    for (const slot of EQUIP_SLOT_ORDER) if (set.pieces[slot].key === key) return { set, piece: set.pieces[slot], slot };
  }
  return null;
}

const Roster: React.FC<{ engine: GameEngine; refresh: () => void }> = ({ engine, refresh }) => {
  const all: PlayerCharacterKey[] = ['akles', 'wins', 'huans'];
  return <aside className="ac-roster flex w-[8.5%] min-w-[70px] flex-col items-center gap-3 border-r border-[#263854] bg-[#071225]/70 py-4">
    {all.map((key) => {
      const unlocked = engine.availableCharacters.includes(key);
      const active = engine.activeCharacter === key;
      return <button key={key} type="button" disabled={!unlocked} onClick={() => { engine.switchCharacter(key); refresh(); }} className={`relative h-[72px] w-[72px] max-h-[9vh] max-w-[9vh] overflow-hidden rounded-full border-2 bg-[#0b1930] transition ${active ? 'border-[#f7c84b] shadow-[0_0_18px_rgba(247,200,75,.35)]' : unlocked ? 'border-[#60769a] hover:border-white' : 'border-[#34445e] opacity-45'}`}>
        <img src={PORTRAIT[key]} alt={key} className="h-full w-full object-contain object-top scale-[1.45] translate-y-2" />
        {!unlocked && <span className="absolute inset-0 grid place-items-center bg-[#071225]/72"><Lock className="h-5 w-5 text-slate-400" /></span>}
        {active && <span className="absolute inset-x-1 bottom-0 rounded-full bg-[#071225]/90 py-0.5 text-[9px] font-black text-white">Nv. {engine.stats.level}</span>}
      </button>;
    })}
    <div className="mt-auto grid h-[68px] w-[68px] max-h-[8.5vh] max-w-[8.5vh] place-items-center rounded-full border-2 border-[#34445e] bg-[#091429]"><Lock className="h-5 w-5 text-[#64748b]" /></div>
  </aside>;
};

const CharacterTab: React.FC<{ engine: GameEngine; power: number; canLevelUp: boolean; onLevelUp: () => void; inventory: Record<string, number>; refresh: () => void; onEquipment: (slot: EquipSlotKey, key: string) => void }> = ({ engine, power, canLevelUp, onLevelUp, inventory, refresh, onEquipment }) => {
  const s = engine.stats;
  const key = engine.activeCharacter;
  const copy = CHARACTER_COPY[key];
  const xpPct = Math.min(100, s.xp / Math.max(1, s.xpNext) * 100);
  const equipped = EQUIP_SLOT_ORDER.map((slot) => findPiece(engine, engine.equippedPieces[slot])).filter(Boolean).slice(0, 3);
  const levelCost = { partitura_bronze: 3, clave: 5, crystal_blue_raw: 1 };
  return <div className="flex h-full min-h-0">
    <Roster engine={engine} refresh={refresh} />
    <section className="ac-character-stage ac-stage relative w-[42%] min-w-[290px] overflow-hidden border-r border-[#263854] bg-[#061123]">
      <img src="/assets/ui/character-stage-acordelot.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071326] via-transparent to-[#071326]/20" />
      <img src={PORTRAIT[key]} alt={s.name} className="absolute bottom-[2%] left-1/2 h-[89%] -translate-x-1/2 object-contain drop-shadow-[0_15px_16px_rgba(0,0,0,.8)] [image-rendering:auto]" />
      <p className="absolute bottom-[8%] left-[6%] max-w-[150px] -rotate-6 font-serif text-[clamp(13px,1.4vw,22px)] italic leading-snug text-[#f5c961] drop-shadow">A música move<br />novas histórias.</p>
    </section>
    <section className="ac-scroll-region ac-character-detail min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-[clamp(12px,1.4vw,24px)]">
      <div className="grid grid-cols-[1fr_250px] gap-3">
        <div>
          <h2 className="font-serif text-[clamp(26px,2.4vw,42px)] font-bold leading-none text-white">{s.name}</h2>
          <p className="mt-1 text-[clamp(12px,1.1vw,18px)] font-semibold text-[#94a9ce]">{copy.title}</p>
          <p className="mt-1 font-serif text-sm italic text-[#91a0bd]">“{copy.quote}”</p>
          <div className="mt-2 flex gap-2">{copy.tags.map((tag, i) => <span key={tag} className={`rounded-full border px-3 py-1 text-[10px] font-bold ${i === 0 ? 'border-[#c69224] bg-[#4e3910]/35 text-[#f6cd62]' : 'border-[#334761] text-[#9fb1d0]'}`}>{tag}</span>)}</div>
        </div>
        <Panel className="flex items-center justify-center gap-3 border-[#9a701d]/60 px-4 py-3 text-center">
          <Swords className="h-9 w-9 text-[#ffd85a] drop-shadow-[0_0_12px_#d49518]" />
          <div><p className="text-xs font-semibold text-[#9fb1d0]">Poder de Combate</p><p className="text-[clamp(25px,2.4vw,40px)] font-black leading-none text-[#ffd85a]">{power.toLocaleString('pt-BR')}</p></div>
        </Panel>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
        <Panel className="p-3"><div className="flex justify-between text-sm font-bold"><span>Nível <b className="text-white">{s.level}</b> <span className="text-[#6f82a3]">/ 50</span></span><span className="text-[10px] text-[#8498ba]">{s.xp}/{s.xpNext}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[#22324b]"><div className="h-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${xpPct}%` }} /></div></Panel>
        <Panel className="p-3"><p className="text-sm font-bold text-white">Ascensão</p><div className="mt-2 flex gap-4">{[0,1,2,3,4].map((n) => <span key={n} className={`block h-5 w-3 rotate-45 border-2 ${n === 0 ? 'border-[#ffd34f] bg-[#e7a817] shadow-[0_0_10px_#e7a817]' : 'border-[#526783] bg-[#17263d]'}`} />)}</div></Panel>
      </div>
      <div className="mt-3 grid grid-cols-[.9fr_1.1fr] gap-3">
        <Panel className="p-3"><h3 className="mb-2 text-sm font-black text-white">Atributos Base</h3>{[
          [Heart, 'HP Máximo', s.maxHp, 'text-rose-400'], [Sword, 'Ataque', s.forca, 'text-sky-400'], [Shield, 'Defesa', s.defense, 'text-indigo-400'], [Star, 'Taxa Crítica', `${s.critChance}%`, 'text-yellow-300'], [Zap, 'Energia Máxima', s.maxEnergy, 'text-cyan-400'],
        ].map(([Icon, label, value, color]: any) => <div key={label} className="flex items-center gap-2 py-1 text-[12px]"><Icon className={`h-4 w-4 ${color}`} /><span className="flex-1 text-[#9fb1d0]">{label}</span><b className="text-white">{value}</b></div>)}</Panel>
        <Panel className="p-3"><h3 className="mb-2 text-sm font-black text-white">Equipamentos</h3><div className="grid grid-cols-3 gap-2">{equipped.length ? equipped.map((entry: any) => <button type="button" aria-label={`Abrir ${entry.piece.name}`} onClick={() => onEquipment(entry.slot, entry.piece.key)} key={entry.piece.key} className="group text-center"><div className="relative mx-auto grid aspect-square max-h-[80px] place-items-center rounded-xl border-2 transition group-active:scale-95" style={{ borderColor: entry.set.color, background: `${entry.set.color}18` }}><img src={entry.piece.img} alt="" className="h-[75%] w-[75%] object-contain transition group-hover:scale-110" /><span className="absolute inset-x-1 bottom-0 rounded bg-[#061123]/90 text-[9px] font-black">+{engine.getPieceLevel(entry.piece.key)}</span></div><p className="mt-1 truncate text-[9px] text-[#aab8d2]">{EQUIP_SLOT_LABEL[entry.slot]}</p></button>) : <p className="col-span-3 py-5 text-center text-xs text-[#657895]">Equipe peças para ativar conjuntos.</p>}</div></Panel>
      </div>
      <Panel className="mt-3 flex items-center gap-4 p-3"><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-white">Materiais para evolução</h3><div className="mt-2 max-w-[390px]"><MaterialCards cost={levelCost} inventory={inventory} /></div></div><button type="button" disabled={!canLevelUp} onClick={() => { onLevelUp(); refresh(); }} className={`min-w-[190px] rounded-xl px-5 py-4 text-base font-black ${canLevelUp ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,.25)]' : 'bg-[#183047] text-[#64748b]'}`}><ArrowUp className="mr-2 inline h-5 w-5" />Subir de Nível</button></Panel>
    </section>
  </div>;
};

const SkillOrb: React.FC<{ skill: SkillInfo; large?: boolean }> = ({ skill, large }) => (
  <div className={`relative grid shrink-0 place-items-center rounded-full border-2 shadow-[0_0_18px_currentColor] ${large ? 'h-[180px] w-[180px]' : 'h-14 w-14'}`} style={{ color: skill.color, borderColor: skill.color, background: `radial-gradient(circle, ${skill.color}55, #071326 68%)` }}>
    {skill.kind === 'Passiva' ? <Star className={large ? 'h-20 w-20' : 'h-7 w-7'} /> : skill.kind === 'Especial' ? <Sparkles className={large ? 'h-20 w-20' : 'h-7 w-7'} /> : skill.kind === 'Ataque Básico' ? <Swords className={large ? 'h-20 w-20' : 'h-7 w-7'} /> : <Music2 className={large ? 'h-20 w-20' : 'h-7 w-7'} />}
  </div>
);

const SkillsTab: React.FC<{ engine: GameEngine; inventory: Record<string, number> }> = ({ engine, inventory }) => {
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  const skills = SKILLS[engine.activeCharacter];
  const [selectedKey, setSelectedKey] = React.useState(skills[0].key);
  React.useEffect(() => setSelectedKey(SKILLS[engine.activeCharacter][0].key), [engine.activeCharacter]);
  const skill = skills.find((s) => s.key === selectedKey) ?? skills[0];
  const slot = skill.key.startsWith('skill') ? Number(skill.key.slice(-1)) - 1 : null;
  const level = slot === null ? engine.getAnyPassiveLevel(skill.passiveIds[0]) : engine.getSkillLevel(slot);
  const cost = slot === null ? engine.passiveUpgradeCost(skill.passiveIds[0]) : engine.skillUpgradeCost(slot);
  const canUpgrade = slot === null ? engine.canUpgradePassive(skill.passiveIds[0]) : engine.canUpgradeSkill(slot);
  const requirement = slot === null ? null : engine.skillUpgradeRequirement(slot);
  const doUpgrade = () => { if (slot === null ? engine.upgradePassive(skill.passiveIds[0]) : engine.upgradeSkill(slot)) refresh(); };
  return <div className="ac-skills grid h-full min-h-0 grid-cols-[30%_70%]">
    <aside className="overflow-y-auto border-r border-[#263854] bg-[#071225]/72 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-base font-black text-[#9fb1d0]"><Swords className="h-5 w-5 text-white" /> Skills Ativas</h3>
      <div className="space-y-2">{skills.map((item) => <button key={item.key} type="button" onClick={() => setSelectedKey(item.key)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${item.key === skill.key ? 'border-[#f5cc54] bg-[#172641] shadow-[0_0_14px_rgba(245,204,84,.18)]' : 'border-[#263854] bg-[#08162a] hover:border-[#526783]'}`}><SkillOrb skill={item} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{item.name}</p><p className="text-xs text-[#9fb1d0]">{item.kind}</p></div><b className="text-xs text-[#c5d1e7]">Nv. {item.key.startsWith('skill') ? engine.getSkillLevel(Number(item.key.slice(-1)) - 1) : engine.getAnyPassiveLevel(item.passiveIds[0])}</b></button>)}</div>
    </aside>
    <section className="ac-scroll-region ac-skills-detail min-w-0 overflow-y-auto overflow-x-hidden p-5">
      <div className="ac-skills-hero grid grid-cols-[220px_minmax(0,1fr)_220px] gap-5">
        <div className="grid place-items-center rounded-2xl bg-[radial-gradient(circle,rgba(191,143,33,.18),transparent_68%)]"><SkillOrb skill={skill} large /></div>
        <div className="min-w-0"><h2 className="font-serif text-[clamp(25px,2.5vw,42px)] font-bold leading-tight text-white">{skill.name}</h2><span className="mt-2 inline-block rounded-lg border border-rose-500/70 bg-rose-950/50 px-3 py-1 text-xs font-black text-rose-300">{skill.kind}</span><div className="mt-4 flex items-center justify-between"><p className="font-serif text-2xl font-black text-white">Nv. {level} <span className="text-[#526783]">/ 5</span></p><span className="text-xs text-[#8194b5]">{level >= 5 ? 'Máximo' : 'Progresso da habilidade'}</span></div><div className="mt-2 h-3 rounded-full bg-[#263854]"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${level * 20}%` }} /></div><p className="mt-5 text-[15px] leading-relaxed text-[#c1cbe0]">{skill.explanation}</p></div>
        <Panel className="grid place-items-center border-[#a9791d]/70 p-4 text-center"><p className="text-sm text-[#c4cee0]">Dano Atual</p><Sword className="mt-3 h-8 w-8 text-[#ffd65a]" /><p className="mt-1 font-serif text-[clamp(28px,3vw,52px)] font-black text-[#ffe27a]">{skill.damage}</p><p className="text-sm text-[#ffd65a]">{skill.cooldown} · {skill.cost}</p></Panel>
      </div>
      <Panel className="mt-4 p-4"><h3 className="text-base font-black text-[#c9d6ed]">Efeitos por Nível</h3><div className="mt-3 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((n) => <div key={n} className={`rounded-xl border py-3 text-center ${n === level ? 'border-[#ffd451] bg-[#4b3712]/30 shadow-[0_0_12px_rgba(255,212,81,.2)]' : 'border-[#263854] bg-[#071326]'}`}><p className="text-xs text-[#b9c6db]">Nv. {n}</p><p className={`mt-1 text-lg font-black ${n === level ? 'text-[#ffe27a]' : 'text-white'}`}>{100 + (n - 1) * 10}%</p><p className="text-[10px] text-[#9aabc7]">do efeito</p></div>)}</div></Panel>
      <div className="mt-3 grid grid-cols-[1fr_360px] gap-3"><Panel className="p-3"><h3 className="mb-2 text-sm font-black text-[#c9d6ed]">Materiais necessários</h3><MaterialCards cost={cost} inventory={inventory} />{requirement && <p className={`mt-2 text-[10px] font-bold ${requirement.met ? 'text-emerald-300' : 'text-rose-300'}`}>Requisito: {requirement.label} {requirement.current}/{requirement.required}</p>}</Panel><Panel className="grid place-items-center p-4"><button type="button" disabled={!canUpgrade} onClick={doUpgrade} className={`w-full rounded-xl py-4 text-lg font-black ${canUpgrade ? 'bg-gradient-to-r from-emerald-600 to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,.3)]' : 'bg-[#173148] text-[#62738f]'}`}><ArrowUp className="mr-2 inline h-6 w-6" />{level >= 5 ? 'Nível Máximo' : skill.kind === 'Passiva' ? 'Aumentar Passiva' : 'Aumentar Skill'}</button></Panel></div>
    </section>
  </div>;
};

const EquipmentTab: React.FC<{ engine: GameEngine; inventory: Record<string, number>; initialSlot?: EquipSlotKey; initialKey?: string }> = ({ engine, inventory, initialSlot, initialKey }) => {
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  const sets = EQUIP_SETS.filter((s) => equipSetClass(s) === engine.characterClassKey);
  const [slot, setSlot] = React.useState<EquipSlotKey>(initialSlot ?? 'colar');
  const rows = sets.map((set) => ({ set, piece: set.pieces[slot] }));
  const [key, setKey] = React.useState(initialKey ?? rows[0]?.piece.key ?? '');
  React.useEffect(() => {
    const nextSlot = initialSlot ?? 'colar';
    setSlot(nextSlot);
    setKey(initialKey ?? sets[0]?.pieces[nextSlot].key ?? '');
  }, [engine.activeCharacter, initialKey, initialSlot]);
  const selected = rows.find((r) => r.piece.key === key) ?? rows[0];
  if (!selected) return <div className="grid h-full place-items-center text-slate-400">Nenhum equipamento disponível para esta classe.</div>;
  const { set, piece } = selected;
  const level = engine.getPieceLevel(piece.key);
  const cost = engine.pieceUpgradeCost(piece.key);
  const equipped = engine.equippedPieces[slot] === piece.key;
  const setCount = engine.activeSetCounts[set.key] ?? 0;
  const stats = Object.entries(piece.stats).filter(([, value]) => value) as Array<[StatKey, number]>;
  const pieceArt = piece.img;
  return <div className="grid h-full min-h-0 grid-cols-[30%_25%_45%]">
    <aside className="min-h-0 border-r border-[#263854] bg-[#071225]/72 p-4">
      <div className="grid grid-cols-4 gap-2">{EQUIP_SLOT_ORDER.map((s) => { const Icon = SLOT_ICON[s]; return <button key={s} type="button" onClick={() => { setSlot(s); setKey(sets[0]?.pieces[s].key ?? ''); }} className={`rounded-xl border py-3 text-center ${slot === s ? 'border-[#f5cf55] bg-[#4d3a13]/25 text-[#ffe06b]' : 'border-[#263854] bg-[#071326] text-[#7e92b4]'}`}><Icon className="mx-auto h-7 w-7" /><span className="mt-1 block text-[10px] font-black">{EQUIP_SLOT_LABEL[s]}</span></button>; })}</div>
      <div className="mt-4 h-[calc(100%-78px)] space-y-2 overflow-y-auto pr-1">{rows.map(({ set: rowSet, piece: row }) => <button key={row.key} type="button" onClick={() => setKey(row.key)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${row.key === piece.key ? 'border-sky-400 bg-sky-950/35' : 'border-[#263854] bg-[#071326]'}`}><div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border" style={{ borderColor: rowSet.color, background: `${rowSet.color}18` }}>{row.img ? <img src={row.img} alt="" className="h-12 w-12 object-contain" /> : <CircleDot className="h-9 w-9" style={{ color: rowSet.color }} />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-white">{row.name}</p><p className="truncate text-[10px] text-[#8194b5]">{rowSet.name}</p></div><b className="text-sm text-[#dce5f7]">+{engine.getPieceLevel(row.key)}</b></button>)}</div>
    </aside>
    <section className="ac-stage relative overflow-hidden border-r border-[#263854] bg-[#071326]">
      <img src="/assets/ui/character-stage-acordelot.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /><div className="absolute inset-0 bg-gradient-to-t from-[#071326] via-transparent to-[#071326]/40" />
      <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#35506f] bg-[#071326]/90 px-3 py-1 text-[10px] font-bold text-[#dbe6f9]"><img src={PORTRAIT[engine.activeCharacter]} alt="" className="h-7 w-7 rounded-full object-contain" />{equipped ? 'Equipado' : 'Disponível'}</span>
      {pieceArt ? <img src={pieceArt} alt={piece.name} className="absolute left-1/2 top-[43%] h-[42%] w-[82%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_30px_rgba(245,194,64,.48)]" /> : <CircleDot className="absolute left-1/2 top-[43%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 text-[#f0c34b] drop-shadow-[0_0_30px_rgba(245,194,64,.48)]" />}
      <Panel className="absolute inset-x-4 bottom-4 p-3 font-serif text-xs italic leading-relaxed text-[#b8c5dc]">“{piece.passive?.desc ?? `Uma peça de ${set.name}, afinada para acompanhar seu portador.`}”</Panel>
    </section>
    <section className="ac-scroll-region ac-equipment-detail min-w-0 overflow-y-auto overflow-x-hidden p-5"><h2 className="font-serif text-[clamp(22px,2.2vw,38px)] font-bold leading-tight text-white">{piece.name}</h2><p className="mt-1 text-sm font-bold text-[#94a9ce]">{EQUIP_SLOT_LABEL[slot]} · Tier {set.tier} · {set.name}</p>
      <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3"><Panel className="border-[#d0a436]/70 px-4 py-3"><p className="font-serif text-3xl font-black text-[#ffe06b]">+{level} <span className="text-[#536987]">/ +15</span></p></Panel><Panel className="px-4 py-3"><p className="text-xs font-bold text-white">Nv. {engine.stats.level} <span className="text-[#5e7392]">/ 50</span></p><div className="mt-2 h-2 rounded bg-[#263854]"><div className="h-full w-1/4 rounded bg-sky-400" /></div></Panel></div>
      <div className="mt-3 grid grid-cols-2 gap-3"><Panel className="p-3"><h3 className="mb-2 text-sm font-black text-[#a9bae0]">Atributos Base</h3>{stats.map(([stat, value]) => { const Icon = STAT_ICON[stat] ?? Sparkles; return <div key={stat} className="flex items-center gap-2 border-b border-[#1d2d45] py-1.5 text-xs"><Icon className="h-4 w-4 text-sky-400" /><span className="flex-1 text-[#b1bfd6]">{STAT_LABELS[stat]}</span><b className="text-white">+{value}%</b></div>; })}</Panel><Panel className="p-3"><h3 className="mb-2 text-sm font-black text-[#a9bae0]">Aprimoramento (+{level})</h3>{stats.map(([stat, value]) => <div key={stat} className="flex justify-between border-b border-[#1d2d45] py-1.5 text-xs"><span className="text-[#b1bfd6]">{STAT_LABELS[stat]}</span><b className="text-white">+{Math.round(value * (1 + level * .08) * 10) / 10}%</b></div>)}</Panel></div>
      <div className="mt-3 grid grid-cols-2 gap-3"><Panel className="p-3"><h3 className="text-sm font-black text-[#a9bae0]">Habilidade Passiva</h3><p className="mt-2 text-sm font-black text-white">{piece.passive?.name ?? 'Afinação do Conjunto'}</p><p className="mt-1 text-[11px] leading-relaxed text-[#9fb0ca]">{piece.passive?.desc ?? 'Fortalece os atributos da peça a cada aprimoramento.'}</p></Panel><Panel className="p-3"><h3 className="text-sm font-black text-[#a9bae0]">{set.name}</h3><p className={`mt-3 text-xs ${setCount >= 2 ? 'text-[#ffe06b]' : 'text-[#7184a2]'}`}><b>2 peças</b> · {Object.entries(set.bonus2).map(([k,v]) => `+${v}% ${STAT_LABELS[k as StatKey]}`).join(', ')}</p><p className={`mt-2 text-xs ${setCount >= 4 ? 'text-[#ffe06b]' : 'text-[#7184a2]'}`}><b>4 peças</b> · {Object.entries(set.bonus4).map(([k,v]) => `+${v}% ${STAT_LABELS[k as StatKey]}`).join(', ')}</p></Panel></div>
      <Panel className="ac-equipment-actions mt-3 grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2 p-3"><div className="min-w-0"><h3 className="mb-2 text-sm font-black text-[#a9bae0]">Materiais para aprimoramento</h3><MaterialCards cost={cost} inventory={inventory} /></div><div className="flex min-w-0 flex-col gap-2"><button type="button" onClick={() => { equipped ? engine.unequipSlot(slot) : engine.equipPiece(piece.key); refresh(); }} className="rounded-xl border border-sky-500/60 bg-sky-950/40 py-2 text-xs font-black text-sky-200">{equipped ? 'Desequipar' : 'Equipar'}</button><button type="button" disabled={!engine.canUpgradePiece(piece.key)} onClick={() => { engine.upgradePiece(piece.key); refresh(); }} className={`rounded-xl py-3 text-sm font-black ${engine.canUpgradePiece(piece.key) ? 'bg-gradient-to-r from-emerald-600 to-teal-400 text-white' : 'bg-[#173148] text-[#62738f]'}`}><ArrowUp className="mr-1 inline h-4 w-4" />Aprimorar</button></div></Panel>
    </section>
  </div>;
};

const AdvancedTab: React.FC<{ engine: GameEngine; onSpend: (attr: AttrKey) => void }> = ({ engine, onSpend }) => {
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  const attrs: Array<[AttrKey, string, number, React.ComponentType<{ className?: string }>, string]> = [
    ['forca', 'Força', engine.stats.forca, Sword, 'Dano físico e ataques básicos'], ['agilidade', 'Agilidade', engine.stats.agilidade, Wind, 'Movimento e cadência'], ['vitalidade', 'Vitalidade', engine.stats.vitalidade, Heart, 'Vida e sobrevivência'], ['inteligencia', 'Inteligência', engine.stats.inteligencia, Music2, 'Dano harmônico'], ['sorte', 'Sorte', engine.stats.sorte, Star, 'Crítico e recompensas'], ['ressonancia', 'Ressonância', engine.stats.maxEnergy, BatteryCharging, 'Energia máxima para Skills'],
  ];
  const tools: Array<['axe' | 'pick', string, ToolTier[]]> = [['axe', 'Machado', engine.ownedAxes], ['pick', 'Picareta', engine.ownedPicks]];
  return <div className="grid h-full min-h-0 grid-cols-[1.25fr_.75fr] gap-4 overflow-y-auto p-5"><Panel className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-serif text-3xl font-bold text-white">Atributos Avançados</h2><p className="text-sm text-[#8fa2c2]">Construa a identidade de combate do personagem.</p></div><span className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-sm font-black text-emerald-300">{engine.stats.attrPoints} pontos</span></div><div className="mt-5 grid grid-cols-2 gap-3">{attrs.map(([key,label,value,Icon,desc]) => <div key={key} className="flex items-center gap-3 rounded-xl border border-[#263854] bg-[#08162a] p-3"><div className="grid h-11 w-11 place-items-center rounded-full border border-[#b88725]/50 bg-[#3b2a0e]/30"><Icon className="h-5 w-5 text-[#ffd65a]" /></div><div className="min-w-0 flex-1"><p className="text-sm font-black text-white">{label}</p><p className="truncate text-[10px] text-[#8295b5]">{desc}</p></div><b className="text-xl text-[#ffe06b]">{value}</b><button type="button" disabled={!engine.stats.attrPoints} onClick={() => { onSpend(key); refresh(); }} className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white disabled:bg-[#1d3047] disabled:text-[#5d708d]">+</button></div>)}</div></Panel><Panel className="p-5"><h3 className="font-serif text-2xl font-bold text-white">Ferramentas</h3><p className="text-xs text-[#8fa2c2]">Selecione o tier usado na coleta.</p><div className="mt-5 space-y-5">{tools.map(([kind,label,owned]) => <div key={kind}><p className="mb-2 text-sm font-black text-[#c5d2e8]">{label}</p><div className="grid grid-cols-3 gap-2">{owned.map((tier) => { const active = kind === 'axe' ? engine.equippedAxe === tier : engine.equippedPick === tier; return <button key={tier} type="button" onClick={() => { engine.equipTool(kind, tier); refresh(); }} className={`rounded-xl border p-2 ${active ? 'border-[#ffd65a] bg-[#4a3510]/35' : 'border-[#263854] bg-[#071326]'}`}><img src={`/assets/tools/${kind}_${tier}.png`} alt="" className="mx-auto h-12 w-12 object-contain" /><p className={`mt-1 text-[10px] font-bold capitalize ${active ? 'text-[#ffe06b]' : 'text-[#8799b6]'}`}>{tier}</p></button>; })}</div></div>)}</div></Panel></div>;
};

export const CharacterScreen: React.FC<Props> = ({ open, onClose, stats, power, canLevelUp, onLevelUp, onSpend, engine, inventory = {}, initialTab }) => {
  const [tab, setTab] = React.useState<Tab>('ficha');
  const [equipmentFocus, setEquipmentFocus] = React.useState<{ slot: EquipSlotKey; key?: string }>({ slot: 'colar' });
  const [, refresh] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => { if (open) setTab(initialTab ?? 'ficha'); }, [open, initialTab]);
  if (!open || !engine) return null;
  const title = tab === 'ficha' ? 'Personagem' : tab === 'skills' ? 'Skills' : tab === 'equipamentos' ? 'Equipamentos' : 'Atributos Avançados';
  return <div className="fixed inset-0 z-40 grid place-items-center p-[clamp(6px,2vw,30px)] pointer-events-auto">
    <style>{`
      /* O PWA do iPhone entrega somente ~393px CSS em paisagem. Nessa
         altura, preservamos o desenho 16:9 e reduzimos o miolo como uma
         unidade, em vez de transformar cada painel numa página rolável. */
      @media (max-height: 650px) and (orientation: landscape) {
        .ac-sheet { width: calc(100vw - 48px - env(safe-area-inset-left) - env(safe-area-inset-right)) !important; height: calc(100vh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important; border-radius: 18px !important; }
        .ac-sheet-head { height: 50px !important; padding-left: 20px !important; padding-right: 20px !important; }
        .ac-sheet-head > svg:first-child { width: 25px !important; height: 25px !important; margin-right: 12px !important; }
        .ac-sheet-head > button svg { width: 23px !important; height: 23px !important; }
        .ac-sheet-main { zoom: .74; }
        .ac-sheet-nav { display: none !important; }
        .ac-mobile-tabs { display: flex !important; }
        .ac-close { margin-left: 12px !important; }
        .ac-skill-total { margin-left: auto !important; margin-right: 8px !important; padding: 4px 8px !important; gap: 6px !important; }
        .ac-skill-total > span { width: 22px !important; height: 22px !important; }
        .ac-skill-total > span:nth-child(2) { display: none !important; }
        .ac-roster { min-width: 58px !important; width: 7.5% !important; }
        .ac-character-stage { min-width: 0 !important; width: 40% !important; }
        .ac-character-detail, .ac-skills-detail, .ac-equipment-detail { overflow-x: hidden !important; overflow-y: auto !important; padding: 12px !important; overscroll-behavior: contain; }
        .ac-skills-hero { grid-template-columns: 170px minmax(0,1fr) 185px !important; gap: 12px !important; }
        .ac-equipment-actions { grid-template-columns: minmax(0,1fr) 130px !important; }
      }
      .ac-scroll-region { scrollbar-width: none; -ms-overflow-style: none; }
      .ac-scroll-region::-webkit-scrollbar { display: none; width: 0; height: 0; }
      @media (max-height: 330px) and (orientation: landscape) {
        .ac-sheet-main { zoom: .68; }
        .ac-sheet-head { height: 44px !important; }
      }
      .ac-sheet::before { content: ''; position: absolute; z-index: 2; pointer-events: none; inset: 0; border-radius: inherit; background: linear-gradient(112deg, transparent 20%, rgba(96,165,250,.045) 42%, rgba(250,204,21,.07) 50%, transparent 62%); transform: translateX(-75%); animation: acSheen 9s ease-in-out infinite; }
      .ac-sheet::after { content: ''; position: absolute; z-index: 1; pointer-events: none; inset: 0; border-radius: inherit; box-shadow: inset 0 0 28px rgba(56,189,248,.06), inset 0 0 2px rgba(250,204,21,.55); }
      .ac-panel { transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
      .ac-panel:hover { border-color: rgba(96,165,250,.42); box-shadow: inset 0 1px rgba(255,255,255,.035), 0 0 18px rgba(14,165,233,.07); }
      .ac-material { position: relative; overflow: hidden; }
      .ac-material::after { content: ''; position: absolute; inset: -60% -30%; pointer-events: none; background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.16) 50%, transparent 60%); transform: translateX(-75%); animation: acMaterialShine 4.5s ease-in-out infinite; }
      .ac-stage::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .65; background-image: radial-gradient(circle, rgba(255,218,92,.9) 0 1px, transparent 1.7px), radial-gradient(circle, rgba(96,165,250,.65) 0 1px, transparent 1.8px); background-size: 83px 83px, 127px 127px; background-position: 13px 29px, 47px 9px; animation: acMotes 8s linear infinite; }
      @keyframes acSheen { 0%,70% { transform: translateX(-75%); } 88%,100% { transform: translateX(75%); } }
      @keyframes acMaterialShine { 0%,72% { transform: translateX(-80%); } 100% { transform: translateX(80%); } }
      @keyframes acMotes { from { transform: translateY(10px); } to { transform: translateY(-73px); } }
      @media (prefers-reduced-motion: reduce) { .ac-sheet::before, .ac-material::after, .ac-stage::after { animation: none !important; } }
    `}</style>
    <div className="absolute inset-0 bg-[#020817]/65 backdrop-blur-[4px]" onClick={onClose} />
    <div className="ac-sheet relative flex h-[min(890px,94vh)] w-[min(1540px,96vw)] flex-col overflow-hidden rounded-[26px] border border-[#a87516] bg-[radial-gradient(circle_at_40%_0%,#10233f_0%,#071326_38%,#040d1d_100%)] text-[#dce6f8] shadow-[0_24px_80px_rgba(0,0,0,.75),inset_0_0_50px_rgba(24,66,110,.08)]">
      <header className="ac-sheet-head relative z-10 flex h-[72px] shrink-0 items-center border-b border-[#263854] px-8"><Music2 className="mr-5 h-9 w-9 text-[#f6ce62]" /><h1 className="whitespace-nowrap text-[clamp(18px,1.6vw,28px)] font-black text-[#f8d96f]">{title} — {engine.stats.name || stats.name}</h1>{tab === 'skills' && <div className="ac-skill-total ml-auto mr-6 flex items-center gap-3 rounded-xl border border-[#263854] bg-[#071326] px-4 py-2 text-xs text-[#b8c6dd]"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#c38c1f] bg-[#563b0b] text-[#ffe06b]">♪</span><span className="hidden sm:inline">Níveis de Skill</span><b className="text-xl text-[#ffe06b]">{engine.skillLevels[engine.activeCharacter].reduce((a,b) => a + b, 0)}</b></div>}<div className={`ac-mobile-tabs ml-auto hidden items-center gap-1.5 ${tab === 'skills' ? '!ml-2' : ''}`}>{TABS.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-label={label} title={label} onClick={() => setTab(key)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${tab === key ? 'border-[#f7c84b] bg-[#5a4012]/45 text-[#ffe176] shadow-[0_0_12px_rgba(247,200,75,.2)]' : 'border-[#293c58] bg-[#08162a] text-[#8295b5]'}`}><Icon className="h-4 w-4" /></button>)}</div><button type="button" aria-label="Fechar" onClick={onClose} className={`ac-close ${tab !== 'skills' ? 'ml-auto' : ''} ml-3 text-[#8fa2c3] hover:text-white`}><X className="h-8 w-8" /></button></header>
      <main className="ac-sheet-main min-h-0 flex-1 overflow-hidden">{tab === 'ficha' && <CharacterTab engine={engine} power={power} canLevelUp={canLevelUp} onLevelUp={onLevelUp} inventory={inventory} refresh={refresh} onEquipment={(slot, key) => { setEquipmentFocus({ slot, key }); setTab('equipamentos'); }} />}{tab === 'skills' && <SkillsTab engine={engine} inventory={inventory} />}{tab === 'equipamentos' && <EquipmentTab engine={engine} inventory={inventory} initialSlot={equipmentFocus.slot} initialKey={equipmentFocus.key} />}{tab === 'ferramentas' && <AdvancedTab engine={engine} onSpend={onSpend} />}</main>
      <nav className="ac-sheet-nav grid h-[84px] shrink-0 grid-cols-4 border-t border-[#263854] bg-[#061123]/95">{TABS.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} className={`relative flex flex-col items-center justify-center gap-1 border-r border-[#172842] text-sm font-black transition ${tab === key ? 'bg-[#3e2d11]/38 text-[#ffd535]' : 'text-[#7386a6] hover:bg-[#0b1930] hover:text-[#bac8dc]'}`}>{tab === key && <span className="absolute inset-x-0 top-0 h-[3px] bg-[#ffc928] shadow-[0_0_12px_#ffc928]" />}<Icon className="h-6 w-6" />{label}</button>)}</nav>
    </div>
  </div>;
};

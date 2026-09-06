import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Store,
  ChevronRight,
  HelpCircle,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  Crosshair,
  Minus,
  Plus,
  Sliders,
  CheckCircle2,
  Sun,
  Moon,
  Sunset,
  Save,
  Layers,
  X,
  LogOut,
  Smartphone,
  Settings,
  CloudRain,
  Map as MapIcon,
} from 'lucide-react';
import type { PlayerStats } from '../game/engine';
import { GameEngine, InteractionState, SelectedPropInfo, TimeOfDay, CHARACTER_PORTRAITS, SHOP_ITEMS } from '../game/engine';
import { TouchControls } from './TouchControls';
import { Inventory } from './Inventory';
import { PlayerHud } from './PlayerHud';
import { CharacterScreen } from './CharacterScreenPremium';
import { DayCycleIndicator } from './DayCycleIndicator';
import { SynthesisScreen } from './SynthesisScreen';
import { PartituraScreen } from './PartituraScreen';
import { WeaponScreen } from './WeaponScreen';
import { ForgeScreen } from './ForgeScreen';
import { CatalogScreen } from './CatalogScreen';
import { QuestScreen } from './QuestScreen';
import { HudIcon } from './HudIcon';
import { SettingsModal } from './SettingsModal';
import { ChatBox } from './ChatBox';
import { WorldMapScreen } from './WorldMapScreen';
import { publishMapToCode, getGhToken, setGhToken } from '../game/mapPersist';
import { saveWorldMapToCloud } from '../game/worldMapSync';
import { loadCloudSave, applySaveToEngine, prepareProgressionVersion, setupAutoSave, saveToCloud } from '../game/saveManager';
import { saveGlobalHudLayout } from '../game/hudSync';
import { networkManager, ChatMessage } from '../game/networkManager';
import { playMusicalTone, speakMusically, stopMusicalVoice, unlockMusicalVoice } from '../game/musicalVoice';

type OpeningPhase = 'awakening' | 'discovery' | 'encounter' | 'aftermath' | 'echoes' | 'gate' | 'mirella' | 'rest' | 'morning' | 'antony';
type TutorialStage = 'cinematic' | 'movement' | 'explore' | 'combat' | 'follow' | 'full';

const OPENING_LINES: Record<OpeningPhase, Array<{ speaker: string; voice: string; text: string }>> = {
  awakening: [
    { speaker: 'Narração', voice: 'narrator', text: 'Antes de abrir os olhos, ele ouviu a floresta respirar.' },
    { speaker: 'Akles', voice: 'akles', text: '...' },
    { speaker: 'Akles', voice: 'akles', text: 'Onde eu estou?' },
    { speaker: 'Narração', voice: 'narrator', text: 'Nenhum nome. Nenhuma lembrança. Apenas um corpo que parecia conhecer aquele perigo.' },
  ],
  discovery: [
    { speaker: 'Narração', voice: 'narrator', text: 'Um galho se parte entre as árvores.' },
    { speaker: 'Akles', voice: 'akles', text: 'Sol bemol.' },
    { speaker: 'Akles', voice: 'akles', text: 'Como... como eu sei disso?' },
  ],
  encounter: [
    { speaker: 'Narração', voice: 'narrator', text: 'A vibração se repete. Desta vez, acompanhada por passos.' },
    { speaker: 'Akles', voice: 'akles', text: 'Não estou sozinho.' },
    { speaker: 'Narração', voice: 'narrator', text: 'Duas criaturas dissonantes deixam a escuridão. Akles não se lembra de lutar — mas seu corpo, sim.' },
  ],
  aftermath: [
    { speaker: 'Akles', voice: 'akles', text: 'Eu sabia exatamente onde golpear...' },
    { speaker: 'Akles', voice: 'akles', text: 'Quem me ensinou isso?' },
    { speaker: 'Narração', voice: 'narrator', text: 'Três pequenas luzes respondem ao combate com uma harmonia impossível.' },
  ],
  echoes: [
    { speaker: 'Akles', voice: 'akles', text: 'Dó... Mi... Sol.' },
    { speaker: 'Narração', voice: 'narrator', text: 'Separadas, eram três vozes. Juntas, formavam um acorde maior.' },
    { speaker: 'Akles', voice: 'akles', text: 'Vocês também me reconhecem, não é?' },
    { speaker: 'Narração', voice: 'narrator', text: 'Os três Ecos seguem pela floresta. Pela primeira vez, Akles possui uma direção.' },
  ],
  gate: [
    { speaker: 'Narração', voice: 'narrator', text: 'As luzes param diante dos portões. Uma lanterna se ergue do outro lado da muralha.' },
    { speaker: 'Pippo', voice: 'pippo', text: 'Ei! Senhor guarda, ele veio com os Ecos. Eles nunca trazem ninguém até aqui.' },
    { speaker: 'Guarda', voice: 'guard_muralha', text: 'E apareceu na floresta à meia-noite. Fique perto do menino e mantenha as mãos onde eu possa ver.' },
    { speaker: 'Pippo', voice: 'pippo', text: 'Eu sou Pippo. Venha comigo. Mirella vai saber o que fazer.' },
  ],
  mirella: [
    { speaker: 'Mirella', voice: 'mirella', text: 'Pippo, você trouxe um desconhecido da floresta a esta hora?' },
    { speaker: 'Pippo', voice: 'pippo', text: 'Não foi só eu. Dó, Mi e Sol trouxeram ele até o portão.' },
    { speaker: 'Akles', voice: 'akles', text: 'Eu não lembro do meu nome... mas reconheci as notas.' },
    { speaker: 'Mirella', voice: 'mirella', text: 'Então as perguntas podem esperar o amanhecer. Esta noite, você descansa sob nosso teto.' },
  ],
  rest: [
    { speaker: 'Narração', voice: 'narrator', text: 'Pela primeira vez desde que abriu os olhos, Akles encontra silêncio sem perigo.' },
    { speaker: 'Narração', voice: 'narrator', text: 'Do lado de fora, a lanterna de Pippo permanece acesa por mais alguns minutos.' },
    { speaker: 'Narração', voice: 'narrator', text: 'A manhã trará um mundo novo — e perguntas que ninguém parece disposto a responder.' },
  ],
  morning: [
    { speaker: 'Mirella', voice: 'mirella', text: 'Bom dia. A estrada até Acordelot é longa, mas você precisa falar com quem pode ajudá-lo.' },
    { speaker: 'Mirella', voice: 'mirella', text: 'Vá ao centro da cidade e procure o Sr. Antony. Ele é o líder de Acordelot.' },
    { speaker: 'Pippo', voice: 'pippo', text: 'Eu mostro o começo do caminho. E prometo não correr... muito.' },
  ],
  antony: [
    { speaker: 'Pippo', voice: 'pippo', text: 'Sr. Antony! Mirella pediu que eu trouxesse ele. Os Ecos encontraram ele na floresta.' },
    { speaker: 'Sr. Antony', voice: 'sr_antony', text: 'Então foram os Ecos... e você chegou justamente nesta noite.' },
    { speaker: 'Akles', voice: 'akles', text: 'Eu não lembro de nada. Nem mesmo do meu nome.' },
    { speaker: 'Pippo', voice: 'pippo', text: 'Eu chamei ele de Akles. Não sei por quê. Só parece certo.' },
    { speaker: 'Sr. Antony', voice: 'sr_antony', text: 'Akles... Entendo. Diga-me: como reconheceu as notas sem recordar que as conhecia?' },
    { speaker: 'Akles', voice: 'akles', text: 'Meu corpo sabia. Como se já tivesse vivido aquilo antes.' },
    { speaker: 'Sr. Antony', voice: 'sr_antony', text: 'Fique em Acordelot por enquanto. Aqui aprenderemos o que sua memória decidiu esconder.' },
    { speaker: 'Sr. Antony', voice: 'sr_antony', text: 'Abra seu Diário de Missões e aceite sua nova tarefa. Primeiro, apresente-se aos nossos cidadãos.' },
    { speaker: 'Narração', voice: 'narrator', text: 'Por um instante, o líder parece reconhecer Akles. Então esconde a reação atrás de um sorriso cauteloso.' },
  ],
};

const DIALOGUE_PORTRAITS: Record<string, { src: string; sheet?: 'npc' | 'guard' }> = {
  akles: { src: CHARACTER_PORTRAITS.akles },
  pippo: { src: '/assets/characters/npcs/seminima.png', sheet: 'npc' },
  mirella: { src: '/assets/characters/npcs/cadencia.png', sheet: 'npc' },
  guard_muralha: { src: '/assets/characters/knight_idle.png', sheet: 'guard' },
  sr_antony: { src: '/assets/characters/npcs/sr_antony.png', sheet: 'npc' },
  lucian: { src: '/assets/characters/npcs/lucian_portrait.png' },
  miro: { src: '/assets/characters/npcs/tonico.png', sheet: 'npc' },
};

const NPC_PORTRAIT_SOURCES: Record<string, { src: string; sheet?: 'npc' | 'guard' | 'portrait' }> = {
  cadencia: { src: '/assets/characters/npcs/cadencia.png', sheet: 'npc' },
  tonico: { src: '/assets/characters/npcs/tonico.png', sheet: 'npc' },
  setimo: { src: '/assets/characters/npcs/setimo.png', sheet: 'npc' },
  seminima: { src: '/assets/characters/npcs/seminima.png', sheet: 'npc' },
  diapasao: { src: '/assets/characters/npcs/diapasao.png', sheet: 'npc' },
  guard: { src: '/assets/characters/knight_idle.png', sheet: 'guard' },
  merchant: { src: '/assets/ancient-ruins/Characters/NPC Merchant-idle.png', sheet: 'npc' },
  antony: { src: '/assets/characters/npcs/sr_antony.png', sheet: 'npc' },
  lucian: { src: '/assets/characters/npcs/lucian_portrait.png', sheet: 'portrait' },
  blacksmith: { src: '/assets/characters/npcs/blacksmith_portrait.png', sheet: 'portrait' },
};

interface PropPaletteItem {
  type: string;
  name: string;
  category: 'houses_front' | 'houses_angles' | 'rocks' | 'street' | 'trees' | 'walls';
  imgSrc?: string;
  badge?: string;
}

const PROP_CATALOG: PropPaletteItem[] = [
  // 1. Casas Frontais
  {
    type: 'bldgTownHall',
    name: 'Mansão / Prefeitura',
    category: 'houses_front',
    imgSrc: '/assets/buildings/town_hall_front.png',
    badge: 'Frontal',
  },
  {
    type: 'bldgBakeryFront',
    name: 'Padaria & Mercado',
    category: 'houses_front',
    imgSrc: '/assets/buildings/bakery_front.png',
    badge: 'Frontal',
  },
  {
    type: 'blacksmithFront',
    name: 'Ferraria da Vila',
    category: 'houses_front',
    imgSrc: '/assets/buildings/blacksmith_front.png',
    badge: 'Frontal',
  },
  {
    type: 'residentialFront',
    name: 'Casa com Flores',
    category: 'houses_front',
    imgSrc: '/assets/buildings/residential_front.png',
    badge: 'Frontal',
  },
  {
    type: 'apothecaryFront',
    name: 'Alquimia & Biblioteca',
    category: 'houses_front',
    imgSrc: '/assets/buildings/apothecary_front.png',
    badge: 'Frontal',
  },

  // 2. Casas de Costas Autênticas (Rua Sul), Diagonais e Laterais
  {
    type: 'townHallBack',
    name: 'Mansão com Mansardas (Costas)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/town_hall_back.png',
    badge: 'Costas (Sul)',
  },
  {
    type: 'bakeryBack',
    name: 'Padaria & Toldo (Costas)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/bakery_back.png',
    badge: 'Costas (Sul)',
  },
  {
    type: 'houseBackCottage',
    name: 'Chalé Terracota (Costas)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/house_back_cottage.png',
    badge: 'Costas (Sul)',
  },
  {
    type: 'houseBackBlueWoodshed',
    name: 'Casa Azul com Lenheiro (Costas)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/house_back_blue_woodshed.png',
    badge: 'Costas (Sul)',
  },
  {
    type: 'houseBackTavernMossy',
    name: 'Grande Taverna Musgo (Costas)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/house_back_tavern_mossy.png',
    badge: 'Costas (Sul)',
  },
  {
    type: 'houseBackBlueCellar',
    name: 'Casa Azul com Alçapão (Costas)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/house_back_blue_cellar.png',
    badge: 'Costas (Sul)',
  },
  {
    type: 'townHallDiag',
    name: 'Mansão (Diagonal 3/4)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/town_hall_diag.png',
    badge: 'Diagonal 3/4',
  },
  {
    type: 'bakeryDiag',
    name: 'Padaria (Diagonal 3/4)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/bakery_diag.png',
    badge: 'Diagonal 3/4',
  },
  {
    type: 'bldgLodgeEast',
    name: 'Taverna (Diagonal Leste)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/lodge_east.png',
    badge: 'Diagonal 3/4',
  },
  {
    type: 'lodgeWest',
    name: 'Taverna (Diagonal Oeste)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/lodge_west.png',
    badge: 'Diagonal 3/4',
  },
  {
    type: 'bldgHerbalistWest',
    name: 'Botânico (Diagonal Oeste)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/herbalist_west.png',
    badge: 'Diagonal 3/4',
  },
  {
    type: 'herbalistEast',
    name: 'Botânico (Diagonal Leste)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/herbalist_east.png',
    badge: 'Diagonal 3/4',
  },
  {
    type: 'townHallSide',
    name: 'Mansão (Lateral)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/town_hall_side.png',
    badge: 'Perfil Leste/Oeste',
  },
  {
    type: 'bakerySide',
    name: 'Padaria (Lateral)',
    category: 'houses_angles',
    imgSrc: '/assets/buildings/bakery_side.png',
    badge: 'Perfil Leste/Oeste',
  },

  // 3. Pedreiras e Rochas
  {
    type: 'spot_wood',
    name: 'Toco Melódico (spot)',
    category: 'rocks',
    imgSrc: '/assets/props/wood2_spot.png',
    badge: 'Coletável',
  },
  {
    type: 'spot_mineral',
    name: 'Veio Ressonante (spot)',
    category: 'rocks',
    imgSrc: '/assets/props/mineral_spot.png',
    badge: 'Coletável',
  },
  {
    type: 'spot_gold',
    name: 'Filão Dourado (spot)',
    category: 'rocks',
    imgSrc: '/assets/props/gold_spot.png',
    badge: 'Coletável',
  },
  {
    type: 'spot_crystal_blue',
    name: 'Cristal de Eco Azul (spot)',
    category: 'rocks',
    imgSrc: '/assets/props/crystal_blue_spot.png',
    badge: 'Coletável',
  },
  {
    type: 'spot_crystal_red',
    name: 'Cristal Dissonante (spot)',
    category: 'rocks',
    imgSrc: '/assets/props/crystal_red_spot.png',
    badge: 'Coletável',
  },
  {
    type: 'spot_eco_essence',
    name: 'Nascente de Eco (spot)',
    category: 'rocks',
    imgSrc: '/assets/props/eco_essence_spot.png',
    badge: 'Coletável',
  },
  {
    type: 'dark_bigrock',
    name: 'Rochedo Sombrio',
    category: 'rocks',
    imgSrc: '/assets/props/dark_bigrock.png',
    badge: 'Sombria',
  },
  {
    type: 'dark_icecrystal',
    name: 'Cristal Gélido',
    category: 'rocks',
    imgSrc: '/assets/props/dark_icecrystal.png',
    badge: 'Sombria',
  },
  {
    type: 'stoneQuarry',
    name: 'Pedreira de Mineração',
    category: 'rocks',
    imgSrc: '/assets/buildings/stone_quarry.png',
    badge: '140x140',
  },
  {
    type: 'limestoneBoulders',
    name: 'Rochedos de Calcário',
    category: 'rocks',
    imgSrc: '/assets/buildings/limestone_boulders.png',
    badge: '88x86',
  },
  {
    type: 'rockCluster',
    name: 'Grupo de Pedras',
    category: 'rocks',
    imgSrc: '/assets/props/rock_cluster.png',
  },
  {
    type: 'rockPair',
    name: 'Par de Rochas',
    category: 'rocks',
    imgSrc: '/assets/props/rock_pair.png',
  },
  {
    type: 'rockMonolith',
    name: 'Menir / Obelisco',
    category: 'rocks',
    imgSrc: '/assets/props/rock_monolith.png',
  },
  {
    type: 'rockFlatSlab',
    name: 'Laje Rasteira',
    category: 'rocks',
    imgSrc: '/assets/props/rock_flat_slab.png',
  },

  // 4. Elementos da Vila (32-bit Village Elements) & Iluminação
  {
    type: 'wagonCart',
    name: 'Carroça com Feno',
    category: 'street',
    imgSrc: '/assets/props/wagon_cart.png',
    badge: '32-bit',
  },
  {
    type: 'marketStall',
    name: 'Barraca de Mercado',
    category: 'street',
    imgSrc: '/assets/props/market_stall.png',
    badge: '32-bit',
  },
  {
    type: 'hayBaleStack',
    name: 'Pilha de Feno',
    category: 'street',
    imgSrc: '/assets/props/hay_bale_stack.png',
    badge: '32-bit',
  },
  {
    type: 'barrelStack',
    name: 'Pilha de Barris',
    category: 'street',
    imgSrc: '/assets/props/barrel_stack.png',
    badge: '32-bit',
  },
  {
    type: 'woodenBenchRustic',
    name: 'Banco Rústico',
    category: 'street',
    imgSrc: '/assets/props/wooden_bench_rustic.png',
    badge: '32-bit',
  },
  {
    type: 'streetLantern',
    name: 'Lanterna de Rua (Shader)',
    category: 'street',
    imgSrc: '/assets/props/street_lantern.png',
    badge: 'Luz Real',
  },
  {
    type: 'villageWell',
    name: 'Poço Sagrado da Vila',
    category: 'street',
    imgSrc: '/assets/buildings/village_well.png',
  },
  {
    type: 'woodenBench',
    name: 'Banco da Praça',
    category: 'street',
    imgSrc: '/assets/props/wooden_bench.png',
  },
  {
    type: 'bulletinBoard',
    name: 'Mural de Avisos',
    category: 'street',
    imgSrc: '/assets/props/bulletin_board.png',
  },

  // 5. Vegetação
  {
    type: 'oak',
    name: 'Carvalho Real',
    category: 'trees',
    badge: 'Grande',
  },
  {
    type: 'pine',
    name: 'Pinheiro Alpino',
    category: 'trees',
    badge: 'Conífera',
  },
  {
    type: 'blossomTree',
    name: 'Cerejeira Encantada',
    category: 'trees',
    badge: 'Rosa',
  },
  {
    type: 'bush',
    name: 'Arbusto com Frutas',
    category: 'trees',
    badge: 'Baixo',
  },
  {
    type: 'dark_deadtree',
    name: 'Árvore Morta',
    category: 'trees',
    imgSrc: '/assets/props/dark_deadtree.png',
    badge: 'Sombria',
  },
  {
    type: 'dark_bigpine',
    name: 'Pinheiro Sombrio',
    category: 'trees',
    imgSrc: '/assets/props/dark_bigpine.png',
    badge: 'Sombria',
  },
  {
    type: 'dark_thorn',
    name: 'Espinheiro',
    category: 'trees',
    imgSrc: '/assets/props/dark_thorn_p.png',
    badge: 'Sombria',
  },
  // Muralhas musicais — para construir os muros da cidade
  {
    type: 'wallGate',
    name: 'Portão da Cidade',
    category: 'walls',
    imgSrc: '/assets/props/wall_gate.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical4',
    name: 'Torre de Vigia',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_4.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical7',
    name: 'Portal com Estandarte',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_7.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical1',
    name: 'Muralha com Torreão',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_1.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical6',
    name: 'Muralha com Esquina',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_6.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical5',
    name: 'Muralha com Pilar',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_5.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical2',
    name: 'Muralha Longa',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_2.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical3',
    name: 'Muralha Baixa',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_3.png',
    badge: 'Muralha',
  },
  {
    type: 'wallMusical8',
    name: 'Muralha Curta',
    category: 'walls',
    imgSrc: '/assets/props/wall_musical_8.png',
    badge: 'Muralha',
  },
];

export interface GameCanvasProps {
  user?: any;
  onLogout?: () => void;
  roomId?: string | null;
  roomName?: string | null;
  onChangeMode?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  user,
  onLogout,
  roomId,
  roomName,
  onChangeMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [interaction, setInteraction] = useState<InteractionState>({
    nearMerchant: false,
    isTalking: false,
  });
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [shopMessage, setShopMessage] = useState<string | null>(null);

  // Inventário / coleta / ficha
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [showInventory, setShowInventory] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [pickupFlash, setPickupFlash] = useState<string | null>(null);
  const pickupTimer = useRef<number | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isRaining, setIsRaining] = useState(false);
  const [showSynth, setShowSynth] = useState(false);
  const [showPartitura, setShowPartitura] = useState(false);
  const [showWeapon, setShowWeapon] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [, setQuestTick] = useState(0);
  const [, setCharacterTick] = useState(0);
  // Skills agora é uma aba dentro da Ficha — abrir com esse atalho já cai nela
  const [sheetInitialTab, setSheetInitialTab] = useState<
    'ficha' | 'ferramentas' | 'equipamentos' | 'skills'
  >('ficha');
  const [fragments, setFragments] = useState<number[]>(new Array(12).fill(0));
  const [notesBuilt, setNotesBuilt] = useState<number[]>(new Array(12).fill(0));
  const [coins, setCoins] = useState(0);

  // Map Editor, Time of Day & Zoom State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProp, setSelectedProp] = useState<SelectedPropInfo | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [saveNotice, setSaveNotice] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [publishState, setPublishState] = useState<'idle' | 'publishing'>('idle');
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [activeCategory, setActiveCategory] = useState<
    'houses_front' | 'houses_angles' | 'rocks' | 'street' | 'trees' | 'walls'
  >('houses_front');

  // Estados de carregamento de assets e editor de HUD Mobile no PC
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase | null>(null);
  const [openingLine, setOpeningLine] = useState(0);
  const [showOpeningVideo, setShowOpeningVideo] = useState(false);
  const [tutorialStage, setTutorialStage] = useState<TutorialStage>('cinematic');
  const openingStarted = useRef(false);
  const [showMobileHudEditor, setShowMobileHudEditor] = useState(false);
  const [currentHudLayout, setCurrentHudLayout] = useState<any>(null);
  const [hudSaveStatus, setHudSaveStatus] = useState<string | null>(null);

  // Estados de Música, Configurações e Multiplayer
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('há poucos instantes');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Música contínua de fundo (Whispers of the Village)
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [bgmVolume, setBgmVolume] = useState(() => {
    try {
      const v = localStorage.getItem('acordelot_bgm_volume');
      return v !== null ? Number(v) : 0.45;
    } catch {
      return 0.45;
    }
  });
  const [isBgmMuted, setIsBgmMuted] = useState(() => {
    try {
      return localStorage.getItem('acordelot_bgm_muted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.volume = isBgmMuted ? 0 : bgmVolume;
    audio.loop = true;

    audio.play().catch(() => {});

    const handleFirstGesture = () => {
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const handleVolumeChange = (vol: number) => {
    setBgmVolume(vol);
    try {
      localStorage.setItem('acordelot_bgm_volume', String(vol));
    } catch {}
    if (bgmRef.current) {
      bgmRef.current.volume = isBgmMuted ? 0 : vol;
    }
  };

  const handleToggleBgmMute = () => {
    const next = !isBgmMuted;
    setIsBgmMuted(next);
    try {
      localStorage.setItem('acordelot_bgm_muted', String(next));
    } catch {}
    if (bgmRef.current) {
      bgmRef.current.volume = next ? 0 : bgmVolume;
      if (!next && bgmRef.current.paused) {
        bgmRef.current.play().catch(() => {});
      }
    }
  };

  // O jogo é pensado SEMPRE pra paisagem — em celular na vertical o HUD
  // inteiro (posicionado em coordenadas de paisagem) sai torto/de lado.
  // Em vez de deixar isso confuso, avisa e trava até girar o aparelho.
  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    if (!canvasRef.current || !containerRef.current) return;

    prepareProgressionVersion();
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    // Detecta se os assets já carregaram ou aguarda carregamento para remover a cortina preta
    if (engine.assetsLoaded) {
      setAssetsLoaded(true);
    } else {
      engine.onAssetsLoaded = () => {
        setAssetsLoaded(true);
      };
    }

    // Carrega save na nuvem e local de forma infalível
    let autoSaveCleanup: (() => void) | null = null;
    let saveTimeout: any = null;
    const userId = user?.id;

    const scheduleSave = () => {
      if (!userId || !engineRef.current) return;
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (engineRef.current) saveToCloud(engineRef.current, userId).catch(() => {});
      }, 1000);
    };

    if (userId) {
      loadCloudSave(userId).then((save) => {
        if (save) {
          applySaveToEngine(engine, save);
        }
      }).finally(() => setSaveReady(true));
      // Auto-save a cada 5 segundos e ao minimizar/fechar
      autoSaveCleanup = setupAutoSave(engine, userId, 5000);
    } else setSaveReady(true);
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      (window as unknown as { __game?: GameEngine }).__game = engine;
    }

    engine.onInteractionChange = (state) => {
      setInteraction(state);
      if (!state.isTalking) {
        setShowShop(false);
        setDialogueIdx(0);
      }
    };

    engine.onInventoryChange = (inv) => {
      setInventory(inv);
      scheduleSave();
    };

    let prevLevel = engine.stats?.level || 1;
    engine.onStatsChange = (s) => {
      setStats(s);
      if (s.level > prevLevel) {
        prevLevel = s.level;
        // Subiu de nível! Salva imediatamente no dispositivo e na nuvem
        if (userId && engineRef.current) {
          saveToCloud(engineRef.current, userId).catch(() => {});
        }
      } else {
        scheduleSave();
      }
    };
    setStats({ ...engine.stats });

    engine.onFragmentsChange = ({ fragments: f, built }) => {
      setFragments(f);
      setNotesBuilt(built);
      scheduleSave();
    };
    engine.onCoinsChange = (n) => {
      setCoins(n);
      scheduleSave();
    };

    engine.onHarvestPopup = (text) => {
      setPickupFlash(text);
      if (pickupTimer.current) window.clearTimeout(pickupTimer.current);
      pickupTimer.current = window.setTimeout(() => setPickupFlash(null), 900);
    };

    engine.onGroupChange = (ids) => setGroupCount(ids.length);

    engine.onSelectedPropChange = (prop) => {
      setSelectedProp(prop);
    };

    engine.onMapSaveNotification = () => {
      setSaveNotice(true);
      setTimeout(() => setSaveNotice(false), 2000);
    };

    engine.onZoomChange = (zoom) => {
      setZoomLevel(zoom);
    };

    engine.onQuestsChange = () => setQuestTick((t) => t + 1);
    engine.onCharacterChange = () => setCharacterTick((t) => t + 1);
    engine.onStoryVoice = (text, voice) => speakMusically(text, voice, Math.max(.12, bgmVolume * .34));
    engine.onStoryBeat = (beat) => {
      if (beat === 'movement_learned') {
        setTutorialStage('explore');
      } else if (beat === 'attack_learned') {
        setTutorialStage('follow');
      } else if (beat === 'opening_sound_found') {
        setTutorialStage('cinematic');
        playMusicalTone(369.99, .72, isBgmMuted ? 0 : .13); // Sol♭4 / F♯4
        setOpeningLine(0);
        setOpeningPhase('discovery');
      } else if (beat === 'shinkers_appear') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('encounter');
      } else if (beat === 'shinkers_defeated') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('aftermath');
      } else if (beat === 'three_echoes_found') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('echoes');
        if (!isBgmMuted) {
          playMusicalTone(261.63, .2, .1);
          window.setTimeout(() => playMusicalTone(329.63, .2, .1), 230);
          window.setTimeout(() => playMusicalTone(392, .35, .11), 460);
        }
      } else if (beat === 'opening_mission_complete') {
        setTutorialStage('follow');
      } else if (beat === 'gate_arrival') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('gate');
      } else if (beat === 'mirella_arrival') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('mirella');
      } else if (beat === 'house_entered') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('rest');
      } else if (beat === 'morning_arrival') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('morning');
      } else if (beat === 'antony_arrival') {
        setTutorialStage('cinematic');
        setOpeningLine(0);
        setOpeningPhase('antony');
      } else if (beat === 'second_mission_complete') {
        setTutorialStage('full');
      }
    };

    const updateSize = () => {
      if (!containerRef.current || !engineRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerW = Math.max(320, Math.floor(rect.width));
      const containerH = Math.max(240, Math.floor(rect.height));

      const targetInternalH = 320;
      const scale = Math.max(1, Math.floor(containerH / targetInternalH));
      const internalW = Math.floor(containerW / scale);
      const internalH = Math.floor(containerH / scale);

      engineRef.current.setViewportSize(internalW, internalH);
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(containerRef.current);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') setShowInventory((v) => !v);
      if (e.code === 'KeyC') {
        setSheetInitialTab('ficha');
        setShowSheet((v) => !v);
      }
      if (e.code === 'KeyN') setShowSynth((v) => !v);
      if (e.code === 'KeyP') setShowPartitura((v) => !v);
      if (e.code === 'KeyU') setShowWeapon((v) => !v);
      if (e.code === 'KeyY') {
        setSheetInitialTab('skills');
        setShowSheet(true);
      }
      if (e.code === 'KeyK') setShowCatalog((v) => !v);
      if (e.code === 'KeyM') setShowQuests((v) => !v);
      if (e.code === 'KeyG') setShowWorldMap((v) => !v);
      if (e.code === 'KeyV') {
        const eng = engineRef.current;
        if (eng) {
          const roster = eng.availableCharacters;
          const idx = roster.indexOf(eng.activeCharacter);
          eng.switchCharacter(roster[(idx + 1) % roster.length]);
        }
      }
    };
    window.addEventListener('keydown', onKey);

    engine.start();

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      if (autoSaveCleanup) autoSaveCleanup();
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!assetsLoaded || !saveReady || openingStarted.current || !engineRef.current) return;
    openingStarted.current = true;
    if (engineRef.current.isAntonyMissionComplete) {
      setTutorialStage('full');
      setOpeningPhase(null);
      return;
    }
    setTutorialStage('cinematic');
    setOpeningLine(0);
    if (!engineRef.current.isOpeningComplete) {
      engineRef.current.beginOpeningScene();
      setOpeningPhase(null);
      setShowOpeningVideo(true);
      return;
    }
    engineRef.current.startAtMorningScene();
    setOpeningPhase('morning');
  }, [assetsLoaded, saveReady, user?.id]);

  const finishOpeningVideo = () => {
    setShowOpeningVideo(false);
    setOpeningLine(0);
    setOpeningPhase('awakening');
  };

  const currentOpeningLine = openingPhase ? OPENING_LINES[openingPhase][openingLine] : null;

  useEffect(() => {
    if (!currentOpeningLine || currentOpeningLine.text === '...') return;
    speakMusically(
      currentOpeningLine.text,
      currentOpeningLine.voice,
      Math.max(.12, bgmVolume * .34),
    );
  }, [currentOpeningLine, bgmVolume, isBgmMuted]);

  useEffect(() => {
    if (!interaction.isTalking || !dlgLines[dialogueIdx]) return;
    speakMusically(
      dlgLines[dialogueIdx],
      interaction.npc?.id ?? interaction.npc?.name ?? 'npc',
      Math.max(.12, bgmVolume * .34),
    );
  }, [interaction.isTalking, interaction.npc?.id, dialogueIdx]);

  const advanceOpening = () => {
    if (!openingPhase) return;
    unlockMusicalVoice();
    const lines = OPENING_LINES[openingPhase];
    if (openingLine < lines.length - 1) {
      setOpeningLine((line) => line + 1);
      return;
    }
    stopMusicalVoice();
    if (openingPhase === 'awakening') {
      setOpeningPhase(null);
      setTutorialStage('movement');
      engineRef.current?.releaseOpeningControl();
      return;
    }
    if (openingPhase === 'discovery') {
      setOpeningPhase(null);
      setTutorialStage('explore');
      engineRef.current?.finishOpeningDiscovery();
      return;
    }
    if (openingPhase === 'encounter') {
      setOpeningPhase(null);
      setTutorialStage('combat');
      engineRef.current?.beginShinkerEncounter();
      return;
    }
    if (openingPhase === 'aftermath') {
      setOpeningPhase(null);
      setTutorialStage('explore');
      engineRef.current?.revealThreeEchoes();
      return;
    }
    if (openingPhase === 'gate') {
      setOpeningPhase(null);
      setTutorialStage('follow');
      engineRef.current?.beginPippoEscort();
      return;
    }
    if (openingPhase === 'mirella') {
      setOpeningPhase(null);
      engineRef.current?.beginHouseRest();
      return;
    }
    if (openingPhase === 'rest') {
      setOpeningPhase(null);
      engineRef.current?.finishOpeningRest();
      return;
    }
    if (openingPhase === 'morning') {
      setOpeningPhase(null);
      setTutorialStage('follow');
      engineRef.current?.finishMorningBriefing();
      return;
    }
    if (openingPhase === 'antony') {
      setOpeningPhase(null);
      setTutorialStage('full');
      engineRef.current?.clearInputState();
      engineRef.current?.finishAntonyMeeting();
      return;
    }
    setOpeningPhase(null);
    setTutorialStage('follow');
    engineRef.current?.finishThreeEchoes();
  };

  // Conexão e sincronização Multiplayer da Sala Online (Supabase Realtime Broadcast & Presence)
  useEffect(() => {
    if (!roomId) {
      if (engineRef.current) {
        engineRef.current.clearRemotePlayers();
      }
      return;
    }

    const currentUserId = user?.id || 'guest-' + Math.random().toString(36).substring(2, 7);

    networkManager.onRemotePlayerUpdate = (remotePlayer) => {
      if (engineRef.current) {
        engineRef.current.setRemotePlayer(remotePlayer);
      }
    };

    networkManager.onRemotePlayerLeave = (leftPlayerId) => {
      if (engineRef.current) {
        engineRef.current.removeRemotePlayer(leftPlayerId);
      }
    };

    networkManager.onRoomPresenceSync = (presentPlayers) => {
      const eng = engineRef.current;
      if (!eng) return;
      const presentIds = new Set(presentPlayers.map((player) => player.id));
      for (const id of eng.remotePlayers.keys()) {
        if (!presentIds.has(id)) eng.removeRemotePlayer(id);
      }
      for (const player of presentPlayers) eng.setRemotePlayer(player);
    };

    networkManager.onEnemyDamage = (event) => {
      engineRef.current?.applyRemoteEnemyDamage(event.enemyId, event.damage, event.fromX, event.fromY);
    };

    if (engineRef.current) {
      engineRef.current.onEnemyDamaged = (enemyId, damage, fromX, fromY) => {
        networkManager.broadcastEnemyDamage(user, enemyId, damage, fromX, fromY);
      };
    }

    networkManager.onChatMessage = (msg) => {
      setChatMessages((prev) => [...prev.slice(-49), msg]);
      if (engineRef.current) {
        engineRef.current.showChatBubble(
          msg.senderId,
          msg.senderName,
          msg.text,
          msg.senderId === currentUserId
        );
      }
    };

    const localPlayer = engineRef.current?.player;
    networkManager.connectToRoom(roomId, user, engineRef.current?.activeCharacter || 'akles', localPlayer ? {
      x: localPlayer.x,
      y: localPlayer.y,
      direction: localPlayer.direction,
      isMoving: localPlayer.isMoving,
      stepTimer: localPlayer.stepTimer,
    } : undefined);

    // WebRTC direto em ~12 FPS; o Supabase só é usado como fallback lento.
    const interval = setInterval(() => {
      const eng = engineRef.current;
      if (!eng || !eng.player) return;
      const p = eng.player;
      networkManager.broadcastMovement(
        user,
        p.x,
        p.y,
        p.direction,
        p.isMoving,
        p.stepTimer,
        eng.activeCharacter,
        p.actionState,
        p.actionTimer,
      );
    }, 80);

    const handlePageExit = () => {
      void networkManager.disconnectFromRoom(user?.id);
    };
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
      void networkManager.disconnectFromRoom(user?.id);
      networkManager.onRemotePlayerUpdate = undefined;
      networkManager.onRemotePlayerLeave = undefined;
      networkManager.onRoomPresenceSync = undefined;
      networkManager.onEnemyDamage = undefined;
      networkManager.onChatMessage = undefined;
      if (engineRef.current) {
        engineRef.current.onEnemyDamaged = undefined;
        engineRef.current.clearRemotePlayers();
      }
    };
  }, [roomId, user]);

  const handleSendChatMessage = (text: string) => {
    if (!user || !roomId) return;
    const msg = networkManager.sendChatMessage(user, text);
    if (msg) {
      setChatMessages((prev) => [...prev.slice(-49), msg]);
      if (engineRef.current) {
        engineRef.current.showChatBubble(
          msg.senderId,
          msg.senderName,
          msg.text,
          true
        );
      }
    }
  };

  const handleSaveGlobalHud = async () => {
    setHudSaveStatus('Salvando layout...');
    const raw = localStorage.getItem('acordelot_hud_layout_v3');
    const layout = currentHudLayout || (raw ? JSON.parse(raw) : { portrait: {}, landscape: {} });
    const success = await saveGlobalHudLayout(layout);
    if (success) {
      setHudSaveStatus('✅ HUD Global salvo no Supabase para todos!');
      setTimeout(() => setHudSaveStatus(null), 3500);
    } else {
      setHudSaveStatus('❌ Erro ao salvar HUD no servidor');
      setTimeout(() => setHudSaveStatus(null), 3000);
    }
  };

  const dlgLines = interaction.npc?.dialogue ?? interaction.dialogue ?? [];
  const regularDialoguePortrait = interaction.npc?.spriteType
    ? NPC_PORTRAIT_SOURCES[interaction.npc.spriteType]
    : undefined;
  const handleNextDialogue = () => {
    if (dialogueIdx < dlgLines.length - 1) {
      setDialogueIdx((prev) => prev + 1);
    } else if (interaction.npc?.isMerchant) {
      setShowShop(true);
    } else {
      handleCloseDialogue();
    }
  };

  const handleCloseDialogue = () => {
    const enterForge = interaction.npc?.isBlacksmith === true;
    engineRef.current?.clearInputState();
    engineRef.current?.closeDialogue();
    setShowShop(false);
    setShopMessage(null);
    setDialogueIdx(0);
    if (enterForge) setShowForge(true);
  };

  const handleShopPurchase = (id: string) => {
    const result = engineRef.current?.buyShopItem(id);
    if (!result) return;
    setShopMessage(result.message);
  };

  const toggleEditMode = () => {
    const next = !isEditMode;
    setIsEditMode(next);
    engineRef.current?.setEditMode(next);
    if (!next) {
      setShowMobileHudEditor(false);
    }
  };

  const handleTimeOfDay = (time: TimeOfDay) => {
    setTimeOfDay(time);
    engineRef.current?.setTimeOfDay(time);
  };

  const handleScaleChange = (newScale: number) => {
    if (!engineRef.current || !selectedProp) return;
    engineRef.current.setPropScale(selectedProp.id, newScale);
  };

  const handleDuplicate = () => {
    if (!engineRef.current || !selectedProp) return;
    engineRef.current.duplicateProp(selectedProp.id);
  };

  const handleDelete = () => {
    if (!engineRef.current || !selectedProp) return;
    engineRef.current.deleteProp(selectedProp.id);
  };

  const handleSpawn = (type: string) => {
    engineRef.current?.spawnProp(type);
  };

  const handleSaveExplicitly = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.saveMapToStorage(); // persistência local instantânea
    saveWorldMapToCloud(engine.serializeMap()); // persistência em tempo real no Supabase

    // Publicar no código (commit no GitHub). Se não houver token, pede.
    if (!getGhToken()) {
      setShowTokenDialog(true);
      return;
    }
    setPublishState('publishing');
    const res = await publishMapToCode(engine.serializeMap());
    setPublishState('idle');
    setPublishMsg(res.ok ? '✓ ' + res.message : '✗ ' + res.message);
    setTimeout(() => setPublishMsg(null), 5000);
  };

  const handleSaveToken = async () => {
    setGhToken(tokenInput);
    setShowTokenDialog(false);
    setTokenInput('');
    if (getGhToken() && engineRef.current) {
      setPublishState('publishing');
      const res = await publishMapToCode(engineRef.current.serializeMap());
      setPublishState('idle');
      setPublishMsg(res.ok ? '✓ ' + res.message : '✗ ' + res.message);
      setTimeout(() => setPublishMsg(null), 5000);
    }
  };

  const handleResetMap = () => {
    if (window.confirm('Restaurar posições padrão de todas as casas, árvores e rochas?')) {
      engineRef.current?.resetMapToDefault();
    }
  };

  // Drag and Drop from palette drawer onto canvas
  const handleDragStart = (e: React.DragEvent, propType: string) => {
    e.dataTransfer.setData('text/plain', propType);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const propType = e.dataTransfer.getData('text/plain');
    if (!propType || !engineRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rs = engineRef.current.renderScale;
    const scaleX = canvasRef.current.width / rect.width / rs;
    const scaleY = canvasRef.current.height / rect.height / rs;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const worldX = canvasX + engineRef.current.camX;
    const worldY = canvasY + engineRef.current.camY;

    engineRef.current.spawnPropAtWorldPos(propType, worldX, worldY);
  };

  const currentCategoryItems = PROP_CATALOG.filter((item) => item.category === activeCategory);

  // O jogo só funciona em paisagem. Em celular com a ROTAÇÃO DO SISTEMA
  // travada (comum em Android — trava ativada não deixa a tela virar mesmo
  // segurando o aparelho deitado), pedir pra girar não adianta: o viewport
  // nunca fica largo. Em vez de bloquear, gira o conteúdo INTEIRO por CSS
  // (truque padrão de "forçar paisagem") — o jogador segura deitado, a UI
  // gira 90° pra compensar, e visualmente cai tudo no lugar certo pra ele.
  // Clique-no-canvas (getWorldPosFromEvent) só é usado no editor de mapa
  // (desktop), nunca no toque — então girar por CSS não quebra input mobile.
  const needsCssRotate = isTouchDevice && isPortrait;

  return (
    <div
      style={
        needsCssRotate
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vh',
              height: '100vw',
              transformOrigin: 'top left',
              transform: 'rotate(90deg) translateY(-100%)',
              background: '#020617',
              overflow: 'hidden',
            }
          : { position: 'fixed', inset: 0 }
      }
    >
    <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      {/* ------------------------------------------------------------- */}
      {/* SLEEK TOP BAR EDITOR (Posicionado no topo, fino e desobstruído) */}
      {/* ------------------------------------------------------------- */}
      {isEditMode && (
        <div
          id="map-editor-top-bar"
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-5xl flex flex-col gap-1.5 transition-all animate-in fade-in slide-in-from-top-4 duration-200"
        >
          {/* Main Top Header Strip */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/50 rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl shadow-black/70">
            {/* Left: Mode Title + Save status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl px-2.5 py-1">
                <Sliders className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">
                  Editor de Mapa
                </span>
              </div>

              {/* Publica o layout no código (commit no GitHub) */}
              <button
                type="button"
                onClick={handleSaveExplicitly}
                disabled={publishState === 'publishing'}
                className="cursor-pointer flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 px-2.5 py-1 rounded-xl text-xs transition-all active:scale-95 shadow-sm disabled:opacity-60"
                title="Salva no navegador e comita src/game/customMapLayout.json no GitHub — vira build permanente."
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-300">
                  {publishState === 'publishing'
                    ? 'Publicando…'
                    : publishMsg
                      ? publishMsg
                      : 'Publicar no Código'}
                </span>
              </button>

              {/* Opção para exibir e editar o HUD do celular no computador */}
              <button
                type="button"
                onClick={() => setShowMobileHudEditor((v) => !v)}
                className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  showMobileHudEditor
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border border-amber-500/40'
                }`}
                title="Mostrar os botões de toque do celular para posicionar com o mouse no computador e salvar para todos"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{showMobileHudEditor ? '📱 HUD Celular (Aberto)' : '📱 HUD Celular'}</span>
              </button>
            </div>

            {/* Middle: Day / Sunset / Night Shaders */}
            <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handleTimeOfDay('day')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  timeOfDay === 'day'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Iluminação Natural Diurna"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Dia</span>
              </button>
              <button
                type="button"
                onClick={() => handleTimeOfDay('sunset')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  timeOfDay === 'sunset'
                    ? 'bg-amber-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Pôr do Sol Dourado"
              >
                <Sunset className="w-3.5 h-3.5" />
                <span>Entardecer</span>
              </button>
              <button
                type="button"
                onClick={() => handleTimeOfDay('night')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  timeOfDay === 'night'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/50 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Noite com Iluminação das Lanternas, Luz da Lua e Shaders"
              >
                <Moon className="w-3.5 h-3.5 text-cyan-300" />
                <span>Noite (Shader)</span>
              </button>
            </div>

            {/* Right: Camera Zoom Pill + Close */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-xl px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => engineRef.current?.zoomCamera(-0.15)}
                  className="cursor-pointer p-1 text-slate-300 hover:text-white"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-amber-300 w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => engineRef.current?.zoomCamera(0.15)}
                  className="cursor-pointer p-1 text-slate-300 hover:text-white"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetMap}
                className="cursor-pointer text-slate-400 hover:text-rose-400 px-2 py-1 text-[11px] font-medium transition-colors"
                title="Restaurar posições padrão"
              >
                Resetar
              </button>

              <button
                type="button"
                onClick={toggleEditMode}
                className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-xl transition-all"
                title="Fechar Modo Editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de controle do HUD Celular no PC */}
          {showMobileHudEditor && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-amber-400/80 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="text-xs font-bold text-amber-300">
                  HUD do Celular no PC:
                </span>
                <span className="text-[11px] text-slate-300">
                  Arraste qualquer botão com o mouse para posicioná-lo. Ao salvar, todos os celulares carregarão este HUD.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {hudSaveStatus && (
                  <span className="text-xs font-bold text-emerald-400 animate-pulse mr-1">
                    {hudSaveStatus}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveGlobalHud}
                  className="cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-md active:scale-95 transition-all"
                  title="Salvar layout global para todos os celulares no Supabase"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar HUD Global</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMobileHudEditor(false)}
                  className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                >
                  Fechar HUD
                </button>
              </div>
            </div>
          )}

          {/* Barra de seleção múltipla */}
          {groupCount > 1 && (
            <div className="bg-sky-950/95 backdrop-blur-md border border-sky-400/70 rounded-xl px-3 py-1.5 flex items-center justify-between gap-3 shadow-xl">
              <span className="text-[11px] font-bold text-sky-200">
                {groupCount} assets selecionados
                <span className="text-sky-400/80 font-normal">
                  {' '}
                  · arraste um deles p/ mover todos · Shift+clique adiciona
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => engineRef.current?.duplicateSelection()}
                  className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar ({groupCount})
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.deleteSelection()}
                  className="cursor-pointer bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.clearSelection()}
                  className="cursor-pointer text-sky-300 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Contextual Sub-Bar: Selected Prop Controls (When an item is clicked) */}
          {groupCount > 1 ? null : selectedProp ? (
            <div className="bg-slate-900/95 backdrop-blur-md border border-amber-400/80 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                  {selectedProp.name}
                </span>
                <span className="text-slate-400 text-[11px]">
                  ({selectedProp.w}x{selectedProp.h} px)
                </span>
              </div>

              {/* Inline Scale Slider & Controls */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] font-medium">Tamanho:</span>
                <button
                  type="button"
                  onClick={() => handleScaleChange(selectedProp.scale - 0.1)}
                  className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white p-1 rounded-md"
                  title="Diminuir tamanho"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={selectedProp.scale}
                  onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                  className="w-24 accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleScaleChange(selectedProp.scale + 0.1)}
                  className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white p-1 rounded-md"
                  title="Aumentar tamanho"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-xs font-mono font-bold text-amber-300 w-12 text-right">
                  {Math.round(selectedProp.scale * 100)}%
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95"
                  title="Duplicar (D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar (D)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="cursor-pointer bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95"
                  title="Excluir (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.selectProp(null)}
                  className="cursor-pointer text-slate-400 hover:text-white p-1"
                  title="Deselecionar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Category Selector & Prop Drawer (When no item is selected) */
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl px-2.5 py-1.5 flex flex-col gap-1.5 shadow-xl">
              {/* Category Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 border-b border-slate-800/60 pb-1">
                <span className="text-slate-400 text-[11px] font-semibold mr-1">Adicionar:</span>
                <button
                  type="button"
                  onClick={() => setActiveCategory('houses_front')}
                  className={`cursor-pointer px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === 'houses_front'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🏠 Casas (Frente)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('houses_angles')}
                  className={`cursor-pointer px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === 'houses_angles'
                      ? 'bg-sky-500/30 text-sky-300 border border-sky-500/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔄 Costas & Laterais
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('rocks')}
                  className={`cursor-pointer px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === 'rocks'
                      ? 'bg-stone-500/30 text-stone-200 border border-stone-500/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⛰️ Pedreira & Rochas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('street')}
                  className={`cursor-pointer px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === 'street'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🏮 Lanternas & Vila
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('trees')}
                  className={`cursor-pointer px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === 'trees'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌳 Árvores
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('walls')}
                  className={`cursor-pointer px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === 'walls'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🏰 Muralhas
                </button>
              </div>

              {/* Horizontal Prop Cards Drawer (Clique ou arraste direto para o mapa) */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin">
                {currentCategoryItems.map((item) => (
                  <div
                    key={item.type}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onClick={() => handleSpawn(item.type)}
                    className="cursor-pointer group shrink-0 flex items-center gap-2 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-400/70 rounded-xl px-2.5 py-1 transition-all active:scale-95 shadow"
                    title="Clique para adicionar ou arraste para o mapa"
                  >
                    {item.imgSrc ? (
                      <img
                        src={item.imgSrc}
                        alt={item.name}
                        className="w-8 h-8 object-contain rounded bg-slate-900/60 p-0.5 border border-slate-800 group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-sm">
                        🌳
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 transition-colors whitespace-nowrap">
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-medium text-amber-400/90">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Notification Toast */}
      {saveNotice && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/70 rounded-xl px-4 py-1.5 shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Edições salvas automaticamente com sucesso!</span>
        </div>
      )}

      {/* Game Canvas Viewport */}
      <div
        ref={containerRef}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-default select-none"
          style={{ imageRendering: 'auto', touchAction: 'none' }}
        />

        {/* TELA DE PRÉ-CARREGAMENTO CINEMÁTICA ACORDELOT (Elimina código cru / assets não carregados) */}
        <div
          className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-700 select-none ${
            assetsLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
        >
          <img
            src="/assets/login/logo.png"
            alt="Acordelot"
            className="w-56 sm:w-72 max-h-32 object-contain mb-6 drop-shadow-[0_0_35px_rgba(245,158,11,0.5)] animate-pulse"
          />
          <div className="w-56 sm:w-72 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-3 border border-amber-500/20 shadow-inner">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-amber-300/90 font-semibold animate-pulse">
            Carregando Texturas &amp; Sons de Acordelot…
          </span>
        </div>

        {showOpeningVideo && (
          <div className="fixed inset-0 z-[70] bg-black pointer-events-auto">
            <video
              src="/assets/videos/abertura_floresta.mp4"
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={finishOpeningVideo}
              onError={finishOpeningVideo}
            />
            <button
              type="button"
              onClick={finishOpeningVideo}
              className="absolute right-[max(14px,env(safe-area-inset-right))] top-[max(14px,env(safe-area-inset-top))] rounded-full border border-white/30 bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-white backdrop-blur-sm"
            >
              Pular abertura
            </button>
          </div>
        )}

        {openingPhase && currentOpeningLine && (
          <div className="fixed inset-0 z-[60] pointer-events-auto select-none flex items-end justify-center pb-[max(8px,env(safe-area-inset-bottom))]">
            <div className="absolute left-3 top-3 rounded-lg border border-violet-300/20 bg-slate-950/78 px-3 py-1.5 backdrop-blur-sm">
              <p className="text-[8px] font-black uppercase tracking-[.28em] text-violet-200/70">Capítulo I · Missão 1</p>
              <p className="text-[10px] font-black tracking-[.1em] text-white/90 drop-shadow-lg">
                {openingPhase === 'awakening' ? 'O SOM NA ESCURIDÃO' :
                  openingPhase === 'discovery' ? 'SOL BEMOL' :
                    openingPhase === 'encounter' ? 'CRIATURAS DISSONANTES' :
                      openingPhase === 'aftermath' ? 'MEMÓRIA DO CORPO' :
                        openingPhase === 'echoes' ? 'TRÊS ECOS' :
                          openingPhase === 'gate' ? 'O MENINO DA LANTERNA' :
                            openingPhase === 'mirella' ? 'ABRIGO' :
                              openingPhase === 'rest' ? 'ANTES DO AMANHECER' :
                                openingPhase === 'morning' ? 'UMA LONGA ESTRADA' : 'O LÍDER DE ACORDELOT'}
              </p>
            </div>

            <div className="w-[min(560px,72vw)]">
              <div className="rounded-xl border border-violet-300/30 bg-slate-950/90 backdrop-blur-md shadow-[0_10px_36px_rgba(0,0,0,.65)] overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-transparent via-violet-300/80 to-transparent" />
                <div className="px-3 py-2.5 flex items-center gap-3">
                  {DIALOGUE_PORTRAITS[currentOpeningLine.voice] && (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-amber-300/40 bg-slate-900 shadow-inner">
                      {DIALOGUE_PORTRAITS[currentOpeningLine.voice].sheet ? (
                        <div
                          className="absolute inset-0 bg-no-repeat"
                          style={{
                            backgroundImage: `url(${DIALOGUE_PORTRAITS[currentOpeningLine.voice].src})`,
                            backgroundSize: DIALOGUE_PORTRAITS[currentOpeningLine.voice].sheet === 'npc' ? '1500% auto' : '600% auto',
                            backgroundPosition: '0% 0%',
                          }}
                        />
                      ) : (
                        <img src={DIALOGUE_PORTRAITS[currentOpeningLine.voice].src} alt="" className="h-full w-full object-cover object-top" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-violet-300 text-xs">♪</span>
                    <p className={`text-[9px] font-black uppercase tracking-[.18em] ${currentOpeningLine.speaker === 'Narração' ? 'text-slate-400' : 'text-amber-300'}`}>
                      {currentOpeningLine.speaker}
                    </p>
                  </div>
                  <p className={`min-h-[30px] text-[11px] sm:text-sm leading-snug ${currentOpeningLine.speaker === 'Narração' ? 'italic text-slate-200' : 'font-semibold text-white'}`}>
                    {currentOpeningLine.text}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      {OPENING_LINES[openingPhase].map((_, index) => (
                        <span key={index} className={`h-1 rounded-full transition-all ${index === openingLine ? 'w-6 bg-violet-300' : 'w-2 bg-slate-700'}`} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={advanceOpening}
                      className="cursor-pointer shrink-0 rounded-lg bg-violet-300 hover:bg-violet-200 text-slate-950 px-3 py-1.5 text-[10px] font-black flex items-center gap-1 active:scale-95 transition"
                    >
                      {openingLine < OPENING_LINES[openingPhase].length - 1
                        ? 'Continuar'
                        : openingPhase === 'awakening'
                          ? 'Levantar'
                          : openingPhase === 'discovery'
                            ? 'Seguir o som'
                            : openingPhase === 'encounter'
                              ? 'Preparar-se'
                              : openingPhase === 'aftermath'
                                ? 'Seguir as luzes'
                                : openingPhase === 'echoes'
                                  ? 'Seguir os Ecos'
                                  : openingPhase === 'gate'
                                    ? 'Ir com Pippo'
                                    : openingPhase === 'mirella'
                                      ? 'Entrar na casa'
                                      : openingPhase === 'rest'
                                        ? 'Amanhecer'
                                        : openingPhase === 'morning'
                                          ? 'Procurar o Sr. Antony'
                                          : openingPhase === 'antony'
                                            ? 'Entrar em Acordelot'
                                            : 'Continuar'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de vida + retrato + XP */}
      {!isEditMode && stats && tutorialStage !== 'cinematic' && (
        <PlayerHud
          stats={{ ...stats, maxEnergy: engineRef.current?.effectiveMaxEnergy ?? stats.maxEnergy }}
          onOpenSheet={() => { setSheetInitialTab('ficha'); setShowSheet(true); }}
          questObjective={engineRef.current?.activeQuestObjective ?? null}
          onOpenQuests={() => setShowQuests(true)}
          portraitSrc={engineRef.current?.activeCharacterPortrait}
          coins={coins}
          goldRaw={inventory.gold_raw || 0}
          goldRefined={inventory.gold_refined || 0}
        />
      )}

      {/* Joystick + botões de ação para celular (também visível no PC quando showMobileHudEditor estiver ativo) */}
      {((isTouchDevice && !isEditMode) || showMobileHudEditor) && (
        <TouchControls
          engineRef={engineRef}
          onToggleInventory={() => setShowInventory((v) => !v)}
          onToggleSynth={() => setShowSynth((v) => !v)}
          onTogglePartitura={() => setShowPartitura((v) => !v)}
          onToggleWeapon={() => setShowWeapon((v) => !v)}
          onToggleCatalog={() => setShowCatalog((v) => !v)}
          onToggleQuests={() => setShowQuests((v) => !v)}
          onToggleMap={() => setShowWorldMap((v) => !v)}
          onToggleSheet={() => {
            setSheetInitialTab('ficha');
            setShowSheet((v) => !v);
          }}
          forceEditMode={showMobileHudEditor}
          tutorialStage={showMobileHudEditor ? 'full' : tutorialStage}
          showQuestTutorial={Boolean(engineRef.current?.antonyMissionComplete && !engineRef.current?.voicesMissionAccepted)}
          onLayoutChange={(layout) => {
            setCurrentHudLayout(layout);
          }}
        />
      )}

      {stats && (
        <CharacterScreen
          open={showSheet && !isEditMode}
          onClose={() => setShowSheet(false)}
          stats={stats}
          power={engineRef.current?.combatPower ?? 0}
          canLevelUp={engineRef.current?.canLevelUp ?? false}
          onLevelUp={() => engineRef.current?.levelUp()}
          onSpend={(attr) => engineRef.current?.spendAttrPoint(attr)}
          engine={engineRef.current}
          inventory={inventory}
          initialTab={sheetInitialTab}
        />
      )}

      {/* HUD de coleta — desktop */}
      {!isEditMode && !isTouchDevice && tutorialStage === 'full' && (
        <div className="fixed bottom-6 right-6 z-30 flex items-end gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowWorldMap((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Mapa do mundo (G)"
          >
            <MapIcon className="w-7 h-7" />
          </button>
          <button
            type="button"
            onClick={() => setShowPartitura((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Síntese de Partituras (P)"
          >
            <HudIcon name="partitura" className="w-9 h-9" />
          </button>
          <button
            type="button"
            onClick={() => setShowWeapon((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-blue-300 border border-blue-500/40 hover:border-blue-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Arma (U)"
          >
            <HudIcon name="weapon" className="w-9 h-9" />
          </button>
          <button
            type="button"
            onClick={() => setShowCatalog((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Catálogo (K)"
          >
            <HudIcon name="catalog" className="w-9 h-9" />
          </button>
          <div className="relative">
            {Boolean(engineRef.current?.antonyMissionComplete && !engineRef.current?.voicesMissionAccepted) && (
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-50">
                <span className="text-amber-300 text-[10px] font-black tracking-wider uppercase bg-amber-950/95 px-2.5 py-0.5 rounded-full border border-amber-400 shadow-xl whitespace-nowrap">
                  Missão! ✨
                </span>
                <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-amber-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowQuests((v) => !v)}
              className={`cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95 ${
                Boolean(engineRef.current?.antonyMissionComplete && !engineRef.current?.voicesMissionAccepted)
                  ? 'ring-4 ring-amber-400 animate-pulse'
                  : ''
              }`}
              title="Missões (M)"
            >
              <HudIcon name="quests" className="w-9 h-9" />
            </button>
          </div>
          {/* Troca de personagem estilo Genshin — desktop */}
          <div className="flex items-center gap-1 bg-slate-950/60 rounded-full p-1 backdrop-blur-md border border-slate-700/60">
            {(engineRef.current?.availableCharacters ?? ['akles']).map((ck) => {
              const active = engineRef.current?.activeCharacter === ck;
              return (
                <button
                  key={ck}
                  type="button"
                  onClick={() => engineRef.current?.switchCharacter(ck)}
                  className={`cursor-pointer w-10 h-10 rounded-full overflow-hidden border-2 shadow-xl transition-all active:scale-95 ${
                    active ? 'border-fuchsia-400 ring-2 ring-fuchsia-300/60' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                  title={`Trocar para ${ck === 'akles' ? 'Akles' : ck === 'wins' ? 'Wins' : 'Huans'} (V)`}
                >
                  <img src={CHARACTER_PORTRAITS[ck]} alt={ck} className="w-full h-full object-cover object-top" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowSynth((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-fuchsia-300 border border-fuchsia-500/40 hover:border-fuchsia-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Síntese de notas (N)"
          >
            <HudIcon name="synthesis" className="w-9 h-9" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSheetInitialTab('ficha');
              setShowSheet((v) => !v);
            }}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-sky-300 border border-sky-500/40 hover:border-sky-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Ficha do personagem (C)"
          >
            <HudIcon name="party" className="w-9 h-9" />
          </button>
          <button
            type="button"
            onClick={() => setShowInventory((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Abrir mochila (I)"
          >
            <HudIcon name="backpack" className="w-9 h-9" />
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.useHealingItem()}
            className="cursor-pointer w-12 h-12 rounded-full bg-lime-950/85 hover:bg-lime-900 text-lime-300 border border-lime-500/50 hover:border-lime-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Usar item de cura (Q)"
          >
            <HudIcon name="potion-heal" className="w-10 h-10" />
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.harvestAction()}
            className="cursor-pointer w-16 h-16 rounded-full bg-emerald-900/85 hover:bg-emerald-800 text-emerald-100 border border-emerald-400/60 shadow-xl flex flex-col items-center justify-center gap-0.5 backdrop-blur-md transition-all active:scale-90"
            title="Coletar recurso mais próximo (F)"
          >
            <HudIcon name="collect" className="w-11 h-11" />
            <span className="text-[9px] font-bold">Coletar</span>
          </button>
        </div>
      )}

      {!isEditMode && !isTouchDevice && tutorialStage === 'movement' && (
        <div className="fixed left-1/2 bottom-8 z-30 -translate-x-1/2 rounded-xl border border-cyan-300/60 bg-slate-950/92 px-4 py-2 text-sm font-black text-cyan-100 shadow-xl animate-pulse">
          Use WASD ou as setas para andar
        </div>
      )}
      {!isEditMode && !isTouchDevice && tutorialStage === 'combat' && (
        <button type="button" onClick={() => engineRef.current?.primaryAction()} className="fixed right-8 bottom-8 z-30 h-20 w-20 rounded-full border-2 border-rose-300 bg-rose-900/95 text-white shadow-[0_0_30px_rgba(251,113,133,.5)] animate-pulse">
          <HudIcon name="attack" className="mx-auto h-12 w-12" />
          <span className="sr-only">Atacar com J</span>
        </button>
      )}
      {!isEditMode && !isTouchDevice && tutorialStage === 'combat' && (
        <div className="fixed right-6 bottom-32 z-30 rounded-xl border border-rose-300/60 bg-slate-950/92 px-3 py-2 text-xs font-black text-rose-100">Pressione J para atacar</div>
      )}

      {/* Botão de falar com NPC próximo */}
      {!isEditMode && interaction.nearNpc && !interaction.isTalking && (
        <button
          type="button"
          onClick={() => engineRef.current?.handleInteract()}
          className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black shadow-xl active:scale-95 transition-transform animate-in fade-in slide-in-from-bottom-2"
          style={{
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            background: interaction.nearNpc.accent,
            color: '#0b1220',
          }}
        >
          <span className="text-sm">♪</span>
          Falar com {interaction.nearNpc.name}
        </button>
      )}

      {/* Feedback de coleta */}
      {pickupFlash && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-emerald-950/90 text-emerald-200 border border-emerald-500/60 rounded-full px-4 py-1 text-sm font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {pickupFlash}
        </div>
      )}

      <Inventory
        open={showInventory && !isEditMode}
        onClose={() => setShowInventory(false)}
        items={inventory}
        coins={coins}
        maxCarryWeight={engineRef.current?.maxCarryWeight ?? 40}
        onSell={(item) => engineRef.current?.sellInventoryItem(item)}
        onDiscard={(item) => engineRef.current?.discardInventoryItem(item)}
      />

      <SynthesisScreen
        open={showSynth && !isEditMode}
        onClose={() => setShowSynth(false)}
        fragments={fragments}
        built={notesBuilt}
      />

      <PartituraScreen
        open={showPartitura && !isEditMode}
        onClose={() => setShowPartitura(false)}
        engine={engineRef.current}
        coins={coins}
        fragments={fragments}
        inventory={inventory}
      />

      <WeaponScreen
        open={showWeapon && !isEditMode}
        onClose={() => setShowWeapon(false)}
        engine={engineRef.current}
        inventory={inventory}
      />

      <ForgeScreen
        open={showForge && !isEditMode}
        onClose={() => setShowForge(false)}
        engine={engineRef.current}
        inventory={inventory}
        openOnTools={engineRef.current?.marketIntroStage === 'forge_tools'}
      />

      <CatalogScreen
        open={showCatalog && !isEditMode}
        onClose={() => setShowCatalog(false)}
        engine={engineRef.current}
      />

      <QuestScreen
        open={showQuests && !isEditMode}
        onClose={() => setShowQuests(false)}
        engine={engineRef.current}
      />

      <WorldMapScreen
        open={showWorldMap && !isEditMode}
        onClose={() => setShowWorldMap(false)}
        engine={engineRef.current}
      />

      {/* Configuração do token do GitHub (uma vez) para publicar o mapa */}
      {showTokenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTokenDialog(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-5">
            <h3 className="text-sm font-bold text-emerald-200 mb-2">Publicar o mapa no código</h3>
            <p className="text-[12px] text-slate-300 leading-relaxed mb-3">
              O site publicado é estático, então o editor comita{' '}
              <code className="text-emerald-300">customMapLayout.json</code> direto no GitHub. Cole
              um <b>token pessoal</b> (uma vez — fica só neste navegador):
            </p>
            <ol className="text-[11px] text-slate-400 list-decimal ml-4 space-y-1 mb-3">
              <li>
                Abra{' '}
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline"
                >
                  github.com/settings/personal-access-tokens/new
                </a>
              </li>
              <li>
                Repository access → <b>Only select repositories</b> → <b>acordelot32b</b>
              </li>
              <li>
                Permissions → Repository → <b>Contents: Read and write</b>
              </li>
              <li>Gere e cole o token abaixo</li>
            </ol>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="github_pat_..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-emerald-500 outline-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowTokenDialog(false)}
                className="cursor-pointer text-xs text-slate-400 hover:text-white px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveToken}
                disabled={!tokenInput.trim()}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-lg"
              >
                Salvar e publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top HUD: Indicador de Dia/Noite, Sala Online e Botão de Configurações */}
      {!isEditMode && tutorialStage === 'full' && (
        <div
          className="absolute right-4 z-20 flex items-center gap-2"
          style={{ top: 'calc(12px + env(safe-area-inset-top))' }}
        >
          {roomId && (
            <button
              type="button"
              onClick={onChangeMode}
              className="cursor-pointer bg-indigo-950/85 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-500/60 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md active:scale-95 transition-all"
              title="Clique para trocar de sala ou voltar ao Mundo Solo"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{roomName || 'Online'}</span>
            </button>
          )}

          <DayCycleIndicator engine={engineRef.current} />

          <button
            id="hud-settings-btn"
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="cursor-pointer bg-slate-900/85 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700/80 hover:border-amber-400/60 p-2 rounded-xl backdrop-blur-md shadow-lg transition-all active:scale-95"
            title="Configurações (Música, Save e Sair)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Right Quick Controls — SÓ no desktop/Mac (some no celular) */}
      {!isEditMode && !isTouchDevice && tutorialStage === 'full' && (
        <div
          className="absolute right-4 z-20 flex items-center gap-2"
          style={{ top: 'calc(112px + env(safe-area-inset-top))' }}
        >
          {/* Chuva */}
          <button
            type="button"
            onClick={() => {
              const next = !isRaining;
              setIsRaining(next);
              engineRef.current?.setWeather(next ? 'rain' : 'clear');
            }}
            className={`cursor-pointer backdrop-blur-md p-2 rounded-xl border shadow-xl transition-all ${
              isRaining
                ? 'bg-sky-950/80 text-sky-300 border-sky-500/60'
                : 'bg-slate-900/85 text-slate-400 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="Alternar chuva"
          >
            <CloudRain className="w-4 h-4" />
          </button>

          {/* Day / Night quick button */}
          <button
            type="button"
            onClick={() => handleTimeOfDay(timeOfDay === 'night' ? 'day' : 'night')}
            className={`cursor-pointer backdrop-blur-md px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xl transition-all ${
              timeOfDay === 'night'
                ? 'bg-indigo-950/80 text-cyan-300 border-indigo-500/60 shadow-indigo-900/40'
                : 'bg-slate-900/85 text-amber-300 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="Alternar Dia e Noite"
          >
            {timeOfDay === 'night' ? (
              <>
                <Moon className="w-4 h-4 text-cyan-300" />
                <span>Noite</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Dia</span>
              </>
            )}
          </button>

          {/* Edit Mode Toggle Button */}
          <button
            id="editor-toggle-btn"
            type="button"
            onClick={toggleEditMode}
            className="cursor-pointer bg-slate-900/85 hover:bg-amber-950/70 border border-slate-700 hover:border-amber-400/80 text-slate-200 hover:text-amber-300 backdrop-blur-md rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-bold shadow-xl transition-all active:scale-95"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Editar Mapa</span>
          </button>
        </div>
      )}

      {/* Movement & Key Hint Pill (oculto no celular — o joystick já orienta) */}
      <div
        id="movement-hint-pill"
        hidden={isTouchDevice}
        className="absolute bottom-4 left-4 z-10 pointer-events-none opacity-85 hover:opacity-100 transition-opacity"
      >
        <div className="bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-300 shadow-xl">
          <span className="inline-flex gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            WASD / Setas
          </span>
          <span className="text-slate-400 text-xs">Mover</span>
          <span className="text-slate-600">·</span>
          <span className="inline-flex gap-1 text-[11px] font-mono font-semibold text-amber-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Scroll do Mouse
          </span>
          <span className="text-slate-400 text-xs">Zoom</span>
          {isEditMode && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300 text-xs">D: Duplicar | Del: Excluir</span>
            </>
          )}
        </div>
      </div>

      {/* Balão de diálogo dos NPCs (estilizado por cor de destaque) */}
      {interaction.isTalking && (
        <div
          id="npc-dialogue-modal"
          className="absolute inset-0 z-30 flex items-end justify-center pb-6 pointer-events-none"
        >
          <div
            className="relative bg-slate-950/92 backdrop-blur-md rounded-2xl p-4 pt-6 max-w-lg w-full mx-4 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-200 border"
            style={{
              borderColor: (interaction.npc?.accent ?? '#f59e0b') + '99',
              boxShadow: `0 0 40px -8px ${(interaction.npc?.accent ?? '#f59e0b')}55`,
            }}
          >
            {/* Chapa de nome flutuante */}
            <div
              className="absolute -top-3.5 left-4 flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-lg"
              style={{
                background: (interaction.npc?.accent ?? '#f59e0b'),
                color: '#0b1220',
              }}
            >
              <span className="text-sm">♪</span>
              {interaction.npc?.name ?? interaction.merchantName ?? 'Viajante'}
            </div>
            <button
              type="button"
              onClick={handleCloseDialogue}
              className="absolute top-2 right-2 cursor-pointer text-slate-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            {regularDialoguePortrait && !showShop && (
              <div className="absolute left-4 top-8 h-16 w-16 overflow-hidden rounded-xl border bg-slate-900" style={{ borderColor: (interaction.npc?.accent ?? '#f59e0b') + '88' }}>
                <div
                  className="absolute inset-0 bg-no-repeat"
                  style={{
                    backgroundImage: `url(${regularDialoguePortrait.src})`,
                    backgroundSize:
                      regularDialoguePortrait.sheet === 'npc'
                        ? '1500% auto'
                        : regularDialoguePortrait.sheet === 'guard'
                          ? '600% auto'
                          : 'cover',
                    backgroundPosition: '0% 0%',
                  }}
                />
              </div>
            )}

            <p className={`text-[11px] mb-2 ${regularDialoguePortrait && !showShop ? 'ml-20' : ''}`} style={{ color: (interaction.npc?.accent ?? '#f59e0b') }}>
              {interaction.npc?.title ?? interaction.merchantTitle ?? ''}
            </p>

            {!showShop ? (
              <div className={regularDialoguePortrait ? 'ml-20' : ''}>
                <p className="text-sm text-slate-100 leading-relaxed min-h-[52px]">
                  {dlgLines[dialogueIdx] ?? '...'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1">
                    {dlgLines.map((_, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full transition-colors"
                        style={{
                          background:
                            i === dialogueIdx
                              ? (interaction.npc?.accent ?? '#f59e0b')
                              : '#33415577',
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextDialogue}
                    className="cursor-pointer font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95"
                    style={{ background: (interaction.npc?.accent ?? '#f59e0b'), color: '#0b1220' }}
                  >
                    <span>
                      {dialogueIdx < dlgLines.length - 1
                        ? 'Continuar'
                        : interaction.npc?.isMerchant
                          ? 'Ver loja'
                          : interaction.npc?.isBlacksmith
                            ? 'Entrar na ferraria'
                          : 'Encerrar'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-[62vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs text-slate-300">Estoque diário de suprimentos</p>
                  <div className="flex gap-2 text-[10px] font-bold whitespace-nowrap">
                    <span className="text-amber-300">◈ {inventory.gold_raw || 0} bruto</span>
                    <span className="text-yellow-100">◆ {inventory.gold_refined || 0} sintetizado</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {SHOP_ITEMS.map((item) => {
                    const bought = engineRef.current?.getShopBought(item.id) ?? 0;
                    const remaining = Math.max(0, item.dailyLimit - bought);
                    const canPay = (inventory[item.currency] || 0) >= item.price;
                    const maxedBag = item.item === 'bag_expansion' && (engineRef.current?.bagLevel ?? 0) >= 5;
                    const soldOut = remaining <= 0 || maxedBag;
                    return (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col min-h-[132px]">
                        <div className="flex items-start gap-2">
                          {item.img ? (
                            <img src={item.img} alt="" className="w-8 h-8 object-contain shrink-0" />
                          ) : (
                            <span className="w-8 h-8 grid place-items-center text-xl shrink-0">{item.icon}</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] leading-tight font-black text-slate-100">{item.name}</p>
                            <p className="text-[9px] leading-tight text-slate-400 mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <div className="mt-auto pt-2">
                          <div className="flex justify-between text-[9px] mb-1.5">
                            <span className={item.currency === 'gold_raw' ? 'text-amber-300' : 'text-yellow-100'}>
                              {item.currency === 'gold_raw' ? '◈' : '◆'} {item.price}
                            </span>
                            <span className={soldOut ? 'text-rose-400' : 'text-slate-400'}>{maxedBag ? 'máximo' : `${remaining}/${item.dailyLimit} hoje`}</span>
                          </div>
                          <button
                            type="button"
                            disabled={soldOut || !canPay}
                            onClick={() => handleShopPurchase(item.id)}
                            className="w-full rounded-lg py-1 text-[10px] font-black bg-amber-400 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 active:scale-95 transition"
                          >
                            {soldOut ? 'Esgotado' : canPay ? `Comprar${item.quantity > 1 ? ` ×${item.quantity}` : ''}` : 'Sem ouro'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {shopMessage && <p className="text-[10px] text-center text-amber-200 mb-2">{shopMessage}</p>}
                <p className="text-[9px] text-slate-500 mb-3">◆ Ouro e cristais brutos são sintetizados somente na Ferraria Harmônica.</p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCloseDialogue}
                    className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all"
                  >
                    Encerrar Conversa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Música Principal Contínua em Loop (Whispers of the Village) */}
      <audio
        ref={bgmRef}
        src="/assets/audio/whispers_of_the_village.m4a"
        loop
        preload="auto"
        playsInline
      />

      {/* Chat de Texto Online para Comunicação com Balões de Fala */}
      {roomId && (
        <ChatBox
          onlineRoomName={roomName ?? null}
          onSendMessage={handleSendChatMessage}
          messages={chatMessages}
        />
      )}

      {/* Modal de Configurações (Volume, Save e Sair) */}
      <SettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        musicVolume={bgmVolume}
        onVolumeChange={handleVolumeChange}
        isMusicMuted={isBgmMuted}
        onToggleMute={handleToggleBgmMute}
        onManualSave={async () => {
          if (user?.id && engineRef.current) {
            const ok = await saveToCloud(engineRef.current, user.id);
            if (ok) {
              const now = new Date();
              setLastSavedText(
                `${now.getHours().toString().padStart(2, '0')}:${now
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
              );
            }
            return ok;
          }
          return false;
        }}
        onLogout={() => {
          if (onLogout) onLogout();
        }}
        lastSavedText={lastSavedText}
        roomName={roomName}
        onChangeMode={onChangeMode}
      />
    </div>
    </div>
  );
};

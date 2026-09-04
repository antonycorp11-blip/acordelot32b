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
} from 'lucide-react';
import type { PlayerStats } from '../game/engine';
import { GameEngine, InteractionState, SelectedPropInfo, TimeOfDay } from '../game/engine';
import { TouchControls } from './TouchControls';
import { Inventory } from './Inventory';
import { PlayerHud } from './PlayerHud';
import { CharacterScreen } from './CharacterScreen';
import { Backpack, Hand, User, CloudRain } from 'lucide-react';

interface PropPaletteItem {
  type: string;
  name: string;
  category: 'houses_front' | 'houses_angles' | 'rocks' | 'street' | 'trees';
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
];

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [interaction, setInteraction] = useState<InteractionState>({
    nearMerchant: false,
    isTalking: false,
  });
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [showShop, setShowShop] = useState(false);

  // Inventário / coleta / ficha
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [showInventory, setShowInventory] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [pickupFlash, setPickupFlash] = useState<string | null>(null);
  const pickupTimer = useRef<number | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isRaining, setIsRaining] = useState(false);

  // Map Editor, Time of Day & Zoom State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProp, setSelectedProp] = useState<SelectedPropInfo | null>(null);
  const [saveNotice, setSaveNotice] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [activeCategory, setActiveCategory] = useState<
    'houses_front' | 'houses_angles' | 'rocks' | 'street' | 'trees'
  >('houses_front');

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    if (!canvasRef.current || !containerRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
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
    };

    engine.onStatsChange = (s) => {
      setStats(s);
    };
    setStats({ ...engine.stats });

    engine.onHarvestPopup = (text) => {
      setPickupFlash(text);
      if (pickupTimer.current) window.clearTimeout(pickupTimer.current);
      pickupTimer.current = window.setTimeout(() => setPickupFlash(null), 900);
    };

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
      if (e.code === 'KeyC') setShowSheet((v) => !v);
    };
    window.addEventListener('keydown', onKey);

    engine.start();

    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const handleNextDialogue = () => {
    if (!interaction.dialogue) return;
    if (dialogueIdx < interaction.dialogue.length - 1) {
      setDialogueIdx((prev) => prev + 1);
    } else {
      setShowShop(true);
    }
  };

  const handleCloseDialogue = () => {
    if (engineRef.current) {
      engineRef.current.isTalkingToMerchant = false;
    }
    setInteraction((prev) => ({ ...prev, isTalking: false }));
    setShowShop(false);
    setDialogueIdx(0);
  };

  const toggleEditMode = () => {
    const next = !isEditMode;
    setIsEditMode(next);
    engineRef.current?.setEditMode(next);
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

  const handleSaveExplicitly = () => {
    engineRef.current?.saveMapToStorage();
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2000);
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
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const worldX = canvasX + engineRef.current.camX;
    const worldY = canvasY + engineRef.current.camY;

    engineRef.current.spawnPropAtWorldPos(propType, worldX, worldY);
  };

  const currentCategoryItems = PROP_CATALOG.filter((item) => item.category === activeCategory);

  return (
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

              {/* Save directly to code file and LocalStorage */}
              <button
                type="button"
                onClick={handleSaveExplicitly}
                className="cursor-pointer flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 px-2.5 py-1 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                title="Grava o layout diretamente no arquivo src/game/customMapLayout.json no código do jogo e no LocalStorage."
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-300">
                  {saveNotice ? '✓ Gravado no Código!' : 'Salvar no Código'}
                </span>
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

          {/* Contextual Sub-Bar: Selected Prop Controls (When an item is clicked) */}
          {selectedProp ? (
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
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
        />
      </div>

      {/* Barra de vida + retrato + XP */}
      {!isEditMode && stats && (
        <PlayerHud stats={stats} onOpenSheet={() => setShowSheet(true)} />
      )}

      {/* Joystick + botões de ação para celular */}
      {isTouchDevice && !isEditMode && (
        <TouchControls
          engineRef={engineRef}
          onHarvest={() => engineRef.current?.harvestAction()}
          onToggleInventory={() => setShowInventory((v) => !v)}
        />
      )}

      {stats && (
        <CharacterScreen
          open={showSheet && !isEditMode}
          onClose={() => setShowSheet(false)}
          stats={stats}
          power={engineRef.current?.combatPower ?? 0}
          canLevelUp={stats.xp >= stats.xpNext}
          onLevelUp={() => engineRef.current?.levelUp()}
          onSpend={(attr) => engineRef.current?.spendAttrPoint(attr)}
        />
      )}

      {/* HUD de coleta — desktop */}
      {!isEditMode && !isTouchDevice && (
        <div className="fixed bottom-6 right-6 z-30 flex items-end gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowSheet((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-sky-300 border border-sky-500/40 hover:border-sky-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Ficha do personagem (C)"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowInventory((v) => !v)}
            className="cursor-pointer w-12 h-12 rounded-full bg-slate-950/85 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400/80 shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            title="Abrir mochila (I)"
          >
            <Backpack className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.harvestAction()}
            className="cursor-pointer w-16 h-16 rounded-full bg-emerald-900/85 hover:bg-emerald-800 text-emerald-100 border border-emerald-400/60 shadow-xl flex flex-col items-center justify-center gap-0.5 backdrop-blur-md transition-all active:scale-90"
            title="Coletar recurso mais próximo (F)"
          >
            <Hand className="w-6 h-6" />
            <span className="text-[9px] font-bold">Coletar</span>
          </button>
        </div>
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
      />

      {/* Top Right Quick Controls (Quando o editor está fechado) */}
      {!isEditMode && (
        <div
          className="absolute right-4 z-20 flex items-center gap-2"
          style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
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

      {/* NPC Merchant Dialogue & Shop Modal */}
      {interaction.isTalking && (
        <div
          id="merchant-dialogue-modal"
          className="absolute inset-0 z-30 flex items-end justify-center pb-8 pointer-events-none"
        >
          <div className="bg-slate-950/90 backdrop-blur-md border border-amber-500/50 rounded-2xl p-5 max-w-lg w-full mx-4 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-amber-200">
                    {interaction.merchantName || 'Comerciante das Ruínas'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {interaction.merchantTitle || 'Mercador Viajante'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDialogue}
                className="cursor-pointer text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!showShop ? (
              <div>
                <p className="text-sm text-slate-200 leading-relaxed min-h-[48px]">
                  {interaction.dialogue?.[dialogueIdx] || 'Olá viajante, bem-vindo às Ruínas Antigas!'}
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextDialogue}
                    className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all"
                  >
                    <span>Continuar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-300 mb-3">Artefatos e suprimentos disponíveis:</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center">
                    <img
                      src="/assets/ancient-ruins/Characters/NPC Merchant-icons-potion.png"
                      alt="Poção"
                      className="w-8 h-8 object-contain mb-1"
                    />
                    <span className="text-[11px] font-bold text-slate-200">Elixir Arcano</span>
                    <span className="text-[10px] text-amber-400 font-mono">25 Moedas</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center">
                    <img
                      src="/assets/ancient-ruins/Characters/NPC Merchant-icons-sword.png"
                      alt="Espada"
                      className="w-8 h-8 object-contain mb-1"
                    />
                    <span className="text-[11px] font-bold text-slate-200">Lâmina Rúnica</span>
                    <span className="text-[10px] text-amber-400 font-mono">80 Moedas</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center">
                    <img
                      src="/assets/ancient-ruins/Characters/NPC Merchant-icons-bow.png"
                      alt="Arco"
                      className="w-8 h-8 object-contain mb-1"
                    />
                    <span className="text-[11px] font-bold text-slate-200">Arco Élfico</span>
                    <span className="text-[10px] text-amber-400 font-mono">65 Moedas</span>
                  </div>
                </div>
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
    </div>
  );
};

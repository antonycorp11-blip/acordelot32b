import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEngine, PlayerCharacterKey } from '../game/engine';
import { CHARACTER_ROSTER, CHARACTER_PORTRAITS } from '../game/engine';
import { HudIcon } from './HudIcon';
import { fetchGlobalHudLayout } from '../game/hudSync';

interface TouchControlsProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onToggleInventory: () => void;
  onToggleSynth: () => void;
  onTogglePartitura: () => void;
  onToggleWeapon: () => void;
  onToggleCatalog: () => void;
  onToggleQuests: () => void;
  onToggleSheet: () => void;
  forceEditMode?: boolean;
  onLayoutChange?: (layout: Record<Orientation, Layout>) => void;
}

const JOYSTICK_SIZE = 132;
const KNOB_SIZE = 58;
const MAX_RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

// ---- Layout do HUD editável: CADA botão tem sua própria posição, salva
// separadamente para retrato e paisagem (o jogo troca de layout sozinho ao
// girar o celular). ----
type Pos = { dx: number; dy: number };
type Orientation = 'portrait' | 'landscape';
type Layout = Record<string, Pos>;
// v3 limpa deslocamentos antigos que podiam deixar botões fora da tela
// depois da reorganização do HUD em paisagem.
const HUD_LS_KEY = 'acordelot_hud_layout_v3';
function loadFullLayout(): Record<Orientation, Layout> {
  try {
    const raw = localStorage.getItem(HUD_LS_KEY);
    if (!raw) return { portrait: {}, landscape: {} };
    const p = JSON.parse(raw);
    return { portrait: p.portrait ?? {}, landscape: p.landscape ?? {} };
  } catch {
    return { portrait: {}, landscape: {} };
  }
}
function saveFullLayout(l: Record<Orientation, Layout>) {
  try {
    localStorage.setItem(HUD_LS_KEY, JSON.stringify(l));
  } catch {}
}
function getOrientation(): Orientation {
  // O jogo roda SEMPRE em paisagem (GameCanvas força isso via rotação CSS
  // quando o viewport do celular fica travado em retrato) — então o layout
  // do HUD é sempre o de paisagem, não importa o que window.innerWidth/
  // innerHeight reportem no momento.
  return 'landscape';
}

/**
 * Controles de toque para celular: joystick analógico virtual (esquerda) e
 * botões de ação de combate (direita). O joystick alimenta engine.setTouchVector().
 *
 * Modo de edição do HUD (engrenagem, canto inferior esquerdo): arrasta CADA
 * botão individualmente. A posição fica salva no aparelho — separada para
 * retrato e paisagem — e volta exatamente ali da próxima vez.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  engineRef,
  onToggleInventory,
  onToggleSynth,
  onTogglePartitura,
  onToggleWeapon,
  onToggleCatalog,
  onToggleQuests,
  onToggleSheet,
  forceEditMode = false,
  onLayoutChange,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const [hudEdit, setHudEdit] = useState(forceEditMode);
  const [orientation, setOrientation] = useState<Orientation>(getOrientation);
  const [full, setFull] = useState(loadFullLayout);
  const layout = full[orientation];

  useEffect(() => {
    setHudEdit(forceEditMode);
  }, [forceEditMode]);

  useEffect(() => {
    fetchGlobalHudLayout().then((global) => {
      if (global && global.landscape) {
        setFull(global);
        onLayoutChange?.(global);
      }
    });
  }, []);

  // Altura real da tela
  const [viewportH, setViewportH] = useState(() => Math.min(window.innerWidth, window.innerHeight));
  const [viewportW, setViewportW] = useState(() => Math.max(window.innerWidth, window.innerHeight));

  useEffect(() => {
    const onResize = () => {
      setOrientation(getOrientation());
      setViewportH(Math.min(window.innerWidth, window.innerHeight));
      setViewportW(Math.max(window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const getPos = (id: string): Pos => layout[id] ?? { dx: 0, dy: 0 };
  const dragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; orig: Pos } | null>(null);

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    if (!hudEdit) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, orig: getPos(id) };
  };
  useEffect(() => {
    if (!hudEdit) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      e.preventDefault();
      const dx = d.orig.dx + (e.clientX - d.startX);
      const dy = d.orig.dy + (e.clientY - d.startY);
      setFull((prev) => {
        const next = { ...prev, [orientation]: { ...prev[orientation], [d.id]: { dx, dy } } };
        onLayoutChange?.(next);
        return next;
      });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      setFull((cur) => {
        saveFullLayout(cur);
        onLayoutChange?.(cur);
        return cur;
      });
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [hudEdit, orientation, onLayoutChange]);

  const resetLayout = () => {
    setFull((prev) => {
      const next = { ...prev, [orientation]: {} };
      saveFullLayout(next);
      return next;
    });
  };

  // ---- joystick (vira Draggable também) ----
  const applyVector = useCallback(
    (dx: number, dy: number) => {
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, MAX_RADIUS);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;
      setKnob({ x: kx, y: ky });
      const nx = kx / MAX_RADIUS;
      const ny = ky / MAX_RADIUS;
      const mag = Math.hypot(nx, ny);
      engineRef.current?.setTouchVector(mag < 0.22 ? 0 : nx, mag < 0.22 ? 0 : ny);
    },
    [engineRef]
  );
  const reset = useCallback(() => {
    pointerIdRef.current = null;
    originRef.current = null;
    setKnob({ x: 0, y: 0 });
    setActive(false);
    engineRef.current?.setTouchVector(0, 0);
  }, [engineRef]);
  const onPointerDown = (e: React.PointerEvent) => {
    if (hudEdit) return;
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    const rect = baseRef.current!.getBoundingClientRect();
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    applyVector(e.clientX - originRef.current.x, e.clientY - originRef.current.y);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current || !originRef.current) return;
      e.preventDefault();
      applyVector(e.clientX - originRef.current.x, e.clientY - originRef.current.y);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      reset();
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [applyVector, reset]);

  // Botão central: vira "Coletar" quando dá (perto de um recurso, fora de
  // luta) e volta a ser "Atacar" sozinho assim que entra em combate.
  const [collectMode, setCollectMode] = useState(false);
  const [activeChar, setActiveChar] = useState<PlayerCharacterKey>('akles');
  useEffect(() => {
    const iv = setInterval(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const busy = ['chop', 'mine', 'attack', 'spin', 'cast'].includes(eng.player.actionState as string);
      setCollectMode(!busy && !eng.inCombat && !!eng.findNearestHarvestable('any'));
      setActiveChar(eng.activeCharacter);
    }, 180);
    return () => clearInterval(iv);
  }, [engineRef]);

  const actionBtn =
    'pointer-events-auto flex items-center justify-center rounded-full border backdrop-blur-md shadow-xl active:scale-90 transition-transform select-none touch-none';
  const skillNames = activeChar === 'wins'
    ? ['Nota Perfurante', 'Coro Dissonante', 'Ária do Clímax']
    : activeChar === 'huans'
      ? ['Flecha Resonante', 'Passo do Caçador', 'Chuva das Cordas']
      : ['Ressonância', 'Amplificação', 'Pulso Harmônico'];

  // Fileira de topo (mochila/síntese/partitura/arma/catálogo/missões/ficha): 7
  // ícones em LINHA HORIZONTAL, à esquerda do widget de clima (que fica em
  // right-4, ~136px de largura) e acima da barra de vida. Antes isso era uma
  // coluna vertical na borda direita — ficava espremida/cortada em tela
  // curva de Android. O tamanho encolhe um pouco só em telas muito estreitas.
  const sideMenuTop = 'calc(14px + env(safe-area-inset-top))';
  const sideMenuIcon = Math.max(28, Math.min(34, (viewportW - 430) / 7.2));
  const sideMenuStep = sideMenuIcon + 8;
  // 190px reserva o widget de clima inteiro em celulares largos.
  const sideMenuRight = (i: number) => `calc(${Math.round(190 + i * sideMenuStep)}px + env(safe-area-inset-right))`;

  // Botão arrastável: id próprio, posição própria, funciona em qualquer lugar da tela.
  const D: React.FC<{ id: string; className: string; title: string; onAction: () => void; style?: React.CSSProperties; children: React.ReactNode }> = ({
    id,
    className,
    title,
    onAction,
    style,
    children,
  }) => {
    const p = getPos(id);
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          if (hudEdit) {
            startDrag(id)(e);
            return;
          }
          e.preventDefault();
          onAction();
        }}
        className={`${className} ${hudEdit ? 'outline outline-2 outline-dashed outline-amber-400/80 outline-offset-2' : ''}`}
        title={title}
        style={{
          ...style,
          transform: `${style?.transform ? style.transform + ' ' : ''}translate(${p.dx}px, ${p.dy}px)`,
          touchAction: 'none',
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none" style={{ touchAction: 'none' }}>
      {/* Botão de editar HUD (Aparece apenas quando o Modo Editor estiver ativo) */}
      {forceEditMode && (
        <>
          <div
            className="pointer-events-none absolute px-2 py-1 rounded-lg text-[9px] font-bold bg-amber-500 text-slate-950 z-40"
            style={{ left: 'max(18px, env(safe-area-inset-left))', bottom: 'calc(200px + env(safe-area-inset-bottom))' }}
          >
            Arraste os botões · {orientation === 'landscape' ? 'paisagem' : 'retrato'}
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              resetLayout();
            }}
            className="pointer-events-auto absolute px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-950/85 border border-slate-700 text-slate-300 z-40"
            style={{ left: 'max(18px, env(safe-area-inset-left))', bottom: 'calc(158px + env(safe-area-inset-bottom))' }}
          >
            Restaurar Padrão
          </button>
        </>
      )}

      {/* Joystick — canto inferior esquerdo */}
      <div
        ref={baseRef}
        onPointerDown={hudEdit ? startDrag('joystick') : onPointerDown}
        className={`absolute pointer-events-auto rounded-full border border-amber-400/40 bg-slate-950/40 backdrop-blur-sm shadow-2xl ${
          hudEdit ? 'outline outline-2 outline-dashed outline-amber-400/80 outline-offset-2' : ''
        }`}
        style={{
          width: JOYSTICK_SIZE,
          height: JOYSTICK_SIZE,
          left: 'max(18px, env(safe-area-inset-left))',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          touchAction: 'none',
          transform: `translate(${getPos('joystick').dx}px, ${getPos('joystick').dy}px)`,
        }}
      >
        <div className="absolute inset-3 rounded-full border border-slate-100/10" />
        <div
          className={`absolute rounded-full border ${
            active ? 'border-amber-300 bg-amber-400/30' : 'border-slate-100/30 bg-slate-100/15'
          } shadow-lg transition-colors`}
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        />
      </div>

      {/* Menu superior completo — todos os acessos permanecem visíveis. */}
      <D id="btn_inv" className={`${actionBtn} absolute border-amber-400/50 bg-slate-950/80 text-amber-300`} title="Mochila" onAction={onToggleInventory} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(6), top: sideMenuTop }}>
        <HudIcon name="backpack" className="w-[82%] h-[82%]" />
      </D>
      <D id="btn_synth" className={`${actionBtn} absolute border-fuchsia-400/50 bg-slate-950/80 text-fuchsia-300`} title="Síntese de notas" onAction={onToggleSynth} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(5), top: sideMenuTop }}>
        <HudIcon name="synthesis" className="w-[82%] h-[82%]" />
      </D>
      <D id="btn_partitura" className={`${actionBtn} absolute border-amber-400/50 bg-slate-950/80 text-amber-300`} title="Síntese de Partituras" onAction={onTogglePartitura} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(4), top: sideMenuTop }}>
        <HudIcon name="partitura" className="w-[82%] h-[82%]" />
      </D>
      <D id="btn_weapon" className={`${actionBtn} absolute border-blue-400/50 bg-slate-950/80 text-blue-300`} title="Arma" onAction={onToggleWeapon} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(3), top: sideMenuTop }}>
        <HudIcon name="weapon" className="w-[82%] h-[82%]" />
      </D>
      {/* Catálogo — botão temporário pra ver armas/equipamentos novos por tier */}
      <D id="btn_catalog" className={`${actionBtn} absolute border-amber-400/50 bg-slate-950/80 text-amber-300`} title="Catálogo" onAction={onToggleCatalog} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(2), top: sideMenuTop }}>
        <HudIcon name="catalog" className="w-[82%] h-[82%]" />
      </D>
      <D id="btn_quests" className={`${actionBtn} absolute border-emerald-400/50 bg-slate-950/80 text-emerald-300`} title="Missões" onAction={onToggleQuests} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(1), top: sideMenuTop }}>
        <HudIcon name="quests" className="w-[82%] h-[82%]" />
      </D>
      <D id="btn_sheet" className={`${actionBtn} absolute border-sky-400/50 bg-slate-950/80 text-sky-300`} title="Ficha do personagem" onAction={onToggleSheet} style={{ width: sideMenuIcon, height: sideMenuIcon, right: sideMenuRight(0), top: sideMenuTop }}>
        <HudIcon name="party" className="w-[82%] h-[82%]" />
      </D>

      {/* Poções: cura + buff temporário — perto do joystick, como no layout de referência */}
      <D id="btn_potion" className={`${actionBtn} absolute w-12 h-12 border-lime-400/60 bg-lime-950/85 text-lime-200`} title="Usar item de cura" onAction={() => engineRef.current?.useHealingItem()} style={{ left: 'calc(94px + env(safe-area-inset-left))', bottom: 'calc(200px + env(safe-area-inset-bottom))' }}>
        <HudIcon name="potion-heal" className="w-10 h-10" />
      </D>
      <D id="btn_buff" className={`${actionBtn} absolute w-12 h-12 border-fuchsia-400/60 bg-fuchsia-950/85 text-fuchsia-200`} title="Usar item de buff" onAction={() => engineRef.current?.useBuffItem()} style={{ left: 'calc(150px + env(safe-area-inset-left))', bottom: 'calc(170px + env(safe-area-inset-bottom))' }}>
        <HudIcon name="potion-buff" className="w-10 h-10" />
      </D>

      {/* Ataque básico — vira "Coletar" sozinho perto de um recurso, fora de luta */}
      <D
        id="btn_attack"
        className={`${actionBtn} absolute w-[64px] h-[64px] ${
          collectMode ? 'border-emerald-400/70 bg-emerald-900/90 text-emerald-100' : 'border-rose-400/70 bg-rose-900/90 text-rose-100'
        }`}
        title={collectMode ? 'Coletar recurso mais próximo' : 'Ataque básico (espada)'}
        onAction={() => engineRef.current?.primaryAction()}
        style={{ right: 'calc(66px + env(safe-area-inset-right))', bottom: 'calc(52px + env(safe-area-inset-bottom))' }}
      >
        <HudIcon name={collectMode ? 'collect' : 'attack'} className="w-12 h-12" />
      </D>

      {/* Troca de personagem estilo Genshin — colada bem em cima do anel de
          skills (nunca em coluna que pode passar da altura da tela). */}
      {CHARACTER_ROSTER.map((ck, i) => {
        const active = activeChar === ck;
        return (
          <D
            key={ck}
            id={`btn_char_${ck}`}
            className={`${actionBtn} absolute w-8 h-8 overflow-hidden p-0 ${
              active ? 'border-2 border-fuchsia-400 ring-2 ring-fuchsia-300/60' : 'border-2 border-slate-700 opacity-60'
            }`}
            title={`Trocar para ${ck === 'akles' ? 'Akles' : ck === 'wins' ? 'Wins' : 'Huans'} (V)`}
            onAction={() => engineRef.current?.switchCharacter(ck)}
            style={{ right: `calc(${118 + i * 36}px + env(safe-area-inset-right))`, bottom: 'calc(176px + env(safe-area-inset-bottom))' }}
          >
            <img src={CHARACTER_PORTRAITS[ck]} alt={ck} className="w-full h-full object-cover object-top" />
          </D>
        );
      })}

      {/* Skills ao redor */}
      <D id="btn_spin" className={`${actionBtn} absolute w-[46px] h-[46px] border-indigo-400/50 bg-indigo-950/80 text-indigo-300`} title={skillNames[1]} onAction={() => engineRef.current?.triggerAction('spin')} style={{ right: 'calc(76px + env(safe-area-inset-right))', bottom: 'calc(126px + env(safe-area-inset-bottom))' }}>
        <HudIcon name="amplify" className="w-9 h-9" />
      </D>
      <D id="btn_cast" className={`${actionBtn} absolute w-[46px] h-[46px] border-cyan-400/50 bg-cyan-950/80 text-cyan-300`} title={skillNames[2]} onAction={() => engineRef.current?.triggerAction('cast')} style={{ right: 'calc(6px + env(safe-area-inset-right))', bottom: 'calc(52px + env(safe-area-inset-bottom))' }}>
        <HudIcon name="cast" className="w-9 h-9" />
      </D>
      <D id="btn_resonance" className={`${actionBtn} absolute w-[46px] h-[46px] border-blue-400/50 bg-blue-950/80 text-blue-300`} title={skillNames[0]} onAction={() => engineRef.current?.activateResonance()} style={{ right: 'calc(146px + env(safe-area-inset-right))', bottom: 'calc(52px + env(safe-area-inset-bottom))' }}>
        <HudIcon name="resonance" className="w-9 h-9" />
      </D>
      <D
        id="btn_locked"
        className={`${actionBtn} absolute w-[46px] h-[46px] border border-slate-600/50 bg-slate-900/75 text-slate-600`}
        title="Habilidade em breve"
        onAction={() => {}}
        style={{ right: 'calc(76px + env(safe-area-inset-right))', bottom: 'calc(-4px + env(safe-area-inset-bottom))' }}
      >
        <HudIcon name="locked" className="w-8 h-8 opacity-60 grayscale" />
      </D>

    </div>
  );
};

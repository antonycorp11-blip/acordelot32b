import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Swords,
  RefreshCw,
  Sparkles,
  Hand,
  Backpack,
  Music4,
  User,
  FlaskConical,
  Lock,
  ScrollText,
  Zap,
  Settings,
  Check,
  Plus,
  Minus,
} from 'lucide-react';
import type { GameEngine, AklesAction } from '../game/engine';

interface TouchControlsProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onHarvest: () => void;
  onToggleInventory: () => void;
  onToggleSynth: () => void;
  onTogglePartitura: () => void;
  onToggleWeapon: () => void;
  onToggleSheet: () => void;
}

const JOYSTICK_SIZE = 132;
const KNOB_SIZE = 58;
const MAX_RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

// ---- Layout do HUD editável (posição + tamanho de cada bloco) ----
type BlockCfg = { dx: number; dy: number; scale: number };
type HudLayout = { joystick: BlockCfg; side: BlockCfg; actions: BlockCfg };
const DEFAULT_LAYOUT: HudLayout = {
  joystick: { dx: 0, dy: 0, scale: 1 },
  side: { dx: 0, dy: 0, scale: 1 },
  actions: { dx: 0, dy: 0, scale: 1 },
};
const HUD_LS_KEY = 'acordelot_hud_layout_v1';
function loadHudLayout(): HudLayout {
  try {
    const raw = localStorage.getItem(HUD_LS_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const p = JSON.parse(raw);
    return {
      joystick: { ...DEFAULT_LAYOUT.joystick, ...p.joystick },
      side: { ...DEFAULT_LAYOUT.side, ...p.side },
      actions: { ...DEFAULT_LAYOUT.actions, ...p.actions },
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}
function saveHudLayout(l: HudLayout) {
  try {
    localStorage.setItem(HUD_LS_KEY, JSON.stringify(l));
  } catch {}
}

/**
 * Controles de toque para celular: joystick analógico virtual (esquerda) e
 * botões de ação de combate (direita). O joystick alimenta engine.setTouchVector().
 *
 * Modo de edição do HUD (botão de engrenagem, canto inferior esquerdo):
 * arrasta cada bloco (joystick / menu lateral / anel de ação) e ajusta o
 * tamanho com +/-. Fica salvo no aparelho (localStorage).
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  engineRef,
  onHarvest,
  onToggleInventory,
  onToggleSynth,
  onTogglePartitura,
  onToggleWeapon,
  onToggleSheet,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const [hudEdit, setHudEdit] = useState(false);
  const [layout, setLayout] = useState<HudLayout>(() => loadHudLayout());
  const dragRef = useRef<{ block: keyof HudLayout; pointerId: number; startX: number; startY: number; origDx: number; origDy: number } | null>(null);

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
      // zona morta
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
    if (hudEdit) return; // no modo de edição o joystick não move o personagem
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

  // ---- arrastar blocos no modo de edição ----
  const startDrag = (block: keyof HudLayout) => (e: React.PointerEvent) => {
    if (!hudEdit) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      block,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origDx: layout[block].dx,
      origDy: layout[block].dy,
    };
  };
  useEffect(() => {
    if (!hudEdit) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      e.preventDefault();
      setLayout((prev) => ({
        ...prev,
        [d.block]: {
          ...prev[d.block],
          dx: d.origDx + (e.clientX - d.startX),
          dy: d.origDy + (e.clientY - d.startY),
        },
      }));
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      setLayout((cur) => {
        saveHudLayout(cur);
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
  }, [hudEdit]);

  const rescale = (block: keyof HudLayout, delta: number) => {
    setLayout((prev) => {
      const next = {
        ...prev,
        [block]: { ...prev[block], scale: Math.max(0.6, Math.min(1.6, prev[block].scale + delta)) },
      };
      saveHudLayout(next);
      return next;
    });
  };
  const resetLayout = () => {
    setLayout({ ...DEFAULT_LAYOUT });
    saveHudLayout({ ...DEFAULT_LAYOUT });
  };

  const fireAction = (action: AklesAction) => (e: React.PointerEvent) => {
    if (hudEdit) return;
    e.preventDefault();
    engineRef.current?.triggerAction(action);
  };

  const actionBtn =
    'pointer-events-auto flex items-center justify-center rounded-full border backdrop-blur-md shadow-xl active:scale-90 transition-transform select-none touch-none';

  // moldura + controles de edição para um bloco do HUD
  const EditFrame: React.FC<{ block: keyof HudLayout; label: string }> = ({ block, label }) =>
    !hudEdit ? null : (
      <div
        className="absolute inset-0 -m-2 rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-400/5 pointer-events-auto cursor-move flex flex-col items-center justify-between p-1"
        onPointerDown={startDrag(block)}
        style={{ touchAction: 'none' }}
      >
        <span className="text-[8px] font-bold text-amber-300 bg-slate-950/80 px-1 rounded">{label}</span>
        <div className="flex gap-1 mb-0.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              rescale(block, -0.1);
            }}
            className="w-5 h-5 rounded-full bg-slate-950/90 border border-amber-400/60 text-amber-300 flex items-center justify-center"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              rescale(block, 0.1);
            }}
            className="w-5 h-5 rounded-full bg-slate-950/90 border border-amber-400/60 text-amber-300 flex items-center justify-center"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none" style={{ touchAction: 'none' }}>
      {/* Botão de editar HUD */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          setHudEdit((v) => !v);
        }}
        className={`pointer-events-auto absolute w-9 h-9 rounded-full border shadow-xl flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
          hudEdit
            ? 'bg-amber-500 border-amber-300 text-slate-950'
            : 'bg-slate-950/80 border-slate-700 text-slate-400'
        }`}
        style={{ left: 'max(18px, env(safe-area-inset-left))', bottom: 'calc(158px + env(safe-area-inset-bottom))' }}
        title="Editar posição/tamanho do HUD"
      >
        {hudEdit ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
      </button>
      {hudEdit && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            resetLayout();
          }}
          className="pointer-events-auto absolute px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-950/85 border border-slate-700 text-slate-300"
          style={{ left: 'max(18px, env(safe-area-inset-left))', bottom: 'calc(202px + env(safe-area-inset-bottom))' }}
        >
          Restaurar
        </button>
      )}

      {/* Joystick — canto inferior esquerdo */}
      <div
        className="absolute"
        style={{
          left: 'max(18px, env(safe-area-inset-left))',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          width: JOYSTICK_SIZE,
          height: JOYSTICK_SIZE,
          transform: `translate(${layout.joystick.dx}px, ${layout.joystick.dy}px) scale(${layout.joystick.scale})`,
        }}
      >
        <div
          ref={baseRef}
          onPointerDown={onPointerDown}
          className="absolute inset-0 pointer-events-auto rounded-full border border-amber-400/40 bg-slate-950/40 backdrop-blur-sm shadow-2xl"
          style={{ touchAction: 'none' }}
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
        <EditFrame block="joystick" label="Analógico" />
      </div>

      {/* Menu lateral direito — mochila / síntese / ficha
          (abaixo do indicador de ciclo de dia) */}
      <div
        className="absolute flex flex-col gap-2"
        style={{
          right: 'max(14px, env(safe-area-inset-right))',
          top: 'calc(118px + env(safe-area-inset-top))',
          transform: `translate(${layout.side.dx}px, ${layout.side.dy}px) scale(${layout.side.scale})`,
          transformOrigin: 'top right',
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!hudEdit) onToggleInventory();
          }}
          className={`${actionBtn} w-11 h-11 border-amber-400/50 bg-slate-950/80 text-amber-300`}
          title="Mochila"
        >
          <Backpack className="w-5 h-5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!hudEdit) onToggleSynth();
          }}
          className={`${actionBtn} w-11 h-11 border-fuchsia-400/50 bg-slate-950/80 text-fuchsia-300`}
          title="Síntese de notas"
        >
          <Music4 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!hudEdit) onTogglePartitura();
          }}
          className={`${actionBtn} w-11 h-11 border-amber-400/50 bg-slate-950/80 text-amber-300`}
          title="Síntese de Partituras"
        >
          <ScrollText className="w-5 h-5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!hudEdit) onToggleWeapon();
          }}
          className={`${actionBtn} w-11 h-11 border-blue-400/50 bg-slate-950/80 text-blue-300`}
          title="Arma"
        >
          <Swords className="w-5 h-5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!hudEdit) onToggleSheet();
          }}
          className={`${actionBtn} w-11 h-11 border-sky-400/50 bg-slate-950/80 text-sky-300`}
          title="Ficha"
        >
          <User className="w-5 h-5" />
        </button>
        <div className="relative">
          <EditFrame block="side" label="Menu" />
        </div>
      </div>

      {/* Botões de ação — layout padrão de jogo: ataque no centro, 4 skills ao
          redor (N/S/L/O), poção acima. Coletar à esquerda do conjunto. */}
      {(() => {
        const RING = 66; // raio do anel de skills
        const CENTER = 116; // metade do container
        const box = CENTER * 2;
        const pos = (ang: number) => ({
          left: CENTER + Math.cos(ang) * RING,
          top: CENTER - Math.sin(ang) * RING,
        });
        const skillBtn =
          actionBtn + ' w-[46px] h-[46px] -translate-x-1/2 -translate-y-1/2';
        return (
          <div
            className="absolute"
            style={{
              right: 'max(6px, env(safe-area-inset-right))',
              bottom: 'calc(10px + env(safe-area-inset-bottom))',
              width: box,
              height: box,
              transform: `translate(${layout.actions.dx}px, ${layout.actions.dy}px) scale(${layout.actions.scale})`,
              transformOrigin: 'bottom right',
            }}
          >
            {/* Poção — acima do anel */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                if (!hudEdit) engineRef.current?.useHealingItem();
              }}
              className={`${actionBtn} absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 border-lime-400/60 bg-lime-950/85 text-lime-200`}
              style={{ left: CENTER, top: CENTER - RING - 40 }}
              title="Usar item de cura"
            >
              <FlaskConical className="w-5 h-5" />
            </button>

            {/* Ataque básico — centro */}
            <button
              type="button"
              onPointerDown={fireAction('attack')}
              className={`${actionBtn} absolute w-[64px] h-[64px] -translate-x-1/2 -translate-y-1/2 border-rose-400/70 bg-rose-900/90 text-rose-100`}
              style={{ left: CENTER, top: CENTER }}
              title="Ataque básico (espada)"
            >
              <Swords className="w-7 h-7" />
            </button>

            {/* Skill Norte — Amplificação */}
            <button
              type="button"
              onPointerDown={fireAction('spin')}
              className={`${skillBtn} absolute border-indigo-400/50 bg-indigo-950/80 text-indigo-300`}
              style={pos(Math.PI / 2)}
              title="Amplificação"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {/* Skill Leste — Pulso Harmônico */}
            <button
              type="button"
              onPointerDown={fireAction('cast')}
              className={`${skillBtn} absolute border-cyan-400/50 bg-cyan-950/80 text-cyan-300`}
              style={pos(0)}
              title="Pulso Harmônico"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            {/* Skill Oeste — Ressonância */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                if (!hudEdit) engineRef.current?.activateResonance();
              }}
              className={`${skillBtn} absolute border-blue-400/50 bg-blue-950/80 text-blue-300`}
              style={pos(Math.PI)}
              title="Ressonância"
            >
              <Zap className="w-5 h-5" />
            </button>
            {/* Skill Sul — bloqueada */}
            <button
              type="button"
              disabled
              className={`${skillBtn} absolute border-slate-600/50 bg-slate-900/75 text-slate-600`}
              style={pos(-Math.PI / 2)}
              title="Habilidade em breve"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Coletar — à esquerda do conjunto */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                if (!hudEdit) onHarvest();
              }}
              className={`${actionBtn} absolute w-[58px] h-[58px] flex-col gap-0.5 -translate-y-1/2 border-emerald-400/60 bg-emerald-900/90 text-emerald-100`}
              style={{ left: -66, top: CENTER }}
              title="Coletar recurso mais próximo"
            >
              <Hand className="w-5 h-5" />
              <span className="text-[9px] font-bold">Coletar</span>
            </button>

            <EditFrame block="actions" label="Ações" />
          </div>
        );
      })()}
    </div>
  );
};

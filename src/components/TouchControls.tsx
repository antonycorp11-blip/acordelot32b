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

/**
 * Controles de toque para celular: joystick analógico virtual (esquerda) e
 * botões de ação de combate (direita). O joystick alimenta engine.setTouchVector().
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

  const fireAction = (action: AklesAction) => (e: React.PointerEvent) => {
    e.preventDefault();
    engineRef.current?.triggerAction(action);
  };

  const actionBtn =
    'pointer-events-auto flex items-center justify-center rounded-full border backdrop-blur-md shadow-xl active:scale-90 transition-transform select-none touch-none';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none" style={{ touchAction: 'none' }}>
      {/* Joystick — canto inferior esquerdo */}
      <div
        ref={baseRef}
        onPointerDown={onPointerDown}
        className="absolute pointer-events-auto rounded-full border border-amber-400/40 bg-slate-950/40 backdrop-blur-sm shadow-2xl"
        style={{
          width: JOYSTICK_SIZE,
          height: JOYSTICK_SIZE,
          left: 'max(18px, env(safe-area-inset-left))',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          touchAction: 'none',
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

      {/* Menu lateral direito — mochila / síntese / ficha
          (abaixo do indicador de ciclo de dia) */}
      <div
        className="absolute flex flex-col gap-2"
        style={{
          right: 'max(14px, env(safe-area-inset-right))',
          top: 'calc(118px + env(safe-area-inset-top))',
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onToggleInventory();
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
            onToggleSynth();
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
            onTogglePartitura();
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
            onToggleWeapon();
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
            onToggleSheet();
          }}
          className={`${actionBtn} w-11 h-11 border-sky-400/50 bg-slate-950/80 text-sky-300`}
          title="Ficha"
        >
          <User className="w-5 h-5" />
        </button>
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
            }}
          >
            {/* Poção — acima do anel */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                engineRef.current?.useHealingItem();
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
                engineRef.current?.activateResonance();
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
                onHarvest();
              }}
              className={`${actionBtn} absolute w-[58px] h-[58px] flex-col gap-0.5 -translate-y-1/2 border-emerald-400/60 bg-emerald-900/90 text-emerald-100`}
              style={{ left: -66, top: CENTER }}
              title="Coletar recurso mais próximo"
            >
              <Hand className="w-5 h-5" />
              <span className="text-[9px] font-bold">Coletar</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Swords, RefreshCw, Sparkles, Hand, Backpack } from 'lucide-react';
import type { GameEngine, AklesAction } from '../game/engine';

interface TouchControlsProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onHarvest: () => void;
  onToggleInventory: () => void;
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

      {/* Mochila — canto superior direito, abaixo dos controles */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onToggleInventory();
        }}
        className={`${actionBtn} absolute w-11 h-11 border-amber-400/50 bg-slate-950/80 text-amber-300`}
        style={{
          right: 'max(18px, env(safe-area-inset-right))',
          top: 'calc(64px + env(safe-area-inset-top))',
        }}
        title="Mochila"
      >
        <Backpack className="w-5 h-5" />
      </button>

      {/* Botões de ação — canto inferior direito */}
      <div
        className="absolute flex flex-col items-end gap-2.5"
        style={{
          right: 'max(18px, env(safe-area-inset-right))',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-end gap-2.5">
          <button
            type="button"
            onPointerDown={fireAction('cast')}
            className={`${actionBtn} w-11 h-11 border-cyan-400/50 bg-cyan-950/70 text-cyan-300`}
            title="Magia"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            type="button"
            onPointerDown={fireAction('spin')}
            className={`${actionBtn} w-11 h-11 border-indigo-400/50 bg-indigo-950/70 text-indigo-300`}
            title="Golpe giratório"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onPointerDown={fireAction('attack')}
            className={`${actionBtn} w-12 h-12 border-rose-400/60 bg-rose-950/80 text-rose-200`}
            title="Atacar com a espada"
          >
            <Swords className="w-5 h-5" />
          </button>
        </div>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onHarvest();
          }}
          className={`${actionBtn} w-[70px] h-[70px] flex-col gap-0.5 border-emerald-400/60 bg-emerald-900/85 text-emerald-100`}
          title="Coletar recurso mais próximo"
        >
          <Hand className="w-6 h-6" />
          <span className="text-[10px] font-bold">Coletar</span>
        </button>
      </div>
    </div>
  );
};

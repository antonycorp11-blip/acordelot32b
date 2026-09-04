import React from 'react';

export type HudIconName =
  | 'backpack' | 'synthesis' | 'partitura' | 'weapon'
  | 'catalog' | 'quests' | 'potion-heal' | 'potion-buff'
  | 'attack' | 'collect' | 'resonance' | 'cast'
  | 'amplify' | 'party' | 'locked' | 'settings';

export function HudIcon({ name, className = 'w-7 h-7' }: { name: HudIconName; className?: string }) {
  return <img src={`/assets/hud/${name}.png`} alt="" draggable={false} className={`${className} object-contain select-none pointer-events-none drop-shadow-md`} />;
}

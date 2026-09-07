import type { StatBag } from './statTypes';

export type ScaleInterval = 'tone' | 'semitone';

export const MAJOR_SCALE_PATTERN: ScaleInterval[] = [
  'tone', 'tone', 'semitone', 'tone', 'tone', 'tone', 'semitone',
];

export const INTERVAL_SEMITONES: Record<ScaleInterval, number> = {
  tone: 2,
  semitone: 1,
};

export const INTERVAL_LABEL: Record<ScaleInterval, string> = {
  tone: 'Tom',
  semitone: 'Semitom',
};

export type ChordQuality = 'major' | 'minor' | 'diminished';

export interface ScaleChord {
  id: string;
  scaleKey: string;
  root: number;
  degree: number;
  roman: string;
  quality: ChordQuality;
  functionName: string;
  effect: string;
  stats: StatBag;
}

const DEGREES = [0, 2, 4, 5, 7, 9, 11];
const QUALITIES: ChordQuality[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const FUNCTIONS = [
  { name: 'Tônica', effect: '+6% HP máximo', stats: { hpPct: 6 } },
  { name: 'Supertônica', effect: '+4% redução de recarga', stats: { cooldownReductionPct: 4 } },
  { name: 'Mediante', effect: '+6% dano de Skill', stats: { skillDmgPct: 6 } },
  { name: 'Subdominante', effect: '+6% DEF e resistência', stats: { defPct: 6, resistPct: 3 } },
  { name: 'Dominante', effect: '+7% ATQ', stats: { atkPct: 7 } },
  { name: 'Relativa menor', effect: '+3% roubo de vida', stats: { lifeStealPct: 3 } },
  { name: 'Sensível', effect: '+5% crítico, +10% dano crítico, −4% HP', stats: { critChancePct: 5, critDmgPct: 10, hpPct: -4 } },
] satisfies Array<{ name: string; effect: string; stats: StatBag }>;

export function majorScaleNotes(tonic: number): number[] {
  return DEGREES.map((step) => (tonic + step) % 12);
}

export function notesFromIntervals(tonic: number, intervals: ScaleInterval[]): number[] {
  const notes = [tonic];
  let cursor = tonic;
  for (const interval of intervals) {
    cursor = (cursor + INTERVAL_SEMITONES[interval]) % 12;
    notes.push(cursor);
  }
  return notes;
}

export function isMajorPattern(intervals: ScaleInterval[]): boolean {
  return intervals.length === MAJOR_SCALE_PATTERN.length
    && intervals.every((step, index) => step === MAJOR_SCALE_PATTERN[index]);
}

export function scaleBaseBonus(tonic: number): { label: string; stats: StatBag } {
  const choices: Array<{ label: string; stats: StatBag }> = [
    { label: '+5% HP máximo', stats: { hpPct: 5 } },
    { label: '+4% resistência', stats: { resistPct: 4 } },
    { label: '+4% ATQ', stats: { atkPct: 4 } },
    { label: '+5% poder harmônico', stats: { harmonicPowerPct: 5 } },
    { label: '+4% dano de Skill', stats: { skillDmgPct: 4 } },
    { label: '+4% DEF', stats: { defPct: 4 } },
    { label: '+4% velocidade de ataque', stats: { atkSpeedPct: 4 } },
    { label: '+5% energia máxima', stats: { energyMaxPct: 5 } },
    { label: '+4% dano básico', stats: { basicDmgPct: 4 } },
    { label: '+3% chance crítica', stats: { critChancePct: 3 } },
    { label: '+8% dano crítico', stats: { critDmgPct: 8 } },
    { label: '+5% regeneração de energia', stats: { energyRegenPct: 5 } },
  ];
  return choices[((tonic % 12) + 12) % 12];
}

export function chordsForMajorScale(tonic: number, noteKeys: string[]): ScaleChord[] {
  const scaleKey = `scale_${noteKeys[tonic]}_major`;
  return DEGREES.map((step, index) => {
    const root = (tonic + step) % 12;
    const fn = FUNCTIONS[index];
    return {
      id: `${scaleKey}_chord_${index + 1}`,
      scaleKey,
      root,
      degree: index + 1,
      roman: ROMAN[index],
      quality: QUALITIES[index],
      functionName: fn.name,
      effect: fn.effect,
      stats: { ...fn.stats },
    };
  });
}


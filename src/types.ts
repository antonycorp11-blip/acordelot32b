/** Nota do gabarito. Tempo em batidas (beats), para valer em qualquer BPM. */
export interface NoteEv {
  midi: number;
  beat: number;
  dur: number;
}

/** Exercício gravado no teclado. */
export interface Recording {
  id: string;
  name: string;
  createdAt: string;
  bpm: number;
  beatsPerBar: number;
  source: 'midi' | 'mic';
  notes: NoteEv[];
}

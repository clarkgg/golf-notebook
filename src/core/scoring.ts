import type { Course } from './types';

export type Scorecard = (number | null)[];

export function emptyScorecard(): Scorecard {
  return Array.from({ length: 18 }, () => null);
}

/** "Birdie", "Bogey", and friends. */
export function scoreName(strokes: number, par: number): string {
  if (strokes === 1) return 'Hole in one';
  const diff = strokes - par;
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double bogey';
  if (diff === 3) return 'Triple bogey';
  return `${diff} over`;
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

export interface CardTotals {
  played: number;
  strokes: number;
  parPlayed: number;
  toPar: number;
  complete: boolean;
}

export function totals(course: Course, card: Scorecard, from = 0, to = 18): CardTotals {
  let strokes = 0;
  let parPlayed = 0;
  let played = 0;
  for (let i = from; i < to; i++) {
    const s = card[i];
    if (s == null) continue;
    played++;
    strokes += s;
    parPlayed += course.holes[i].par;
  }
  return {
    played,
    strokes,
    parPlayed,
    toPar: strokes - parPlayed,
    complete: played === to - from,
  };
}

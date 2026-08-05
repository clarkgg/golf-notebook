/**
 * Small seeded PRNG so that a notebook code always produces the same courses —
 * the digital equivalent of every printed notebook being uniquely generated but
 * identical from copy to copy.
 */

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** true with the given probability */
  chance(p: number): boolean;
}

/** xmur3 string hash — turns a notebook code into a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function createRng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A short, human-readable notebook code such as "K7QF-2M9P". */
export function randomNotebookCode(rng: Rng = createRng(Math.floor(Math.random() * 2 ** 32))): string {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[rng.int(0, ALPHABET.length - 1)]).join('');
  return `${block()}-${block()}`;
}

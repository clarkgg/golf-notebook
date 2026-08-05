import { generateHole } from './hole';
import { createRng } from './rng';
import type { Course, Notebook } from './types';

/** Par 72: four short holes, four long ones, and ten in between. */
const PAR_MIX = [3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5];

const FIRST = [
  'Bramble',
  'Cedar',
  'Foxglove',
  'Harrow',
  'Kestrel',
  'Marsh',
  'Pine',
  'Quarry',
  'Thistle',
  'Whin',
  'Alder',
  'Gorse',
];
const SECOND = ['Hollow', 'Links', 'Bank', 'Point', 'Creek', 'Ridge', 'Dunes', 'Park', 'Head', 'Vale'];

export const COURSES_PER_NOTEBOOK = 3;

function courseName(seed: string): string {
  const rng = createRng(`${seed}:name`);
  return `${rng.pick(FIRST)} ${rng.pick(SECOND)}`;
}

/** Deal out the par mix so the nines are balanced and no two par 3s sit together. */
function parLayout(seed: string): number[] {
  const rng = createRng(`${seed}:pars`);
  const pool = [...PAR_MIX];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 1; i < pool.length; i++) {
    if (pool[i] !== pool[i - 1] || pool[i] === 4) continue;
    const swap = pool.findIndex((p, k) => k > i && p === 4);
    if (swap !== -1) [pool[i], pool[swap]] = [pool[swap], pool[i]];
  }
  return pool;
}

export function generateCourse(seed: string, name = courseName(seed)): Course {
  const pars = parLayout(seed);
  const holes = pars.map((par, i) => generateHole(seed, i + 1, par));
  return {
    seed,
    name,
    holes,
    par: holes.reduce((sum, h) => sum + h.par, 0),
  };
}

export function courseSeed(notebookSeed: string, index: number): string {
  return `${notebookSeed}#${index + 1}`;
}

export function generateNotebook(seed: string): Notebook {
  return {
    seed,
    courses: Array.from({ length: COURSES_PER_NOTEBOOK }, (_, i) => generateCourse(courseSeed(seed, i))),
  };
}

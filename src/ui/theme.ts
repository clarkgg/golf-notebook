import type { Terrain } from '../core/types';

/** A pocket notebook: warm paper, pencil ink, and a course drawn in soft colour. */
export const colors = {
  paper: '#F4EFE1',
  paperDeep: '#E8E0CB',
  card: '#FBF8EF',
  ink: '#1F2A23',
  inkSoft: '#69756A',
  inkFaint: '#B4B0A0',
  line: '#D6CEB8',
  flag: '#C2412D',
  ball: '#FFFFFF',
  accent: '#2F6B44',
};

export const terrainColors: Record<Terrain, string> = {
  fairway: '#A7CC77',
  rough: '#6E9A55',
  green: '#CDE6A4',
  sand: '#EAD6A0',
  water: '#8CC0DC',
  trees: '#416B3C',
};

export const terrainNames: Record<Terrain, string> = {
  fairway: 'Fairway',
  rough: 'Rough',
  green: 'Green',
  sand: 'Bunker',
  water: 'Water',
  trees: 'Trees',
};

export const radius = { sm: 8, md: 14, lg: 22 };

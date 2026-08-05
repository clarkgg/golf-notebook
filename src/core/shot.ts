import { samePoint } from './hole';
import type { Direction, Hole, Point, ShotResult, Terrain } from './types';

/** Clockwise from north. */
export const DIRECTIONS: Direction[] = [
  { name: 'N', dr: -1, dc: 0 },
  { name: 'NE', dr: -1, dc: 1 },
  { name: 'E', dr: 0, dc: 1 },
  { name: 'SE', dr: 1, dc: 1 },
  { name: 'S', dr: 1, dc: 0 },
  { name: 'SW', dr: 1, dc: -1 },
  { name: 'W', dr: 0, dc: -1 },
  { name: 'NW', dr: -1, dc: -1 },
];

export function inBounds(hole: Hole, p: Point): boolean {
  return p.r >= 0 && p.r < hole.rows && p.c >= 0 && p.c < hole.cols;
}

export function terrainAt(hole: Hole, p: Point): Terrain {
  return hole.grid[p.r][p.c];
}

export function isCup(hole: Hole, p: Point): boolean {
  return samePoint(p, hole.cup);
}

/** The eight-way direction from `from` that points most nearly at `to`. */
export function directionToward(from: Point, to: Point): number {
  const angle = Math.atan2(to.c - from.c, from.r - to.r); // 0 = north, clockwise
  const index = Math.round(angle / (Math.PI / 4));
  return ((index % 8) + 8) % 8;
}

/**
 * How far a die roll carries the ball from a given lie.
 *
 * Fairway (and the tee) gives you a boost, the rough costs you a cell, sand
 * costs you two, and from the trees all you can do is punch out.
 */
export function swingDistance(lie: Terrain, roll: number): number {
  switch (lie) {
    case 'fairway':
      return roll + 1;
    case 'green':
      return roll;
    case 'rough':
      return Math.max(1, roll - 1);
    case 'sand':
      return Math.max(1, roll - 2);
    case 'trees':
      return Math.min(roll, 2);
    default:
      return roll;
  }
}

/** On the green you control the pace of a putt, so you may come up short on purpose. */
export function canChooseDistance(lie: Terrain): boolean {
  return lie === 'green';
}

const LIE_LABEL: Record<Terrain, string> = {
  fairway: 'the fairway',
  green: 'the green',
  rough: 'the rough',
  sand: 'the bunker',
  trees: 'the trees',
  water: 'the water',
};

export function lieLabel(lie: Terrain): string {
  return LIE_LABEL[lie];
}

/**
 * Fly the ball `distance` cells along `dirIndex` and work out where it stops.
 *
 * The ball may pass over water but may not come to rest in it, trees stop a
 * shot dead, and leaving the hole is stroke and distance.
 */
export function resolveShot(hole: Hole, from: Point, dirIndex: number, distance: number): ShotResult {
  const dir = DIRECTIONS[((dirIndex % 8) + 8) % 8];
  const path: Point[] = [];
  let cur: Point = { ...from };
  let outOfBounds = false;
  let blocked = false;

  for (let step = 0; step < distance; step++) {
    const next: Point = { r: cur.r + dir.dr, c: cur.c + dir.dc };
    if (!inBounds(hole, next)) {
      outOfBounds = true;
      break;
    }
    if (terrainAt(hole, next) === 'trees') {
      blocked = true;
      break;
    }
    path.push(next);
    cur = next;
  }

  const travelled = path.length;

  if (outOfBounds) {
    return {
      path,
      landing: { ...from },
      outcome: 'ob',
      penalty: 1,
      strokes: 2,
      travelled,
      message: 'Out of bounds — one penalty stroke, playing again from the same spot.',
    };
  }

  if (terrainAt(hole, cur) === 'water') {
    // Drop at the last dry cell the ball flew over.
    let drop: Point = { ...from };
    for (let i = path.length - 1; i >= 0; i--) {
      if (terrainAt(hole, path[i]) !== 'water') {
        drop = path[i];
        break;
      }
    }
    return {
      path,
      landing: drop,
      outcome: 'water',
      penalty: 1,
      strokes: 2,
      travelled,
      message: 'In the water — one penalty stroke, dropping short of the hazard.',
    };
  }

  if (isCup(hole, cur)) {
    return {
      path,
      landing: cur,
      outcome: 'holed',
      penalty: 0,
      strokes: 1,
      travelled,
      message: 'In the hole!',
    };
  }

  if (blocked) {
    return {
      path,
      landing: cur,
      outcome: 'blocked',
      penalty: 0,
      strokes: 1,
      travelled,
      message: travelled === 0 ? 'Blocked by the trees — no advance.' : 'Pulled up short by the trees.',
    };
  }

  return {
    path,
    landing: cur,
    outcome: 'rest',
    penalty: 0,
    strokes: 1,
    travelled,
    message: `Lying in ${lieLabel(terrainAt(hole, cur))}.`,
  };
}

/** Preview of where a shot would finish, used to draw the aim line before you commit. */
export function previewShot(hole: Hole, from: Point, dirIndex: number, distance: number): ShotResult {
  return resolveShot(hole, from, dirIndex, distance);
}

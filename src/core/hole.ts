import { createRng, type Rng } from './rng';
import type { Hole, Point, Terrain } from './types';

export const COLS = 9;
/** Upper bound on a hole's height; each hole is cropped to the length it needs. */
export const ROWS = 20;

/** Chebyshev distance — the ball moves in eight directions, so diagonals count as one. */
export function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

export function samePoint(a: Point, b: Point): boolean {
  return a.r === b.r && a.c === b.c;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** How far from tee to cup, in cells, for each par. */
const PAR_DISTANCE: Record<number, [number, number]> = {
  3: [5, 7],
  4: [8, 11],
  5: [12, 15],
};

/**
 * The centre line of the hole: a wandering route from the tee up to the cup.
 * Hazards are never allowed to cover it, which guarantees every hole is
 * playable — there is always a chain of legal landing spots to the green.
 */
function carveCentreLine(rng: Rng, tee: Point, cup: Point): Point[] {
  const line: Point[] = [{ ...tee }];
  let col = tee.c;
  for (let r = tee.r - 1; r >= cup.r; r--) {
    const rowsLeft = r - cup.r;
    const need = cup.c - col;
    const candidates = [-1, 0, 0, 1].filter((d) => {
      const nextCol = col + d;
      if (nextCol < 0 || nextCol > COLS - 1) return false;
      // Must still be able to reach the cup's column in the rows that remain.
      return Math.abs(cup.c - nextCol) <= rowsLeft;
    });
    // Nudge the walk toward the cup so it converges without looking mechanical.
    const biased = need === 0 ? candidates : [...candidates, ...candidates.filter((d) => d === Math.sign(need))];
    col = clamp(col + rng.pick(biased.length ? biased : [Math.sign(need)]), 0, COLS - 1);
    line.push({ r, c: col });
  }
  return line;
}

function blob(rng: Rng, centre: Point, radius: number): Point[] {
  const cells: Point[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      if (dist > radius) continue;
      // Ragged edges rather than perfect squares.
      if (dist === radius && rng.chance(0.45)) continue;
      cells.push({ r: centre.r + dr, c: centre.c + dc });
    }
  }
  return cells;
}

export function generateHole(seed: string, number: number, par: number): Hole {
  const rng = createRng(`${seed}:hole:${number}`);

  const [minDist, maxDist] = PAR_DISTANCE[par];
  const distance = rng.int(minDist, maxDist);

  // The grid is only as long as the hole needs, plus a little room behind the
  // green to punish an over-hit. Short holes then draw at a bigger scale.
  const rows = distance + rng.int(3, 5);
  const grid: Terrain[][] = Array.from({ length: rows }, () =>
    Array.from({ length: COLS }, () => 'rough' as Terrain),
  );

  const tee: Point = { r: rows - 1, c: clamp(Math.floor(COLS / 2) + rng.int(-1, 1), 1, COLS - 2) };
  const spread = Math.min(distance, 4);
  const cup: Point = {
    r: tee.r - distance,
    c: clamp(tee.c + rng.int(-spread, spread), 1, COLS - 2),
  };

  const centreLine = carveCentreLine(rng, tee, cup);
  const onCentreLine = new Set(centreLine.map((p) => `${p.r},${p.c}`));

  // Fairway: the centre line widened, pinching in and out along the hole.
  const fairway = new Set<string>();
  for (const p of centreLine) {
    const width = rng.chance(0.2) ? 0 : rng.chance(0.25) ? 2 : 1;
    for (let dc = -width; dc <= width; dc++) {
      const c = p.c + dc;
      if (c < 0 || c > COLS - 1) continue;
      grid[p.r][c] = 'fairway';
      fairway.add(`${p.r},${c}`);
    }
  }

  // Green around the cup.
  const greenRadius = par === 3 ? 2 : rng.int(1, 2);
  for (let dr = -greenRadius; dr <= greenRadius; dr++) {
    for (let dc = -greenRadius; dc <= greenRadius; dc++) {
      const r = cup.r + dr;
      const c = cup.c + dc;
      if (r < 0 || r > rows - 1 || c < 0 || c > COLS - 1) continue;
      if (Math.max(Math.abs(dr), Math.abs(dc)) === greenRadius && greenRadius === 2 && rng.chance(0.4)) continue;
      grid[r][c] = 'green';
    }
  }
  grid[cup.r][cup.c] = 'green';

  const isProtected = (p: Point): boolean => {
    if (p.r < 0 || p.r > rows - 1 || p.c < 0 || p.c > COLS - 1) return true;
    if (onCentreLine.has(`${p.r},${p.c}`)) return true;
    if (grid[p.r][p.c] === 'green') return true;
    return chebyshev(p, tee) <= 1 || chebyshev(p, cup) <= 1;
  };

  const paint = (cells: Point[], terrain: Terrain, allowFairway: boolean) => {
    for (const p of cells) {
      if (isProtected(p)) continue;
      if (!allowFairway && fairway.has(`${p.r},${p.c}`)) continue;
      grid[p.r][p.c] = terrain;
    }
  };

  // Water: can cut across the fairway, since the ball may fly over it.
  const waterCount = par === 3 ? rng.int(0, 2) : rng.int(1, 3);
  for (let i = 0; i < waterCount; i++) {
    const centre = { r: rng.int(cup.r, tee.r - 1), c: rng.int(0, COLS - 1) };
    paint(blob(rng, centre, rng.int(1, 2)), 'water', true);
  }

  // Bunkers: a couple guarding the green, the rest scattered down the hole.
  const sandCount = rng.int(2, 4);
  for (let i = 0; i < sandCount; i++) {
    const guardsGreen = i < 2 && rng.chance(0.75);
    const centre = guardsGreen
      ? { r: cup.r + rng.int(0, 3), c: cup.c + rng.pick([-2, -3, 2, 3]) }
      : { r: rng.int(cup.r, tee.r - 2), c: rng.int(0, COLS - 1) };
    paint(blob(rng, centre, 1), 'sand', true);
  }

  // Trees only ever grow in the rough, so they can never wall off the route.
  const treeCount = rng.int(3, 6);
  for (let i = 0; i < treeCount; i++) {
    const centre = { r: rng.int(cup.r - 1, tee.r - 1), c: rng.pick([0, 1, COLS - 2, COLS - 1, rng.int(0, COLS - 1)]) };
    for (const p of blob(rng, centre, rng.int(0, 1))) {
      if (isProtected(p)) continue;
      if (grid[p.r]?.[p.c] !== 'rough') continue;
      grid[p.r][p.c] = 'trees';
    }
  }

  grid[tee.r][tee.c] = 'fairway';

  return {
    number,
    par,
    yards: Math.round((distance * 35 + rng.int(0, 35)) / 5) * 5,
    rows,
    cols: COLS,
    grid,
    tee,
    cup,
  };
}

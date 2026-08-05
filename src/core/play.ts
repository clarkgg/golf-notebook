import { chebyshev } from './hole';
import { canChooseDistance, DIRECTIONS, resolveShot, swingDistance, terrainAt } from './shot';
import type { Hole, HoleState, ShotResult } from './types';

export function startHole(hole: Hole): HoleState {
  return { ball: { ...hole.tee }, strokes: 0, holed: false, shots: [] };
}

export function applyShot(
  state: HoleState,
  result: ShotResult,
  roll: number,
  distance: number,
): HoleState {
  return {
    ball: { ...result.landing },
    strokes: state.strokes + result.strokes,
    holed: result.outcome === 'holed',
    shots: [...state.shots, { from: { ...state.ball }, result, roll, distance }],
  };
}

/** The distance a given roll would carry from the ball's current lie. */
export function distanceForRoll(hole: Hole, state: HoleState, roll: number): number {
  return swingDistance(terrainAt(hole, state.ball), roll);
}

export interface ShotOption {
  dirIndex: number;
  distance: number;
  result: ShotResult;
}

/**
 * Every shot available for a given roll: eight directions, plus the shorter
 * putts you may choose to play when the ball is on the green.
 */
export function shotOptions(hole: Hole, state: HoleState, roll: number): ShotOption[] {
  const lie = terrainAt(hole, state.ball);
  const max = swingDistance(lie, roll);
  const distances = canChooseDistance(lie)
    ? Array.from({ length: max }, (_, i) => i + 1)
    : [max];
  const options: ShotOption[] = [];
  for (let dirIndex = 0; dirIndex < DIRECTIONS.length; dirIndex++) {
    for (const distance of distances) {
      options.push({ dirIndex, distance, result: resolveShot(hole, state.ball, dirIndex, distance) });
    }
  }
  return options;
}

/**
 * A simple greedy player: hole out if you can, otherwise get as close as
 * possible without paying a penalty. Used to sanity-check that generated holes
 * are always completable, and to power the "suggest a shot" hint.
 */
export function bestShot(hole: Hole, state: HoleState, roll: number): ShotOption {
  const options = shotOptions(hole, state, roll);
  let best = options[0];
  let bestScore = Infinity;
  for (const option of options) {
    if (option.result.outcome === 'holed') return option;
    const lie = terrainAt(hole, option.result.landing);
    const lieCost = lie === 'sand' ? 1.5 : lie === 'trees' ? 2.5 : lie === 'rough' ? 0.75 : 0;
    // A shot that leaves the ball where it started is a stroke thrown away —
    // without this the greedy player will hammer into the same tree forever.
    const wasted = option.result.travelled === 0 ? 6 : 0;
    const score =
      chebyshev(option.result.landing, hole.cup) + option.result.penalty * 3 + lieCost + wasted;
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
}

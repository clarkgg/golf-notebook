/**
 * Core types for the golf notebook game.
 *
 * A hole is a grid of terrain cells. The ball moves in straight lines across
 * that grid, one cell at a time, exactly the way you'd count squares with a
 * pencil in the paper version.
 */

export type Terrain = 'fairway' | 'rough' | 'sand' | 'water' | 'trees' | 'green';

export interface Point {
  r: number;
  c: number;
}

export interface Hole {
  /** 1-18 */
  number: number;
  par: number;
  yards: number;
  rows: number;
  cols: number;
  /** grid[r][c] */
  grid: Terrain[][];
  tee: Point;
  cup: Point;
}

export interface Course {
  seed: string;
  name: string;
  holes: Hole[];
  par: number;
}

export interface Notebook {
  seed: string;
  courses: Course[];
}

/** One of the eight compass directions the ball can be struck along. */
export interface Direction {
  name: string;
  dr: number;
  dc: number;
}

export type ShotOutcome =
  /** ball came to rest in the cup */
  | 'holed'
  /** ball came to rest on a legal lie */
  | 'rest'
  /** ball landed in water: penalty stroke, dropped short of the hazard */
  | 'water'
  /** ball flew off the edge of the hole: penalty stroke, replay from the same spot */
  | 'ob'
  /** ball was stopped early by a stand of trees */
  | 'blocked';

export interface ShotResult {
  /** Cells the ball travelled through, in order, excluding the starting cell. */
  path: Point[];
  /** Where the ball came to rest after any penalty drop. */
  landing: Point;
  outcome: ShotOutcome;
  /** Penalty strokes added on top of the swing itself. */
  penalty: number;
  /** Total strokes this shot cost: 1 for the swing, plus penalties. */
  strokes: number;
  /** Cells the ball actually travelled (after being cut short, if it was). */
  travelled: number;
  message: string;
}

export interface ShotRecord {
  from: Point;
  result: ShotResult;
  roll: number;
  distance: number;
}

export interface HoleState {
  ball: Point;
  strokes: number;
  holed: boolean;
  shots: ShotRecord[];
}

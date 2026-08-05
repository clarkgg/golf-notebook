/**
 * Print a hole as text and play it with the greedy bot.
 *
 *   npx tsc -p tsconfig.test.json && node test-build/../scripts/... (see npm run inspect)
 */
import { generateCourse } from '../src/core/course';
import { applyShot, bestShot, startHole } from '../src/core/play';
import { createRng } from '../src/core/rng';
import { terrainAt, DIRECTIONS } from '../src/core/shot';
import type { Hole, HoleState, Terrain } from '../src/core/types';

const GLYPH: Record<Terrain, string> = {
  fairway: '.',
  rough: ',',
  sand: 's',
  water: '~',
  trees: 'T',
  green: 'g',
};

function draw(hole: Hole, state: HoleState): string {
  const lines: string[] = [];
  for (let r = 0; r < hole.rows; r++) {
    let line = '';
    for (let c = 0; c < hole.cols; c++) {
      if (state.ball.r === r && state.ball.c === c) line += 'O';
      else if (hole.cup.r === r && hole.cup.c === c) line += 'H';
      else if (hole.tee.r === r && hole.tee.c === c) line += 't';
      else line += GLYPH[hole.grid[r][c]];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

const seed = process.argv[2] ?? '2026';
const holeNumber = Number(process.argv[3] ?? 14);
const course = generateCourse(seed);
const hole = course.holes[holeNumber - 1];

console.log(`${course.name} — hole ${hole.number}, par ${hole.par}, ${hole.yards} yds`);
console.log(`grid ${hole.rows}x${hole.cols}, tee ${hole.tee.r},${hole.tee.c} cup ${hole.cup.r},${hole.cup.c}`);

const rng = createRng(`${seed}:inspect`);
let state = startHole(hole);
console.log(draw(hole, state));

let swings = 0;
while (!state.holed && swings < 40) {
  const roll = rng.int(1, 6);
  const option = bestShot(hole, state, roll);
  const lie = terrainAt(hole, state.ball);
  state = applyShot(state, option.result, roll, option.distance);
  swings++;
  console.log(
    `${swings}. from ${lie} roll ${roll} → ${DIRECTIONS[option.dirIndex].name} ${option.distance} : ` +
      `${option.result.outcome} at ${state.ball.r},${state.ball.c} (${state.strokes} strokes)`,
  );
}
console.log(draw(hole, state));
console.log(`finished: ${state.holed} in ${state.strokes} strokes`);

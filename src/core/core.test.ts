import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateCourse, generateNotebook, COURSES_PER_NOTEBOOK } from './course';
import { chebyshev, COLS, generateHole, ROWS, samePoint } from './hole';
import { createRng, randomNotebookCode } from './rng';
import { applyShot, bestShot, distanceForRoll, shotOptions, startHole } from './play';
import { emptyScorecard, formatToPar, scoreName, totals } from './scoring';
import { directionToward, DIRECTIONS, resolveShot, swingDistance, terrainAt } from './shot';
import type { Hole, Point, Terrain } from './types';

const SEEDS = ['ABCD-1234', 'K7QF-2M9P', 'notebook', 'zzz', '2026', 'golf-notebook'];

test('the same seed always produces the same course', () => {
  const a = generateCourse('repeatable');
  const b = generateCourse('repeatable');
  assert.deepEqual(a, b);
  assert.notDeepEqual(generateCourse('repeatable').holes[0].grid, generateCourse('other').holes[0].grid);
});

test('a course is 18 holes at par 72', () => {
  for (const seed of SEEDS) {
    const course = generateCourse(seed);
    assert.equal(course.holes.length, 18);
    assert.equal(course.par, 72);
    course.holes.forEach((hole, i) => assert.equal(hole.number, i + 1));
  }
});

test('a notebook holds three differently named courses', () => {
  const notebook = generateNotebook('K7QF-2M9P');
  assert.equal(notebook.courses.length, COURSES_PER_NOTEBOOK);
  const seeds = new Set(notebook.courses.map((c) => c.seed));
  assert.equal(seeds.size, COURSES_PER_NOTEBOOK);
});

test('notebook codes are readable and unambiguous', () => {
  const code = randomNotebookCode(createRng('fixed'));
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.doesNotMatch(code, /[IO01]/);
});

test('hole geometry stays inside the grid and matches its par', () => {
  for (const seed of SEEDS) {
    for (const hole of generateCourse(seed).holes) {
      assert.equal(hole.grid.length, hole.rows);
      assert.ok(hole.rows <= ROWS, 'no taller than the maximum grid');
      hole.grid.forEach((row) => assert.equal(row.length, COLS));
      for (const p of [hole.tee, hole.cup]) {
        assert.ok(p.r >= 0 && p.r < hole.rows, `row ${p.r} in range`);
        assert.ok(p.c >= 0 && p.c < COLS, `col ${p.c} in range`);
      }
      const distance = chebyshev(hole.tee, hole.cup);
      const [lo, hi] = hole.par === 3 ? [5, 7] : hole.par === 4 ? [8, 11] : [12, 15];
      assert.ok(distance >= lo && distance <= hi, `par ${hole.par} hole is ${distance} cells`);
      assert.ok(hole.yards > 0);
    }
  }
});

test('the grid is cropped to the hole, with room behind the green', () => {
  for (const seed of SEEDS) {
    for (const hole of generateCourse(seed).holes) {
      const distance = chebyshev(hole.tee, hole.cup);
      const behind = hole.cup.r;
      assert.equal(hole.tee.r, hole.rows - 1, 'the tee sits on the bottom row');
      assert.ok(behind >= 2 && behind <= 4, `${behind} rows behind the green`);
      assert.ok(hole.rows <= distance + 5, 'no dead space beyond the hole');
    }
  }
});

test('short holes draw at a bigger scale than long ones', () => {
  const course = generateCourse('K7QF-2M9P');
  const shortest = Math.min(...course.holes.filter((h) => h.par === 3).map((h) => h.rows));
  const longest = Math.max(...course.holes.filter((h) => h.par === 5).map((h) => h.rows));
  assert.ok(shortest < longest, `par 3 grid (${shortest}) shorter than par 5 (${longest})`);
});

test('the tee is playable and the cup sits on the green', () => {
  for (const seed of SEEDS) {
    for (const hole of generateCourse(seed).holes) {
      assert.equal(terrainAt(hole, hole.tee), 'fairway');
      assert.equal(terrainAt(hole, hole.cup), 'green');
    }
  }
});

test('every hole has some fairway, and trees never grow on it', () => {
  for (const seed of SEEDS) {
    for (const hole of generateCourse(seed).holes) {
      const counts = new Map<Terrain, number>();
      for (const row of hole.grid) {
        for (const cell of row) counts.set(cell, (counts.get(cell) ?? 0) + 1);
      }
      assert.ok((counts.get('fairway') ?? 0) > 0, 'hole has fairway');
      assert.ok((counts.get('green') ?? 0) > 0, 'hole has a green');
    }
  }
});

test('lies change how far a roll carries', () => {
  assert.equal(swingDistance('fairway', 4), 5, 'fairway gives a boost');
  assert.equal(swingDistance('green', 4), 4);
  assert.equal(swingDistance('rough', 4), 3, 'rough costs a cell');
  assert.equal(swingDistance('sand', 4), 2, 'sand costs two');
  assert.equal(swingDistance('trees', 6), 2, 'trees are a punch-out');
  assert.equal(swingDistance('sand', 1), 1, 'never less than one cell');
  assert.equal(swingDistance('rough', 1), 1);
});

/** Build a hand-made hole so shot rules can be checked exactly. */
function makeHole(rows: string[], par = 4): Hole {
  const legend: Record<string, Terrain> = {
    '.': 'fairway',
    ',': 'rough',
    's': 'sand',
    'w': 'water',
    't': 'trees',
    'g': 'green',
    'T': 'fairway',
    'H': 'green',
  };
  let tee: Point = { r: 0, c: 0 };
  let cup: Point = { r: 0, c: 0 };
  const grid = rows.map((row, r) =>
    row.split('').map((ch, c) => {
      if (ch === 'T') tee = { r, c };
      if (ch === 'H') cup = { r, c };
      return legend[ch];
    }),
  );
  return { number: 1, par, yards: 300, rows: grid.length, cols: grid[0].length, grid, tee, cup };
}

test('a shot travels exactly its distance and reports the lie', () => {
  const hole = makeHole([
    ',,H,,',
    ',,g,,',
    ',,.,,',
    ',,.,,',
    ',,T,,',
  ]);
  const north = DIRECTIONS.findIndex((d) => d.name === 'N');
  const result = resolveShot(hole, hole.tee, north, 2);
  assert.equal(result.outcome, 'rest');
  assert.equal(result.travelled, 2);
  assert.deepEqual(result.landing, { r: 2, c: 2 });
  assert.equal(result.strokes, 1);
});

test('landing in the cup holes out, flying over it does not', () => {
  const hole = makeHole([
    ',,g,,',
    ',,H,,',
    ',,g,,',
    ',,.,,',
    ',,T,,',
  ]);
  const north = DIRECTIONS.findIndex((d) => d.name === 'N');
  assert.equal(resolveShot(hole, hole.tee, north, 3).outcome, 'holed');
  const flownOver = resolveShot(hole, hole.tee, north, 4);
  assert.equal(flownOver.outcome, 'rest');
  assert.deepEqual(flownOver.landing, { r: 0, c: 2 });
});

test('the ball flies over water but may not rest in it', () => {
  const hole = makeHole([
    ',,H,,',
    ',,g,,',
    ',,w,,',
    ',,w,,',
    ',,T,,',
  ]);
  const north = DIRECTIONS.findIndex((d) => d.name === 'N');

  const splash = resolveShot(hole, hole.tee, north, 2);
  assert.equal(splash.outcome, 'water');
  assert.equal(splash.penalty, 1);
  assert.equal(splash.strokes, 2);
  assert.deepEqual(splash.landing, hole.tee, 'dropped at the last dry cell, here the tee');

  const carried = resolveShot(hole, hole.tee, north, 3);
  assert.equal(carried.outcome, 'rest');
  assert.deepEqual(carried.landing, { r: 1, c: 2 }, 'carried the hazard onto the green');
});

test('a water drop goes back to the last dry cell flown over', () => {
  const hole = makeHole([
    ',,H,,',
    ',,w,,',
    ',,.,,',
    ',,.,,',
    ',,T,,',
  ]);
  const north = DIRECTIONS.findIndex((d) => d.name === 'N');
  const result = resolveShot(hole, hole.tee, north, 3);
  assert.equal(result.outcome, 'water');
  assert.deepEqual(result.landing, { r: 2, c: 2 });
});

test('trees stop a shot dead', () => {
  const hole = makeHole([
    ',,H,,',
    ',,g,,',
    ',,t,,',
    ',,.,,',
    ',,T,,',
  ]);
  const north = DIRECTIONS.findIndex((d) => d.name === 'N');
  const result = resolveShot(hole, hole.tee, north, 4);
  assert.equal(result.outcome, 'blocked');
  assert.deepEqual(result.landing, { r: 3, c: 2 });
  assert.equal(result.penalty, 0, 'no penalty, just a wasted stroke');
});

test('trees against the ball cost a stroke and gain nothing', () => {
  const hole = makeHole([
    ',,H,,',
    ',,g,,',
    ',,.,,',
    ',,t,,',
    ',,T,,',
  ]);
  const north = DIRECTIONS.findIndex((d) => d.name === 'N');
  const result = resolveShot(hole, hole.tee, north, 3);
  assert.equal(result.outcome, 'blocked');
  assert.equal(result.travelled, 0);
  assert.deepEqual(result.landing, hole.tee);
  assert.equal(result.strokes, 1);
});

test('leaving the hole is stroke and distance', () => {
  const hole = makeHole([
    ',,H,,',
    ',,g,,',
    ',,.,,',
    ',,.,,',
    ',,T,,',
  ]);
  const south = DIRECTIONS.findIndex((d) => d.name === 'S');
  const result = resolveShot(hole, hole.tee, south, 2);
  assert.equal(result.outcome, 'ob');
  assert.equal(result.penalty, 1);
  assert.equal(result.strokes, 2);
  assert.deepEqual(result.landing, hole.tee, 'replayed from the same spot');
});

test('putts may be played short of the full roll', () => {
  const hole = makeHole([
    ',ggg,',
    ',gHg,',
    ',ggg,',
    ',,.,,',
    ',,T,,',
  ]);
  const onGreen = { r: 2, c: 2 };
  const state = { ...startHole(hole), ball: onGreen };
  const options = shotOptions(hole, state, 5);
  assert.equal(options.length, DIRECTIONS.length * 5, 'every direction at every pace');
  assert.ok(options.some((o) => o.result.outcome === 'holed'), 'a one-cell putt drops');

  const offGreen = { ...startHole(hole), ball: { r: 3, c: 2 } };
  assert.equal(shotOptions(hole, offGreen, 5).length, DIRECTIONS.length, 'full swing only, off the green');
});

test('aiming picks the nearest of the eight directions', () => {
  const from = { r: 5, c: 5 };
  const cases: [Point, string][] = [
    [{ r: 0, c: 5 }, 'N'],
    [{ r: 0, c: 10 }, 'NE'],
    [{ r: 5, c: 9 }, 'E'],
    [{ r: 9, c: 9 }, 'SE'],
    [{ r: 9, c: 5 }, 'S'],
    [{ r: 9, c: 1 }, 'SW'],
    [{ r: 5, c: 0 }, 'W'],
    [{ r: 1, c: 1 }, 'NW'],
  ];
  for (const [target, name] of cases) {
    assert.equal(DIRECTIONS[directionToward(from, target)].name, name);
  }
});

test('applying a shot records it and accumulates strokes', () => {
  const hole = generateCourse('ABCD-1234').holes[0];
  let state = startHole(hole);
  assert.equal(state.strokes, 0);
  assert.ok(samePoint(state.ball, hole.tee));

  const distance = distanceForRoll(hole, state, 4);
  assert.equal(distance, 5, 'tee shots get the fairway boost');
  const option = bestShot(hole, state, 4);
  state = applyShot(state, option.result, 4, option.distance);
  assert.equal(state.shots.length, 1);
  assert.equal(state.strokes, option.result.strokes);
});

test('every generated hole can be finished', () => {
  const rng = createRng('bot');
  for (const seed of SEEDS) {
    for (const hole of generateCourse(seed).holes) {
      let state = startHole(hole);
      let swings = 0;
      while (!state.holed && swings < 40) {
        const roll = rng.int(1, 6);
        const option = bestShot(hole, state, roll);
        state = applyShot(state, option.result, roll, option.distance);
        swings++;
      }
      assert.ok(state.holed, `hole ${hole.number} of ${seed} was finished`);
      assert.ok(
        state.strokes <= 15,
        `hole ${hole.number} of ${seed} took ${state.strokes} strokes`,
      );
    }
  }
});

test('a greedy round comes in somewhere near par', () => {
  const rng = createRng('round');
  const course = generateCourse('K7QF-2M9P');
  let strokes = 0;
  for (const hole of course.holes) {
    let state = startHole(hole);
    while (!state.holed) {
      const roll = rng.int(1, 6);
      const option = bestShot(hole, state, roll);
      state = applyShot(state, option.result, roll, option.distance);
    }
    strokes += state.strokes;
  }
  assert.ok(strokes > 50 && strokes < 110, `greedy round of ${strokes} is a plausible score`);
});

test('scorecard totals and score names', () => {
  const course = generateCourse('ABCD-1234');
  const card = emptyScorecard();
  assert.equal(card.length, 18);
  assert.equal(totals(course, card).played, 0);

  card[0] = course.holes[0].par - 1;
  card[1] = course.holes[1].par + 2;
  const t = totals(course, card);
  assert.equal(t.played, 2);
  assert.equal(t.toPar, 1);
  assert.equal(t.complete, false);

  assert.equal(scoreName(3, 4), 'Birdie');
  assert.equal(scoreName(4, 4), 'Par');
  assert.equal(scoreName(5, 4), 'Bogey');
  assert.equal(scoreName(6, 4), 'Double bogey');
  assert.equal(scoreName(2, 4), 'Eagle');
  assert.equal(scoreName(1, 3), 'Hole in one');
  assert.equal(scoreName(2, 5), 'Albatross');
  assert.equal(formatToPar(0), 'E');
  assert.equal(formatToPar(-3), '-3');
  assert.equal(formatToPar(4), '+4');
});

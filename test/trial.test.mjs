import assert from "node:assert/strict";
import test from "node:test";

import {
  generateAnswer,
  generateQuestion,
  generateTrial,
  letterNumberCoordinate,
  simulateTrial,
  validateSolidCellMaze
} from "../dist/index.js";

test("the same seed and parameters produce the same trial", () => {
  const options = { seed: 42, rows: 15, cols: 15 };
  assert.deepEqual(generateTrial(options), generateTrial(options));
});

test("seed 42 preserves a stable regression result", () => {
  const trial = generateTrial({ seed: 42 });
  assert.equal(trial.maze.seed, 42);
  assert.deepEqual(trial.maze.entry, { row: 10, col: 4 });
  assert.deepEqual(trial.maze.goal, { row: 6, col: 8 });
  assert.equal(trial.actions.length, 76);
  assert.deepEqual(trial.result.answers, {
    finalPosition: "H6",
    keys: 0,
    treasures: 0,
    health: 3,
    alive: true,
    reachedGoal: true,
    openedDoors: 1,
    openedChests: 0,
    triggeredTraps: 2,
    usedMedicines: 2,
    blockedMoves: 0,
    blockedAfterDeath: 0
  });
});

test("question and answer render in English by default and in Chinese on request", () => {
  assert.match(generateQuestion({ seed: 7 }), /^# Maze Trial/u);
  assert.match(generateAnswer({ seed: 7 }), /^# Answer Key/u);
  assert.match(generateQuestion({ seed: 7, language: "zh" }), /^# 迷宫试题/u);
  assert.match(generateAnswer({ seed: 7, language: "zh" }), /^# 标准答案/u);
});

test("the stored answer is reproducible by the independent simulator", () => {
  const trial = generateTrial({ seed: 81, scenario: "treasure-and-leave" });
  const replay = simulateTrial(trial.maze, trial.actions, trial.initialState);
  assert.deepEqual(replay, trial.result);
  assert.equal(replay.answers.reachedGoal, true);
  assert.notEqual(replay.answers.finalPosition, letterNumberCoordinate(trial.maze.goal));
  assert.ok(replay.answers.openedChests >= 1);
  assert.ok(replay.answers.usedMedicines >= 1);
  assert.ok(replay.answers.blockedMoves >= 2);
});

test("death-and-stop produces blocked moves after death", () => {
  const trial = generateTrial({ seed: 117, scenario: "death-and-stop" });
  assert.equal(trial.result.answers.alive, false);
  assert.ok(trial.result.answers.blockedAfterDeath >= 5);
});

test("all scenarios satisfy their invariants across a batch of seeds", () => {
  for (let seed = 0; seed < 10; seed += 1) {
    const success = generateTrial({ seed, scenario: "success" });
    assert.equal(success.result.answers.reachedGoal, true);
    assert.equal(success.result.answers.alive, true);

    const treasure = generateTrial({ seed, scenario: "treasure-and-leave" });
    assert.equal(treasure.result.answers.reachedGoal, true);
    assert.ok(treasure.result.answers.openedChests >= 1);
    assert.ok(treasure.result.answers.blockedMoves >= 2);

    const death = generateTrial({ seed, scenario: "death-and-stop" });
    assert.equal(death.result.answers.alive, false);
    assert.ok(death.result.answers.blockedAfterDeath >= 5);
  }
});

test("braided mazes search deterministically for a valid decorated maze", () => {
  const options = { seed: 19, rows: 21, cols: 21, braid: 0.1, doorCount: 2 };
  const first = generateTrial(options);
  const second = generateTrial(options);
  assert.equal(first.maze.seed, second.maze.seed);
  assert.deepEqual(first.maze.terrain, second.maze.terrain);
  assert.equal(validateSolidCellMaze(first.maze).valid, true);
});

test("invalid dimensions and scenario requirements fail clearly", () => {
  assert.throws(() => generateTrial({ rows: 14 }), /rows must be odd/u);
  assert.throws(
    () => generateTrial({ scenario: "death-and-stop", trapCount: 0 }),
    /requires at least one trap/u
  );
});

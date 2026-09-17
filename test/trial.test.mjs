import assert from "node:assert/strict";
import test from "node:test";

import {
  generateAnswer,
  generateQuestion,
  generateTrial,
  letterNumberCoordinate,
  shortestPath,
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
    keysByMaterial: { copper: 0, silver: 0, gold: 0 },
    treasures: 0,
    treasuresByType: { treasure: 0, coin: 0, gem: 0, relic: 0 },
    health: 3,
    alive: true,
    reachedGoal: true,
    openedDoors: 1,
    openedChests: 0,
    triggeredTraps: 2,
    usedMedicines: 2,
    usedPotions: 0,
    elapsedTime: 76,
    finalSpeed: "normal",
    speedRemaining: 0,
    poisonDamage: 0,
    poisonRemaining: 0,
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

test("wording exposes only mechanisms that exist in the generated trial", () => {
  const basic = generateTrial({ seed: 8, complexity: "basic", scenario: "treasure-and-leave" });
  assert.match(basic.sections.questions, /medicine rooms/u);
  assert.doesNotMatch(basic.sections.questions, /potions were drunk/u);
  assert.doesNotMatch(basic.sections.rules, /Poison starts/u);
  assert.doesNotMatch(basic.sections.rules, /time units according to/u);
  assert.match(basic.sections.rules, /Starting at the entry does not count as entering/u);

  const advanced = generateTrial({ seed: 5, complexity: "advanced", scenario: "mechanism-tour" });
  assert.match(advanced.sections.questions, /potions were drunk/u);
  assert.doesNotMatch(advanced.sections.questions, /medicine rooms/u);
  assert.match(advanced.sections.rules, /antidote potion/u);
  assert.match(advanced.sections.rules, /haste potion sets speed to fast/u);
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

test("every selected door is an actual entry-goal separator", () => {
  for (const braid of [0, 0.1, 0.35]) {
    for (let seed = 0; seed < 5; seed += 1) {
      const trial = generateTrial({ seed, rows: 31, cols: 31, braid, doorCount: 3 });
      for (const door of trial.maze.doors) {
        assert.deepEqual(
          shortestPath(trial.maze, trial.maze.entry, trial.maze.goal, door.position),
          []
        );
      }
    }
  }
});

test("invalid dimensions and scenario requirements fail clearly", () => {
  assert.throws(() => generateTrial({ rows: 14 }), /rows must be odd/u);
  assert.throws(
    () => generateTrial({ scenario: "death-and-stop", trapCount: 0 }),
    /requires at least one trap/u
  );
});

test("advanced mechanism-tour exercises every configured mechanism", () => {
  const trial = generateTrial({ seed: 42, complexity: "advanced", scenario: "mechanism-tour" });
  assert.equal(trial.options.doorCount, 3);
  assert.equal(trial.options.potionCount, 5);
  assert.deepEqual(new Set(trial.maze.doors.map((item) => item.material)), new Set(["copper", "silver", "gold"]));
  assert.deepEqual(new Set(trial.maze.objects.filter((item) => item.type === "trap").map((item) => item.damage)), new Set([1, 2, 3]));
  assert.deepEqual(new Set(trial.maze.objects.filter((item) => item.type === "potion").map((item) => item.kind)), new Set(["healing", "poison", "antidote", "haste", "slow"]));
  assert.deepEqual(new Set(trial.maze.objects.filter((item) => item.type === "chest").flatMap((item) => item.contents.map((content) => content.type))), new Set(["coin", "gem", "relic"]));
  assert.equal(trial.result.answers.openedDoors, 3);
  assert.equal(trial.result.answers.openedChests, 3);
  assert.equal(trial.result.answers.triggeredTraps, 3);
  assert.equal(trial.result.answers.usedPotions, 5);
  assert.ok(trial.result.answers.elapsedTime > trial.actions.length);

  const poisonStep = trial.result.trace.findIndex((item) => item.events.some((event) => event.type === "drink-potion" && event.potionKind === "poison"));
  assert.ok(poisonStep >= 0);
  assert.equal(trial.result.trace[poisonStep].events.some((event) => event.type === "poison-tick"), false);
  assert.equal(trial.result.trace[poisonStep + 1].events.some((event) => event.type === "poison-tick"), true);

  const hasteStep = trial.result.trace.findIndex((item) => item.events.some((event) => event.type === "drink-potion" && event.potionKind === "haste"));
  assert.equal(trial.result.trace[hasteStep].after.speedRemaining, 4);
  assert.equal(trial.result.trace[hasteStep + 1].before.speed, "fast");
  assert.equal(trial.result.trace[hasteStep + 1].after.elapsedTime - trial.result.trace[hasteStep + 1].before.elapsedTime, 1);
});

test("intermediate and custom mechanism settings are deterministic", () => {
  const options = {
    seed: 9,
    complexity: "intermediate",
    scenario: "mechanism-tour",
    trapDamages: [2, 4],
    trapCount: 2,
    potionKinds: ["healing", "poison"],
    potionCount: 2,
    treasureTypes: ["coin", "relic"],
    chestCount: 2,
    poisonDamage: 2,
    poisonDuration: 2
  };
  const first = generateTrial(options);
  const second = generateTrial(options);
  assert.deepEqual(first, second);
  assert.deepEqual(first.maze.objects.filter((item) => item.type === "trap").map((item) => item.damage), [2, 4]);
  assert.equal(first.result.answers.usedPotions, 2);
  assert.equal(first.result.answers.openedChests, 2);
});

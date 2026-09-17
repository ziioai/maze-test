import { cell, cellKey, letterNumberCoordinate, sameCell } from "./coordinates.js";
import { terrainAt } from "./maze.js";
import type {
  BlockedReason,
  Direction,
  InitialState,
  Maze,
  SimulationResult,
  TrialEvent,
  TrialState,
  TrialTraceItem
} from "./types.js";

const DELTAS: Record<Direction, readonly [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1]
};

export function simulateTrial(
  maze: Maze,
  actions: readonly Direction[],
  initial: Partial<InitialState> = {}
): SimulationResult {
  const health = initial.health ?? 5;
  const state: TrialState = {
    position: structuredClone(maze.entry),
    health,
    healthMax: initial.healthMax ?? health,
    keys: initial.keys ?? 0,
    treasures: initial.treasures ?? 0,
    alive: health > 0,
    reachedGoal: false,
    openedDoors: [],
    collectedKeys: [],
    openedChests: [],
    triggeredTraps: [],
    usedMedicines: []
  };
  const trace: TrialTraceItem[] = [];
  for (let index = 0; index < actions.length; index += 1) {
    const direction = actions[index];
    if (!direction) continue;
    trace.push(executeStep(maze, state, direction, index + 1));
  }
  return {
    state: structuredClone(state),
    trace,
    answers: {
      finalPosition: letterNumberCoordinate(state.position),
      keys: state.keys,
      treasures: state.treasures,
      health: state.health,
      alive: state.alive,
      reachedGoal: state.reachedGoal,
      openedDoors: state.openedDoors.length,
      openedChests: state.openedChests.length,
      triggeredTraps: state.triggeredTraps.length,
      usedMedicines: state.usedMedicines.length,
      blockedMoves: trace.filter((item) => !item.moved).length,
      blockedAfterDeath: trace.filter((item) => item.reason === "dead").length
    }
  };
}

function executeStep(
  maze: Maze,
  state: TrialState,
  direction: Direction,
  step: number
): TrialTraceItem {
  const before = structuredClone(state);
  const events: TrialEvent[] = [];
  if (!state.alive) return record(step, direction, before, state, false, "dead", events);

  const [dr, dc] = DELTAS[direction];
  const target = cell(state.position.row + dr, state.position.col + dc);
  if (terrainAt(maze, target) !== ".") {
    return record(step, direction, before, state, false, "wall-or-outside", events);
  }

  const door = maze.doors.find((item) => sameCell(item.position, target));
  if (door && !state.openedDoors.includes(door.id)) {
    if (state.keys <= 0) {
      return record(
        step,
        direction,
        before,
        state,
        false,
        "closed-door-without-key",
        events
      );
    }
    state.keys -= 1;
    state.openedDoors.push(door.id);
    events.push({ type: "open-door", id: door.id, keyCost: 1 });
  }

  state.position = target;
  const object = maze.objects.find((item) => sameCell(item.position, target));
  if (object?.type === "key" && !state.collectedKeys.includes(object.id)) {
    state.collectedKeys.push(object.id);
    state.keys += 1;
    events.push({ type: "collect-key", id: object.id });
  }
  if (object?.type === "chest" && !state.openedChests.includes(object.id)) {
    if (state.keys > 0) {
      state.keys -= 1;
      state.openedChests.push(object.id);
      state.treasures += object.treasures;
      events.push({
        type: "open-chest",
        id: object.id,
        keyCost: 1,
        treasures: object.treasures
      });
    } else {
      events.push({ type: "pass-closed-chest", id: object.id });
    }
  }
  if (object?.type === "trap" && !state.triggeredTraps.includes(object.id)) {
    state.triggeredTraps.push(object.id);
    state.health = Math.max(0, state.health - object.damage);
    events.push({ type: "trigger-trap", id: object.id, damage: object.damage });
  }
  if (object?.type === "medicine" && !state.usedMedicines.includes(object.id)) {
    state.usedMedicines.push(object.id);
    const prior = state.health;
    state.health = Math.min(state.healthMax, state.health + object.recovery);
    events.push({ type: "use-medicine", id: object.id, recovery: state.health - prior });
  }
  if (state.health <= 0 && state.alive) {
    state.alive = false;
    events.push({ type: "die" });
  }
  if (sameCell(state.position, maze.goal) && !state.reachedGoal) {
    state.reachedGoal = true;
    events.push({ type: "reach-goal" });
  }
  return record(step, direction, before, state, true, null, events);
}

function record(
  step: number,
  direction: Direction,
  before: TrialState,
  state: TrialState,
  moved: boolean,
  reason: BlockedReason | null,
  events: TrialEvent[]
): TrialTraceItem {
  return {
    step,
    direction,
    before,
    moved,
    reason,
    events,
    after: structuredClone(state)
  };
}

export function stateKey(state: TrialState): string {
  return [
    cellKey(state.position),
    state.health,
    state.healthMax,
    state.keys,
    state.treasures,
    state.alive,
    state.reachedGoal,
    [...state.openedDoors].sort().join(","),
    [...state.collectedKeys].sort().join(","),
    [...state.openedChests].sort().join(","),
    [...state.triggeredTraps].sort().join(","),
    [...state.usedMedicines].sort().join(",")
  ].join("|");
}

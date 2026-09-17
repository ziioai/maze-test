import { cell, cellKey, letterNumberCoordinate } from "./coordinates.js";
import { emptyMaterialCounts, emptyTreasureCounts, mechanismPreset, totalMaterialKeys } from "./mechanisms.js";
import { terrainAt } from "./maze.js";
import type {
  Direction,
  InitialState,
  Maze,
  PotionObject,
  SimulationResult,
  SpeedMode,
  TrialEvent,
  TrialState,
  TrialTraceItem
} from "./types.js";

const DELTAS: Record<Direction, { row: number; col: number }> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 }
};

interface StatusContext {
  speedAtStart: SpeedMode;
  speedRemainingAtStart: number;
  poisonDamageAtStart: number;
  poisonRemainingAtStart: number;
  speedReplaced: boolean;
  poisonReplaced: boolean;
}

export function simulateTrial(
  maze: Maze,
  actions: readonly Direction[],
  initial: Partial<InitialState> = {}
): SimulationResult {
  const mechanisms = maze.mechanisms ?? mechanismPreset("basic");
  const health = initial.health ?? 5;
  const state: TrialState = {
    position: structuredClone(maze.entry),
    health,
    healthMax: initial.healthMax ?? health,
    keys: initial.keys ?? 0,
    keysByMaterial: emptyMaterialCounts(initial.keysByMaterial),
    treasures: initial.treasures ?? 0,
    treasuresByType: emptyTreasureCounts(initial.treasuresByType),
    elapsedTime: initial.elapsedTime ?? 0,
    speed: initial.speed ?? "normal",
    speedRemaining: initial.speedRemaining ?? 0,
    poisonDamage: initial.poisonDamage ?? 0,
    poisonRemaining: initial.poisonRemaining ?? 0,
    alive: health > 0,
    reachedGoal: false,
    openedDoors: [],
    collectedKeys: [],
    openedChests: [],
    triggeredTraps: [],
    usedMedicines: [],
    usedPotions: []
  };
  const trace: TrialTraceItem[] = [];

  for (let index = 0; index < actions.length; index += 1) {
    const direction = actions[index];
    if (!direction) continue;
    const before = cloneState(state);
    const events: TrialEvent[] = [];
    if (!state.alive) {
      trace.push({ step: index + 1, direction, before, moved: false, reason: "dead", events, after: cloneState(state) });
      continue;
    }

    const context: StatusContext = {
      speedAtStart: state.speed,
      speedRemainingAtStart: state.speedRemaining,
      poisonDamageAtStart: state.poisonDamage,
      poisonRemainingAtStart: state.poisonRemaining,
      speedReplaced: false,
      poisonReplaced: false
    };
    const timeCost = mechanisms.movementTime[context.speedAtStart];
    state.elapsedTime += timeCost;
    const delta = DELTAS[direction];
    const target = cell(state.position.row + delta.row, state.position.col + delta.col);
    let moved = false;
    let reason: TrialTraceItem["reason"] = null;

    if (terrainAt(maze, target) !== ".") {
      reason = "wall-or-outside";
    } else {
      const door = maze.doors.find((item) => cellKey(item.position) === cellKey(target));
      if (door && !state.openedDoors.includes(door.id)) {
        if (door.material) {
          if (state.keysByMaterial[door.material] < 1) {
            reason = "closed-door-without-matching-key";
          } else {
            state.keysByMaterial[door.material] -= 1;
            state.openedDoors.push(door.id);
            events.push({ type: "open-door", id: door.id, material: door.material, keyCost: 1, timeCost });
          }
        } else if (state.keys < 1) {
          reason = "closed-door-without-key";
        } else {
          state.keys -= 1;
          state.openedDoors.push(door.id);
          events.push({ type: "open-door", id: door.id, keyCost: 1, timeCost });
        }
      }
      if (!reason) {
        state.position = target;
        moved = true;
        applyCellObjects(maze, state, events, context);
        if (cellKey(state.position) === cellKey(maze.goal) && !state.reachedGoal) {
          state.reachedGoal = true;
          events.push({ type: "reach-goal" });
        }
      }
    }

    finishStatuses(state, events, context);
    trace.push({ step: index + 1, direction, before, moved, reason, events, after: cloneState(state) });
  }

  const blockedMoves = trace.filter((item) => !item.moved).length;
  const blockedAfterDeath = trace.filter((item) => item.reason === "dead").length;
  return {
    state,
    trace,
    answers: {
      finalPosition: letterNumberCoordinate(state.position),
      keys: state.keys + totalMaterialKeys(state.keysByMaterial),
      keysByMaterial: structuredClone(state.keysByMaterial),
      treasures: state.treasures,
      treasuresByType: structuredClone(state.treasuresByType),
      health: state.health,
      alive: state.alive,
      reachedGoal: state.reachedGoal,
      openedDoors: state.openedDoors.length,
      openedChests: state.openedChests.length,
      triggeredTraps: state.triggeredTraps.length,
      usedMedicines: state.usedMedicines.length,
      usedPotions: state.usedPotions.length,
      elapsedTime: state.elapsedTime,
      finalSpeed: state.speed,
      speedRemaining: state.speedRemaining,
      poisonDamage: state.poisonDamage,
      poisonRemaining: state.poisonRemaining,
      blockedMoves,
      blockedAfterDeath
    }
  };
}

function applyCellObjects(
  maze: Maze,
  state: TrialState,
  events: TrialEvent[],
  context: StatusContext
): void {
  const object = maze.objects.find((item) => cellKey(item.position) === cellKey(state.position));
  if (!object) return;
  if (object.type === "key" && !state.collectedKeys.includes(object.id)) {
    state.collectedKeys.push(object.id);
    if (object.material) state.keysByMaterial[object.material] += 1;
    else state.keys += 1;
    events.push({
      type: "collect-key",
      id: object.id,
      ...(object.material ? { material: object.material } : {})
    });
    return;
  }
  if (object.type === "chest" && !state.openedChests.includes(object.id)) {
    let canOpen = false;
    if (object.lockMaterial) {
      canOpen = state.keysByMaterial[object.lockMaterial] > 0;
      if (canOpen) state.keysByMaterial[object.lockMaterial] -= 1;
    } else {
      canOpen = state.keys > 0;
      if (canOpen) state.keys -= 1;
    }
    if (!canOpen) {
      events.push({
        type: "pass-closed-chest",
        id: object.id,
        ...(object.lockMaterial ? { material: object.lockMaterial } : {})
      });
      return;
    }
    state.openedChests.push(object.id);
    const contents = object.contents?.length > 0
      ? object.contents
      : [{ type: "treasure" as const, count: object.treasures }];
    for (const content of contents) {
      state.treasures += content.count;
      state.treasuresByType[content.type] += content.count;
    }
    events.push({
      type: "open-chest",
      id: object.id,
      ...(object.lockMaterial ? { material: object.lockMaterial } : {}),
      keyCost: 1,
      treasures: object.treasures,
      contents: structuredClone(contents)
    });
    return;
  }
  if (object.type === "trap" && !state.triggeredTraps.includes(object.id)) {
    state.triggeredTraps.push(object.id);
    state.health = Math.max(0, state.health - object.damage);
    events.push({ type: "trigger-trap", id: object.id, damage: object.damage });
    return;
  }
  if (object.type === "medicine" && !state.usedMedicines.includes(object.id)) {
    state.usedMedicines.push(object.id);
    const before = state.health;
    state.health = Math.min(state.healthMax, state.health + object.recovery);
    events.push({ type: "use-medicine", id: object.id, recovery: state.health - before });
    return;
  }
  if (object.type === "potion" && !state.usedPotions.includes(object.id)) {
    state.usedPotions.push(object.id);
    applyPotion(state, object, context);
    const recovery = object.kind === "healing" ? object.potency ?? 1 : undefined;
    const damage = object.kind === "poison" ? object.potency ?? maze.mechanisms.poisonDamage : undefined;
    events.push({
      type: "drink-potion",
      id: object.id,
      potionKind: object.kind,
      ...(recovery === undefined ? {} : { recovery }),
      ...(damage === undefined ? {} : { damage }),
      ...(object.duration === undefined ? {} : { duration: object.duration })
    });
  }
}

function applyPotion(state: TrialState, potion: PotionObject, context: StatusContext): void {
  if (potion.kind === "healing") {
    state.health = Math.min(state.healthMax, state.health + (potion.potency ?? 1));
  } else if (potion.kind === "poison") {
    state.poisonDamage = potion.potency ?? 1;
    state.poisonRemaining = potion.duration ?? 1;
    context.poisonReplaced = true;
  } else if (potion.kind === "antidote") {
    state.poisonDamage = 0;
    state.poisonRemaining = 0;
    context.poisonReplaced = true;
  } else if (potion.kind === "haste") {
    state.speed = "fast";
    state.speedRemaining = potion.duration ?? 1;
    context.speedReplaced = true;
  } else {
    state.speed = "slow";
    state.speedRemaining = potion.duration ?? 1;
    context.speedReplaced = true;
  }
}

function finishStatuses(state: TrialState, events: TrialEvent[], context: StatusContext): void {
  if (!context.poisonReplaced && context.poisonRemainingAtStart > 0) {
    state.health = Math.max(0, state.health - context.poisonDamageAtStart);
    state.poisonRemaining = context.poisonRemainingAtStart - 1;
    state.poisonDamage = state.poisonRemaining > 0 ? context.poisonDamageAtStart : 0;
    events.push({ type: "poison-tick", damage: context.poisonDamageAtStart });
  }
  if (!context.speedReplaced && context.speedRemainingAtStart > 0) {
    state.speedRemaining = context.speedRemainingAtStart - 1;
    if (state.speedRemaining === 0) {
      state.speed = "normal";
      events.push({ type: "speed-expired" });
    }
  }
  if (state.health <= 0 && state.alive) {
    state.health = 0;
    state.alive = false;
    events.push({ type: "die" });
  }
}

function cloneState(state: TrialState): TrialState {
  return structuredClone(state);
}

export function stateKey(state: TrialState): string {
  return JSON.stringify({
    position: state.position,
    health: state.health,
    keys: state.keys,
    keysByMaterial: state.keysByMaterial,
    treasures: state.treasures,
    treasuresByType: state.treasuresByType,
    elapsedTime: state.elapsedTime,
    speed: state.speed,
    speedRemaining: state.speedRemaining,
    poisonDamage: state.poisonDamage,
    poisonRemaining: state.poisonRemaining,
    alive: state.alive,
    reachedGoal: state.reachedGoal,
    openedDoors: state.openedDoors,
    collectedKeys: state.collectedKeys,
    openedChests: state.openedChests,
    triggeredTraps: state.triggeredTraps,
    usedMedicines: state.usedMedicines,
    usedPotions: state.usedPotions
  });
}

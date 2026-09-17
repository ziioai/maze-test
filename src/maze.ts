import { cell, cellKey, neighbors, sameCell } from "./coordinates.js";
import { mechanismPreset } from "./mechanisms.js";
import type {
  Cell,
  ChestObject,
  DecorateMazeOptions,
  GenerateMazeOptions,
  KeyObject,
  Maze,
  MazeMetrics,
  MazeObject,
  MazeValidation,
  MedicineObject,
  PotionObject,
  TrapObject
} from "./types.js";

export function generateSolidCellMaze(options: GenerateMazeOptions = {}): Maze {
  const rows = oddDimension(options.rows ?? 15, "rows");
  const cols = oddDimension(options.cols ?? 15, "cols");
  const seed = integerOption(options.seed ?? 1, "seed", 0);
  const requestedSeed = integerOption(options.requestedSeed ?? seed, "requestedSeed", 0);
  const braid = numberOption(options.braid ?? 0, "braid", 0, 1);
  const mechanisms = options.mechanisms ?? mechanismPreset("basic");
  const rng = mulberry32(seed);
  const grid = Array.from({ length: rows }, () => Array<string>(cols).fill("#"));
  const logicalCells: Cell[] = [];

  for (let row = 1; row < rows - 1; row += 2) {
    for (let col = 1; col < cols - 1; col += 2) logicalCells.push({ row, col });
  }

  const start = logicalCells[randomInt(rng, logicalCells.length)];
  if (!start) throw new Error("The maze has no logical cells.");
  const visited = new Set([cellKey(start)]);
  const stack = [start];
  grid[start.row]![start.col] = ".";

  while (stack.length > 0) {
    const current = stack.at(-1);
    if (!current) break;
    const choices = shuffle(
      rng,
      logicalNeighbors(current, rows, cols).filter((item) => !visited.has(cellKey(item)))
    );
    const next = choices[0];
    if (!next) {
      stack.pop();
      continue;
    }
    grid[(current.row + next.row) / 2]![(current.col + next.col) / 2] = ".";
    grid[next.row]![next.col] = ".";
    visited.add(cellKey(next));
    stack.push(next);
  }

  braidDeadEnds(grid, braid, rng);
  const terrain = grid.map((row) => row.join(""));
  const first = farthestFloor(cell(2, 2), terrain).cell;
  const second = farthestFloor(first, terrain).cell;
  const maze: Maze = {
    schemaVersion: "solid-cell-maze-v4@1",
    id: options.id ?? `solid-maze-${rows}x${cols}-${requestedSeed}`,
    seed,
    requestedSeed,
    rows,
    cols,
    braid,
    coordinateSystem: {
      origin: "top-left",
      columns: "letters-left-to-right",
      rows: "numbers-top-to-bottom"
    },
    mechanisms: structuredClone(mechanisms),
    terrain,
    entry: first,
    goal: second,
    doors: [],
    objects: [],
    metrics: emptyMetrics(rows, cols)
  };
  maze.metrics = analyzeSolidCellMaze(maze);
  return maze;
}

export function decorateSolidCellMaze(maze: Maze, options: DecorateMazeOptions = {}): Maze {
  const result = structuredClone(maze);
  const mechanisms = options.mechanisms ?? maze.mechanisms ?? mechanismPreset("basic");
  result.mechanisms = structuredClone(mechanisms);
  const decorationSeed = integerOption(options.seed ?? maze.seed + 71_311, "decoration seed", 0);
  const rng = mulberry32(decorationSeed);
  const mainPath = shortestPath(result, result.entry, result.goal);
  const occupied = new Set([cellKey(result.entry), cellKey(result.goal)]);
  const doorCount = integerOption(
    options.doorCount ?? Math.max(1, Math.floor(result.metrics.floorCells / 120)),
    "doorCount",
    0
  );
  const chestCount = integerOption(options.chestCount ?? 2, "chestCount", 0);
  const trapCount = integerOption(options.trapCount ?? 2, "trapCount", 0);
  const potionCount = integerOption(
    options.potionCount ?? options.medicineCount ?? 2,
    "potionCount",
    0
  );
  const doorIndices = selectGatingDoorIndices(result, mainPath, doorCount);

  result.doors = doorIndices.map((index, doorIndex) => {
    const position = mainPath[index];
    if (!position) throw new Error(`No path cell exists at door index ${index}.`);
    occupied.add(cellKey(position));
    const material = cyclicValue(mechanisms.keyMaterials, doorIndex + decorationSeed);
    return {
      id: `door-${doorIndex + 1}`,
      position,
      state: "closed" as const,
      ...(material ? { material } : {})
    };
  });

  const objects: MazeObject[] = [];
  for (let index = 0; index < result.doors.length; index += 1) {
    const doorIndex = doorIndices[index];
    if (doorIndex === undefined) throw new Error("Door index mismatch.");
    const preferredIndex = Math.max(1, Math.floor(doorIndex * 0.55));
    const position = freePathCellBefore(mainPath, preferredIndex, occupied);
    occupied.add(cellKey(position));
    const door = result.doors[index];
    const key: KeyObject = {
      id: `key-${index + 1}`,
      type: "key",
      position,
      ...(door?.material ? { material: door.material } : {})
    };
    objects.push(key);
  }

  const degrees = degreeMap(result);
  const deadEnds = shuffle(
    rng,
    floorCells(result).filter(
      (item) => degrees.get(cellKey(item)) === 1 && !occupied.has(cellKey(item))
    )
  );

  for (let index = 0; index < chestCount; index += 1) {
    const position = takeFree(deadEnds, result, occupied, rng, "chest");
    occupied.add(cellKey(position));
    const treasureType = cyclicValue(mechanisms.treasureTypes, index + decorationSeed);
    if (!treasureType) throw new Error("At least one treasure type is required.");
    const count = 1 + (index % 3);
    const lockMaterial = cyclicValue(mechanisms.keyMaterials, index + decorationSeed + 1);
    const chest: ChestObject = {
      id: `chest-${index + 1}`,
      type: "chest",
      position,
      treasures: count,
      contents: [{ type: treasureType, count }],
      ...(lockMaterial ? { lockMaterial } : {})
    };
    objects.push(chest);
  }

  const trapCandidates = shuffle(rng, mainPath.slice(2, -2));
  for (let index = 0; index < trapCount; index += 1) {
    const position = takeFree(trapCandidates, result, occupied, rng, "trap");
    occupied.add(cellKey(position));
    const trap: TrapObject = {
      id: `trap-${index + 1}`,
      type: "trap",
      position,
      damage: mechanisms.trapDamages[index % mechanisms.trapDamages.length] ?? 1
    };
    objects.push(trap);
  }

  const potionCandidates = shuffle(rng, floorCells(result));
  for (let index = 0; index < potionCount; index += 1) {
    const position = takeFree(potionCandidates, result, occupied, rng, "potion");
    occupied.add(cellKey(position));
    if (
      mechanisms.complexity === "basic" &&
      mechanisms.potionKinds.length === 1 &&
      mechanisms.potionKinds[0] === "healing"
    ) {
      const medicine: MedicineObject = {
        id: `medicine-${index + 1}`,
        type: "medicine",
        position,
        recovery: 1
      };
      objects.push(medicine);
      continue;
    }
    const kind = mechanisms.potionKinds[index % mechanisms.potionKinds.length];
    if (!kind) throw new Error("At least one potion kind is required.");
    const potion: PotionObject = {
      id: `potion-${index + 1}`,
      type: "potion",
      position,
      kind,
      ...(kind === "healing" ? { potency: 1 + (index % 2) } : {}),
      ...(kind === "poison"
        ? { potency: mechanisms.poisonDamage, duration: mechanisms.poisonDuration }
        : {}),
      ...(kind === "haste" || kind === "slow"
        ? { duration: mechanisms.speedDuration }
        : {})
    };
    objects.push(potion);
  }

  result.objects = objects;
  result.metrics = analyzeSolidCellMaze(result);
  return result;
}

export function analyzeSolidCellMaze(maze: Maze): MazeMetrics {
  assertShape(maze);
  const floors = floorCells(maze);
  const graph = adjacency(maze);
  const distances = bfsDistances(maze.entry, graph);
  const degreeValues = [...graph.values()].map((items) => items.length);
  const edgeCount = degreeValues.reduce((sum, value) => sum + value, 0) / 2;
  const mainPath = shortestPathInGraph(graph, maze.entry, maze.goal);
  const entryGoalSeparators = separatingCellKeys(graph, maze.entry, maze.goal);
  const objectCounts: Partial<Record<MazeObject["type"], number>> = {};
  for (const object of maze.objects ?? []) {
    objectCounts[object.type] = (objectCounts[object.type] ?? 0) + 1;
  }
  return {
    totalCells: maze.rows * maze.cols,
    wallCells: maze.rows * maze.cols - floors.length,
    floorCells: floors.length,
    connectedFloorCells: distances.size,
    connected: distances.size === floors.length,
    floorAdjacencyEdges: edgeCount,
    independentCycles: edgeCount - floors.length + 1,
    deadEnds: degreeValues.filter((value) => value === 1).length,
    junctions: degreeValues.filter((value) => value >= 3).length,
    entryGoalDistance: mainPath.length > 0 ? mainPath.length - 1 : null,
    doorCount: maze.doors.length,
    gatingDoorCount: maze.doors.filter(
      (door) => entryGoalSeparators.has(cellKey(door.position))
    ).length,
    objectCounts
  };
}

export function validateSolidCellMaze(maze: Maze): MazeValidation {
  const errors: string[] = [];
  try {
    assertShape(maze);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      metrics: null
    };
  }

  for (let row = 1; row <= maze.rows; row += 1) {
    for (let col = 1; col <= maze.cols; col += 1) {
      const value = terrainAt(maze, cell(row, col));
      if (value !== "#" && value !== ".") errors.push(`Invalid terrain at ${row},${col}: ${value}`);
      if (
        (row === 1 || row === maze.rows || col === 1 || col === maze.cols) &&
        value !== "#"
      ) {
        errors.push(`The outer boundary is not a wall at ${row},${col}.`);
      }
    }
  }

  if (!isFloor(maze, maze.entry)) errors.push("The entry is not on a floor cell.");
  if (!isFloor(maze, maze.goal)) errors.push("The goal is not on a floor cell.");
  if (sameCell(maze.entry, maze.goal)) errors.push("The entry and goal overlap.");
  const occupied = new Set([cellKey(maze.entry), cellKey(maze.goal)]);

  for (const door of maze.doors) {
    if (!isFloor(maze, door.position)) errors.push(`${door.id} is not on a floor cell.`);
    const key = cellKey(door.position);
    if (occupied.has(key)) errors.push(`${door.id} overlaps another feature.`);
    occupied.add(key);
  }
  for (const object of maze.objects) {
    if (!isFloor(maze, object.position)) errors.push(`${object.id} is not on a floor cell.`);
    const key = cellKey(object.position);
    if (occupied.has(key)) errors.push(`${object.id} overlaps another feature.`);
    occupied.add(key);
  }

  const metrics = analyzeSolidCellMaze(maze);
  if (!metrics.connected) {
    errors.push(`Floor cells are disconnected: ${metrics.connectedFloorCells}/${metrics.floorCells}.`);
  }
  if (metrics.deadEnds === 0) errors.push("The maze has no dead ends.");
  if (metrics.junctions === 0) errors.push("The maze has no junctions.");
  if (metrics.gatingDoorCount !== metrics.doorCount) {
    errors.push(`${metrics.doorCount - metrics.gatingDoorCount} door(s) can be bypassed.`);
  }

  const path = shortestPath(maze, maze.entry, maze.goal);
  const pathIndex = new Map(path.map((item, index) => [cellKey(item), index]));
  for (let index = 0; index < maze.doors.length; index += 1) {
    const door = maze.doors[index];
    if (!door) continue;
    const key = maze.objects.find((item) => item.id === `key-${index + 1}`);
    const doorIndex = pathIndex.get(cellKey(door.position));
    const keyIndex = key ? pathIndex.get(cellKey(key.position)) : undefined;
    if (!key) errors.push(`Missing a key for ${door.id}.`);
    else if (keyIndex === undefined || doorIndex === undefined || keyIndex >= doorIndex) {
      errors.push(`${key.id} is not before ${door.id} on the main path.`);
    } else if (door.material !== (key.type === "key" ? key.material : undefined)) {
      errors.push(`${key.id} does not match the material of ${door.id}.`);
    }
  }
  return { valid: errors.length === 0, errors, metrics };
}

export function shortestPath(
  maze: Pick<Maze, "rows" | "cols" | "terrain">,
  start: Cell,
  goal: Cell,
  excludedCell: Cell | null = null
): Cell[] {
  if (excludedCell && (sameCell(start, excludedCell) || sameCell(goal, excludedCell))) return [];
  const graph = adjacency(maze, excludedCell);
  return shortestPathInGraph(graph, start, goal);
}

function shortestPathInGraph(graph: Map<string, Cell[]>, start: Cell, goal: Cell): Cell[] {
  const queue = [start];
  const parent = new Map<string, string | null>([[cellKey(start), null]]);
  const values = new Map([[cellKey(start), start]]);
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!current) break;
    if (sameCell(current, goal)) break;
    for (const next of graph.get(cellKey(current)) ?? []) {
      const key = cellKey(next);
      if (parent.has(key)) continue;
      parent.set(key, cellKey(current));
      values.set(key, next);
      queue.push(next);
    }
  }
  if (!parent.has(cellKey(goal))) return [];
  const path: Cell[] = [];
  let cursor: string | null = cellKey(goal);
  while (cursor !== null) {
    const value = values.get(cursor);
    if (!value) throw new Error(`Could not reconstruct path at ${cursor}.`);
    path.push(value);
    cursor = parent.get(cursor) ?? null;
  }
  return path.reverse();
}

export function terrainAt(
  maze: Pick<Maze, "rows" | "cols" | "terrain">,
  value: Cell
): string | null {
  if (value.row < 1 || value.row > maze.rows || value.col < 1 || value.col > maze.cols) {
    return null;
  }
  return maze.terrain[value.row - 1]?.[value.col - 1] ?? null;
}

export function isFloor(maze: Pick<Maze, "rows" | "cols" | "terrain">, value: Cell): boolean {
  return terrainAt(maze, value) === ".";
}

function braidDeadEnds(grid: string[][], braid: number, rng: () => number): void {
  if (braid <= 0) return;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const logicalCells: Cell[] = [];
  for (let row = 1; row < rows - 1; row += 2) {
    for (let col = 1; col < cols - 1; col += 2) logicalCells.push({ row, col });
  }
  const deadEnds = shuffle(
    rng,
    logicalCells.filter((value) => openLogicalNeighbors(grid, value).length === 1)
  );
  for (const current of deadEnds) {
    if (rng() > braid) continue;
    const closed = shuffle(
      rng,
      logicalNeighbors(current, rows, cols).filter(
        (next) => grid[(current.row + next.row) / 2]?.[(current.col + next.col) / 2] === "#"
      )
    );
    const next = closed[0];
    if (!next) continue;
    grid[(current.row + next.row) / 2]![(current.col + next.col) / 2] = ".";
  }
}

function openLogicalNeighbors(grid: string[][], current: Cell): Cell[] {
  return logicalNeighbors(current, grid.length, grid[0]?.length ?? 0).filter(
    (next) => grid[(current.row + next.row) / 2]?.[(current.col + next.col) / 2] === "."
  );
}

function logicalNeighbors(value: Cell, rows: number, cols: number): Cell[] {
  return [
    { row: value.row - 2, col: value.col },
    { row: value.row + 2, col: value.col },
    { row: value.row, col: value.col - 2 },
    { row: value.row, col: value.col + 2 }
  ].filter((item) => item.row >= 1 && item.row < rows - 1 && item.col >= 1 && item.col < cols - 1);
}

function farthestFloor(start: Cell, terrain: string[]): { cell: Cell; distance: number } {
  const maze = { rows: terrain.length, cols: terrain[0]?.length ?? 0, terrain };
  const graph = adjacency(maze);
  const distances = bfsDistances(start, graph);
  let farthest = start;
  let distance = -1;
  for (const [key, value] of distances) {
    if (value <= distance) continue;
    distance = value;
    farthest = parseCellKey(key);
  }
  return { cell: farthest, distance };
}

function floorCells(maze: Pick<Maze, "rows" | "cols" | "terrain">): Cell[] {
  const values: Cell[] = [];
  for (let row = 1; row <= maze.rows; row += 1) {
    for (let col = 1; col <= maze.cols; col += 1) {
      if (isFloor(maze, cell(row, col))) values.push(cell(row, col));
    }
  }
  return values;
}

function adjacency(
  maze: Pick<Maze, "rows" | "cols" | "terrain">,
  excludedCell: Cell | null = null
): Map<string, Cell[]> {
  const floors = floorCells(maze).filter((item) => !excludedCell || !sameCell(item, excludedCell));
  const floorKeys = new Set(floors.map(cellKey));
  return new Map(
    floors.map((item) => [
      cellKey(item),
      neighbors(item, maze.rows, maze.cols).filter((next) => floorKeys.has(cellKey(next)))
    ])
  );
}

function bfsDistances(start: Cell, graph: Map<string, Cell[]>): Map<string, number> {
  const distances = new Map([[cellKey(start), 0]]);
  const queue = [start];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!current) break;
    const distance = distances.get(cellKey(current));
    if (distance === undefined) continue;
    for (const next of graph.get(cellKey(current)) ?? []) {
      const key = cellKey(next);
      if (distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push(next);
    }
  }
  return distances;
}

function degreeMap(maze: Maze): Map<string, number> {
  return new Map([...adjacency(maze)].map(([key, values]) => [key, values.length]));
}

function selectGatingDoorIndices(maze: Maze, mainPath: Cell[], count: number): number[] {
  if (count === 0) return [];
  const graph = adjacency(maze);
  const separators = separatingCellKeys(graph, maze.entry, maze.goal);
  const candidates: number[] = [];
  for (let index = 3; index < mainPath.length - 3; index += 1) {
    const pathCell = mainPath[index];
    if (!pathCell) continue;
    const key = cellKey(pathCell);
    if ((graph.get(key)?.length ?? 0) === 2 && separators.has(key)) candidates.push(index);
  }
  if (candidates.length < count) {
    throw new Error(`Only ${candidates.length} non-bypassable path cells are available for ${count} doors.`);
  }
  const targets = spacedIndices(mainPath.length - 1, count, 0.28, 0.78);
  const selected: number[] = [];
  for (const target of targets) {
    const available = candidates.filter((index) => !selected.includes(index));
    available.sort(
      (left, right) => Math.abs(left - target) - Math.abs(right - target) || left - right
    );
    const candidate = available[0];
    if (candidate === undefined) throw new Error(`Could not place ${count} doors.`);
    selected.push(candidate);
  }
  if (selected.length !== count) throw new Error(`Could not space ${count} doors along the main path.`);
  return selected.sort((left, right) => left - right);
}

function separatingCellKeys(
  graph: Map<string, Cell[]>,
  start: Cell,
  goal: Cell
): Set<string> {
  const startKey = cellKey(start);
  const goalKey = cellKey(goal);
  if (!graph.has(startKey) || !graph.has(goalKey)) return new Set();

  const discovered = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>([[startKey, null]]);
  const stack: Array<{ key: string; nextNeighbor: number }> = [
    { key: startKey, nextNeighbor: 0 }
  ];
  let order = 1;
  discovered.set(startKey, order);
  low.set(startKey, order);

  while (stack.length > 0) {
    const frame = stack.at(-1);
    if (!frame) break;
    const adjacent = graph.get(frame.key) ?? [];
    const next = adjacent[frame.nextNeighbor];
    if (next) {
      frame.nextNeighbor += 1;
      const nextKey = cellKey(next);
      if (!discovered.has(nextKey)) {
        order += 1;
        discovered.set(nextKey, order);
        low.set(nextKey, order);
        parent.set(nextKey, frame.key);
        stack.push({ key: nextKey, nextNeighbor: 0 });
        continue;
      }
      if (nextKey !== parent.get(frame.key)) {
        low.set(frame.key, Math.min(low.get(frame.key) ?? order, discovered.get(nextKey) ?? order));
      }
      continue;
    }

    stack.pop();
    const parentKey = parent.get(frame.key);
    if (parentKey) {
      low.set(parentKey, Math.min(low.get(parentKey) ?? order, low.get(frame.key) ?? order));
    }
  }

  if (!discovered.has(goalKey)) return new Set();
  const separators = new Set<string>();
  let childKey = goalKey;
  while (childKey !== startKey) {
    const parentKey = parent.get(childKey);
    if (!parentKey) break;
    if (
      parentKey !== startKey &&
      (low.get(childKey) ?? Number.POSITIVE_INFINITY) >=
        (discovered.get(parentKey) ?? Number.NEGATIVE_INFINITY)
    ) {
      separators.add(parentKey);
    }
    childKey = parentKey;
  }
  return separators;
}

function freePathCellBefore(mainPath: Cell[], preferredIndex: number, occupied: Set<string>): Cell {
  for (let distance = 0; distance < mainPath.length; distance += 1) {
    for (const index of [preferredIndex - distance, preferredIndex + distance]) {
      if (index <= 0 || index >= mainPath.length - 1) continue;
      const candidate = mainPath[index];
      if (candidate && !occupied.has(cellKey(candidate))) return candidate;
    }
  }
  throw new Error("There is no free path cell on which to place a key.");
}

function takeFree(
  candidates: Cell[],
  maze: Maze,
  occupied: Set<string>,
  rng: () => number,
  type: string
): Cell {
  while (candidates.length > 0) {
    const value = candidates.shift();
    if (value && !occupied.has(cellKey(value))) return value;
  }
  const fallback = shuffle(rng, floorCells(maze)).find((item) => !occupied.has(cellKey(item)));
  if (!fallback) throw new Error(`There are not enough free floor cells to place ${type}.`);
  return fallback;
}

function spacedIndices(
  edgeCount: number,
  count: number,
  startRatio: number,
  endRatio: number
): number[] {
  if (count === 0) return [];
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const ratio =
      count === 1
        ? (startRatio + endRatio) / 2
        : startRatio + ((endRatio - startRatio) * index) / (count - 1);
    values.push(Math.max(2, Math.min(edgeCount - 2, Math.floor(edgeCount * ratio))));
  }
  return [...new Set(values)];
}

function parseCellKey(key: string): Cell {
  const [row, col] = key.split(",").map(Number);
  if (row === undefined || col === undefined) throw new Error(`Invalid cell key: ${key}`);
  return cell(row, col);
}

function assertShape(maze: Pick<Maze, "rows" | "cols" | "terrain">): void {
  oddDimension(maze.rows, "rows");
  oddDimension(maze.cols, "cols");
  if (!Array.isArray(maze.terrain) || maze.terrain.length !== maze.rows) {
    throw new Error("The terrain row count does not match rows.");
  }
  if (maze.terrain.some((row) => typeof row !== "string" || row.length !== maze.cols)) {
    throw new Error("A terrain row does not match cols.");
  }
}

function oddDimension(value: number, name: string): number {
  integerOption(value, name, 7);
  if (value % 2 === 0) throw new Error(`${name} must be odd.`);
  return value;
}

function integerOption(value: number, name: string, minimum: number): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
  return value;
}

function numberOption(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function randomInt(rng: () => number, maximum: number): number {
  return Math.floor(rng() * maximum);
}

function shuffle<T>(rng: () => number, input: readonly T[]): T[] {
  const values = [...input];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = randomInt(rng, index + 1);
    const prior = values[index];
    const replacement = values[target];
    if (prior === undefined || replacement === undefined) continue;
    values[index] = replacement;
    values[target] = prior;
  }
  return values;
}

function cyclicValue<T>(values: readonly T[], index: number): T | undefined {
  if (values.length === 0) return undefined;
  return values[((index % values.length) + values.length) % values.length];
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function emptyMetrics(rows: number, cols: number): MazeMetrics {
  return {
    totalCells: rows * cols,
    wallCells: rows * cols,
    floorCells: 0,
    connectedFloorCells: 0,
    connected: false,
    floorAdjacencyEdges: 0,
    independentCycles: 0,
    deadEnds: 0,
    junctions: 0,
    entryGoalDistance: null,
    doorCount: 0,
    gatingDoorCount: 0,
    objectCounts: {}
  };
}

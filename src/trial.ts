import { cell, columnLabel, letterNumberCoordinate } from "./coordinates.js";
import {
  decorateSolidCellMaze,
  generateSolidCellMaze,
  shortestPath,
  terrainAt,
  validateSolidCellMaze
} from "./maze.js";
import { simulateTrial } from "./simulator.js";
import type {
  Cell,
  Direction,
  InitialState,
  Language,
  Maze,
  MazeTrial,
  ResolvedTrialOptions,
  ScenarioKind,
  TrialAnswers,
  TrialOptions,
  TrialSections
} from "./types.js";

const DIRECTIONS: Record<Direction, { en: string; zh: string }> = {
  up: { en: "up", zh: "上" },
  down: { en: "down", zh: "下" },
  left: { en: "left", zh: "左" },
  right: { en: "right", zh: "右" }
};

const ENGLISH_RULES = [
  "The explorer can move only one cell at a time to an orthogonally adjacent cell. An instruction to move several cells is executed as that many consecutive one-cell moves.",
  "If the next cell is a wall or outside the map, the explorer stays in place, and the remaining actions continue.",
  "A closed door occupies a whole cell. To enter it, the explorer must spend one key; the door then stays open. Without a key, the explorer stays in place.",
  "The first time the explorer enters a cell containing a key, they collect it. A key cannot be collected twice.",
  "The first time the explorer enters a cell containing an unopened chest, one key is spent to open it if a key is available. Without a key, the explorer may pass through but does not open the chest.",
  "A trap removes one health point the first time it is entered and has no effect afterward.",
  "A medicine room restores one health point the first time it is entered, without exceeding maximum health, and has no effect afterward.",
  "When health reaches zero, the explorer dies. All remaining moves are still read but cannot change any state.",
  "Once the explorer enters the goal cell, reached-goal remains true even if the explorer later leaves it."
];

const CHINESE_RULES = [
  "探险者每次只能向上、下、左、右相邻的一格移动；“向某方向移动若干格”依次执行相应次数的单格移动。",
  "如果一次移动的目标是墙格或超出地图，探险者停在原地，但后续行动仍然继续。",
  "门占据一个完整格子。目标格是关闭的门时，探险者若持有钥匙，就消耗一把钥匙、打开该门并进入门格；没有钥匙则停在原地。已经打开的门可以直接进入。",
  "探险者第一次进入某把钥匙所在的格子时取得该钥匙，钥匙数增加一；同一把钥匙不能重复取得。",
  "探险者第一次进入尚未打开的宝箱格且持有钥匙时，消耗一把钥匙、打开宝箱并取得其中全部宝物；没有钥匙时可以经过该格，但不能打开宝箱。",
  "探险者第一次进入某个陷阱格时减少一点健康值；同一陷阱以后不再生效。",
  "仍然存活的探险者第一次进入某个药品房时恢复一点健康值，但不得超过健康上限；同一药品房以后不再生效。",
  "健康值降为零时探险者死亡。死亡以后，所有尚未执行的移动都不再改变任何状态。",
  "探险者一旦进入终点格，就把“曾经到达终点”记录为真；以后即使离开终点，该记录仍然保持为真。"
];

const ENGLISH_QUESTIONS = [
  "Which cell is the explorer in after all actions are complete?",
  "How many keys does the explorer have at the end?",
  "How many treasures has the explorer collected at the end?",
  "How many health points does the explorer have at the end?",
  "Is the explorer alive at the end?",
  "Did the explorer ever reach the goal?",
  "How many doors were opened?",
  "How many chests were opened?",
  "How many traps were triggered?",
  "How many medicine rooms were used?",
  "How many individual moves did not change the explorer's position?"
];

const CHINESE_QUESTIONS = [
  "全部行动结束后，探险者位于哪一格？",
  "探险者最后持有几把钥匙？",
  "探险者最后取得了几件宝物？",
  "探险者最后还剩几点健康值？",
  "探险者最后是否仍然存活？",
  "行动过程中，探险者是否曾经到达终点？",
  "行动过程中一共打开了几道门？",
  "行动过程中一共打开了几只宝箱？",
  "行动过程中一共触发了几个陷阱？",
  "行动过程中一共使用了几个药品房？",
  "行动过程中共有多少次移动没有改变探险者的位置？"
];

export function generateTrial(options: TrialOptions = {}): MazeTrial {
  const resolved = resolveTrialOptions(options);
  const maze = selectMaze(resolved);
  const plan = buildScenarioPlan(maze, resolved.scenario);
  const result = simulateTrial(maze, plan.actions, plan.initialState);
  verifyScenario(resolved.scenario, result.answers, maze);
  const sections: TrialSections = {
    map: renderMapDescription(maze, plan.initialState, resolved.language, resolved.style),
    rules: renderRules(resolved.language),
    actions: renderActionDescription(plan.actions, resolved.language, resolved.style),
    questions: renderQuestions(resolved.language)
  };
  const question = renderQuestion(resolved, maze, sections);
  const answer = renderAnswer(resolved, maze, result.answers, plan.actions.length);
  return {
    schemaVersion: "maze-test-trial@1",
    options: resolved,
    maze,
    initialState: plan.initialState,
    actions: plan.actions,
    sections,
    question,
    answer,
    result
  };
}

export function generateQuestion(options: TrialOptions = {}): string {
  return generateTrial(options).question;
}

export function generateAnswer(options: TrialOptions = {}): string {
  return generateTrial(options).answer;
}

export function resolveTrialOptions(options: TrialOptions = {}): ResolvedTrialOptions {
  const scenario = options.scenario ?? "success";
  const language = options.language ?? "en";
  if (!["success", "treasure-and-leave", "death-and-stop"].includes(scenario)) {
    throw new Error(`Unknown scenario: ${scenario}`);
  }
  if (language !== "en" && language !== "zh") throw new Error(`Unknown language: ${language}`);
  const resolved: ResolvedTrialOptions = {
    seed: integer(options.seed ?? 1, "seed", 0),
    rows: oddInteger(options.rows ?? 15, "rows", 7),
    cols: oddInteger(options.cols ?? 15, "cols", 7),
    braid: finiteNumber(options.braid ?? 0, "braid", 0, 1),
    doorCount: integer(options.doorCount ?? 1, "doorCount", 0),
    chestCount: integer(options.chestCount ?? 2, "chestCount", 0),
    trapCount: integer(options.trapCount ?? 2, "trapCount", 0),
    medicineCount: integer(options.medicineCount ?? 2, "medicineCount", 0),
    scenario,
    language,
    style: integer(options.style ?? 0, "style", 0),
    minDistance: integer(options.minDistance ?? 0, "minDistance", 0),
    maxAttempts: integer(options.maxAttempts ?? 500, "maxAttempts", 1)
  };
  if (scenario === "treasure-and-leave" && resolved.chestCount < 1) {
    throw new Error("The treasure-and-leave scenario requires at least one chest.");
  }
  if (scenario === "treasure-and-leave" && resolved.medicineCount < 1) {
    throw new Error("The treasure-and-leave scenario requires at least one medicine room.");
  }
  if (scenario === "death-and-stop" && resolved.trapCount < 1) {
    throw new Error("The death-and-stop scenario requires at least one trap.");
  }
  return resolved;
}

function selectMaze(options: ResolvedTrialOptions): Maze {
  let lastError: unknown = null;
  for (let offset = 0; offset < options.maxAttempts; offset += 1) {
    const effectiveSeed = options.seed + offset;
    try {
      const base = generateSolidCellMaze({
        rows: options.rows,
        cols: options.cols,
        braid: options.braid,
        seed: effectiveSeed,
        requestedSeed: options.seed,
        id: `maze-test-${options.rows}x${options.cols}-${options.seed}`
      });
      const maze = decorateSolidCellMaze(base, {
        seed: effectiveSeed + 80_000,
        doorCount: options.doorCount,
        chestCount: options.chestCount,
        trapCount: options.trapCount,
        medicineCount: options.medicineCount
      });
      const validation = validateSolidCellMaze(maze);
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      if ((validation.metrics?.entryGoalDistance ?? 0) < options.minDistance) {
        throw new Error(`The entry-goal distance is below ${options.minDistance}.`);
      }
      const plan = buildScenarioPlan(maze, options.scenario);
      const result = simulateTrial(maze, plan.actions, plan.initialState);
      verifyScenario(options.scenario, result.answers, maze);
      return maze;
    } catch (error) {
      lastError = error;
    }
  }
  const detail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(
    `Could not generate a valid trial in ${options.maxAttempts} deterministic attempts.${detail}`
  );
}

function buildScenarioPlan(
  maze: Maze,
  scenario: ScenarioKind
): { initialState: InitialState; actions: Direction[] } {
  if (scenario === "success") {
    return {
      initialState: { health: 5, healthMax: 5, keys: 0, treasures: 0 },
      actions: pathToActions(shortestPath(maze, maze.entry, maze.goal))
    };
  }
  if (scenario === "treasure-and-leave") {
    const medicine = maze.objects.find((item) => item.type === "medicine");
    const chest = maze.objects.find((item) => item.type === "chest");
    if (!medicine || !chest) throw new Error("This scenario requires a medicine room and a chest.");
    const path1 = shortestPath(maze, maze.entry, medicine.position);
    const path2 = shortestPath(maze, medicine.position, chest.position);
    const path3 = shortestPath(maze, chest.position, maze.goal);
    const leavePath = [...path3].reverse().slice(0, Math.min(10, path3.length));
    let actions = [
      ...pathToActions(path1),
      ...pathToActions(path2),
      ...pathToActions(path3),
      ...pathToActions(leavePath)
    ];
    const initialState = {
      health: 3,
      healthMax: 5,
      keys: maze.doors.length + 2,
      treasures: 0
    };
    const beforeBump = simulateTrial(maze, actions, initialState);
    const bump = wallDirection(maze, beforeBump.state.position);
    if (bump) actions = [...actions, bump, bump];
    return { initialState, actions };
  }
  const trap = maze.objects.find((item) => item.type === "trap");
  if (!trap) throw new Error("This scenario requires a trap.");
  const toTrap = shortestPath(maze, maze.entry, trap.position);
  const afterTrap = shortestPath(maze, trap.position, maze.goal).slice(0, 14);
  return {
    initialState: {
      health: 1,
      healthMax: 1,
      keys: maze.doors.length + 1,
      treasures: 0
    },
    actions: [...pathToActions(toTrap), ...pathToActions(afterTrap)]
  };
}

function verifyScenario(scenario: ScenarioKind, answers: TrialAnswers, maze: Maze): void {
  if (
    scenario === "success" &&
    (!answers.reachedGoal || !answers.alive || answers.finalPosition !== letterNumberCoordinate(maze.goal))
  ) {
    throw new Error("The success scenario did not finish alive at the goal.");
  }
  if (
    scenario === "treasure-and-leave" &&
    (!answers.reachedGoal ||
      answers.finalPosition === letterNumberCoordinate(maze.goal) ||
      answers.openedChests < 1 ||
      answers.usedMedicines < 1 ||
      answers.blockedMoves < 2)
  ) {
    throw new Error("The treasure-and-leave scenario did not meet its invariants.");
  }
  if (scenario === "death-and-stop" && (answers.alive || answers.blockedAfterDeath < 5)) {
    throw new Error("The death-and-stop scenario did not meet its invariants.");
  }
}

function renderQuestion(
  options: ResolvedTrialOptions,
  maze: Maze,
  sections: TrialSections
): string {
  const isZh = options.language === "zh";
  const title = isZh ? "迷宫试题" : "Maze Trial";
  const labels = isZh
    ? ["地图描述", "机制描述", "行动描述", "问题"]
    : ["Map", "Rules", "Actions", "Questions"];
  const seedLine =
    maze.seed === options.seed
      ? `${isZh ? "种子" : "Seed"}: ${options.seed}`
      : `${isZh ? "种子" : "Seed"}: ${options.seed} (${isZh ? "有效迷宫种子" : "effective maze seed"}: ${maze.seed})`;
  return [
    `# ${title}`,
    "",
    seedLine,
    "",
    `## 1. ${labels[0]}`,
    "",
    sections.map,
    "",
    `## 2. ${labels[1]}`,
    "",
    sections.rules,
    "",
    `## 3. ${labels[2]}`,
    "",
    sections.actions,
    "",
    `## 4. ${labels[3]}`,
    "",
    sections.questions,
    ""
  ].join("\n");
}

function renderAnswer(
  options: ResolvedTrialOptions,
  maze: Maze,
  answers: TrialAnswers,
  actionCount: number
): string {
  const zh = options.language === "zh";
  const rows = zh
    ? [
        ["最终位置", answers.finalPosition],
        ["最终钥匙数", answers.keys],
        ["最终宝物数", answers.treasures],
        ["最终健康值", answers.health],
        ["是否存活", answers.alive ? "是" : "否"],
        ["是否曾到达终点", answers.reachedGoal ? "是" : "否"],
        ["打开的门", answers.openedDoors],
        ["打开的宝箱", answers.openedChests],
        ["触发的陷阱", answers.triggeredTraps],
        ["使用的药品房", answers.usedMedicines],
        ["未改变位置的移动", answers.blockedMoves]
      ]
    : [
        ["Final position", answers.finalPosition],
        ["Keys remaining", answers.keys],
        ["Treasures collected", answers.treasures],
        ["Health remaining", answers.health],
        ["Alive", answers.alive ? "Yes" : "No"],
        ["Ever reached the goal", answers.reachedGoal ? "Yes" : "No"],
        ["Doors opened", answers.openedDoors],
        ["Chests opened", answers.openedChests],
        ["Traps triggered", answers.triggeredTraps],
        ["Medicine rooms used", answers.usedMedicines],
        ["Moves that did not change position", answers.blockedMoves]
      ];
  return [
    `# ${zh ? "标准答案" : "Answer Key"}`,
    "",
    `${zh ? "种子" : "Seed"}: ${options.seed}`,
    ...(maze.seed === options.seed
      ? []
      : [
          `${zh ? "有效迷宫种子" : "Effective maze seed"}: ${maze.seed}`
        ]),
    "",
    `| ${zh ? "问题" : "Item"} | ${zh ? "答案" : "Answer"} |`,
    "|---|---|",
    ...rows.map(([label, value]) => `| ${label} | ${String(value)} |`),
    "",
    `${zh ? "原子行动数" : "Atomic action count"}: ${actionCount}`,
    ""
  ].join("\n");
}

function renderMapDescription(
  maze: Maze,
  initial: InitialState,
  language: Language,
  style: number
): string {
  const terrain = renderTerrainDescription(maze, language, style);
  const objects = renderObjectDescription(maze, language);
  if (language === "zh") {
    return [
      `这是一座${maze.rows}行${maze.cols}列的迷宫。左上角为A1，列从左向右依次标为A至${columnLabel(maze.cols)}，行从上向下编号为1至${maze.rows}。`,
      `入口位于${letterNumberCoordinate(maze.entry)}，终点位于${letterNumberCoordinate(maze.goal)}。`,
      "",
      terrain,
      "",
      "迷宫中的门和其他对象分布如下。门本身占据一个完整格子。",
      objects,
      "",
      `迷宫中有一名探险者。他从入口出发，初始健康值为${numberZh(initial.health)}点，健康上限为${numberZh(initial.healthMax)}点；${initialPossessions(initial, language)}，尚未到达终点。`
    ].join("\n");
  }
  return [
    `This maze has ${maze.rows} rows and ${maze.cols} columns. The top-left cell is A1. Columns run left to right from A to ${columnLabel(maze.cols)}, and rows run top to bottom from 1 to ${maze.rows}.`,
    `The entry is at ${letterNumberCoordinate(maze.entry)}, and the goal is at ${letterNumberCoordinate(maze.goal)}.`,
    "",
    terrain,
    "",
    "Doors and other objects are distributed as follows. Each door occupies a whole cell.",
    objects,
    "",
    `An explorer starts at the entry with ${initial.health} health point${plural(initial.health)}, a maximum health of ${initial.healthMax}, ${initialPossessions(initial, language)}, and reached-goal set to false.`
  ].join("\n");
}

function renderTerrainDescription(maze: Maze, language: Language, style: number): string {
  const clauses = Array.from({ length: maze.rows }, (_, index) => index + 1).map((row) => {
    const kinds = Array.from({ length: maze.cols }, (_, index) =>
      terrainAt(maze, cell(row, index + 1)) === "." ? "floor" : "wall"
    );
    const label =
      language === "zh"
        ? [`第${row}行`, `${row}、`, `（${row}）`][style % 3]
        : `Row ${row}: `;
    return `${label ?? `第${row}行`}${describeTerrainLine(kinds, language)}`;
  });
  return language === "zh"
    ? ["每行内部的格子均从左往右计数。从上往下，各行的格子情况如下：", `${clauses.join("；\n")}。`].join("\n")
    : ["Within each row, cells are counted from left to right:", `${clauses.join(";\n")}.`].join("\n");
}

function describeTerrainLine(kinds: string[], language: Language): string {
  const walls: number[] = [];
  const floors: number[] = [];
  for (let index = 0; index < kinds.length; index += 1) {
    (kinds[index] === "wall" ? walls : floors).push(index + 1);
  }
  if (language === "zh") {
    if (walls.length === 0) return "都是通路";
    if (floors.length === 0) return "都是墙壁";
    const limit = Math.floor(kinds.length / 3);
    if (walls.length <= limit) return `除了${positionList(walls, language)}是墙壁以外，其余都是通路`;
    if (floors.length <= limit) return `除了${positionList(floors, language)}是通路以外，其余都是墙壁`;
    return `${positionList(walls, language)}是墙壁，${positionList(floors, language)}是通路`;
  }
  if (walls.length === 0) return "all cells are passages";
  if (floors.length === 0) return "all cells are walls";
  const limit = Math.floor(kinds.length / 3);
  if (walls.length <= limit) return `all cells are passages except ${positionList(walls, language)}, which ${walls.length === 1 ? "is a wall" : "are walls"}`;
  if (floors.length <= limit) return `all cells are walls except ${positionList(floors, language)}, which ${floors.length === 1 ? "is a passage" : "are passages"}`;
  return `${positionList(walls, language)} ${walls.length === 1 ? "is a wall" : "are walls"}; ${positionList(floors, language)} ${floors.length === 1 ? "is a passage" : "are passages"}`;
}

function positionList(indices: number[], language: Language): string {
  const ranges: Array<[number, number]> = [];
  let start = indices[0];
  let end = indices[0];
  if (start === undefined || end === undefined) return "";
  for (const value of indices.slice(1)) {
    if (value === end + 1) {
      end = value;
      continue;
    }
    ranges.push([start, end]);
    start = value;
    end = value;
  }
  ranges.push([start, end]);
  const parts = ranges.map(([from, to]) =>
    language === "zh"
      ? from === to
        ? `第${from}格`
        : `第${from}格至第${to}格`
      : from === to
        ? `cell ${from}`
        : `cells ${from}-${to}`
  );
  if (parts.length === 1) return parts[0] ?? "";
  const last = parts.at(-1);
  return language === "zh"
    ? `${parts.slice(0, -1).join("、")}和${last}`
    : `${parts.slice(0, -1).join(", ")} and ${last}`;
}

function renderObjectDescription(maze: Maze, language: Language): string {
  const sentences: string[] = [];
  const doorPositions = maze.doors.map((item) => letterNumberCoordinate(item.position));
  const keys = maze.objects.filter((item) => item.type === "key");
  const chests = maze.objects.filter((item) => item.type === "chest");
  const traps = maze.objects.filter((item) => item.type === "trap");
  const medicines = maze.objects.filter((item) => item.type === "medicine");
  if (language === "zh") {
    if (doorPositions.length > 0) sentences.push(`${coordinateList(doorPositions, language)}${doorPositions.length > 1 ? "各" : ""}有一道初始关闭的门。`);
    const keyPositions = keys.map((item) => letterNumberCoordinate(item.position));
    if (keyPositions.length > 0) sentences.push(`${coordinateList(keyPositions, language)}${keyPositions.length > 1 ? "各" : ""}放着一把钥匙。`);
    for (const chest of chests) sentences.push(`${letterNumberCoordinate(chest.position)}放着一只初始关闭的宝箱，箱内有${numberZh(chest.treasures)}件宝物。`);
    const trapPositions = traps.map((item) => letterNumberCoordinate(item.position));
    if (trapPositions.length > 0) sentences.push(`${coordinateList(trapPositions, language)}${trapPositions.length > 1 ? "各" : ""}设有一个尚未触发的陷阱。`);
    const medicinePositions = medicines.map((item) => letterNumberCoordinate(item.position));
    if (medicinePositions.length > 0) sentences.push(`${coordinateList(medicinePositions, language)}${medicinePositions.length > 1 ? "各" : ""}有一个尚未使用的药品房。`);
  } else {
    if (doorPositions.length > 0) sentences.push(`${coordinateList(doorPositions, language)} ${doorPositions.length === 1 ? "contains a closed door" : "each contain a closed door"}.`);
    const keyPositions = keys.map((item) => letterNumberCoordinate(item.position));
    if (keyPositions.length > 0) sentences.push(`${coordinateList(keyPositions, language)} ${keyPositions.length === 1 ? "contains a key" : "each contain a key"}.`);
    for (const chest of chests) sentences.push(`${letterNumberCoordinate(chest.position)} contains a closed chest with ${chest.treasures} treasure${plural(chest.treasures)}.`);
    const trapPositions = traps.map((item) => letterNumberCoordinate(item.position));
    if (trapPositions.length > 0) sentences.push(`${coordinateList(trapPositions, language)} ${trapPositions.length === 1 ? "contains an untriggered trap" : "each contain an untriggered trap"}.`);
    const medicinePositions = medicines.map((item) => letterNumberCoordinate(item.position));
    if (medicinePositions.length > 0) sentences.push(`${coordinateList(medicinePositions, language)} ${medicinePositions.length === 1 ? "contains an unused medicine room" : "each contain an unused medicine room"}.`);
  }
  return sentences.length > 0 ? sentences.join("\n") : language === "zh" ? "没有门或其他对象。" : "There are no doors or other objects.";
}

function renderRules(language: Language): string {
  return (language === "zh" ? CHINESE_RULES : ENGLISH_RULES).join("\n");
}

function renderQuestions(language: Language): string {
  return (language === "zh" ? CHINESE_QUESTIONS : ENGLISH_QUESTIONS).join("\n");
}

function renderActionDescription(
  actions: Direction[],
  language: Language,
  style: number
): string {
  const runs = compressActions(actions);
  if (language === "zh") {
    const connectors = ["随后", "接着", "然后", "再", "之后"];
    const clauses = runs.map((run, index) => {
      const connector = index === 0 ? "探险者先" : connectors[(style + index) % connectors.length];
      return `${connector ?? "然后"}向${DIRECTIONS[run.direction].zh}移动${numberZh(run.count)}格`;
    });
    return paragraphize(clauses, "，", "。");
  }
  const clauses = runs.map((run, index) => {
    const connector =
      index === 0
        ? "First, the explorer moves"
        : index % 4 === 0
          ? "The explorer then moves"
          : "then moves";
    const directionForms: Record<Direction, string[]> = {
      up: ["up", "upward"],
      down: ["down", "downward"],
      left: ["left", "to the left"],
      right: ["right", "to the right"]
    };
    const forms = directionForms[run.direction];
    const direction = forms[(style + index) % forms.length] ?? DIRECTIONS[run.direction].en;
    return `${connector} ${direction} ${run.count} cell${plural(run.count)}`;
  });
  return paragraphize(clauses, ", ", ".");
}

function paragraphize(clauses: string[], separator: string, terminator: string): string {
  const sentences: string[] = [];
  for (let index = 0; index < clauses.length; index += 4) {
    sentences.push(`${clauses.slice(index, index + 4).join(separator)}${terminator}`);
  }
  return sentences.join("\n");
}

function compressActions(actions: Direction[]): Array<{ direction: Direction; count: number }> {
  const runs: Array<{ direction: Direction; count: number }> = [];
  for (const direction of actions) {
    const prior = runs.at(-1);
    if (prior?.direction === direction) prior.count += 1;
    else runs.push({ direction, count: 1 });
  }
  return runs;
}

function pathToActions(path: Cell[]): Direction[] {
  const actions: Direction[] = [];
  for (let index = 1; index < path.length; index += 1) {
    const current = path[index];
    const prior = path[index - 1];
    if (!current || !prior) continue;
    const dr = current.row - prior.row;
    const dc = current.col - prior.col;
    actions.push(dr === -1 ? "up" : dr === 1 ? "down" : dc === -1 ? "left" : "right");
  }
  return actions;
}

function wallDirection(maze: Maze, position: Cell): Direction | null {
  const candidates: Array<[Direction, Cell]> = [
    ["up", cell(position.row - 1, position.col)],
    ["down", cell(position.row + 1, position.col)],
    ["left", cell(position.row, position.col - 1)],
    ["right", cell(position.row, position.col + 1)]
  ];
  return candidates.find(([, target]) => terrainAt(maze, target) !== ".")?.[0] ?? null;
}

function coordinateList(values: string[], language: Language): string {
  if (values.length <= 1) return values[0] ?? "";
  const last = values.at(-1);
  return language === "zh"
    ? `${values.slice(0, -1).join("、")}和${last}`
    : `${values.slice(0, -1).join(", ")} and ${last}`;
}

function initialPossessions(state: InitialState, language: Language): string {
  if (language === "zh") {
    const keys = state.keys > 0 ? `起初持有${numberZh(state.keys)}把钥匙` : "起初没有钥匙";
    const treasures = state.treasures > 0 ? `持有${numberZh(state.treasures)}件宝物` : "没有宝物";
    return `${keys}，${treasures}`;
  }
  const keys = state.keys > 0 ? `${state.keys} key${plural(state.keys)}` : "no keys";
  const treasures = state.treasures > 0 ? `${state.treasures} treasure${plural(state.treasures)}` : "no treasures";
  return `${keys} and ${treasures}`;
}

function numberZh(value: number): string {
  const forms = ["零", "一", "两", "三", "四", "五", "六", "七", "八", "九", "十"];
  return forms[value] ?? String(value);
}

function plural(value: number): string {
  return value === 1 ? "" : "s";
}

function integer(value: number, name: string, minimum: number): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
  return value;
}

function oddInteger(value: number, name: string, minimum: number): number {
  integer(value, name, minimum);
  if (value % 2 === 0) throw new Error(`${name} must be odd.`);
  return value;
}

function finiteNumber(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

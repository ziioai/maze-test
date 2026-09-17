import { cell, columnLabel, letterNumberCoordinate } from "./coordinates.js";
import { defaultObjectCounts, emptyMaterialCounts, resolveMechanisms } from "./mechanisms.js";
import { decorateSolidCellMaze, generateSolidCellMaze, shortestPath, terrainAt, validateSolidCellMaze } from "./maze.js";
import { simulateTrial } from "./simulator.js";
import type { Cell, Direction, InitialState, KeyMaterial, Language, Maze, MazeTrial, PotionKind, ResolvedTrialOptions, ScenarioKind, TrialAnswers, TrialOptions, TrialSections, TreasureType } from "./types.js";

const DIRECTIONS: Record<Direction, { en: string; zh: string }> = {
  up: { en: "up", zh: "上" }, down: { en: "down", zh: "下" },
  left: { en: "left", zh: "左" }, right: { en: "right", zh: "右" }
};
const MATERIAL_NAMES: Record<KeyMaterial, { en: string; zh: string }> = {
  copper: { en: "copper", zh: "铜" }, silver: { en: "silver", zh: "银" }, gold: { en: "gold", zh: "金" }
};
const TREASURE_NAMES: Record<TreasureType, { en: string; zh: string }> = {
  treasure: { en: "treasure", zh: "宝物" }, coin: { en: "coin", zh: "钱币" },
  gem: { en: "gem", zh: "宝石" }, relic: { en: "relic", zh: "遗物" }
};
const POTION_NAMES: Record<PotionKind, { en: string; zh: string }> = {
  healing: { en: "healing potion", zh: "治疗药水" }, poison: { en: "poison potion", zh: "毒药" },
  antidote: { en: "antidote potion", zh: "解毒药水" }, haste: { en: "haste potion", zh: "加速药水" }, slow: { en: "slow potion", zh: "减速药水" }
};
const SPEED_NAMES = {
  normal: { en: "normal", zh: "正常" },
  fast: { en: "fast", zh: "加速" },
  slow: { en: "slow", zh: "减速" }
} as const;

export function generateTrial(options: TrialOptions = {}): MazeTrial {
  const resolved = resolveTrialOptions(options);
  const maze = selectMaze(resolved);
  const plan = buildScenarioPlan(maze, resolved.scenario);
  const result = simulateTrial(maze, plan.actions, plan.initialState);
  verifyScenario(resolved.scenario, result.answers, maze);
  const sections: TrialSections = {
    map: renderMapDescription(maze, plan.initialState, resolved.language, resolved.style),
    rules: renderRules(maze, resolved.language),
    actions: renderActionDescription(plan.actions, resolved.language, resolved.style),
    questions: renderQuestions(maze, resolved.language)
  };
  return {
    schemaVersion: "maze-test-trial@2", options: resolved, maze,
    initialState: plan.initialState, actions: plan.actions, sections,
    question: renderQuestion(resolved, maze, sections),
    answer: renderAnswer(resolved, maze, result.answers, plan.actions.length), result
  };
}

export function generateQuestion(options: TrialOptions = {}): string { return generateTrial(options).question; }
export function generateAnswer(options: TrialOptions = {}): string { return generateTrial(options).answer; }

export function resolveTrialOptions(options: TrialOptions = {}): ResolvedTrialOptions {
  const scenario = options.scenario ?? "success";
  const language = options.language ?? "en";
  if (!["success", "treasure-and-leave", "death-and-stop", "mechanism-tour"].includes(scenario)) throw new Error(`Unknown scenario: ${scenario}`);
  if (language !== "en" && language !== "zh") throw new Error(`Unknown language: ${language}`);
  const mechanisms = resolveMechanisms(options);
  const defaults = defaultObjectCounts(mechanisms.complexity);
  const resolved: ResolvedTrialOptions = {
    seed: integer(options.seed ?? 1, "seed", 0), rows: oddInteger(options.rows ?? 15, "rows", 7),
    cols: oddInteger(options.cols ?? 15, "cols", 7), braid: finiteNumber(options.braid ?? 0, "braid", 0, 1),
    doorCount: integer(options.doorCount ?? defaults.doors, "doorCount", 0),
    chestCount: integer(options.chestCount ?? defaults.chests, "chestCount", 0),
    trapCount: integer(options.trapCount ?? defaults.traps, "trapCount", 0),
    potionCount: integer(options.potionCount ?? options.medicineCount ?? defaults.potions, "potionCount", 0),
    mechanisms, scenario, language, style: integer(options.style ?? 0, "style", 0),
    minDistance: integer(options.minDistance ?? 0, "minDistance", 0), maxAttempts: integer(options.maxAttempts ?? 500, "maxAttempts", 1)
  };
  validateScenarioOptions(resolved);
  return resolved;
}

function validateScenarioOptions(options: ResolvedTrialOptions): void {
  if (options.scenario === "treasure-and-leave") {
    if (options.chestCount < 1) throw new Error("The treasure-and-leave scenario requires at least one chest.");
    if (!options.mechanisms.potionKinds.includes("healing")) throw new Error("The treasure-and-leave scenario requires healing in potionKinds.");
    if (options.potionCount < 1) throw new Error("The treasure-and-leave scenario requires at least one potion.");
  }
  if (options.scenario === "death-and-stop" && options.trapCount < 1) throw new Error("The death-and-stop scenario requires at least one trap.");
  if (options.scenario === "mechanism-tour") {
    if (options.trapCount < options.mechanisms.trapDamages.length) throw new Error("The mechanism-tour scenario needs at least one trap for every configured trap damage.");
    if (options.potionCount < options.mechanisms.potionKinds.length) throw new Error("The mechanism-tour scenario needs at least one potion for every configured potion kind.");
    if (options.chestCount < options.mechanisms.treasureTypes.length) throw new Error("The mechanism-tour scenario needs at least one chest for every configured treasure type.");
    if (options.doorCount < options.mechanisms.keyMaterials.length) throw new Error("The mechanism-tour scenario needs at least one door for every configured key material.");
  }
}

function selectMaze(options: ResolvedTrialOptions): Maze {
  let lastError: unknown = null;
  for (let offset = 0; offset < options.maxAttempts; offset += 1) {
    const effectiveSeed = options.seed + offset;
    try {
      const base = generateSolidCellMaze({ rows: options.rows, cols: options.cols, braid: options.braid, seed: effectiveSeed, requestedSeed: options.seed, mechanisms: options.mechanisms, id: `maze-test-${options.rows}x${options.cols}-${options.seed}` });
      const maze = decorateSolidCellMaze(base, { seed: effectiveSeed + 80_000, doorCount: options.doorCount, chestCount: options.chestCount, trapCount: options.trapCount, potionCount: options.potionCount, mechanisms: options.mechanisms });
      const validation = validateSolidCellMaze(maze);
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      if ((validation.metrics?.entryGoalDistance ?? 0) < options.minDistance) throw new Error(`The entry-goal distance is below ${options.minDistance}.`);
      const plan = buildScenarioPlan(maze, options.scenario);
      const result = simulateTrial(maze, plan.actions, plan.initialState);
      verifyScenario(options.scenario, result.answers, maze);
      return maze;
    } catch (error) { lastError = error; }
  }
  const detail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`Could not generate a valid trial in ${options.maxAttempts} deterministic attempts.${detail}`);
}

function buildScenarioPlan(maze: Maze, scenario: ScenarioKind): { initialState: InitialState; actions: Direction[] } {
  const ample = ampleInitialState(maze);
  if (scenario === "success") {
    const damage = maze.objects.filter((item) => item.type === "trap").reduce((sum, item) => sum + item.damage, 0);
    const poisonBudget = maze.mechanisms.potionKinds.includes("poison") ? maze.mechanisms.poisonDamage * maze.mechanisms.poisonDuration : 0;
    const health = Math.max(5, damage + poisonBudget + 1);
    return { initialState: { health, healthMax: health, keys: 0, treasures: 0 }, actions: pathToActions(shortestPath(maze, maze.entry, maze.goal)) };
  }
  if (scenario === "treasure-and-leave") {
    const healing = maze.objects.find((item) => item.type === "medicine" || (item.type === "potion" && item.kind === "healing"));
    const chest = maze.objects.find((item) => item.type === "chest");
    if (!healing || !chest) throw new Error("This scenario requires a healing object and a chest.");
    let actions = routeThrough(maze, [maze.entry, healing.position, chest.position, maze.goal]);
    const leavePath = shortestPath(maze, maze.goal, chest.position).slice(0, 10);
    actions.push(...pathToActions(leavePath));
    const initialState = { ...ample, health: 50, healthMax: 100 };
    const bump = wallDirection(maze, simulateTrial(maze, actions, initialState).state.position);
    if (bump) actions.push(bump, bump);
    return { initialState, actions };
  }
  if (scenario === "death-and-stop") {
    const trap = maze.objects.find((item) => item.type === "trap");
    if (!trap) throw new Error("This scenario requires a trap.");
    const actions = [...pathToActions(shortestPath(maze, maze.entry, trap.position)), ...pathToActions(shortestPath(maze, trap.position, maze.goal).slice(0, 14))];
    for (let health = 1; health <= 200; health += 1) {
      const initialState = { ...ample, health, healthMax: health };
      const result = simulateTrial(maze, actions, initialState);
      if (result.trace.some((item) => item.events.some((event) => event.type === "trigger-trap" && event.id === trap.id) && item.events.some((event) => event.type === "die"))) return { initialState, actions };
    }
    throw new Error("Could not choose health that makes the death-and-stop scenario die on its target trap.");
  }
  return { initialState: { ...ample, health: 1000, healthMax: 1000 }, actions: routeThrough(maze, [maze.entry, ...maze.objects.map((item) => item.position), maze.goal]) };
}

function ampleInitialState(maze: Maze): InitialState {
  const material = emptyMaterialCounts();
  for (const door of maze.doors) if (door.material) material[door.material] += 1;
  for (const object of maze.objects) if (object.type === "chest" && object.lockMaterial) material[object.lockMaterial] += 1;
  return { health: 100, healthMax: 100, keys: maze.doors.filter((door) => !door.material).length + maze.objects.filter((item) => item.type === "chest" && !item.lockMaterial).length, keysByMaterial: material, treasures: 0 };
}

function verifyScenario(scenario: ScenarioKind, a: TrialAnswers, maze: Maze): void {
  if (scenario === "success" && (!a.reachedGoal || !a.alive || a.finalPosition !== letterNumberCoordinate(maze.goal))) throw new Error("The success scenario did not finish alive at the goal.");
  if (scenario === "treasure-and-leave" && (!a.reachedGoal || a.finalPosition === letterNumberCoordinate(maze.goal) || a.openedChests < 1 || a.usedMedicines + a.usedPotions < 1 || a.blockedMoves < 2)) throw new Error("The treasure-and-leave scenario did not meet its invariants.");
  if (scenario === "death-and-stop" && (a.alive || a.triggeredTraps < 1 || a.blockedAfterDeath < 5)) throw new Error("The death-and-stop scenario did not meet its invariants.");
  if (scenario === "mechanism-tour") {
    const count = (type: "chest" | "trap" | "potion" | "medicine") => maze.objects.filter((item) => item.type === type).length;
    if (!a.alive || !a.reachedGoal || a.openedDoors !== maze.doors.length || a.openedChests !== count("chest") || a.triggeredTraps !== count("trap") || a.usedPotions !== count("potion") || a.usedMedicines !== count("medicine")) throw new Error("The mechanism-tour scenario did not exercise every generated mechanism object.");
  }
}

function renderQuestion(options: ResolvedTrialOptions, maze: Maze, sections: TrialSections): string {
  const zh = options.language === "zh";
  const labels = zh ? ["地图描述", "机制描述", "行动描述", "问题"] : ["Map", "Rules", "Actions", "Questions"];
  const seedLine = maze.seed === options.seed ? `${zh ? "种子" : "Seed"}: ${options.seed}` : `${zh ? "种子" : "Seed"}: ${options.seed} (${zh ? "有效迷宫种子" : "effective maze seed"}: ${maze.seed})`;
  return [`# ${zh ? "迷宫试题" : "Maze Trial"}`, "", seedLine, `${zh ? "机制复杂度" : "Mechanism complexity"}: ${options.mechanisms.complexity}`, "", `## 1. ${labels[0]}`, "", sections.map, "", `## 2. ${labels[1]}`, "", sections.rules, "", `## 3. ${labels[2]}`, "", sections.actions, "", `## 4. ${labels[3]}`, "", sections.questions, ""].join("\n");
}

function renderAnswer(options: ResolvedTrialOptions, maze: Maze, a: TrialAnswers, actionCount: number): string {
  const zh = options.language === "zh";
  const rows: Array<[string, string | number]> = zh
    ? [["最终位置", a.finalPosition], ["最终钥匙总数", a.keys], ["最终宝物总数", a.treasures], ["最终健康值", a.health], ["是否存活", a.alive ? "是" : "否"], ["是否曾到达终点", a.reachedGoal ? "是" : "否"], ["打开的门", a.openedDoors], ["打开的宝箱", a.openedChests], ["触发的陷阱", a.triggeredTraps]]
    : [["Final position", a.finalPosition], ["Keys remaining in total", a.keys], ["Treasures collected in total", a.treasures], ["Health remaining", a.health], ["Alive", a.alive ? "Yes" : "No"], ["Ever reached the goal", a.reachedGoal ? "Yes" : "No"], ["Doors opened", a.openedDoors], ["Chests opened", a.openedChests], ["Traps triggered", a.triggeredTraps]];
  if (maze.objects.some((item) => item.type === "medicine")) rows.push([zh ? "使用的药品房" : "Medicine rooms used", a.usedMedicines]);
  if (maze.objects.some((item) => item.type === "potion")) rows.push([zh ? "饮用的药水" : "Potions drunk", a.usedPotions]);
  rows.push([zh ? "未改变位置的原子移动指令" : "Atomic movement instructions that did not change position", a.blockedMoves]);
  for (const material of maze.mechanisms.keyMaterials) rows.push([zh ? `剩余${MATERIAL_NAMES[material].zh}钥匙` : `${capitalize(MATERIAL_NAMES[material].en)} keys remaining`, a.keysByMaterial[material]]);
  if (maze.mechanisms.treasureTypes.some((type) => type !== "treasure")) for (const type of maze.mechanisms.treasureTypes) rows.push([zh ? `${TREASURE_NAMES[type].zh}数量` : `${capitalize(TREASURE_NAMES[type].en)}s collected`, a.treasuresByType[type]]);
  if (maze.mechanisms.complexity === "advanced") rows.push([zh ? "累计耗时（时间单位）" : "Elapsed time (time units)", a.elapsedTime], [zh ? "最终速度状态" : "Final speed state", SPEED_NAMES[a.finalSpeed][zh ? "zh" : "en"]], [zh ? "速度效果剩余指令数" : "Speed-effect instructions remaining", a.speedRemaining], [zh ? "中毒剩余指令数" : "Poison instructions remaining", a.poisonRemaining]);
  return [`# ${zh ? "标准答案" : "Answer Key"}`, "", `${zh ? "种子" : "Seed"}: ${options.seed}`, ...(maze.seed === options.seed ? [] : [`${zh ? "有效迷宫种子" : "Effective maze seed"}: ${maze.seed}`]), "", `| ${zh ? "问题" : "Item"} | ${zh ? "答案" : "Answer"} |`, "|---|---|", ...rows.map(([label, value]) => `| ${label} | ${String(value)} |`), "", `${zh ? "原子移动指令数" : "Atomic movement instruction count"}: ${actionCount}`, ""].join("\n");
}

function renderMapDescription(maze: Maze, initial: InitialState, language: Language, style: number): string {
  const terrain = renderTerrainDescription(maze, language, style);
  const objects = renderObjectDescription(maze, language);
  if (language === "zh") return [`这是一座${maze.rows}行${maze.cols}列的迷宫。左上角为A1，列从左向右依次标为A至${columnLabel(maze.cols)}，行从上向下编号为1至${maze.rows}。`, `入口位于${letterNumberCoordinate(maze.entry)}，终点位于${letterNumberCoordinate(maze.goal)}。`, "", terrain, "", "门和对象的位置如下；门与对象所在格仍是可以进入的通路格。", objects, "", `探险者从入口出发，初始健康值为${initial.health}，健康上限为${initial.healthMax}；${initialPossessions(initial, language)}；初始未中毒、速度为正常；“曾经到达终点”记录为假。`].join("\n");
  return [`This maze has ${maze.rows} rows and ${maze.cols} columns. The top-left cell is A1. Columns run left to right from A to ${columnLabel(maze.cols)}, and rows run top to bottom from 1 to ${maze.rows}.`, `The entry is at ${letterNumberCoordinate(maze.entry)}, and the goal is at ${letterNumberCoordinate(maze.goal)}.`, "", terrain, "", "Door and object locations follow. A cell containing a door or object is still a passage cell that may be entered, subject to the door rule.", objects, "", `The explorer starts at the entry with ${initial.health} health, a maximum health of ${initial.healthMax}, ${initialPossessions(initial, language)}, no poison, normal speed, and reached-goal set to false.`].join("\n");
}

function renderTerrainDescription(maze: Maze, language: Language, style: number): string {
  const clauses = Array.from({ length: maze.rows }, (_, index) => index + 1).map((row) => {
    const kinds = Array.from({ length: maze.cols }, (_, index) => terrainAt(maze, cell(row, index + 1)) === "." ? "floor" : "wall");
    const label = language === "zh" ? [`第${row}行`, `${row}、`, `（${row}）`][style % 3] : `Row ${row}: `;
    return `${label ?? `第${row}行`}${describeTerrainLine(kinds, language)}`;
  });
  return language === "zh" ? ["每行内部的格子均从左往右计数。从上往下，各行的格子情况如下：", `${clauses.join("；\n")}。`].join("\n") : ["Within each row, cells are counted from left to right:", `${clauses.join(";\n")}.`].join("\n");
}

function describeTerrainLine(kinds: string[], language: Language): string {
  const walls: number[] = []; const floors: number[] = [];
  for (let index = 0; index < kinds.length; index += 1) (kinds[index] === "wall" ? walls : floors).push(index + 1);
  if (language === "zh") {
    if (walls.length === 0) return "都是通路"; if (floors.length === 0) return "都是墙壁";
    const limit = Math.floor(kinds.length / 3);
    if (walls.length <= limit) return `除了${positionList(walls, language)}是墙壁以外，其余都是通路`;
    if (floors.length <= limit) return `除了${positionList(floors, language)}是通路以外，其余都是墙壁`;
    return `${positionList(walls, language)}是墙壁，${positionList(floors, language)}是通路`;
  }
  if (walls.length === 0) return "all cells are passages"; if (floors.length === 0) return "all cells are walls";
  const limit = Math.floor(kinds.length / 3);
  if (walls.length <= limit) return `all cells are passages except ${positionList(walls, language)}, which ${walls.length === 1 ? "is a wall" : "are walls"}`;
  if (floors.length <= limit) return `all cells are walls except ${positionList(floors, language)}, which ${floors.length === 1 ? "is a passage" : "are passages"}`;
  return `${positionList(walls, language)} ${walls.length === 1 ? "is a wall" : "are walls"}; ${positionList(floors, language)} ${floors.length === 1 ? "is a passage" : "are passages"}`;
}

function positionList(indices: number[], language: Language): string {
  const ranges: Array<[number, number]> = []; let start = indices[0]; let end = indices[0];
  if (start === undefined || end === undefined) return "";
  for (const value of indices.slice(1)) { if (value === end + 1) { end = value; continue; } ranges.push([start, end]); start = value; end = value; }
  ranges.push([start, end]);
  const parts = ranges.map(([from, to]) => language === "zh" ? (from === to ? `第${from}格` : `第${from}格至第${to}格`) : (from === to ? `cell ${from}` : `cells ${from}-${to}`));
  if (parts.length === 1) return parts[0] ?? "";
  return language === "zh" ? `${parts.slice(0, -1).join("、")}和${parts.at(-1)}` : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function renderObjectDescription(maze: Maze, language: Language): string {
  const lines: string[] = [];
  for (const door of maze.doors) {
    const at = letterNumberCoordinate(door.position);
    lines.push(language === "zh" ? `${at}有一道初始关闭的${door.material ? MATERIAL_NAMES[door.material].zh : "普通"}门。` : `${at} contains an initially closed ${door.material ? `${MATERIAL_NAMES[door.material].en} ` : "ordinary "}door.`);
  }
  for (const object of maze.objects) {
    const at = letterNumberCoordinate(object.position);
    if (object.type === "key") lines.push(language === "zh" ? `${at}放着一把${object.material ? MATERIAL_NAMES[object.material].zh : "普通"}钥匙。` : `${at} contains one ${object.material ? `${MATERIAL_NAMES[object.material].en} ` : "ordinary "}key.`);
    else if (object.type === "chest") {
      const contents = (object.contents ?? [{ type: "treasure" as const, count: object.treasures }]).map((item) => language === "zh" ? `${item.count}${treasureUnit(item.type)}${TREASURE_NAMES[item.type].zh}` : `${item.count} ${TREASURE_NAMES[item.type].en}${plural(item.count)}`).join(language === "zh" ? "、" : " and ");
      const lock = object.lockMaterial ? `a ${MATERIAL_NAMES[object.lockMaterial].en} lock` : "an ordinary lock";
      lines.push(language === "zh" ? `${at}有一只初始关闭的${object.lockMaterial ? MATERIAL_NAMES[object.lockMaterial].zh : "普通"}锁宝箱，内有${contents}。` : `${at} contains an initially closed chest with ${lock}, containing ${contents}.`);
    } else if (object.type === "trap") lines.push(language === "zh" ? `${at}有一个尚未触发的陷阱，伤害为${object.damage}点。` : `${at} contains an untriggered trap that deals ${object.damage} damage.`);
    else if (object.type === "medicine") lines.push(language === "zh" ? `${at}有一个尚未使用的药品房，可恢复${object.recovery}点健康值。` : `${at} contains an unused medicine room that restores ${object.recovery} health.`);
    else {
      const details = potionDetails(object.kind, object.potency, object.duration, language);
      lines.push(language === "zh" ? `${at}有一瓶尚未饮用的${POTION_NAMES[object.kind].zh}${details}。` : `${at} contains an unused ${POTION_NAMES[object.kind].en}${details}.`);
    }
  }
  return lines.length > 0 ? lines.join("\n") : language === "zh" ? "没有门或其他对象。" : "There are no doors or other objects.";
}

function potionDetails(kind: PotionKind, potency: number | undefined, duration: number | undefined, language: Language): string {
  if (language === "zh") {
    if (kind === "healing") return `，恢复${potency ?? 1}点健康值，但不超过健康上限`;
    if (kind === "poison") return `，使饮用者在之后${duration ?? 1}条原子移动指令各损失${potency ?? 1}点健康值`;
    if (kind === "haste" || kind === "slow") return `，效果持续之后${duration ?? 1}条原子移动指令`;
    return "，可立即清除中毒状态";
  }
  if (kind === "healing") return ` that restores ${potency ?? 1} health without exceeding maximum health`;
  if (kind === "poison") return ` that causes ${potency ?? 1} damage after each of the next ${duration ?? 1} atomic movement instructions`;
  if (kind === "haste" || kind === "slow") return ` whose effect lasts for the next ${duration ?? 1} atomic movement instructions`;
  return " that immediately clears poison";
}

function renderRules(maze: Maze, language: Language): string {
  const m = maze.mechanisms;
  const usesPotionObjects = maze.objects.some((item) => item.type === "potion");
  const usesPoison = usesPotionObjects && m.potionKinds.some((kind) => kind === "poison" || kind === "antidote");
  const usesMaterials = m.keyMaterials.length > 0;
  const doorRuleZh = usesMaterials
    ? "目标格是关闭的门时，必须消耗一把与门材质相同的钥匙；钥匙不足或材质不符时停在原地。钥匙匹配时，在同一条指令中开门并进入门格。门一经打开便永久保持打开。"
    : "目标格是关闭的普通门时，必须消耗一把普通钥匙；没有普通钥匙时停在原地。有钥匙时，在同一条指令中开门并进入门格。门一经打开便永久保持打开。";
  const doorRuleEn = usesMaterials
    ? "If the target cell contains a closed door, the explorer must spend one key whose material matches the door. Without a matching key, the explorer stays in place. With a matching key, the door opens and the explorer enters the door cell in the same instruction. Once opened, a door remains open."
    : "If the target cell contains a closed ordinary door, the explorer must spend one ordinary key. Without an ordinary key, the explorer stays in place. With one, the door opens and the explorer enters the door cell in the same instruction. Once opened, a door remains open.";
  const chestRuleZh = usesMaterials
    ? "每次进入含有尚未打开宝箱的格子时，若持有与锁材质相同的钥匙，则消耗一把该钥匙、打开宝箱并取得箱中全部物品；否则宝箱保持关闭。宝箱格无论是否打开都可以进入或经过。箱内每一枚钱币、每一颗宝石或每一件遗物都分别计为一件宝物。"
    : "每次进入含有尚未打开普通锁宝箱的格子时，若持有普通钥匙，则消耗一把普通钥匙、打开宝箱并取得箱中全部物品；否则宝箱保持关闭。宝箱格无论是否打开都可以进入或经过。箱内每件物品计为一件宝物。";
  const chestRuleEn = usesMaterials
    ? "Whenever the explorer enters a cell containing an unopened chest, if a key matching its lock is available, one such key is spent, the chest opens, and all its contents are collected; otherwise, the chest remains closed. A chest cell may be entered or crossed whether or not the chest is open. Each coin, gem, or relic counts as one treasure."
    : "Whenever the explorer enters a cell containing an unopened chest with an ordinary lock, if an ordinary key is available, one ordinary key is spent, the chest opens, and all its contents are collected; otherwise, the chest remains closed. A chest cell may be entered or crossed whether or not the chest is open. Each item inside counts as one treasure.";
  const orderRuleZh = m.complexity === "advanced"
    ? "一条指令中，依次结算耗时、移动与目标格效果、到达终点记录、该指令开始时已有的中毒与速度状态，最后判断是否死亡。"
    : usesPoison
      ? "一条指令中，依次结算移动与目标格效果、到达终点记录、该指令开始时已有的中毒状态，最后判断是否死亡。"
      : "一条指令中，依次结算移动与目标格效果、到达终点记录，最后判断是否死亡。";
  const orderRuleEn = m.complexity === "advanced"
    ? "Within one instruction, resolve time cost first, then movement and target-cell effects, then the reached-goal record, then poison and speed states that were active at the instruction's start, and finally death."
    : usesPoison
      ? "Within one instruction, resolve movement and target-cell effects, then the reached-goal record, then poison that was active at the instruction's start, and finally death."
      : "Within one instruction, resolve movement and target-cell effects, then the reached-goal record, and finally death.";
  const poisonRuleZh = "毒药从饮用后的下一条原子移动指令开始生效。每条指令（包括因墙、地图边界或门而未移动的指令）结束时扣除指定健康值并减少一次剩余次数。饮用新的毒药会覆盖原中毒状态；饮用毒药或解毒药水的当前指令都不会触发原有毒素。";
  const poisonRuleEn = "Poison starts with the instruction after it is drunk. At the end of each such instruction—including one blocked by a wall, map boundary, or door—it deals the stated damage and consumes one remaining instruction. New poison replaces any previous poison; neither a poison potion nor an antidote potion lets the previous poison tick on the instruction in which it is drunk.";
  const speedRuleZh = `每条原子移动指令在开始时按当时速度计入时间单位：正常${m.movementTime.normal}、加速${m.movementTime.fast}、减速${m.movementTime.slow}。饮用加速药水会把速度设为加速，饮用减速药水会把速度设为减速；两种效果都从饮用后的下一条指令开始，持续指定数量的指令。撞墙或被门挡住也会消耗一次持续次数。饮用速度药水的当前指令按饮用前的速度计时；新速度药水覆盖旧速度状态，当前指令不消耗旧状态或新状态的持续次数。持续次数耗尽后，速度恢复为正常，剩余指令数为0。`;
  const speedRuleEn = `At the start of each atomic movement instruction, add time units according to the current speed: normal ${m.movementTime.normal}, fast ${m.movementTime.fast}, slow ${m.movementTime.slow}. A haste potion sets speed to fast, and a slow potion sets speed to slow; either effect starts with the instruction after it is drunk and lasts for its stated number of instructions. Blocked instructions also consume one duration. The instruction that drinks a speed potion uses the pre-drink speed for time. A new speed potion replaces the previous speed state, and that instruction consumes neither the old nor the new duration. When the duration is exhausted, speed returns to normal with 0 speed-effect instructions remaining.`;
  const rules = language === "zh" ? [
    "每条原子移动指令只尝试向上、下、左或右相邻的一格移动。行动描述中的“移动N格”表示连续执行N条同方向的原子移动指令。初始位于入口不视为进入该格；只有成功移动进入目标格时，才结算该格的效果。",
    "若目标格是墙格或在地图外，探险者停在原地，但该指令仍算作一条已执行的原子移动指令，之后的指令继续执行。",
    doorRuleZh,
    "第一次进入钥匙格时取得该钥匙；同一把钥匙不能重复取得。",
    chestRuleZh,
    "第一次进入陷阱格时受到该陷阱标明的伤害；同一陷阱以后不再生效。",
    usesPotionObjects ? "药水格是指含有治疗药水、毒药、解毒药水、加速药水或减速药水的格子。第一次进入药水格时立即饮用其中的药水并应用其效果；同一瓶药水不能重复饮用。" : "第一次进入药品房时恢复其标明的健康值，但不超过健康上限；同一药品房以后不再生效。",
    orderRuleZh,
    ...(usesPoison ? [poisonRuleZh] : []),
    ...(m.complexity === "advanced" ? [speedRuleZh] : []),
    "健康值降至0或以下时，将健康值记为0，探险者死亡。死亡后尚未执行的指令仍被读取，但不移动、不耗时，也不改变任何状态。",
    "一旦进入终点格，“曾经到达终点”永久记为真，即使后来离开或死亡也不撤销。"
  ] : [
    "Each atomic movement instruction attempts to move exactly one cell up, down, left, or right. A direction followed by N cells means N consecutive atomic movement instructions in that direction. Starting at the entry does not count as entering its cell; target-cell effects are resolved only after a successful movement into that cell.",
    "If the target is a wall or outside the map, the explorer stays in place. The instruction still counts as executed, and later instructions continue.",
    doorRuleEn,
    "The first time the explorer enters a key cell, that key is collected. A key cannot be collected twice.",
    chestRuleEn,
    "The first time the explorer enters a trap cell, the trap reduces health by its stated amount. That trap has no effect afterward.",
    usesPotionObjects ? "A potion cell contains a healing, poison, antidote, haste, or slow potion. The first time the explorer enters a potion cell, its potion is drunk immediately and its effect is applied. A potion cannot be drunk twice." : "The first time the explorer enters a medicine room, it restores the stated health without exceeding maximum health. It has no effect afterward.",
    orderRuleEn,
    ...(usesPoison ? [poisonRuleEn] : []),
    ...(m.complexity === "advanced" ? [speedRuleEn] : []),
    "If health becomes 0 or less, set it to 0 and the explorer dies. Remaining instructions are still read but cause no movement, consume no time, and change no state.",
    "Once the explorer enters the goal, ever-reached-goal remains true even if the explorer later leaves or dies."
  ];
  return rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n");
}

function renderQuestions(maze: Maze, language: Language): string {
  const materialKeys = maze.mechanisms.keyMaterials.length > 0;
  const questions = language === "zh" ? ["全部指令处理完毕后，探险者位于哪一格？", materialKeys ? "最后持有的钥匙总数（所有材质合计）是多少？" : "最后持有几把普通钥匙？", "最后取得的宝物总数（所有类型合计）是多少？", "最后剩余多少健康值？", "最后是否存活？", "是否曾经到达终点？", "共打开几道门？", "共打开几只宝箱？", "共触发几个陷阱？"] : ["Which cell contains the explorer after all instructions have been processed?", materialKeys ? "How many keys remain in total across all key materials?" : "How many ordinary keys remain?", "How many treasures were collected in total across all treasure types?", "How much health remains?", "Is the explorer alive at the end?", "Did the explorer ever reach the goal?", "How many doors were opened?", "How many chests were opened?", "How many traps were triggered?"];
  if (maze.objects.some((item) => item.type === "medicine")) questions.push(language === "zh" ? "共使用几个药品房？" : "How many medicine rooms were used?");
  if (maze.objects.some((item) => item.type === "potion")) questions.push(language === "zh" ? "共饮用几瓶药水？" : "How many potions were drunk?");
  questions.push(language === "zh" ? "按全部列出的原子移动指令计数（包括死亡后仍被读取的指令），其中多少条没有改变探险者的位置？" : "Counting every listed atomic movement instruction, including instructions read after death, how many did not change the explorer's position?");
  for (const material of maze.mechanisms.keyMaterials) questions.push(language === "zh" ? `最后剩余几把${MATERIAL_NAMES[material].zh}钥匙？` : `How many ${MATERIAL_NAMES[material].en} keys remain?`);
  if (maze.mechanisms.treasureTypes.some((type) => type !== "treasure")) for (const type of maze.mechanisms.treasureTypes) questions.push(language === "zh" ? `共取得多少${treasureUnit(type)}${TREASURE_NAMES[type].zh}？` : `How many ${TREASURE_NAMES[type].en}s were collected?`);
  if (maze.mechanisms.complexity === "advanced") questions.push(language === "zh" ? "累计耗时是多少个时间单位？" : "What is the total elapsed time in time units?", language === "zh" ? "最终速度状态（正常、加速或减速）及速度效果剩余指令数分别是什么？" : "What are the final speed state (normal, fast, or slow) and the number of speed-effect instructions remaining?", language === "zh" ? "最终中毒状态还剩几条指令？" : "How many poison instructions remain at the end?");
  return questions.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function renderActionDescription(actions: Direction[], language: Language, style: number): string {
  const runs = compressActions(actions);
  if (language === "zh") {
    const connectors = ["随后", "接着", "然后", "再", "之后"];
    return paragraphize(runs.map((run, index) => `${index === 0 ? "探险者先" : connectors[(style + index) % connectors.length] ?? "然后"}向${DIRECTIONS[run.direction].zh}移动${run.count}格`), "，", "。");
  }
  return paragraphize(runs.map((run, index) => `${index === 0 ? "First, the explorer moves" : index % 4 === 0 ? "The explorer then moves" : "then moves"} ${DIRECTIONS[run.direction].en} ${run.count} cell${plural(run.count)}`), ", ", ".");
}

function paragraphize(clauses: string[], separator: string, terminator: string): string {
  const sentences: string[] = [];
  for (let index = 0; index < clauses.length; index += 4) sentences.push(`${clauses.slice(index, index + 4).join(separator)}${terminator}`);
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

function routeThrough(maze: Maze, points: Cell[]): Direction[] {
  const actions: Direction[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]; const to = points[index];
    if (!from || !to) continue;
    const path = shortestPath(maze, from, to);
    if (path.length === 0) throw new Error("Could not connect scenario waypoints.");
    actions.push(...pathToActions(path));
  }
  return actions;
}

function pathToActions(path: Cell[]): Direction[] {
  const actions: Direction[] = [];
  for (let index = 1; index < path.length; index += 1) {
    const current = path[index]; const prior = path[index - 1];
    if (!current || !prior) continue;
    const dr = current.row - prior.row; const dc = current.col - prior.col;
    actions.push(dr === -1 ? "up" : dr === 1 ? "down" : dc === -1 ? "left" : "right");
  }
  return actions;
}

function wallDirection(maze: Maze, position: Cell): Direction | null {
  const candidates: Array<[Direction, Cell]> = [["up", cell(position.row - 1, position.col)], ["down", cell(position.row + 1, position.col)], ["left", cell(position.row, position.col - 1)], ["right", cell(position.row, position.col + 1)]];
  return candidates.find(([, target]) => terrainAt(maze, target) !== ".")?.[0] ?? null;
}

function initialPossessions(state: InitialState, language: Language): string {
  const materials = emptyMaterialCounts(state.keysByMaterial);
  const parts = (Object.keys(materials) as KeyMaterial[]).filter((key) => materials[key] > 0).map((key) => language === "zh" ? `${materials[key]}把${MATERIAL_NAMES[key].zh}钥匙` : `${materials[key]} ${MATERIAL_NAMES[key].en} key${plural(materials[key])}`);
  if (state.keys > 0) parts.unshift(language === "zh" ? `${state.keys}把普通钥匙` : `${state.keys} ordinary key${plural(state.keys)}`);
  const keys = parts.length > 0 ? parts.join(language === "zh" ? "、" : ", ") : language === "zh" ? "没有钥匙" : "no keys";
  const treasures = state.treasures > 0 ? (language === "zh" ? `${state.treasures}件宝物` : `${state.treasures} treasure${plural(state.treasures)}`) : language === "zh" ? "没有宝物" : "no treasures";
  return language === "zh" ? `持有${keys}，${treasures}` : `${keys} and ${treasures}`;
}

function treasureUnit(type: TreasureType): string {
  return type === "coin" ? "枚" : type === "gem" ? "颗" : "件";
}

function plural(value: number): string { return value === 1 ? "" : "s"; }
function capitalize(value: string): string { return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`; }
function integer(value: number, name: string, minimum: number): number { if (!Number.isInteger(value) || value < minimum) throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`); return value; }
function oddInteger(value: number, name: string, minimum: number): number { integer(value, name, minimum); if (value % 2 === 0) throw new Error(`${name} must be odd.`); return value; }
function finiteNumber(value: number, name: string, minimum: number, maximum: number): number { if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`${name} must be between ${minimum} and ${maximum}.`); return value; }

export type Language = "en" | "zh";

export type ScenarioKind = "success" | "treasure-and-leave" | "death-and-stop";

export type Direction = "up" | "down" | "left" | "right";

export interface Cell {
  row: number;
  col: number;
}

export interface Door {
  id: string;
  position: Cell;
  state: "closed";
}

export interface KeyObject {
  id: string;
  type: "key";
  position: Cell;
}

export interface ChestObject {
  id: string;
  type: "chest";
  position: Cell;
  treasures: number;
}

export interface TrapObject {
  id: string;
  type: "trap";
  position: Cell;
  damage: number;
}

export interface MedicineObject {
  id: string;
  type: "medicine";
  position: Cell;
  recovery: number;
}

export type MazeObject = KeyObject | ChestObject | TrapObject | MedicineObject;

export interface MazeMetrics {
  totalCells: number;
  wallCells: number;
  floorCells: number;
  connectedFloorCells: number;
  connected: boolean;
  floorAdjacencyEdges: number;
  independentCycles: number;
  deadEnds: number;
  junctions: number;
  entryGoalDistance: number | null;
  doorCount: number;
  gatingDoorCount: number;
  objectCounts: Partial<Record<MazeObject["type"], number>>;
}

export interface Maze {
  schemaVersion: "solid-cell-maze-v3@1";
  id: string;
  seed: number;
  requestedSeed: number;
  rows: number;
  cols: number;
  braid: number;
  coordinateSystem: {
    origin: "top-left";
    columns: "letters-left-to-right";
    rows: "numbers-top-to-bottom";
  };
  terrain: string[];
  entry: Cell;
  goal: Cell;
  doors: Door[];
  objects: MazeObject[];
  metrics: MazeMetrics;
}

export interface GenerateMazeOptions {
  rows?: number;
  cols?: number;
  seed?: number;
  requestedSeed?: number;
  braid?: number;
  id?: string;
}

export interface DecorateMazeOptions {
  seed?: number;
  doorCount?: number;
  chestCount?: number;
  trapCount?: number;
  medicineCount?: number;
}

export interface InitialState {
  health: number;
  healthMax: number;
  keys: number;
  treasures: number;
}

export interface TrialState extends InitialState {
  position: Cell;
  alive: boolean;
  reachedGoal: boolean;
  openedDoors: string[];
  collectedKeys: string[];
  openedChests: string[];
  triggeredTraps: string[];
  usedMedicines: string[];
}

export interface TrialEvent {
  type:
    | "open-door"
    | "collect-key"
    | "open-chest"
    | "pass-closed-chest"
    | "trigger-trap"
    | "use-medicine"
    | "die"
    | "reach-goal";
  id?: string;
  keyCost?: number;
  treasures?: number;
  damage?: number;
  recovery?: number;
}

export type BlockedReason = "dead" | "wall-or-outside" | "closed-door-without-key";

export interface TrialTraceItem {
  step: number;
  direction: Direction;
  before: TrialState;
  moved: boolean;
  reason: BlockedReason | null;
  events: TrialEvent[];
  after: TrialState;
}

export interface TrialAnswers {
  finalPosition: string;
  keys: number;
  treasures: number;
  health: number;
  alive: boolean;
  reachedGoal: boolean;
  openedDoors: number;
  openedChests: number;
  triggeredTraps: number;
  usedMedicines: number;
  blockedMoves: number;
  blockedAfterDeath: number;
}

export interface SimulationResult {
  state: TrialState;
  trace: TrialTraceItem[];
  answers: TrialAnswers;
}

export interface TrialOptions {
  seed?: number;
  rows?: number;
  cols?: number;
  braid?: number;
  doorCount?: number;
  chestCount?: number;
  trapCount?: number;
  medicineCount?: number;
  scenario?: ScenarioKind;
  language?: Language;
  style?: number;
  minDistance?: number;
  maxAttempts?: number;
}

export interface ResolvedTrialOptions {
  seed: number;
  rows: number;
  cols: number;
  braid: number;
  doorCount: number;
  chestCount: number;
  trapCount: number;
  medicineCount: number;
  scenario: ScenarioKind;
  language: Language;
  style: number;
  minDistance: number;
  maxAttempts: number;
}

export interface TrialSections {
  map: string;
  rules: string;
  actions: string;
  questions: string;
}

export interface MazeTrial {
  schemaVersion: "maze-test-trial@1";
  options: ResolvedTrialOptions;
  maze: Maze;
  initialState: InitialState;
  actions: Direction[];
  sections: TrialSections;
  question: string;
  answer: string;
  result: SimulationResult;
}

export interface MazeValidation {
  valid: boolean;
  errors: string[];
  metrics: MazeMetrics | null;
}

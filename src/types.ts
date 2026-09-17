export type Language = "en" | "zh";

export type ScenarioKind =
  | "success"
  | "treasure-and-leave"
  | "death-and-stop"
  | "mechanism-tour";

export type Direction = "up" | "down" | "left" | "right";
export type MechanismComplexity = "basic" | "intermediate" | "advanced";
export type KeyMaterial = "copper" | "silver" | "gold";
export type TreasureType = "treasure" | "coin" | "gem" | "relic";
export type PotionKind = "healing" | "poison" | "antidote" | "haste" | "slow";
export type SpeedMode = "normal" | "fast" | "slow";
export type MaterialCounts = Record<KeyMaterial, number>;
export type TreasureCounts = Record<TreasureType, number>;

export interface MechanismConfig {
  complexity: MechanismComplexity;
  trapDamages: number[];
  potionKinds: PotionKind[];
  keyMaterials: KeyMaterial[];
  treasureTypes: TreasureType[];
  poisonDamage: number;
  poisonDuration: number;
  speedDuration: number;
  movementTime: Record<SpeedMode, number>;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Door {
  id: string;
  position: Cell;
  state: "closed";
  material?: KeyMaterial;
}

export interface KeyObject {
  id: string;
  type: "key";
  position: Cell;
  material?: KeyMaterial;
}

export interface TreasureContent {
  type: TreasureType;
  count: number;
}

export interface ChestObject {
  id: string;
  type: "chest";
  position: Cell;
  treasures: number;
  contents: TreasureContent[];
  lockMaterial?: KeyMaterial;
}

export interface TrapObject {
  id: string;
  type: "trap";
  position: Cell;
  damage: number;
}

/** Legacy basic-mode healing object retained for schema compatibility. */
export interface MedicineObject {
  id: string;
  type: "medicine";
  position: Cell;
  recovery: number;
}

export interface PotionObject {
  id: string;
  type: "potion";
  position: Cell;
  kind: PotionKind;
  potency?: number;
  duration?: number;
}

export type MazeObject =
  | KeyObject
  | ChestObject
  | TrapObject
  | MedicineObject
  | PotionObject;

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
  schemaVersion: "solid-cell-maze-v3@1" | "solid-cell-maze-v4@1";
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
  mechanisms: MechanismConfig;
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
  mechanisms?: MechanismConfig;
}

export interface DecorateMazeOptions {
  seed?: number;
  doorCount?: number;
  chestCount?: number;
  trapCount?: number;
  medicineCount?: number;
  potionCount?: number;
  mechanisms?: MechanismConfig;
}

export interface InitialState {
  health: number;
  healthMax: number;
  keys: number;
  treasures: number;
  keysByMaterial?: Partial<MaterialCounts>;
  treasuresByType?: Partial<TreasureCounts>;
  elapsedTime?: number;
  speed?: SpeedMode;
  speedRemaining?: number;
  poisonDamage?: number;
  poisonRemaining?: number;
}

export interface TrialState {
  position: Cell;
  health: number;
  healthMax: number;
  keys: number;
  keysByMaterial: MaterialCounts;
  treasures: number;
  treasuresByType: TreasureCounts;
  elapsedTime: number;
  speed: SpeedMode;
  speedRemaining: number;
  poisonDamage: number;
  poisonRemaining: number;
  alive: boolean;
  reachedGoal: boolean;
  openedDoors: string[];
  collectedKeys: string[];
  openedChests: string[];
  triggeredTraps: string[];
  usedMedicines: string[];
  usedPotions: string[];
}

export interface TrialEvent {
  type:
    | "open-door"
    | "collect-key"
    | "open-chest"
    | "pass-closed-chest"
    | "trigger-trap"
    | "use-medicine"
    | "drink-potion"
    | "poison-tick"
    | "speed-expired"
    | "die"
    | "reach-goal";
  id?: string;
  material?: KeyMaterial;
  potionKind?: PotionKind;
  keyCost?: number;
  treasures?: number;
  contents?: TreasureContent[];
  damage?: number;
  recovery?: number;
  duration?: number;
  timeCost?: number;
}

export type BlockedReason =
  | "dead"
  | "wall-or-outside"
  | "closed-door-without-key"
  | "closed-door-without-matching-key";

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
  keysByMaterial: MaterialCounts;
  treasures: number;
  treasuresByType: TreasureCounts;
  health: number;
  alive: boolean;
  reachedGoal: boolean;
  openedDoors: number;
  openedChests: number;
  triggeredTraps: number;
  usedMedicines: number;
  usedPotions: number;
  elapsedTime: number;
  finalSpeed: SpeedMode;
  speedRemaining: number;
  poisonDamage: number;
  poisonRemaining: number;
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
  potionCount?: number;
  complexity?: MechanismComplexity;
  trapDamages?: number[];
  potionKinds?: PotionKind[];
  keyMaterials?: KeyMaterial[];
  treasureTypes?: TreasureType[];
  poisonDamage?: number;
  poisonDuration?: number;
  speedDuration?: number;
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
  potionCount: number;
  mechanisms: MechanismConfig;
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
  schemaVersion: "maze-test-trial@2";
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

import type {
  KeyMaterial,
  MaterialCounts,
  MechanismComplexity,
  MechanismConfig,
  PotionKind,
  TreasureCounts,
  TreasureType,
  TrialOptions
} from "./types.js";

const MATERIALS: readonly KeyMaterial[] = ["copper", "silver", "gold"];
const TREASURE_TYPES: readonly TreasureType[] = ["treasure", "coin", "gem", "relic"];
const POTION_KINDS: readonly PotionKind[] = ["healing", "poison", "antidote", "haste", "slow"];

export function mechanismPreset(complexity: MechanismComplexity): MechanismConfig {
  if (complexity === "basic") {
    return {
      complexity,
      trapDamages: [1],
      potionKinds: ["healing"],
      keyMaterials: [],
      treasureTypes: ["treasure"],
      poisonDamage: 1,
      poisonDuration: 3,
      speedDuration: 4,
      movementTime: { normal: 1, fast: 1, slow: 1 }
    };
  }
  if (complexity === "intermediate") {
    return {
      complexity,
      trapDamages: [1, 2, 3],
      potionKinds: ["healing", "poison", "antidote"],
      keyMaterials: [],
      treasureTypes: ["coin", "gem", "relic"],
      poisonDamage: 1,
      poisonDuration: 3,
      speedDuration: 4,
      movementTime: { normal: 1, fast: 1, slow: 1 }
    };
  }
  return {
    complexity,
    trapDamages: [1, 2, 3],
    potionKinds: ["healing", "poison", "antidote", "haste", "slow"],
    keyMaterials: ["copper", "silver", "gold"],
    treasureTypes: ["coin", "gem", "relic"],
    poisonDamage: 1,
    poisonDuration: 3,
    speedDuration: 4,
    movementTime: { normal: 2, fast: 1, slow: 3 }
  };
}

export function resolveMechanisms(options: TrialOptions): MechanismConfig {
  const complexity = options.complexity ?? "basic";
  if (!isComplexity(complexity)) throw new Error(`Unknown complexity: ${String(complexity)}`);
  const preset = mechanismPreset(complexity);
  const trapDamages = options.trapDamages ?? preset.trapDamages;
  const potionKinds = options.potionKinds ?? preset.potionKinds;
  const keyMaterials = options.keyMaterials ?? preset.keyMaterials;
  const treasureTypes = options.treasureTypes ?? preset.treasureTypes;
  validatePositiveList(trapDamages, "trapDamages");
  validateEnumList(potionKinds, POTION_KINDS, "potionKinds");
  validateEnumList(keyMaterials, MATERIALS, "keyMaterials", true);
  validateEnumList(treasureTypes, TREASURE_TYPES, "treasureTypes");
  if (complexity !== "advanced" && potionKinds.some((kind) => kind === "haste" || kind === "slow")) {
    throw new Error("Haste and slow potions require advanced complexity so their movement-time costs are defined.");
  }
  if (complexity === "advanced" && keyMaterials.length === 0) {
    throw new Error("Advanced complexity requires at least one key material.");
  }
  return {
    ...preset,
    trapDamages: [...trapDamages],
    potionKinds: [...potionKinds],
    keyMaterials: [...keyMaterials],
    treasureTypes: [...treasureTypes],
    poisonDamage: positiveInteger(options.poisonDamage ?? preset.poisonDamage, "poisonDamage"),
    poisonDuration: positiveInteger(
      options.poisonDuration ?? preset.poisonDuration,
      "poisonDuration"
    ),
    speedDuration: positiveInteger(options.speedDuration ?? preset.speedDuration, "speedDuration")
  };
}

export function defaultObjectCounts(complexity: MechanismComplexity): {
  doors: number;
  chests: number;
  traps: number;
  potions: number;
} {
  if (complexity === "basic") return { doors: 1, chests: 2, traps: 2, potions: 2 };
  if (complexity === "intermediate") return { doors: 2, chests: 3, traps: 3, potions: 3 };
  return { doors: 3, chests: 3, traps: 3, potions: 5 };
}

export function emptyMaterialCounts(
  values: Partial<MaterialCounts> = {}
): MaterialCounts {
  return {
    copper: values.copper ?? 0,
    silver: values.silver ?? 0,
    gold: values.gold ?? 0
  };
}

export function emptyTreasureCounts(
  values: Partial<TreasureCounts> = {}
): TreasureCounts {
  return {
    treasure: values.treasure ?? 0,
    coin: values.coin ?? 0,
    gem: values.gem ?? 0,
    relic: values.relic ?? 0
  };
}

export function totalMaterialKeys(counts: MaterialCounts): number {
  return counts.copper + counts.silver + counts.gold;
}

function isComplexity(value: string): value is MechanismComplexity {
  return value === "basic" || value === "intermediate" || value === "advanced";
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function validatePositiveList(values: readonly number[], name: string): void {
  if (values.length === 0) throw new Error(`${name} must not be empty.`);
  for (const value of values) positiveInteger(value, name);
}

function validateEnumList<T extends string>(
  values: readonly T[],
  allowed: readonly T[],
  name: string,
  allowEmpty = false
): void {
  if (!allowEmpty && values.length === 0) throw new Error(`${name} must not be empty.`);
  for (const value of values) {
    if (!allowed.includes(value)) throw new Error(`Unknown ${name} value: ${value}`);
  }
}

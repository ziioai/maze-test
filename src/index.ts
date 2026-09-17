export {
  cell,
  cellKey,
  columnLabel,
  letterNumberCoordinate,
  neighbors,
  rowColumnCoordinate,
  sameCell
} from "./coordinates.js";
export {
  analyzeSolidCellMaze,
  decorateSolidCellMaze,
  generateSolidCellMaze,
  isFloor,
  shortestPath,
  terrainAt,
  validateSolidCellMaze
} from "./maze.js";
export { renderCharacterMaze } from "./renderer.js";
export { simulateTrial, stateKey } from "./simulator.js";
export {
  generateAnswer,
  generateQuestion,
  generateTrial,
  resolveTrialOptions
} from "./trial.js";
export type * from "./types.js";

/** The npm package name. Retained for compatibility with the initial release. */
export const packageName = "maze-test";

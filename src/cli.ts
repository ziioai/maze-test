#!/usr/bin/env node

import process from "node:process";
import { generateTrial } from "./trial.js";
import type { Language, ScenarioKind, TrialOptions } from "./types.js";

const VERSION = "0.2.0";

type Command = "question" | "answer";
type OutputFormat = "text" | "json";

interface CliOptions {
  command: Command;
  format: OutputFormat;
  trial: TrialOptions;
}

try {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed === "help") {
    process.stdout.write(helpText());
  } else if (parsed === "version") {
    process.stdout.write(`${VERSION}\n`);
  } else {
    const trial = generateTrial(parsed.trial);
    if (parsed.format === "text") {
      process.stdout.write(parsed.command === "question" ? trial.question : trial.answer);
    } else if (parsed.command === "question") {
      process.stdout.write(
        `${JSON.stringify(
          {
            schemaVersion: trial.schemaVersion,
            kind: "question",
            options: trial.options,
            maze: {
              id: trial.maze.id,
              requestedSeed: trial.maze.requestedSeed,
              effectiveSeed: trial.maze.seed,
              metrics: trial.maze.metrics
            },
            sections: trial.sections,
            question: trial.question
          },
          null,
          2
        )}\n`
      );
    } else {
      process.stdout.write(
        `${JSON.stringify(
          {
            schemaVersion: trial.schemaVersion,
            kind: "answer",
            options: trial.options,
            maze: {
              id: trial.maze.id,
              requestedSeed: trial.maze.requestedSeed,
              effectiveSeed: trial.maze.seed
            },
            answers: trial.result.answers,
            actionCount: trial.actions.length,
            answer: trial.answer
          },
          null,
          2
        )}\n`
      );
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`maze-test: ${message}\nRun "maze-test --help" for usage.\n`);
  process.exitCode = 1;
}

function parseArguments(args: string[]): CliOptions | "help" | "version" {
  const values = [...args];
  let command: Command = "question";
  const first = values[0];
  if (first && !first.startsWith("-")) {
    values.shift();
    if (first === "question" || first === "q") command = "question";
    else if (first === "answer" || first === "a") command = "answer";
    else throw new Error(`Unknown command: ${first}`);
  }

  const trial: TrialOptions = {};
  let format: OutputFormat = "text";
  for (let index = 0; index < values.length; index += 1) {
    const raw = values[index];
    if (!raw) continue;
    const equalIndex = raw.indexOf("=");
    const flag = equalIndex >= 0 ? raw.slice(0, equalIndex) : raw;
    const inline = equalIndex >= 0 ? raw.slice(equalIndex + 1) : undefined;
    if (flag === "--help" || flag === "-h") return "help";
    if (flag === "--version" || flag === "-v") return "version";
    if (flag === "--json") {
      format = "json";
      continue;
    }
    const value = inline ?? values[++index];
    if (value === undefined) throw new Error(`Missing value for ${flag}.`);
    switch (flag) {
      case "--seed":
        trial.seed = parseInteger(value, flag);
        break;
      case "--rows":
        trial.rows = parseInteger(value, flag);
        break;
      case "--cols":
        trial.cols = parseInteger(value, flag);
        break;
      case "--braid":
        trial.braid = parseNumber(value, flag);
        break;
      case "--doors":
        trial.doorCount = parseInteger(value, flag);
        break;
      case "--chests":
        trial.chestCount = parseInteger(value, flag);
        break;
      case "--traps":
        trial.trapCount = parseInteger(value, flag);
        break;
      case "--medicines":
        trial.medicineCount = parseInteger(value, flag);
        break;
      case "--scenario":
        trial.scenario = value as ScenarioKind;
        break;
      case "--lang":
      case "--language":
        trial.language = value as Language;
        break;
      case "--style":
        trial.style = parseInteger(value, flag);
        break;
      case "--min-distance":
        trial.minDistance = parseInteger(value, flag);
        break;
      case "--max-attempts":
        trial.maxAttempts = parseInteger(value, flag);
        break;
      case "--format":
        if (value !== "text" && value !== "json") throw new Error(`Invalid format: ${value}`);
        format = value;
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }
  return { command, format, trial };
}

function parseInteger(value: string, flag: string): number {
  if (!/^-?\d+$/u.test(value)) throw new Error(`${flag} requires an integer.`);
  return Number(value);
}

function parseNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${flag} requires a number.`);
  return parsed;
}

function helpText(): string {
  return `maze-test ${VERSION}

Generate a deterministic maze question or its answer key.

Usage:
  maze-test [question] [options]
  maze-test answer [options]

Commands:
  question, q              Generate the question (default)
  answer, a                Generate the matching answer key

Options:
  --seed <integer>         Root seed (default: 1)
  --rows <odd integer>     Number of rows (default: 15)
  --cols <odd integer>     Number of columns (default: 15)
  --braid <0..1>           Chance to remove a dead end (default: 0)
  --doors <integer>        Number of doors and keys (default: 1)
  --chests <integer>       Number of chests (default: 2)
  --traps <integer>        Number of traps (default: 2)
  --medicines <integer>    Number of medicine rooms (default: 2)
  --scenario <name>        success | treasure-and-leave | death-and-stop
                           (default: success)
  --lang <language>        en | zh (default: en)
  --style <integer>        Deterministic wording variation (default: 0)
  --min-distance <integer> Minimum entry-to-goal distance (default: 0)
  --max-attempts <integer> Deterministic search limit (default: 500)
  --format <format>        text | json (default: text)
  --json                   Alias for --format json
  -h, --help               Show help
  -v, --version            Show version

Examples:
  npx maze-test question --seed 42 --rows 15 --cols 15
  npx maze-test answer --seed 42 --rows 15 --cols 15
  npx maze-test question --seed 42 --lang zh
  npx maze-test answer --seed 42 --format json
`;
}

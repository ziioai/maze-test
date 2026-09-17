---
name: maze-test
description: Generate, reproduce, solve, and score deterministic bilingual maze reasoning tasks with the maze-test CLI. Use when creating maze questions or answer keys, evaluating an LLM's spatial reasoning and long-horizon state tracking, comparing English and Chinese performance, or reproducing a trial from its seed and parameters. Do not use for developing unrelated maze games or maintaining the maze-test package itself.
license: MIT
metadata:
  author: ziioai
  package: maze-test
---

# Maze Test

Use the `maze-test` npm package to create reproducible reasoning tasks and independently generated answer keys.

This workflow requires Node.js 20 or newer and npm registry access unless the package is already cached.

## Preserve the evaluation boundary

Never expose or inspect the answer key, structured answers, simulator state, or trace before the response being evaluated has been fixed. This applies when evaluating another model and when solving a task yourself.

If the user prohibits code or tool assistance while solving, use the CLI only to generate the question, solve it without further tool calls, state the complete answer, and only then run the answer command.

Do not generate an answer proactively when the user asks only for a question.

## Choose and record the trial

Preserve every parameter the user supplies. When parameters are omitted, use the CLI defaults rather than inventing hidden settings. English is the default language; use `--lang zh` for Chinese.

Use the scenarios according to the intended capability:

- `success` for a baseline spatial and state-tracking task.
- `treasure-and-leave` for resource use, revisiting, goal memory, and blocked moves.
- `death-and-stop` for one-time events and state freezing after death.
- `mechanism-tour` for complete coverage of every generated mechanism object.

Choose mechanism complexity according to the evaluation target:

- `basic` for the original ordinary-key, generic-treasure task.
- `intermediate` for variable trap damage, typed treasures, healing, poison, and antidotes.
- `advanced` for material-matched locks plus haste, slow, and elapsed-time reasoning.

Use `--trap-damage`, `--potion-kinds`, `--key-materials`, `--treasure-types`, `--poison-damage`, `--poison-duration`, and `--speed-duration` only when a custom rule mix is intentional. Record every override.

For formal or longitudinal evaluation, first record the installed package version with `npx maze-test --version`, then pin that version in every command. Also record the requested seed and the complete option list.

Generate a question:

```sh
npx maze-test@<version> question --seed <seed> --rows 15 --cols 15 --scenario success --lang en
```

Use `--format json` when a pipeline needs structured question sections. Question JSON does not contain the answer.

## Collect the response

Give only the generated question to the model or person being evaluated. Ask for every field listed in that generated trial and save the response verbatim before continuing.

When solving the question yourself, explicitly state all requested answers before retrieving the reference answer. Explanations may be useful, but they do not replace the requested fields.

## Generate the reference answer

Change only the command from `question` to `answer`. Keep the package version, requested seed, and every option identical:

```sh
npx maze-test@<version> answer --seed <seed> --rows 15 --cols 15 --scenario success --lang en --format json
```

If the question reports an effective maze seed different from the requested seed, still rerun the answer command with the original requested seed. The requested seed deterministically drives the valid-maze search.

## Score or diagnose

For exact scoring, response normalization, capability groupings, and the result schema, read [references/scoring.md](references/scoring.md).

Score every question field independently. Use the base field set plus any material-key, typed-treasure, time, speed, and poison fields shown by the generated trial. Do not score `blockedAfterDeath`; it is diagnostic metadata rather than a displayed question.

Inspect the programmatic simulation trace only after scoring, and only when the user requests error analysis or when locating the first incorrect reasoning step would be useful. Never use the trace as hidden assistance during the evaluated solve.

## Report results

Report at least:

- Package version.
- Requested seed and, if different, effective maze seed.
- Complete generation parameters.
- Raw evaluated response when preserving an experiment record.
- Per-field correctness and total score out of the number of displayed questions.
- Whether the answer was fixed before the reference answer was generated.

Clearly separate observed results from interpretation. Do not claim that a single trial measures general intelligence or establishes broad model superiority.

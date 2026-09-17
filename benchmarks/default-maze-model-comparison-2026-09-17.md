# Default Maze Model Comparison — 2026-09-17

This benchmark compares five model/reasoning configurations on deterministic English `maze-test` questions. It is intended as a small, reproducible comparison of long-horizon spatial and state-tracking performance, not as a general intelligence ranking.

## Result summary

Each trial has 11 scored answer fields. Two seeds were tested at each size, so every size is worth 22 points and the full run is worth 66 points.

| Model | Reasoning | 21×21 | 51×51 | 101×101 | Total | Fully correct trials |
|---|---:|---:|---:|---:|---:|---:|
| `gpt-6-astra` | high | 22/22 (100%) | 22/22 (100%) | 22/22 (100%) | **66/66 (100%)** | 6/6 |
| `gpt-5.6-sol` | high | 22/22 (100%) | 22/22 (100%) | 22/22 (100%) | **66/66 (100%)** | 6/6 |
| `gpt-5.6-terra` | high | 16/22 (72.7%) | 19/22 (86.4%) | 18/22 (81.8%) | **53/66 (80.3%)** | 2/6 |
| `gpt-5.6-luna` | high | 22/22 (100%) | 15/22 (68.2%) | 0/22 (0%) | **37/66 (56.1%)** | 3/6 |
| `gpt-5.6-terra` | medium | 10/22 (45.5%) | 9/22 (40.9%) | 9/22 (40.9%) | **28/66 (42.4%)** | 0/6 |

Two configurations achieved identical perfect scores in this sample. Luna/high's 101×101 score is zero because it explicitly abstained on both trials. Terra/medium initially reported that the 101×101 sequences were too long for reliable manual tracking, then supplied best-effort predictions when required to complete both attempts.

## Method

- Package: `maze-test` 0.3.0
- Repository commit: `7f514e409eff525aa25d39c6bef9c7e954a8df94`
- Worktree at evaluation time: clean
- Language: English (default)
- Mechanism complexity: `basic` (default)
- Scenario: `success` (default)
- Seeds: `1101` and `1102`
- Sizes: `21×21`, `51×51`, and `101×101`
- Runs per model: 6
- Total evaluated runs: 30

Every model received the same six trials in ascending size order. A model could generate and view only the question:

```sh
node dist/cli.js question --seed <seed> --rows <size> --cols <size>
```

For long output, the same command could be piped to `sed -n` solely to view non-overlapping line ranges. Models were prohibited from invoking the answer command, requesting JSON, reading source/tests, using trace or state tools, or writing a programmatic solver. Each prediction was fixed before the next trial. No reference answer was generated until every model response had been frozen.

After all responses were fixed, references were generated with:

```sh
node dist/cli.js answer --seed <seed> --rows <size> --cols <size> --format json
```

Each displayed answer field earns one point for an exact match. Boolean spellings such as `yes` and `true` were treated as equivalent. An abstention earns 0/11.

## Trials and reference answers

The tuple order used below is:

`finalPosition, keys, treasures, health, alive, reachedGoal, openedDoors, openedChests, triggeredTraps, usedMedicines, blockedMoves`

| Trial | Atomic moves | Reference tuple |
|---|---:|---|
| 21×21 / 1101 | 128 | `D6, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 21×21 / 1102 | 136 | `D10, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1101 | 598 | `T16, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1102 | 620 | `H42, 0, 0, 3, true, true, 1, 0, 2, 1, 0` |
| 101×101 / 1101 | 2,272 | `AJ10, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 101×101 / 1102 | 2,458 | `V34, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |

## Per-trial scores

| Model / reasoning | 21/1101 | 21/1102 | 51/1101 | 51/1102 | 101/1101 | 101/1102 |
|---|---:|---:|---:|---:|---:|---:|
| `gpt-6-astra` / high | 11/11 | 11/11 | 11/11 | 11/11 | 11/11 | 11/11 |
| `gpt-5.6-sol` / high | 11/11 | 11/11 | 11/11 | 11/11 | 11/11 | 11/11 |
| `gpt-5.6-terra` / high | 5/11 | 11/11 | 11/11 | 8/11 | 9/11 | 9/11 |
| `gpt-5.6-luna` / high | 11/11 | 11/11 | 11/11 | 4/11 | 0/11 | 0/11 |
| `gpt-5.6-terra` / medium | 4/11 | 6/11 | 5/11 | 4/11 | 5/11 | 4/11 |

## Field mismatches

| Model / reasoning | Trial | Incorrect fields |
|---|---|---|
| `gpt-5.6-terra` / high | 21×21 / 1101 | `finalPosition`, `health`, `reachedGoal`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-terra` / high | 51×51 / 1102 | `health`, `triggeredTraps`, `usedMedicines` |
| `gpt-5.6-terra` / high | 101×101 / 1101 | `health`, `usedMedicines` |
| `gpt-5.6-terra` / high | 101×101 / 1102 | `health`, `usedMedicines` |
| `gpt-5.6-luna` / high | 51×51 / 1102 | `finalPosition`, `health`, `reachedGoal`, `openedDoors`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-luna` / high | 101×101 / 1101 | `ABSTAIN` — all 11 fields |
| `gpt-5.6-luna` / high | 101×101 / 1102 | `ABSTAIN` — all 11 fields |
| `gpt-5.6-terra` / medium | 21×21 / 1101 | `finalPosition`, `health`, `reachedGoal`, `openedDoors`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-terra` / medium | 21×21 / 1102 | `finalPosition`, `reachedGoal`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-terra` / medium | 51×51 / 1101 | `finalPosition`, `health`, `reachedGoal`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-terra` / medium | 51×51 / 1102 | `finalPosition`, `health`, `reachedGoal`, `openedDoors`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-terra` / medium | 101×101 / 1101 | `finalPosition`, `reachedGoal`, `openedDoors`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |
| `gpt-5.6-terra` / medium | 101×101 / 1102 | `finalPosition`, `health`, `reachedGoal`, `openedDoors`, `triggeredTraps`, `usedMedicines`, `blockedMoves` |

Rows absent from this table were exact matches.

## Captured predictions

The following is a normalized transcription of the values returned by each evaluated model. Values were not corrected after reference generation.

### `gpt-6-astra` / high

| Trial | Prediction tuple |
|---|---|
| 21×21 / 1101 | `D6, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 21×21 / 1102 | `D10, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1101 | `T16, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1102 | `H42, 0, 0, 3, true, true, 1, 0, 2, 1, 0` |
| 101×101 / 1101 | `AJ10, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 101×101 / 1102 | `V34, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |

### `gpt-5.6-sol` / high

| Trial | Prediction tuple |
|---|---|
| 21×21 / 1101 | `D6, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 21×21 / 1102 | `D10, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1101 | `T16, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1102 | `H42, 0, 0, 3, true, true, 1, 0, 2, 1, 0` |
| 101×101 / 1101 | `AJ10, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 101×101 / 1102 | `V34, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |

### `gpt-5.6-terra` / high

| Trial | Prediction tuple |
|---|---|
| 21×21 / 1101 | `A14, 0, 0, 5, true, false, 1, 0, 0, 0, 51` |
| 21×21 / 1102 | `D10, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1101 | `T16, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1102 | `H42, 0, 0, 5, true, true, 1, 0, 0, 0, 0` |
| 101×101 / 1101 | `AJ10, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 101×101 / 1102 | `V34, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |

### `gpt-5.6-luna` / high

| Trial | Prediction tuple |
|---|---|
| 21×21 / 1101 | `D6, 0, 0, 4, true, true, 1, 0, 2, 1, 0` |
| 21×21 / 1102 | `D10, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1101 | `T16, 0, 0, 5, true, true, 1, 0, 2, 2, 0` |
| 51×51 / 1102 | `J42, 0, 0, 5, true, false, 0, 0, 0, 0, 39` |
| 101×101 / 1101 | `ABSTAIN` |
| 101×101 / 1102 | `ABSTAIN` |

### `gpt-5.6-terra` / medium

| Trial | Prediction tuple |
|---|---|
| 21×21 / 1101 | `N2, 0, 0, 5, true, false, 0, 0, 0, 0, 41` |
| 21×21 / 1102 | `B12, 0, 0, 5, true, false, 1, 0, 1, 1, 7` |
| 51×51 / 1101 | `T22, 0, 0, 4, true, false, 1, 0, 1, 0, 154` |
| 51×51 / 1102 | `N8, 0, 0, 5, true, false, 0, 0, 0, 0, 316` |
| 101×101 / 1101 | `BJ26, 0, 0, 4, true, false, 0, 0, 1, 0, 1000` |
| 101×101 / 1102 | `T46, 0, 0, 5, true, false, 0, 0, 0, 0, 1000` |

## 201×201 advanced follow-up

A separate stress test was run with the two configurations that scored perfectly in the default suite. Both models received the same two trials.

- Package: `maze-test` 0.3.0
- Repository commit: `7f514e409eff525aa25d39c6bef9c7e954a8df94`
- Seeds: `20101` and `20102`
- Rows and columns: `201×201`
- Complexity: `advanced`
- Scenario: `success`
- Language: English
- Braid: `0`
- Doors/chests/traps/potions: `3 / 3 / 3 / 5`
- Maximum attempts: `1`

The generated questions were frozen as plain-text files before evaluation. Models could page only those question files and were prohibited from using source code, answers, JSON, simulator state, traces, scripts, programmatic parsing, or calculation. Both responses were fixed before either reference answer was generated.

Although the question lists 20 numbered items, the final-speed item asks for both `finalSpeed` and `speedRemaining`; therefore each trial has 21 independently scored fields. An explicit abstention scores 0/21.

### Results

| Model / reasoning | Seed 20101 | Seed 20102 | Total |
|---|---:|---:|---:|
| `gpt-6-astra` / high | ABSTAIN — 0/21 | ABSTAIN — 0/21 | **0/42 (0%)** |
| `gpt-5.6-sol` / high | ABSTAIN — 0/21 | ABSTAIN — 0/21 | **0/42 (0%)** |

Both models explicitly reported that the questions exceeded their manual capacity under the no-parsing/no-calculation boundary. These are recorded as abstentions rather than inferred wrong answers or timeouts.

### Reference answers

Tuple order:

`finalPosition, keys, treasures, health, alive, reachedGoal, openedDoors, openedChests, triggeredTraps, usedPotions, blockedMoves, copperKeys, silverKeys, goldKeys, coins, gems, relics, elapsedTime, finalSpeed, speedRemaining, poisonRemaining`

| Seed | Atomic moves | Question size | Reference tuple |
|---:|---:|---:|---|
| 20101 | 6,988 | 840 lines / 174,314 bytes | `AZ148, 0, 0, 2, true, true, 3, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 13972, normal, 0, 0` |
| 20102 | 6,958 | 836 lines / 176,391 bytes | `H22, 0, 0, 1, true, true, 3, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 13920, normal, 0, 0` |

### Generator performance observation

Before the optimization described below, the two 201×201 questions with three doors each took roughly 2–2.5 minutes to generate even with `maxAttempts=1`; output rendering began only after the expensive generation phase. As a controlled comparison, seed `20101` with the same dimensions, complexity, scenario, language, and attempt limit but `doorCount=0` completed in 0.66 seconds. Source inspection identified repeated full-graph shortest-path searches while selecting non-bypassable door cells as the dominant scalability risk. This timing is an implementation performance observation, not part of the model score.

## Generator optimization follow-up

The door-selection algorithm was changed to construct the maze graph once and find entry-goal separating vertices with a single iterative low-link traversal. Door candidates are then filtered against that separator set instead of rebuilding the graph and running a new breadth-first search for nearly every main-path cell.

- Package version after the change: `0.4.0`
- Base repository commit: `7f514e409eff525aa25d39c6bef9c7e954a8df94`
- `src/maze.ts` SHA-256 during this run: `b6519deb745fa88380acb14c78fc517be4463555bbb108d67086ae304f40b3cb`
- 201×201 / seed 20101 / three doors: approximately 147 seconds before, 0.73 seconds after
- 201×201 / seed 20102 / three doors: approximately 150 seconds before, 0.73 seconds after
- Observed improvement: approximately 200×
- Compatibility check: both optimized question files were byte-for-byte identical to the corresponding pre-optimization files
- Verification: type checking, build, and all 12 tests passed; the added regression test independently removes every selected door and confirms that no entry-goal path remains across unbraided and braided mazes

## 101×101 advanced mechanism-tour follow-up

After optimization, Astra/high and Sol/high were evaluated on two 101×101 trials configured to exercise every advanced mechanism.

- Package: `maze-test` 0.4.0
- Seeds: `10101` and `10102`
- Rows and columns: `101×101`
- Complexity: `advanced`
- Scenario: `mechanism-tour`
- Language: English
- Braid: `0`
- Doors/chests/traps/potions: `3 / 3 / 3 / 5`
- Maximum attempts: `1`
- Scored fields per trial: 21

The questions were frozen before evaluation. Each model could page only the question text and could not inspect source, answers, JSON, traces, simulator state, or use programmatic parsing or calculation. All responses were fixed before reference generation.

### Results

| Model / reasoning | Seed 10101 | Seed 10102 | Total |
|---|---:|---:|---:|
| `gpt-6-astra` / high | ABSTAIN — 0/21 | ABSTAIN — 0/21 | **0/42 (0%)** |
| `gpt-5.6-sol` / high | ABSTAIN — 0/21 | ABSTAIN — 0/21 | **0/42 (0%)** |

Both models explicitly abstained because they could not reliably maintain the full manual movement and mechanism-state ledger under the evaluation restrictions.

### Reference answers

Tuple order:

`finalPosition, keys, treasures, health, alive, reachedGoal, openedDoors, openedChests, triggeredTraps, usedPotions, blockedMoves, copperKeys, silverKeys, goldKeys, coins, gems, relics, elapsedTime, finalSpeed, speedRemaining, poisonRemaining`

| Seed | Atomic moves | Question size | Reference tuple |
|---:|---:|---:|---|
| 10101 | 10,824 | 1,028 lines / 130,414 bytes | `R10, 3, 6, 992, true, true, 3, 3, 3, 5, 0, 1, 1, 1, 2, 3, 1, 21648, normal, 0, 0` |
| 10102 | 10,682 | 1,028 lines / 130,279 bytes | `AD66, 3, 6, 992, true, true, 3, 3, 3, 5, 0, 1, 1, 1, 1, 2, 3, 21364, normal, 0, 0` |

Question generation took 0.74 and 0.72 seconds respectively. Reference-answer generation took 0.84 and 0.81 seconds respectively.

## Interpretation limits

- There are only two seeds per size; small samples can overstate differences.
- All questions use the default English/basic/success configuration, so this does not measure bilingual performance or advanced mechanisms.
- Runs were not repeated to measure variance within the same model configuration.
- The 101×101 trials contain more than 2,000 atomic moves. They test persistence and bookkeeping as much as local maze navigation.
- Model identifiers describe the configurations available on the evaluation date; provider-side model updates may change future results.

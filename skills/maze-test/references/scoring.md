# Scoring maze-test responses

Use this reference after the evaluated response has been fixed and the reference answer has been generated.

## Standard answer fields

Score these eleven fields independently:

| # | Question | JSON field | Type |
|---:|---|---|---|
| 1 | Final position | `finalPosition` | Coordinate string |
| 2 | Keys remaining | `keys` | Integer |
| 3 | Treasures collected | `treasures` | Integer |
| 4 | Health remaining | `health` | Integer |
| 5 | Alive at the end | `alive` | Boolean |
| 6 | Ever reached the goal | `reachedGoal` | Boolean |
| 7 | Doors opened | `openedDoors` | Integer |
| 8 | Chests opened | `openedChests` | Integer |
| 9 | Traps triggered | `triggeredTraps` | Integer |
| 10 | Medicine rooms used | `usedMedicines` | Integer |
| 11 | Moves that did not change position | `blockedMoves` | Integer |

`blockedAfterDeath` may appear in answer JSON but is diagnostic metadata, not a standard scored field.

## Normalization

Normalize only presentation differences that preserve an unambiguous answer:

- Compare coordinates case-insensitively, then report them in uppercase, such as `L10`.
- Treat localized yes/no forms such as `yes`, `no`, `是`, and `否` as booleans.
- Accept an integer written as a digit or an unambiguous number word.
- Ignore surrounding whitespace and Markdown table formatting.

Do not infer a missing field from an explanation. Do not award partial credit within a field. If a response gives multiple conflicting values for one field and does not identify a final choice, mark that field incorrect.

## Score

Award one point for each exact normalized match:

```text
score = correct fields / 11
```

Report both the integer score and percentage. Preserve the per-field comparison so that aggregate scores remain auditable.

Suggested table:

```markdown
| Field | Response | Reference | Correct |
|---|---:|---:|:---:|
| Final position | L10 | L10 | ✓ |
```

## Capability groupings

Use these groupings only as descriptive diagnostics; they are not independent psychometric scales:

- Spatial execution: `finalPosition`, `reachedGoal`, `blockedMoves`.
- Resource accounting: `keys`, `treasures`, `openedDoors`, `openedChests`.
- Event and health tracking: `health`, `alive`, `triggeredTraps`, `usedMedicines`.

## Reproducibility record

For a durable result, store:

- `maze-test` package version.
- Requested seed.
- Effective maze seed when reported.
- Rows, columns, braid probability, and object counts.
- Scenario, language, style, minimum distance, and maximum attempts.
- Exact question text.
- Raw evaluated response.
- Structured reference answer.
- Per-field score.
- Timestamp and evaluated model identifier, when available.

Do not rely only on defaults for a long-lived benchmark record. Defaults may change between package versions, so record the resolved options from JSON output or write every option explicitly.

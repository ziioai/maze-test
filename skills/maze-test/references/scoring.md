# Scoring maze-test responses

Use this reference after the evaluated response has been fixed and the reference answer has been generated.

## Displayed answer fields

Score exactly the fields displayed by the generated question. Every trial has ten common fields; it then displays either medicine rooms or potions according to the generated objects, plus any configured material-key, typed-treasure, time, speed, and poison fields.

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
| 10 | Medicine rooms used, when displayed | `usedMedicines` | Integer |
| 10 | Potions drunk, when displayed | `usedPotions` | Integer |
| 11 | Moves that did not change position | `blockedMoves` | Integer |

Advanced or customized trials can add displayed fields for each configured material key (`keysByMaterial`), each configured treasure type (`treasuresByType`), elapsed time (`elapsedTime`), final speed and its remaining instruction count (`finalSpeed`, `speedRemaining`), and remaining poison instructions (`poisonRemaining`). Score exactly the fields displayed in the question.

The advanced preset with all three key materials, all three typed treasures, potions, time, speed, and poison has 21 scored fields. The numbered question about final speed requests two distinct values: `finalSpeed` and `speedRemaining`.

`blockedAfterDeath` and `poisonDamage` may appear in answer JSON as diagnostic state but are not scored unless the question explicitly displays them.

## Normalization

Normalize only presentation differences that preserve an unambiguous answer:

- Compare coordinates case-insensitively, then report them in uppercase, such as `L10`.
- Treat localized yes/no forms such as `yes`, `no`, `是`, and `否` as booleans.
- Accept an integer written as a digit or an unambiguous number word.
- Ignore surrounding whitespace and Markdown table formatting.

Do not infer a missing field from an explanation. Do not award partial credit within a field. If a response gives multiple conflicting values for one field and does not identify a final choice, mark that field incorrect.

## Completion status

Record completion separately from field accuracy:

- `completed`: the response supplies every requested field.
- `abstained`: the evaluator explicitly declines the trial.
- `timed out`: the run ends because of a declared time limit.
- `truncated`: the model could not access the complete frozen question or its response was cut off.
- `incomplete`: the response is returned but omits one or more requested fields.

An abstention, timeout, or truncation scores 0 for missing fields, but it must remain visible as an outcome rather than being reported only as “wrong.” Never force a guessed answer after the benchmark policy has allowed abstention unless that retry is recorded as a separate run.

## Score

Award one point for each exact normalized match:

```text
score = correct displayed fields / displayed field count
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
- Temporal reasoning: `elapsedTime`, `finalSpeed`, `speedRemaining`, `poisonRemaining`.

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
- Completion status.
- Realized atomic action count, displayed-field count, and question size.
- Per-field score.
- Timestamp and evaluated model identifier, when available.

Do not rely only on defaults for a long-lived benchmark record. Defaults may change between package versions, so record the resolved options from JSON output or write every option explicitly.

# Calibrating maze-test difficulty

Read this reference when choosing a difficulty profile, building a benchmark suite, or interpreting why models that solve one maze size fail another.

## Difficulty is a profile

Do not label a trial only by its dimensions. Record the combination of:

- Dimensions and requested seed.
- Mechanism complexity and every override.
- Scenario.
- Braid probability and minimum distance.
- Door, chest, trap, and potion counts.
- Language and wording style.
- Realized atomic action count, displayed-field count, and question size after the evaluated response is fixed.

These values affect different capabilities:

| Axis | Main controls | Primary load |
|---|---|---|
| Route length | dimensions, seed, minimum distance, scenario | Sustained position and state tracking |
| Rule complexity | complexity preset and mechanism overrides | Resource, health, status, and time rules |
| Route coverage | scenario | Whether generated objects and edge cases are actually visited |
| Topology | braid | Alternative routes and non-bypassable-door availability |
| Reporting | displayed fields | Final state reconstruction and completeness |
| Language | language and style | Wording and cross-lingual robustness |

`advanced` does not by itself make a long trial. It adds state variables and temporal rules. `mechanism-tour` deliberately visits every generated object and can make a smaller maze substantially longer than a larger `success` trial.

## Suggested profiles

Use these as starting points, not universal psychometric levels:

| Profile | Dimensions | Complexity | Scenario | Purpose |
|---|---:|---|---|---|
| Quick check | 21×21 | basic | success | Fast spatial and bookkeeping check |
| Advanced rules | 21×21 | advanced | mechanism-tour | Exercise the full rule set at manageable length |
| Long-horizon challenge | 51×51 | advanced | mechanism-tour | Combine thousands of movements with all state fields |
| Extreme stress | 101×101 | advanced | mechanism-tour | Probe completion limits; abstention may be expected |

If a user supplies only a qualitative label:

- Prefer `21×21 basic success` for “easy” or a quick check.
- Prefer `21×21 advanced mechanism-tour` when “hard” means rule complexity.
- Prefer `51×51 advanced mechanism-tour` when “hard” means long-horizon tracking.
- Use `101×101 advanced mechanism-tour` only when the user wants an extreme stress test or an abstention boundary.

Always disclose the selected parameters. Do not silently equate “hard” with the largest supported dimensions.

## Calibration workflow

1. Identify the target capability: spatial execution, rule application, long-horizon tracking, temporal accounting, or cross-lingual robustness.
2. Choose complexity and scenario first, then choose dimensions.
3. Freeze at least two seeds for a comparison; give every evaluated model the same question text.
4. Decide the tool boundary, time limit, and abstention policy before collecting responses.
5. Generate no answer, trace, or simulator state until every evaluated response for that trial is fixed.
6. Afterward, record `actionCount`, scored-field count, question size, completion status, and exact field score.
7. If every model is perfect or every model abstains, adjust one axis and repeat. Changing several axes at once prevents attribution.

For a scaling study, prefer a ladder such as 21×21 → 31×31 → 41×41 → 51×51 with fixed complexity, scenario, and object counts. Seeds still cause substantial variation, so use repeated trials rather than treating one result as a threshold.

## Observed calibration examples

The repository benchmark currently contains the following two-seed observations:

| Profile | Atomic moves | Astra/high | Sol/high |
|---|---:|---:|---:|
| 21×21, advanced, mechanism-tour | 548–604 | 100% | 100% |
| 51×51, advanced, mechanism-tour | 2,548–3,612 | 95.2% | Abstained |
| 101×101, advanced, mechanism-tour | 10,682–10,824 | Abstained | Abstained |

At the same dimensions, simpler scenarios can be much easier: both configurations scored 100% on 51×51 and 101×101 `basic success` trials with shorter action sequences.

Treat these as local calibration evidence, not model rankings or universal cutoffs. Model versions, inference settings, tool access, prompt policy, and seeds can all change the result.

## Reporting difficulty

Report both planned and realized difficulty:

```text
Planned profile: 51×51, advanced, mechanism-tour, braid 0,
3 doors, 3 chests, 3 traps, 5 potions, English.

Realized trial: seed 5101, effective seed 5101,
3,612 atomic moves, 21 scored fields, 49,417-byte question.
```

Keep completion rate separate from field accuracy. A model that abstains did not produce a 0%-accurate completed answer; it produced an abstention that receives 0 field points under the chosen scoring policy.

# maze-test

Generate deterministic bilingual maze reasoning questions and matching answer keys from the command line or a TypeScript API.

[中文文档](./README-CN.md)

[![skills.sh](https://skills.sh/b/ziioai/maze-test)](https://skills.sh/ziioai/maze-test)

The maze uses solid wall cells and open passage cells. Trials can include material-matched doors, keys and chests, typed treasures, variable-damage traps, healing and poison, antidotes, speed effects, movement-time accounting, and a fully reproducible action sequence.

## Built for evaluating LLM reasoning

`maze-test` is particularly well suited for testing the reasoning ability of large language models. Each trial combines several abilities in one reproducible task:

- **Spatial reasoning:** reconstruct and traverse a maze described entirely in text.
- **Long-horizon state tracking:** execute a potentially long sequence of atomic movements without losing the current position.
- **Rule application:** distinguish walls, open and closed doors, blocked moves, and post-death behavior.
- **Resource accounting:** distinguish copper, silver, and gold keys; open matching locks; and count coins, gems, and relics.
- **One-time event memory:** remember which keys, traps, chests, medicine rooms, and potions have already been used.
- **Temporal reasoning:** apply poison and speed effects over exact instruction windows, including blocked moves.
- **Counterfactual-resistant evaluation:** the question and answer are generated independently from the same explicit seed and parameters, making results easy to reproduce and audit.
- **Cross-lingual evaluation:** generate equivalent tasks in English or Chinese and vary their wording deterministically.

Difficulty can be controlled through maze size, mechanism complexity, scenario, braiding, object counts, path-length threshold, and wording style. These controls affect different capabilities and should not be collapsed into a single “maze size” label. Question output is separated from the answer key, while the reference simulator provides structured answers and a complete step trace through the TypeScript API.

A simple LLM evaluation protocol is:

1. Generate a question and record its seed and parameters.
2. Give only the question output to the model.
3. Require the model to return every field requested by that trial (advanced trials add material, treasure, time, and status fields).
4. Generate the answer key with exactly the same seed and parameters.
5. Score exact field accuracy, or inspect the simulator trace to locate the first reasoning error.

## Understanding difficulty

`maze-test` difficulty is multidimensional. A larger map is not automatically harder than a smaller trial with more mechanisms and a route that revisits every object.

| Difficulty axis | Main controls | What it stresses |
|---|---|---|
| Route length | `--rows`, `--cols`, seed, `--min-distance`, scenario | Long-horizon position and state tracking |
| Rule complexity | `--complexity` and mechanism overrides | Keys, locks, typed treasure, health, poison, speed, and time |
| Route coverage | `--scenario` | Which objects and edge cases the action sequence actually exercises |
| Topology | `--braid` | Alternative routes and bypassable-door constraints; not monotonically harder |
| Output burden | Displayed fields and question length | How much state must be returned and audited |
| Language variation | `--lang`, `--style` | Cross-lingual and wording robustness rather than maze complexity itself |

In particular, `advanced` changes the rule set, while `mechanism-tour` forces the route to visit every generated mechanism. Combining them is much harder than either option alone. After an evaluated response is fixed, the answer JSON's `actionCount` is a useful measure of the trial's realized length. Do not inspect it before the response in a no-leak evaluation.

Suggested starting profiles:

| Profile | Parameters | Intended use |
|---|---|---|
| Quick check | `21×21`, `basic`, `success` | Fast spatial and bookkeeping sanity check |
| Advanced rules | `21×21`, `advanced`, `mechanism-tour` | Complete rule coverage at manageable route length |
| Long-horizon challenge | `51×51`, `advanced`, `mechanism-tour` | Thousands of movements plus the full state ledger |
| Extreme stress test | `101×101`, `advanced`, `mechanism-tour` | Deliberately tests completion limits and may produce abstentions |

For example:

```sh
npx maze-test question --seed 2101 --rows 21 --cols 21 \
  --complexity advanced --scenario mechanism-tour
```

The current two-seed benchmark illustrates why dimensions alone are insufficient:

| Trial profile | Observed atomic moves | Astra/high | Sol/high |
|---|---:|---:|---:|
| 51×51, basic, success | 598–620 | 100% | 100% |
| 51×51, advanced, mechanism-tour | 2,548–3,612 | 95.2% | Abstained |
| 101×101, basic, success | 2,272–2,458 | 100% | 100% |
| 101×101, advanced, mechanism-tour | 10,682–10,824 | Abstained | Abstained |

These figures are calibration examples from only two seeds, not universal model rankings. For a fair comparison, use the same seeds and full parameter set, report completion separately from field accuracy, and scale one difficulty axis at a time. See the [full benchmark record](./benchmarks/default-maze-model-comparison-2026-09-17.md).

## Agent Skill

Install the `maze-test` Agent Skill from this repository:

```sh
npx skills add ziioai/maze-test --skill maze-test
```

Install it specifically for Codex:

```sh
npx skills add ziioai/maze-test --skill maze-test --agent codex
```

The Skill guides an agent through difficulty selection, leak-free question generation, response collection, reference-answer generation, exact field scoring, and reproducible result reporting. It treats completion status and field accuracy separately, so abstentions and truncation remain visible.

## Quick start

Generate an English question:

```sh
npx maze-test question --seed 42 --rows 15 --cols 15
```

Generate its answer key using exactly the same seed and parameters:

```sh
npx maze-test answer --seed 42 --rows 15 --cols 15
```

Chinese output:

```sh
npx maze-test question --seed 42 --lang zh
npx maze-test answer --seed 42 --lang zh
```

Generate a trial that deliberately exercises every advanced mechanism:

```sh
npx maze-test question --seed 42 --complexity advanced --scenario mechanism-tour
npx maze-test answer   --seed 42 --complexity advanced --scenario mechanism-tour
```

## Mechanism complexity

- `basic` preserves the original rules: ordinary keys and locks, generic treasures, one-damage traps, and medicine rooms.
- `intermediate` adds variable trap damage, healing potions, poison, antidotes, and coin/gem/relic treasure types.
- `advanced` additionally adds copper/silver/gold keys and matching locks, haste and slow potions, and elapsed-time accounting.

The presets are deterministic and can be overridden with the list and duration options below. `mechanism-tour` visits every generated object and is useful when evaluating the complete configured rule set.

`question` is the default command, so this is also valid:

```sh
npx maze-test --seed 42
```

## Options

| Option | Description | Default |
|---|---|---:|
| `--seed` | Non-negative root seed | `1` |
| `--rows` | Odd row count, at least 7 | `15` |
| `--cols` | Odd column count, at least 7 | `15` |
| `--braid` | Probability from 0 to 1 of opening a dead end | `0` |
| `--complexity` | `basic`, `intermediate`, or `advanced` | `basic` |
| `--doors` | Number of doors and corresponding keys | preset |
| `--chests` | Number of treasure chests | preset |
| `--traps` | Number of traps | preset |
| `--potions` | Number of potion objects (`basic` renders these as medicine rooms) | preset |
| `--medicines` | Legacy alias for `--potions` | preset |
| `--trap-damage` | Comma-separated positive damage values | preset |
| `--potion-kinds` | Comma-separated `healing,poison,antidote,haste,slow` subset | preset |
| `--key-materials` | Comma-separated `copper,silver,gold` subset | preset |
| `--treasure-types` | Comma-separated `treasure,coin,gem,relic` subset | preset |
| `--poison-damage` | Health lost per poison tick | `1` |
| `--poison-duration` | Number of later atomic instructions affected | `3` |
| `--speed-duration` | Number of later atomic instructions affected | `4` |
| `--scenario` | `success`, `treasure-and-leave`, `death-and-stop`, or `mechanism-tour` | `success` |
| `--lang` | `en` or `zh` | `en` |
| `--style` | Non-negative deterministic wording variation | `0` |
| `--min-distance` | Minimum entry-to-goal distance | `0` |
| `--max-attempts` | Deterministic search limit | `500` |
| `--format` | `text` or `json` | `text` |
| `--json` | Alias for `--format json` | — |

See all options with:

```sh
npx maze-test --help
```

## Scenarios

- `success`: follows the main path, collects required keys, opens the gating doors, and reaches the goal alive.
- `treasure-and-leave`: visits a medicine room and a chest, reaches the goal, leaves it again, and includes blocked moves.
- `death-and-stop`: reaches a trap with one health point, dies, and demonstrates that later actions no longer change state.
- `mechanism-tour`: visits all generated objects, opens every chest, triggers every trap, drinks every potion, and reaches the goal.

Some braided mazes cannot support the requested number of non-bypassable doors. In that case, the root seed drives a deterministic search for the next valid maze seed. Both the requested seed and effective maze seed are reported, and identical inputs always produce identical output.

## JSON output

```sh
npx maze-test question --seed 42 --json
npx maze-test answer --seed 42 --json
```

Question JSON contains the localized question sections but no answer. Answer JSON contains the structured answer values and formatted answer key.

## TypeScript API

```ts
import {
  generateAnswer,
  generateQuestion,
  generateTrial,
} from "maze-test";

const options = {
  seed: 42,
  rows: 15,
  cols: 15,
  complexity: "advanced" as const,
  scenario: "mechanism-tour" as const,
  language: "en" as const,
};

const question = generateQuestion(options);
const answer = generateAnswer(options);

// Includes the maze, atomic actions, simulation trace, and structured answers.
const trial = generateTrial(options);
```

The lower-level maze generator, validator, renderer, coordinate helpers, shortest-path function, and reference simulator are also exported.

## 中文说明

该工具根据种子与参数生成可复现的迷宫推理试题。题面与答案应分别使用完全相同的参数生成：

```sh
npx maze-test question --seed 42 --rows 15 --cols 15 --lang zh
npx maze-test answer   --seed 42 --rows 15 --cols 15 --lang zh
```

迷宫由实心墙格和空心通路格组成，并支持金银铜钥匙与锁、不同宝物、不同伤害陷阱、治疗与毒药、解毒药、加减速和耗时核算。默认语言为英文，`--lang zh` 切换为中文。

由于题目能够稳定复现，同时综合考察空间推理、长程状态跟踪、规则执行、资源消耗和一次性事件记忆，本工具特别适合测试大语言模型的推理能力。完整中文说明见 [README-CN.md](./README-CN.md)。

## Development

```sh
pnpm install
pnpm check
```

The build emits ESM, CommonJS, type declarations, and source maps to `dist/`.

## Contributing

Bug reports, rule and wording improvements, new mechanisms, tests, documentation, and reproducible model evaluation results are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and benchmark submission requirements.

The current comparison report is available under [`benchmarks/`](./benchmarks/default-maze-model-comparison-2026-09-17.md). Results from any model or platform are welcome; scores should preserve the raw response and document the exact model, reasoning setting, parameters, tool access, and scoring method.

## License

[MIT](./LICENSE) © ziioai

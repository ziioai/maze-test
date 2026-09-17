# maze-test

Generate deterministic bilingual maze reasoning questions and matching answer keys from the command line or a TypeScript API.

The maze uses solid wall cells and open passage cells. Trials can include doors, keys, chests, traps, medicine rooms, movement rules, and a fully reproducible action sequence.

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
| `--doors` | Number of doors and corresponding keys | `1` |
| `--chests` | Number of treasure chests | `2` |
| `--traps` | Number of traps | `2` |
| `--medicines` | Number of medicine rooms | `2` |
| `--scenario` | `success`, `treasure-and-leave`, or `death-and-stop` | `success` |
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

迷宫由实心墙格和空心通路格组成，并支持门、钥匙、宝箱、陷阱、药品房、逐格行动规则和独立参照模拟器。默认语言为英文，`--lang zh` 切换为中文。

## Development

```sh
pnpm install
pnpm check
```

The build emits ESM, CommonJS, type declarations, and source maps to `dist/`.

## License

[MIT](./LICENSE) © ziioai

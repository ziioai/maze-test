# maze-test

Generate deterministic bilingual maze reasoning questions and matching answer keys from the command line or a TypeScript API.

[中文文档](./README-CN.md)

[![skills.sh](https://skills.sh/b/ziioai/maze-test)](https://skills.sh/ziioai/maze-test)

The maze uses solid wall cells and open passage cells. Trials can include doors, keys, chests, traps, medicine rooms, movement rules, and a fully reproducible action sequence.

## Built for evaluating LLM reasoning

`maze-test` is particularly well suited for testing the reasoning ability of large language models. Each trial combines several abilities in one reproducible task:

- **Spatial reasoning:** reconstruct and traverse a maze described entirely in text.
- **Long-horizon state tracking:** execute a potentially long sequence of atomic movements without losing the current position.
- **Rule application:** distinguish walls, open and closed doors, blocked moves, and post-death behavior.
- **Resource accounting:** collect and spend keys, open chests, and count treasures.
- **One-time event memory:** remember which keys, traps, chests, and medicine rooms have already been used.
- **Counterfactual-resistant evaluation:** the question and answer are generated independently from the same explicit seed and parameters, making results easy to reproduce and audit.
- **Cross-lingual evaluation:** generate equivalent tasks in English or Chinese and vary their wording deterministically.

Difficulty can be controlled through maze size, braiding, object counts, scenario, path-length threshold, and wording style. Question output is separated from the answer key, while the reference simulator provides structured answers and a complete step trace through the TypeScript API.

A simple LLM evaluation protocol is:

1. Generate a question and record its seed and parameters.
2. Give only the question output to the model.
3. Require the model to return the eleven requested answer fields.
4. Generate the answer key with exactly the same seed and parameters.
5. Score exact field accuracy, or inspect the simulator trace to locate the first reasoning error.

## Agent Skill

Install the `maze-test` Agent Skill from this repository:

```sh
npx skills add ziioai/maze-test --skill maze-test
```

Install it specifically for Codex:

```sh
npx skills add ziioai/maze-test --skill maze-test --agent codex
```

The Skill guides an agent through leak-free question generation, response collection, reference-answer generation, exact eleven-field scoring, and reproducible result reporting.

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

由于题目能够稳定复现，同时综合考察空间推理、长程状态跟踪、规则执行、资源消耗和一次性事件记忆，本工具特别适合测试大语言模型的推理能力。完整中文说明见 [README-CN.md](./README-CN.md)。

## Development

```sh
pnpm install
pnpm check
```

The build emits ESM, CommonJS, type declarations, and source maps to `dist/`.

## License

[MIT](./LICENSE) © ziioai

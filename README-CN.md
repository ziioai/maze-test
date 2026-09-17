# maze-test

根据种子与参数生成可复现的中英文迷宫推理试题和标准答案，既可以通过 `npx` 使用，也可以作为 TypeScript 库调用。

[English README](./README.md)

[![skills.sh](https://skills.sh/b/ziioai/maze-test)](https://skills.sh/ziioai/maze-test)

迷宫由实心墙格和空心通路格组成。试题可以包含材质匹配的门、钥匙和宝箱，不同类型的宝物，不同伤害的陷阱，治疗、毒药、解毒药、加减速、耗时核算，以及完整可复现的行动序列。

## 特别适合测试 LLM 推理能力

`maze-test` 特别适合用于测试大语言模型的推理能力。一道题能够同时考察多种相互依赖的能力：

- **空间推理：** 从纯文本地图描述中还原迷宫结构，并正确执行上下左右移动。
- **长程状态跟踪：** 在较长的原子行动序列中持续维护当前位置，避免中途丢失状态。
- **规则执行：** 正确区分墙格、门格、正常移动、受阻移动和死亡后的行动失效。
- **资源核算：** 区分金、银、铜钥匙与对应锁，并分别累计钱币、宝石和遗物。
- **一次性事件记忆：** 记住哪些钥匙、陷阱、宝箱、药品房和药水已经使用。
- **时序推理：** 在精确的指令窗口内结算中毒和速度效果，并处理撞墙等受阻指令。
- **可复现、可审计：** 题目和答案由相同的显式种子与参数独立生成，能够稳定复现并检查结果。
- **跨语言评测：** 同一生成机制支持英文和中文，并可通过 `style` 参数确定性地改变表述形式。

可以通过迷宫尺寸、回环率、对象数量、情境类型、最短路径阈值和文案风格控制难度。题面输出不包含答案；参照模拟器则能通过 TypeScript API 提供结构化答案和完整逐步轨迹，便于定位模型第一次发生推理错误的位置。

推荐的 LLM 评测流程：

1. 生成题目并记录种子和全部参数。
2. 只把题面交给待测模型。
3. 要求模型回答该题列出的全部字段；高级题会增加材质、宝物、耗时和状态字段。
4. 使用完全相同的种子和参数生成标准答案。
5. 按字段计算准确率，或者利用模拟轨迹分析模型的首个错误步骤。

## Agent Skill

从当前仓库安装名为 `maze-test` 的 Agent Skill：

```sh
npx skills add ziioai/maze-test --skill maze-test
```

仅安装到 Codex：

```sh
npx skills add ziioai/maze-test --skill maze-test --agent codex
```

该 Skill 会指导 Agent 在不泄漏答案的前提下生成题目、固定待测回答、生成参考答案、逐项精确评阅，并保存可复现的评测记录。

## 快速开始

生成中文题目：

```sh
npx maze-test question --seed 42 --rows 15 --cols 15 --lang zh
```

使用完全相同的种子和参数生成对应答案：

```sh
npx maze-test answer --seed 42 --rows 15 --cols 15 --lang zh
```

默认语言是英文：

```sh
npx maze-test question --seed 42
npx maze-test answer --seed 42
```

生成一套会依次覆盖全部高级机制的题目：

```sh
npx maze-test question --seed 42 --complexity advanced --scenario mechanism-tour --lang zh
npx maze-test answer   --seed 42 --complexity advanced --scenario mechanism-tour --lang zh
```

## 机制复杂度

- `basic` 保留原始机制：普通钥匙与锁、通用宝物、1 点伤害陷阱和药品房。
- `intermediate` 增加不同陷阱伤害、治疗药水、毒药、解毒药，以及钱币、宝石、遗物。
- `advanced` 进一步增加金银铜钥匙与对应锁、加速与减速药水，以及累计耗时。

每档预设都完全确定；也可以用下列列表和持续时间参数逐项覆盖。`mechanism-tour` 会访问全部生成对象，适合评测完整的机制组合。

`question` 是默认命令，因此也可以写成：

```sh
npx maze-test --seed 42 --lang zh
```

## 参数

| 参数 | 说明 | 默认值 |
|---|---|---:|
| `--seed` | 非负根种子 | `1` |
| `--rows` | 行数，必须是不小于 7 的奇数 | `15` |
| `--cols` | 列数，必须是不小于 7 的奇数 | `15` |
| `--braid` | 打通死路的概率，范围为 0 至 1 | `0` |
| `--complexity` | `basic`、`intermediate` 或 `advanced` | `basic` |
| `--doors` | 门及对应钥匙的数量 | 由预设决定 |
| `--chests` | 宝箱数量 | 由预设决定 |
| `--traps` | 陷阱数量 | 由预设决定 |
| `--potions` | 药水对象数量（`basic` 中显示为药品房） | 由预设决定 |
| `--medicines` | `--potions` 的兼容别名 | 由预设决定 |
| `--trap-damage` | 逗号分隔的正整数伤害值 | 由预设决定 |
| `--potion-kinds` | 从 `healing,poison,antidote,haste,slow` 中选择 | 由预设决定 |
| `--key-materials` | 从 `copper,silver,gold` 中选择 | 由预设决定 |
| `--treasure-types` | 从 `treasure,coin,gem,relic` 中选择 | 由预设决定 |
| `--poison-damage` | 每次中毒结算扣除的健康值 | `1` |
| `--poison-duration` | 中毒影响的后续原子指令数 | `3` |
| `--speed-duration` | 速度状态影响的后续原子指令数 | `4` |
| `--scenario` | `success`、`treasure-and-leave`、`death-and-stop` 或 `mechanism-tour` | `success` |
| `--lang` | `en` 或 `zh` | `en` |
| `--style` | 非负的确定性文案变化编号 | `0` |
| `--min-distance` | 入口到终点的最短距离下限 | `0` |
| `--max-attempts` | 确定性搜索次数上限 | `500` |
| `--format` | `text` 或 `json` | `text` |
| `--json` | `--format json` 的简写 | — |

查看完整命令帮助：

```sh
npx maze-test --help
```

## 四种情境

- `success`：沿主路径行动，取得所需钥匙、打开阻断路径的门，并存活到达终点。
- `treasure-and-leave`：经过药品房和宝箱，到达终点后再次离开，并包含受阻移动。
- `death-and-stop`：以一点健康值进入陷阱并死亡，用后续行动检验死亡后状态不再变化的规则。
- `mechanism-tour`：访问全部生成对象，打开全部宝箱、触发全部陷阱、饮用全部药水并到达终点。

带回环的迷宫不一定拥有足够多不可绕行的门格。遇到这种情况时，根种子会驱动一次确定性搜索，找到后续第一个满足约束的迷宫种子。输出会同时报告请求种子和实际迷宫种子；只要输入参数相同，最终结果就始终相同。

## JSON 输出

```sh
npx maze-test question --seed 42 --lang zh --json
npx maze-test answer --seed 42 --lang zh --json
```

题目 JSON 包含本地化后的四部分题面，不包含答案。答案 JSON 包含结构化答案和格式化答案文本。

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
  language: "zh" as const,
};

const question = generateQuestion(options);
const answer = generateAnswer(options);

// 包含迷宫、原子行动、模拟轨迹和结构化答案。
const trial = generateTrial(options);
```

包中还导出了底层迷宫生成器、校验器、字符画渲染器、坐标工具、最短路径函数和参照模拟器。

## 开发

```sh
pnpm install
pnpm check
```

构建结果同时包含 ESM、CommonJS、类型声明和 source map。

## 参与贡献

欢迎通过 GitHub 提交错误报告、规则和文案改进、新机制、测试、文档，以及可复现的模型评测成绩。开发流程和评测报告要求请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

当前的模型对比报告位于 [`benchmarks/`](./benchmarks/default-maze-model-comparison-2026-09-17.md)。欢迎提交任何模型、任何平台的结果；报告需要保留原始回答，并记录准确的模型、推理设置、试题参数、工具权限和评分方式。

## 许可证

[MIT](./LICENSE) © ziioai

# maze-test

根据种子与参数生成可复现的中英文迷宫推理试题和标准答案，既可以通过 `npx` 使用，也可以作为 TypeScript 库调用。

[English README](./README.md)

迷宫由实心墙格和空心通路格组成。试题可以包含门、钥匙、宝箱、陷阱、药品房、逐格移动规则和完整可复现的行动序列。

## 特别适合测试 LLM 推理能力

`maze-test` 特别适合用于测试大语言模型的推理能力。一道题能够同时考察多种相互依赖的能力：

- **空间推理：** 从纯文本地图描述中还原迷宫结构，并正确执行上下左右移动。
- **长程状态跟踪：** 在较长的原子行动序列中持续维护当前位置，避免中途丢失状态。
- **规则执行：** 正确区分墙格、门格、正常移动、受阻移动和死亡后的行动失效。
- **资源核算：** 拾取和消耗钥匙、开启宝箱并累计宝物。
- **一次性事件记忆：** 记住哪些钥匙已经取得、哪些陷阱已经触发、哪些宝箱或药品房已经使用。
- **可复现、可审计：** 题目和答案由相同的显式种子与参数独立生成，能够稳定复现并检查结果。
- **跨语言评测：** 同一生成机制支持英文和中文，并可通过 `style` 参数确定性地改变表述形式。

可以通过迷宫尺寸、回环率、对象数量、情境类型、最短路径阈值和文案风格控制难度。题面输出不包含答案；参照模拟器则能通过 TypeScript API 提供结构化答案和完整逐步轨迹，便于定位模型第一次发生推理错误的位置。

推荐的 LLM 评测流程：

1. 生成题目并记录种子和全部参数。
2. 只把题面交给待测模型。
3. 要求模型回答题目中的 11 个答案字段。
4. 使用完全相同的种子和参数生成标准答案。
5. 按字段计算准确率，或者利用模拟轨迹分析模型的首个错误步骤。

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
| `--doors` | 门及对应钥匙的数量 | `1` |
| `--chests` | 宝箱数量 | `2` |
| `--traps` | 陷阱数量 | `2` |
| `--medicines` | 药品房数量 | `2` |
| `--scenario` | `success`、`treasure-and-leave` 或 `death-and-stop` | `success` |
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

## 三种情境

- `success`：沿主路径行动，取得所需钥匙、打开阻断路径的门，并存活到达终点。
- `treasure-and-leave`：经过药品房和宝箱，到达终点后再次离开，并包含受阻移动。
- `death-and-stop`：以一点健康值进入陷阱并死亡，用后续行动检验死亡后状态不再变化的规则。

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

## 许可证

[MIT](./LICENSE) © ziioai

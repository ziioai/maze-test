# Contributing to maze-test

Contributions are welcome. You can help improve the generator, rules, documentation, translations, tests, Agent Skill, or submit reproducible evaluation results from any model or platform.

[中文说明](#中文贡献说明)

## Ways to contribute

- Report a bug or unclear rule through a GitHub issue.
- Propose a new mechanism, scenario, output format, or difficulty control.
- Improve the English or Chinese question wording and documentation.
- Add tests, fix code, or improve the CLI and TypeScript API.
- Submit model evaluation results for comparison with existing reports.

For substantial behavior changes, opening an issue first is encouraged so the rules and compatibility impact can be discussed before implementation.

## Code and documentation changes

1. Fork the repository and create a focused branch.
2. Install dependencies with `pnpm install`.
3. Make the smallest coherent change and add or update tests when behavior changes.
4. Run `pnpm check`.
5. Open a pull request explaining what changed, why it changed, and how it was verified.

Please preserve deterministic generation: identical seeds and options must continue to produce identical results unless the pull request intentionally documents a breaking change. Do not include credentials, private prompts, personal data, or unrelated generated files.

## Submitting evaluation results

Evaluation contributions are especially welcome, including results from non-OpenAI models, local models, different reasoning settings, Chinese questions, advanced mechanisms, and alternative maze sizes.

Place a report under:

```text
benchmarks/community/YYYY-MM-DD-<model-or-suite>.md
```

One trial is acceptable, but repeated trials and shared seeds make comparisons more useful. A report should include:

- Evaluation date and contributor name or GitHub handle.
- `maze-test` package version and repository commit, when available.
- Exact model identifier, provider/runtime, and reasoning or thinking setting.
- Language, seed, rows, columns, complexity, scenario, and every non-default option.
- The exact prompt or instructions given to the model.
- The model's unedited response, including abstentions or incomplete answers.
- The reference answer and field-by-field score.
- Whether the model used tools, code execution, files, memory, or external assistance.
- Any timeout, output truncation, retry, or other condition that could affect interpretation.

### Evaluation boundary

To keep a no-tools reasoning result comparable:

1. Generate the question and give only that question to the evaluated model.
2. Do not generate or inspect the answer, trace, simulator state, or source-derived solution before the model response is fixed.
3. Save the response without correcting it.
4. Generate the reference answer with exactly the same seed and options.
5. Score every requested output field by exact match and describe any normalization, such as treating `yes` and `true` as equivalent.

Tool-assisted evaluations are also welcome, but they must be clearly labeled and must describe the tools and access granted to the model. Do not combine assisted and unassisted results in one ranking without distinguishing them.

### Suggested report template

```md
# <Model> maze-test evaluation

- Date:
- Contributor:
- maze-test version / commit:
- Model / provider:
- Reasoning setting:
- Tool access:
- Language and full trial parameters:
- Prompt:

## Results

| Trial | Score | Notes |
|---|---:|---|
| ... | .../... | ... |

## Raw responses

<!-- Preserve the model output exactly. -->

## Reference answers and field mismatches

<!-- Generate only after the evaluated responses are fixed. -->
```

If possible, link the report from the pull request description and explain how another contributor can reproduce it.

## Pull request review

Maintainers may ask for smaller commits, added tests, clarified rules, or additional reproduction details. Evaluation results are reviewed for transparency and reproducibility, not for whether a particular model scored well.

By submitting a contribution, you agree that it may be distributed under this repository's [MIT License](./LICENSE).

---

## 中文贡献说明

欢迎参与完善 `maze-test`。你可以改进生成器、规则、文档、翻译、测试或 Agent Skill，也可以提交任何模型、任何平台上的可复现评测成绩。

### 可以贡献什么

- 通过 GitHub Issue 报告错误或有歧义的规则。
- 提议新的机制、情境、输出格式或难度控制方式。
- 改进中英文题面和文档表述。
- 补充测试、修复代码，或完善 CLI 与 TypeScript API。
- 提交模型评测成绩，与仓库中的现有结果对比。

如果改动会明显影响规则或兼容性，建议先开 Issue 讨论，再开始实现。

### 提交代码或文档

1. Fork 仓库并建立一个目标明确的分支。
2. 使用 `pnpm install` 安装依赖。
3. 完成尽量聚焦的改动；行为发生变化时，请同步补充或修改测试。
4. 运行 `pnpm check`。
5. 提交 Pull Request，说明改了什么、为什么修改以及如何验证。

请尽量保持确定性：相同种子和参数应继续产生相同结果，除非 Pull Request 明确说明这是一次破坏性变更。请勿提交密钥、私人提示词、个人信息或无关的生成文件。

### 提交评测成绩

非常欢迎提交不同模型、不同推理强度、中文题目、高级机制、本地模型和其他迷宫尺寸的评测结果。

请将报告放在：

```text
benchmarks/community/YYYY-MM-DD-<模型或评测集>.md
```

单次试验也可以提交，但重复试验和统一种子更方便横向比较。报告应包含：

- 评测日期及贡献者姓名或 GitHub 用户名。
- `maze-test` 版本，以及可用时的仓库 commit。
- 准确的模型标识、提供方或运行环境、推理强度或思考设置。
- 语言、种子、行列数、复杂度、情境和全部非默认参数。
- 交给模型的完整提示或操作说明。
- 模型未经修改的原始回答，包括弃答和未完成回答。
- 标准答案、逐字段得分及具体错项。
- 模型是否使用工具、代码执行、文件、记忆或其他外部帮助。
- 超时、输出截断、重试等可能影响结果解读的情况。

#### 评测隔离要求

如果报告的是“模型独立推理、不使用工具”的成绩：

1. 先生成题目，只把题面交给待测模型。
2. 模型回答固定前，不得生成或查看答案、轨迹、模拟器状态或从源码推导的解答。
3. 原样保存模型回答，不要替它纠错。
4. 使用完全相同的种子和参数生成标准答案。
5. 对题目要求的每个字段进行精确匹配评分，并说明是否进行了规范化，例如将 `yes` 与 `true` 视为等价。

也欢迎提交允许工具辅助的评测，但必须明确标注，并说明模型获准使用了哪些工具和数据。请勿在没有区分的情况下，把工具辅助与纯推理成绩混在同一排名中。

可以直接复用上面的英文报告模板。提交 Pull Request 时，建议在描述中链接报告，并说明他人如何复现。

### 审查原则

维护者可能会要求拆分改动、补充测试、澄清规则或增加复现信息。评测报告主要审查透明度和可复现性，不会因为某个模型分数高或低而拒绝。

提交贡献即表示你同意相关内容按照本仓库的 [MIT License](./LICENSE) 发布。

# Writing Agent

具有自我检验与持续学习能力的文档协作编辑 Agent。

借鉴 Cursor 等 AI IDE 的协作模式，Agent **提议**结构化编辑 → 后端**验证** → 用户在 Review Queue 中**审阅**并决定接受或放弃。文档在用户明确操作前不会被修改。

```
Agent 提议 → 后端验证 → 用户审阅 → Apply 更新文档 → Save 写入磁盘
```

## 核心功能

### 1. Agent 工具集 + 审阅界面

Agent 通过定制工具（`read_document`、`propose_edits`、`revise_edit`）与文档交互，所有修改以 Edit Group 形式提交到 Review Queue，用户逐组审阅。

<!-- 截图：Chat 中的工具调用 + Review Panel 中展开的 edit group（多条 diff + Apply all / Dismiss all） -->
<!-- ![Review Queue](docs/screenshots/review-queue.png) -->

### 2. 文本质量评估

- **引用检查**：`check_references` 工具自动校验 DOI 可达性（CrossRef API）、URL 可访问性、与本地 `references/` 目录的一致性，并检测缺乏引用支撑的断言。
- **读者模拟**：隔离上下文的 `review` 子代理从目标读者视角评估文本，输出四维诊断（Care / Understand / Convinced / Effortlessly）。开启 Auto Review 后，Agent 先诊断后修改。

<!-- 截图：check_references 工具输出 或 review 子代理的四维诊断 -->
<!-- ![Auto Review](docs/screenshots/auto-review.png) -->

### 3. 用户偏好学习

从用户对编辑建议的反馈信号中学习：

- **Accept** → 正向案例（positive example）
- **Reject** → 负向案例（negative example）
- **调整** → 偏好案例（preference example）

Agent 通过 `propose_principle` 提议写作原则，用户在 Settings → Memory 中确认后生效，后续交互自动遵循。

### 4. 跨会话上下文管理

`remember_context` 记录目标读者画像、领域术语、项目常识，持久化存储并跨会话自动注入，减少重复沟通。

<!-- 截图：Settings → Memory 面板，显示 principle + knowledge 条目 -->
<!-- ![Memory Panel](docs/screenshots/memory-panel.png) -->

## 快速开始

**前置条件**：Node.js ≥ 18、pnpm、Python ≥ 3.11、uv、OpenAI 兼容 API key。

```bash
cp .env.example .env          # 设置 API key
cp tools.yaml.example tools.yaml
cp subagents.yaml.example subagents.yaml
cp models.yaml.example models.yaml

npm install
cd frontend && pnpm install && cd ..
npm run dev                   # Agent :8765 + 前端 :5173
```

打开 http://localhost:5173 ，默认工作区：`examples/`。

## 演示

详见 [`examples/DEMO-GUIDE.md`](examples/DEMO-GUIDE.md)，包含 6 个场景的完整操作步骤和截图指引。

## 测试

```bash
cd agent
uv run pytest -q
uv run python -m evals.runner --suite smoke

cd ../frontend
pnpm run build
```

## 架构

```
frontend          React IDE + Review Queue + Settings（memory / principles）
       │ WebSocket
handlers          session / chat / review / memory / settings
domain            EditGroupService / MemoryStore / SessionStore
agent             Strands Agent + review / researcher 子代理
tools             read_document / check_references / propose_edits / revise_edit / remember_context / propose_principle
filesystem        项目文件 + .writing-agent/ 状态
```

# Writing Agent 演示任务 — 新上下文交接

> 把本文档全文粘贴到新 Cursor 对话的第一条消息，Agent 即可继续完成 README 演示任务。

---

## 根本目的

本项目是一个 **文档协作编辑 Agent 原型**（个人项目），目标是构建具有自主迭代与持续学习能力的写作 Agent。README 演示与截图不是目的本身，而是**向外界证明以下四项设计已实现**：

```
文档协作编辑 Agent 原型设计 | 个人项目
具有自主迭代与持续学习能力的写作 Agent 原型设计

- 借鉴 Cursor 等 AI IDE 产品协作模式，针对文档协作编辑场景，定制 Agent 工具集与系统指令，
  并实现便于用户审阅 Agent 修改建议的前端交互界面

- 设计文本质量评估流程：通过自动化脚本校验引用链接可访问性与内容一致性，
  通过隔离上下文的 Sub-Agent 模拟目标读者反馈，驱动 Agent 自主迭代优化生成内容

- 设计用户偏好学习机制，从用户对 Agent 修改建议的反馈信号（接受/拒绝/调整）中，
  总结可复用的写作原则并附带实际案例，形成"提出→审核→学习"的改进循环

- 设计跨会话上下文管理，记录目标读者、领域常识、专业术语，
  供 Agent 跨 Session 读取与增量更新，减少重复沟通成本
```

**演示与四项能力的映射：**

| 能力声明 | DEMO-GUIDE 场景 | 关键工具 / 界面 |
|---------|----------------|----------------|
| Agent 工具集 + 审阅界面 | 场景 1 | `propose_edits` / `revise_edit`、Review Queue |
| 文本质量评估 | 场景 2、3 | `check_references`、`review` 子代理、Auto Review |
| 用户偏好学习 | 场景 4、5 | Apply/Dismiss 反馈 → Memory、`propose_principle` |
| 跨会话上下文 | 场景 6 | `remember_context`、Settings → Memory |

所有演示设计（示例稿件、prompt、截图选取）都应**优先服务于证明这四项能力**，而非单纯展示 UI 好看或 Agent 会改文。

---

## 当前任务

为 Writing Agent 项目完成 **README 功能演示**：按 `examples/DEMO-GUIDE.md` 的 6 个场景在前端实际操作、截图，并把截图嵌入 `README.md`，使 README 成为上述四项能力的可视化证据。

**最终交付物：**

1. `docs/screenshots/` 下 3–6 张代表性截图（每张对应至少一项能力声明）
2. `README.md` 中取消注释的 `![...](docs/screenshots/...)` 链接
3. （可选）补全 `DEMO-GUIDE.md` 中场景 3–6 的空截图清单、功能映射总表

---

## 当前进度

| 项 | 状态 |
|---|---|
| `examples/demo-manuscript.md` 示例稿件（含故意嵌入的写作问题） | ✅ 完成 |
| `examples/references/` 本地参考文献 | ✅ 完成 |
| `examples/.academic-writing/reader.md` 预建读者画像 | ✅ 完成（避免 Read file 报错） |
| `examples/DEMO-GUIDE.md` 六场景流程 + prompt | ✅ 完成 |
| `agent/strands_runner.py` 系统指令优化 | ✅ 完成（见下方「已修复问题」） |
| 前端文档编辑器字号 20px | ✅ 完成 |
| README 截图占位符 | ⏳ 待用户截图 |
| DEMO-GUIDE 场景 3–6 截图清单、映射总表 | ⏳ 部分为空 |

---

## 环境

```text
项目根：Y:\agent\writing-agent
演示工作区：examples/（前端 File → Open Folder 选此目录）
Agent：ws://127.0.0.1:8765
前端：http://localhost:5173/
启动：npm run dev（项目根目录）
```

**干净重启（如需）：**

1. 杀 8765 / 5173 端口进程
2. 删除 `.writing-agent/**/sessions/sess-*.json`（清空对话）
3. `npm run dev`
4. 只保留**一个**浏览器标签页访问 localhost:5173

---

## 示例目录结构

```text
examples/
├── .academic-writing/
│   └── reader.md              ← Skill 读者画像（Confirmed: YES）
├── references/
│   ├── rag-foundations.md     ← DOI 10.18653/v1/2020.emnlp-main.550
│   ├── systematic-review.md   ← DOI 10.1111/1467-8551.00375
│   └── nanoscale-thermometry.md
├── demo-manuscript.md         ← 主演示稿件
├── demo-citations.md          ← 引用检查备用
└── DEMO-GUIDE.md              ← 操作手册（与 docs/DEMO-GUIDE.md 同步）
```

系统级状态（不在 examples 内）：

```text
.writing-agent/
├── sessions/                  ← 对话持久化
├── workspaces/{id}/sessions/
├── edit-groups/               ← 编辑组
└── memory/                    ← principle / knowledge / example
```

---

## 六场景速查（prompt + 截图要点）

### 场景 1 — Review Queue（README 主图）

**Prompt：**

```text
请帮我润色一下 Introduction，句子有点长，读起来也不太流畅。
```

跟进（若只分析不改）：`分析得不错，请直接改吧。`

**预期：** 2–4 个 Edit Group；某组 badge 显示 `3 edits` 或更多；每条 edit 只改一处。

**截图 → `docs/screenshots/review-queue.png`：**

- Chat 中 `propose_edits` 工具链 + Review card（展开，含多条 diff + Apply all / Dismiss all）

---

### 场景 2 — 引用检查

**Prompt：**

```text
帮我查一下这篇论文的参考文献有没有问题。
```

跟进（若不调用工具）：`请用工具帮我检查，不要只看。`

**预期：** 调用 `check_references`；发现 [2] DOI 404、[3] 无本地 reference 等。

**截图 → `docs/screenshots/check-references.png`（可选）**

---

### 场景 3 — Auto Review

1. 开启 Chat 面板 **Auto Review** 开关
2. **Prompt：**

```text
第三段说 retrieval 能 "enhance calibration" 和 "dramatically reduce variance"，但后面没给引用。帮我改一下这段。
```

**预期：** 先 `review`（传入文本，非文件路径）→ 再 `propose_edits`。

**截图 → `docs/screenshots/auto-review.png`：**

- Chain of thought 中 Run review + Propose edits 两步

---

### 场景 4 — 偏好学习

1. 对场景 1/3 的某组点击 **Apply All**
2. **Prompt：**

```text
我喜欢你把过渡词改得更多样的做法。帮我记一条规则：段落内避免连续使用相同句式结构的过渡词。
```

3. Settings → Memory → Accept candidate principle

**截图 → `docs/screenshots/memory-panel.png`**

---

### 场景 5 — 原则注入验证

**前提：** 场景 4 原则已 Accept。

**Prompt：**

```text
最后一段的三个 contributions 读起来太累了，帮我改简洁一点。
```

**预期：** rationale 引用已学原则；主动拆句。

---

### 场景 6 — 跨会话 Memory

**Prompt（当前 session）：**

```text
这篇是投 EMNLP 的，读者主要是 NLP 和 IR 方向的研究者，对 dense retrieval、FAISS 这些很熟，但不太了解 scientometrics 那边的术语。帮我记一下。
```

**New Session 后 Prompt：**

```text
Introduction 里有没有对我的读者来说太生僻的术语？帮我改一下。
```

**预期：** 新 session 自动引用 EMNLP / IR 读者画像。

---

## README 截图方案（最小集）

| 文件 | 对应功能 | 来源场景 |
|------|---------|---------|
| `docs/screenshots/review-queue.png` | Agent 工具集 + 审阅界面 | 场景 1 |
| `docs/screenshots/auto-review.png` | 文本质量评估（review） | 场景 3 |
| `docs/screenshots/memory-panel.png` | 用户偏好 + 跨会话 | 场景 4 或 6 |

嵌入 README 时取消注释：

```markdown
![Review Queue](docs/screenshots/review-queue.png)
![Auto Review](docs/screenshots/auto-review.png)
![Memory Panel](docs/screenshots/memory-panel.png)
```

---

## 已修复问题（新 Agent 勿重复踩坑）

1. **系统指令**（`agent/strands_runner.py`）：
   - 语言跟随：用户用什么语言问，用什么语言答
   - review 子 Agent 必须传入 verbatim 文本，不能让它读文件
   - 禁止说 "Apply or Reject"；禁止用表格重复 review card 内容
   - 编辑粒度：每 edit 针对句子/短语，非整段
   - Memory 注入说明："Relevant writing memory" 前缀含义

2. **demo-manuscript DOI**：arXiv DOI 不在 CrossRef → 已改为 `10.18653/v1/2020.emnlp-main.550`

3. **reader.md 缺失**：Agent 读 `.academic-writing/reader.md` 报 Not a file → 已在 `examples/.academic-writing/reader.md` 预建

4. **Prompt 设计**：用「润色/改/修」+ 限定范围；避免「全面检查/分析建议」

---

## 给新 Agent 的第一条指令（复制即用）

```text
请阅读 docs/DEMO-HANDOFF.md 和 examples/DEMO-GUIDE.md，继续完成 Writing Agent 的 README 演示任务。

根本目的：证明文档协作编辑 Agent 原型的四项能力已实现（工具集+审阅界面、文本质量评估、用户偏好学习、跨会话上下文）。README 截图是证据，不是目的。

当前状态：示例文件和系统指令已就绪，用户需要按 DEMO-GUIDE 六个场景在前端操作并截图。

请你：
1. 确认 examples/ 目录和 dev 服务就绪
2. 若 DEMO-GUIDE 场景 3–6 的截图清单、功能映射总表仍为空，补全
3. 指导用户按顺序完成场景 1→6，明确每张截图对应哪项能力声明
4. 用户截完图后，把 docs/screenshots/ 下的图片链接写入 README.md

不要改 plan 文件。优先最小 diff。所有 prompt / 示例 / 截图选取优先服务于四项能力声明。
```

---

## 关键源文件

| 文件 | 用途 |
|------|------|
| `README.md` | 截图占位符待填入 |
| `examples/DEMO-GUIDE.md` | 演示操作手册 |
| `examples/demo-manuscript.md` | 演示稿件 |
| `agent/strands_runner.py` | 系统指令 |
| `frontend/src/components/review-panel.tsx` | Review UI |
| `frontend/src/components/document-editor.tsx` | 文档编辑器 |

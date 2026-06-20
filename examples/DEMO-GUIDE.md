# Writing Agent 功能演示指南

本指南包含 **6 个场景**，覆盖项目声称的 4 大核心功能。每个场景给出完整操作步骤、发送给 Agent 的 prompt、预期结果和截图要点。

> **注意**：每个场景独立可执行，但建议按顺序操作——场景 4-5 依赖场景 1/3 的编辑结果，场景 6 需要两个不同 Session。

---

## Prompt 设计原则

Writing Agent 的系统提示要求通过 `propose_edits` 提交编辑，但 prompt 措辞决定了 Agent 是"分析讨论"还是"直接修改"：

| 原则 | 触发工具的措辞 | 容易只得到文字分析的措辞 |
|------|---------------|------------------------|
| **用动作词** | "润色""改""修" | "检查""分析""看看""建议" |
| **限定修改范围** | "逐段改""这段的连接词" | "全面检查这篇论文" |
| **不提工具名** | 让 prompt 看起来像真实作者的话 | 提工具名会暴露这是测试 |

> **万能跟进 prompt**（如果 Agent 只分析不动手）：
> ```
> 分析得不错，请直接改吧。
> ```

---

## 前置准备

1. 启动后端：在项目根目录执行 `npm run dev`（同时启动 Agent :8765 + 前端 :5173）
2. 浏览器打开 [http://localhost:5173](http://localhost:5173)
3. 在前端 File Explorer 中点击 **File → Open Folder** 选择 `examples/` 文件夹作为工作区
4. 在文件树中打开 `demo-manuscript.md`（一篇关于 RAG 文献综述的论文草稿）

---

## 稿件写作问题概览

`demo-manuscript.md` 模拟一篇 CS 领域早期草稿中的典型写作问题：

| 位置 | 问题 | 说明 |
|------|------|------|
| §1 P1 | 超长单句 | 一句话 60+ 词，逗号嵌套三层 |
| §1 P2 | 无引用权威诉求 | "It is well known that..." |
| §1 P3 | 过强断言 | "enhance calibration" / "dramatically reduce"，无引用支撑 |
| §1 P4 | 过渡词单调 | 四句连用 First / Furthermore / Additionally / Also |
| §1 P5 | 术语不一致 | "document fetching" vs 全文 "retrieval" |
| Ref [2] | 无效 DOI | `10.1045/march2018-johnson` — CrossRef 404 |
| Ref [3] | 缺本地引用 | `10.1145/3571730` 无 `references/` 文件 |

---

## 场景 1：Agent 提议编辑 + 用户审阅界面

**对应功能声明**：

> 借鉴 Cursor 等 AI IDE 产品协作模式，定制 Agent 工具集与系统指令，实现便于用户审阅 Agent 修改建议的前端交互界面

### 操作步骤

1. 确认 `demo-manuscript.md` 已在文档面板中打开
2. 在 Chat 面板发送：

```
请帮我润色一下 Introduction，句子有点长，读起来也不太流畅。
```

3. 等待 Agent 完成回复（约 20-40 秒）

> 如果 Agent 只给出分析而未提出编辑，跟进：`分析得不错，请直接改吧。`

### 预期行为

Agent 读取全文后，应产出 **2-4 个 Edit Group**，每组按问题类型聚合：

| 可能的 Group | 典型 title | 组内 edit 数 |
|-------------|-----------|-------------|
| 多样化过渡词 | "Vary monotonous transitions" | 3-4 条（Furthermore→…、Additionally→…、Also→…） |
| 软化无据断言 | "Soften unsupported claims" | 2 条（"dramatically reduce"→"reduce"、删除"it is well known"） |
| 统一术语 | "Unify retrieval terminology" | 1-2 条（"document fetching"→"retrieval"） |

**关键看点**：某个 group 的 badge 显示 `3 edits` 或更多，组内每条 edit 只改一处。

### 截图清单

| 截图 | 内容 |
|------|------|
| **1-A** | Chat 面板：`read_document` → 多次 `propose_edits` 工具调用链 |
| **1-B** | Review Panel：某 group 内含多条 diff（红/绿高亮），badge 显示 edit 数 |
| **1-C** | 底部分页 `< 1/N >` + **Apply all** / **Dismiss all** 按钮 |

### 展示要点

- Agent **不直接改文档**，通过 `propose_edits` 提交建议等待用户审阅
- **一个 Group 内可包含多条 edit**——每条精确到一处替换
- 用户用 **Apply all**（接受整组）或 **Dismiss all**（放弃整组）审阅
- 如需调整单条 edit，在 Chat 中附上该条 → Agent 用 `revise_edit` 修订

---

## 场景 2：引用质量检查

**对应功能声明**：
> 通过自动化脚本校验外部引用的链接可访问性与内容一致性

### 操作步骤

1. 确认 `demo-manuscript.md` 已在文档面板中打开
2. 在 Chat 面板发送：

```
帮我查一下这篇论文的参考文献有没有问题。
```

3. 等待 Agent 调用 `check_references` 工具

> 如果 Agent 只口头描述而未调用工具，跟进：`请用工具帮我检查，不要只看。`

### 预期行为

Agent 调用 `check_references` 工具（自动读取当前 buffer），Chat 中出现工具调用卡片，结果包含：

| 发现 | 说明 |
|------|------|
| ✅ `10.1111/1467-8551.00375` | DOI 可达，且与 `references/systematic-review.md` 匹配 |
| ✅ `10.18653/v1/2020.emnlp-main.550` | DOI 可达，且与 `references/rag-foundations.md` 匹配 |
| ⚠️ `10.1045/march2018-johnson` | DOI 不可达 — CrossRef 返回 404 |
| ⚠️ `10.1145/3571730` | DOI 可达，但 `references/` 中无对应本地文件 |
| ⚠️ claim_missing_evidence | 某些断言缺乏本地证据支撑 |

### 截图清单

| 截图 | 内容 |
|------|------|
| **2-A** | Chat 中 `check_references` 工具调用卡片（展开状态） |
| **2-B** | Agent 基于结果的文字总结（哪些有问题、建议怎么处理） |

### 展示要点

- `check_references` 已集成为 Agent 可调工具，用户在 Chat 里一句话触发
- 自动抽取文档中的 DOI / URL
- 在线校验 CrossRef 可达性
- 与本地 `references/` 目录做一致性比对
- 检测缺少引用支撑的断言

### 终端 CLI（可选补充截图）

同一检查也可通过命令行独立运行（CI / 离线场景）：

```bash
uv run python -m agent.scripts.check_references examples/demo-manuscript.md --project-root examples
```

---

## 场景 3：Sub-Agent 模拟读者反馈（Auto Review）

**对应功能声明**：

> 通过隔离上下文的 Sub-Agent 模拟目标读者反馈，驱动 Agent 自主迭代优化生成内容

### 操作步骤

1. 在 Chat 面板中找到 **Auto Review** 开关，点击**开启**
2. 输入以下 prompt 并发送：

```
第三段说 retrieval 能 "enhance calibration" 和 "dramatically reduce variance"，但后面没给引用。帮我改一下这段。
```

3. 观察 Agent 的**两步**处理过程

### 预期行为

Auto Review 开启后，Agent 的工作流变为：

**第 1 步：调用 `review` 子代理**

- Review 子代理上下文隔离——只看到文本本身，不知道作者意图
- 输出四维诊断：
  - **Care**：读者是否有动力读下去
  - **Understand**：读者能否跟上每一步推理
  - **Convinced**：读者是否必须接受（此维度应标记 "enhance calibration" 和 "dramatically reduce variance" 为未支撑断言）
  - **Effortlessly**：认知负担是否合理

**第 2 步：基于诊断调用 `propose_edits`**

- 编辑建议的 rationale 中引用 review 诊断结果
- 例如："Review 指出 Convinced 维度失败——'enhance calibration' 缺乏引用支撑，因此补充了引用或软化了表述"

### 截图清单

### 展示要点

- Review 子代理**上下文完全隔离**：模拟目标读者视角
- 四维诊断框架来源于学术写作理论
- Agent 先诊断后行动，而非盲目改写
- 形成「诊断 → 修改 → 提交审阅」的迭代闭环

---

## 场景 4：用户偏好学习（提出→审核→学习）

**对应功能声明**：

> 从用户对 Agent 修改建议的反馈信号（接受/拒绝/调整）中，总结可复用的写作原则并附带实际案例，形成"提出→审核→学习"的改进循环

### 操作步骤

**Step 4a — 接受编辑，产生正向案例**

1. 在 Review Panel 中，找到场景 1 或场景 3 产生的编辑组
2. 点击 **Apply All** 接受修改
3. 观察文档内容已更新（diff 消失）

> 后端自动将接受的编辑记录为 positive example（正向案例）

**Step 4b — 要求 Agent 总结写作原则**

4. 在 Chat 中发送：

```
我喜欢你把过渡词改得更多样的做法。帮我记一条规则：段落内避免连续使用相同句式结构的过渡词。
```

5. 观察 Agent 调用 `propose_principle` 工具

**Step 4c — 在 Settings 中确认原则**

6. 打开 **Settings** 面板 → **Memory** 区域
7. 看到 candidate principle 卡片（待确认状态，带有 Accept / Reject 按钮）
8. 点击 **Accept** 确认该原则

### 截图清单

### 展示要点

- Apply = 正向信号 → 自动存为 example memory
- `propose_principle` 需**用户显式确认**才生效（不会偷偷改变行为）
- 原则附带 rationale 和关联案例 ID，可追溯来源
- 完整循环：提出建议 → 用户审阅 → 学习偏好

---

## 场景 5：验证原则注入效果

**对应功能声明**：

> （续场景 4）验证学习到的写作原则在后续交互中确实影响 Agent 行为

### 前提

场景 4 中的原则（如"每句只传达一个核心观点"）已被 Accept。

### 操作步骤

1. 在 Chat 中发送新的编辑请求：

```
最后一段的三个 contributions 读起来太累了，帮我改简洁一点。
```

2. 观察 Agent 的回复和编辑建议

### 预期行为

Agent 提出的修改中应体现已学习的原则：

- 主动拆分长句，而非仅做词汇替换
- rationale 中引用已学习的原则（如"避免重复句式"）

### 截图清单

### 展示要点

- 已确认的 principle 被注入系统提示
- Agent 后续行为**一致地**遵循用户偏好
- 无需每次重复告知

---

## 场景 6：跨会话上下文管理

**对应功能声明**：

> 设计跨会话上下文管理机制，记录目标读者、领域常识、专业术语，供 Agent 跨 session 按需读取与增量更新，减少重复沟通成本

### 操作步骤

**Step 6a — 在当前会话中记录上下文**

1. 在 Chat 中发送：

```
这篇是投 EMNLP 的，读者主要是 NLP 和 IR 方向的研究者，对 dense retrieval、FAISS 这些很熟，但不太了解 scientometrics 那边的术语。帮我记一下。
```

2. 观察 Agent 调用 `remember_context` 工具
3. （可选）打开 Settings → Memory 确认知识条目已存储

**Step 6b — 创建新会话并验证**

4. 在 Chat 面板顶部点击 **New Session** 创建新对话
5. 确认 `demo-manuscript.md` 仍在文档面板中打开
6. 在新会话中发送：

```
Introduction 里有没有对我的读者来说太生僻的术语？帮我改一下。
```

7. 观察 Agent 的回复

### 预期行为

Agent 在新会话中的回复应引用之前记录的读者画像：

- "您的目标读者是 IR 研究者，熟悉 BM25、dense retrieval 等概念..."
- 基于读者画像分析术语使用（如指出 "scientometrics" 可能需要解释）
- 证明 memory 跨会话持久化

### 截图清单

### 展示要点

- `remember_context` 支持 reader / terminology / domain 三类上下文
- Memory 跨会话持久化（存储在 `.writing-agent/` 目录下）
- 新会话中 Agent 自动读取相关 memory，避免重复沟通
- Settings → Memory 界面可视化管理所有存储的知识

---

## 截图清单 &amp; 功能映射总表

---

## 功能实现对照表

---

## 故障排除

- **Auto Review 开关不可见**：确认后端版本包含 `session/auto_review` handler
- **Agent 不调用 check_references**：确认 Settings → Tools 中 `check_references` 已启用；发送跟进 prompt 明确要求调用工具
- **Memory 面板为空**：确认 `.writing-agent/memory/` 目录存在且后端有写入权限
- **编辑高亮不显示**：确认文档已在编辑器中打开（非仅预览模式）
- **Agent 不调用 review**：确认 Auto Review 开关已开启（场景 3 必须）
- **新会话不读取 Memory**：Memory 的 enabled 开关默认开启，检查 Settings → Memory 中的总开关


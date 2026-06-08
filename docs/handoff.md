# 交接文档

> 本文档串起所有设计决策，给接手的 agent 足够信息在现有代码上升级。

---

## 你需要知道的全局图

```
docs/
├── principle.md           # 产品设计原则（六步流程、Review、Memory）——不要改
├── backend.md             # 后端架构设计（选型、分层、工作区、session、扩展性）
├── protocol.md            # WebSocket 协议（所有消息类型、session 管理、review 协议）
├── frontend.md            # 前端架构设计（选型、代码地图、关键约定）
├── ui.md                  # 按钮与图标尺寸规范
├── strands-tutorial.md    # Strands 框架学习笔记（API 参考，实现时查阅用）
├── writing-agent-design.md # 原始设计文档（Review、Memory 详细设计）
├── strands-agents-llms-full.txt  # Strands 完整文档缓存
└── handoff.md             # 本文件

agent/                     # Python 后端代码
frontend/src/              # React 前端代码
```

---

## Phase 1–2 完成状态

### Phase 1: 数据层改造 ✓

| 项 | 文件 | 状态 |
|---|---|---|
| SessionState 升级（open_buffers + active_path） | `agent/protocol.py` | ✓ |
| SessionStore 新增 | `agent/session_store.py` | ✓ |
| read_file overlay 逻辑 | `agent/writing_tools.py` | ✓ |
| handler 升级（document/open、change、chat/message） | `agent/handler.py` | ✓ |
| normalize_workspace_path | `agent/project_root.py` | ✓ |

### Phase 2: Session 管理 ✓

| 项 | 文件 | 状态 |
|---|---|---|
| session/create、switch、list 路由 | `agent/handler.py` | ✓ |
| `session/restore` 废弃 | `agent/handler.py` | ✓ |
| Connection 接入 SessionStore | `agent/connection.py` | ✓ |
| main.py 全局 `SESSION_STORE` 单例（多连接共享） | `agent/main.py` | ✓ |
| strands_runner：snapshot/restore/title、`messages_to_ui` | `agent/strands_runner.py` | ✓ |
| 前端协议类型更新 | `frontend/src/lib/agent-protocol.ts` | ✓ |
| 前端 session 入站/出站处理 | `frontend/src/hooks/use-agent-session.ts` | ✓ |
| 前端 tab 仅持久化 `session_id` | `frontend/src/lib/chat-sessions.ts`、`use-chat-sessions.ts` | ✓ |
| `document/open`、`change` 带 project-relative `path` | `use-document-tabs.ts`、`layout.tsx` | ✓ |
| `chat/message` 带 `active_path` + `buffer_snapshot` | `chat-thread.tsx` | ✓ |

### P0 基线（此前已实现，未改动）

- Strands Agent + OpenAI + `stream_async`
- `read_file`、WebSocket `:8765`、流式帧、`document/open|change`、`session/clear`

### 审阅记录（Phase 1–2）

实现与设计文档对齐，质量良好。`_persist_current` 在 `session/switch` 与 `chat/message` 结束后均调用；`read_file` 的 `source` 字段标明 buffer/disk。

### 已修复的小问题

1. **`session/cleared`**：清空后后端回确认帧，前端 `use-agent-session` 同步 UI。
2. **`snapshot_agent_state()`**：使用 Strands `agent.state.get(None)` 全量快照，`restore_from_snapshot` 按 key 重建。

### 验证清单（进入 Phase 3 前建议跑通）

**自动化（agent 目录，用 `uv run`）：**

```bash
uv run pytest -q                    # 单元测试（handler、SessionStore、read_file overlay、agent.state）
uv run pytest -q -m integration     # 需先启动**当前代码**的 WS 服务，否则 skip
```

配置从**仓库根** `.env` 加载（`config.py` 导入时 `load_dotenv`；支持 `WS_HOST`/`WS_PORT` 与 `AGENT_HOST`/`AGENT_PORT`）。先重启 agent 再测；勿遗留 `WRITING_AGENT_WS_URL` 指向已停用的端口。

**手工（需浏览器 + 有效 `OPENAI_API_KEY`）：**

1. 重启 agent（确保不是 Phase 1–2 之前的旧服务）→ `pnpm dev` 前端
2. 打开 `.md` → 发消息 → 新建 tab → 切换 tab → 历史恢复
3. 未保存编辑后立即提问 → buffer 最新

---

## Phase 3: 扩展性 ✓

| 项 | 文件 | 状态 |
|---|---|---|
| AgentSkills 接入 | `strands_runner.py` | ✓ |
| `plugins/academic-writing/` 就位 | 从 Cursor `academic-writing-v2` 复制 | ✓ |
| WritingPlugin 骨架 | `writing_plugin.py` | ✓ |
| 子 agent `as_tool()` | `subagents.py` + `agents/*.md` | ✓ |
| 工具名 UI 映射 | `frontend/src/lib/agent-tool-labels.ts` | ✓ |

建议顺序（已完成）：**AgentSkills → academic-writing 目录 → WritingPlugin → 子 agent**。

### Phase 3 审阅备忘（已知、不阻塞）

| 项 | 状态 |
|---|---|
| API 工具名 `reference_list` vs frontmatter `reference-list` | 前端用 `formatAgentToolLabel()` 显示友好名；后端 `SubagentSpec.tool_name` / `name` 分离 |
| frontmatter 仅简单 KV | 当前 agent 文件够用；值内 `:` 用 `split(":", 1)` 已支持 |
| `readonly` / `is_background` | 已解析进 `SubagentSpec`，尚未驱动 Strands 行为（MVP） |
| 子 agent 共享同一 `OpenAIModel` | 无状态 HTTP 客户端，可共享；见 `strands_runner.py` 注释 |
| `rules/hard-constraints.mdc` 重复 frontmatter | 已合并为单块（该文件不由 `subagents.py` 加载） |

### 3.1 AgentSkills 插件接入

**目标**：加载 `plugins/` 目录下的 SKILL.md，渐进式披露。

**改什么**：`agent/strands_runner.py`

```python
from strands.vended_plugins.skills.agent_skills import AgentSkills

# 在 WritingAgentRunner.__init__ 中
skill_plugin = AgentSkills(skills=["./plugins/"])
self._agent = Agent(
    ...,
    plugins=[skill_plugin],
)
```

**前置条件**：
- 创建 `agent/plugins/` 目录
- 确保 strands-agents 版本包含 AgentSkills 插件（>=1.42.0 应该已有）

**验证**：在 `plugins/` 下放一个简单的 SKILL.md，agent 应该能看到它的 name + description，并在需要时激活。

**复制现有技能包**：将 Cursor 侧 `academic-writing`（`SKILL.md`、`agents/*.md`、`reference/*.md`）拷到 `agent/plugins/academic-writing/`（见 3.4 目录结构）。

### 3.2 WritingPlugin 创建

**目标**：项目级 hooks + 工具打包。

**新增文件**：`agent/writing_plugin.py`

```python
from strands.plugins import Plugin, hook
from strands.hooks import BeforeToolCallEvent, AfterToolCallEvent

class WritingPlugin(Plugin):
    name = "writing"

    @hook
    def notify_tool_start(self, event: BeforeToolCallEvent):
        """向前端推送工具开始通知。"""
        queue = event.invocation_state.get("outbound_queue")
        if isinstance(queue, list):
            queue.append({
                "type": "chat/tool_start",
                "tool_id": event.tool_use.get("toolUseId", ""),
                "name": event.tool_use["name"],
                "input": event.tool_use.get("input"),
            })

    # 未来可以添加：
    # - write_file 工具
    # - propose_edit 工具（P1 Review）
    # - memory_write 工具（P3 Memory）
```

### 3.3 子 Agent 注册

**目标**：review、check 等专业子 agent 作为工具注册。

**改什么**：`agent/strands_runner.py` 或新建 `agent/subagents.py`

```python
from strands import Agent

def create_subagents(project_root, read_file_tool):
    """创建专业子 agent，包装为工具。"""
    review_agent = Agent(
        system_prompt="你是独立评审人...",
        tools=[read_file_tool],
    )
    check_agent = Agent(
        system_prompt="你是机械一致性检查器...",
        tools=[read_file_tool],
    )
    return [
        review_agent.as_tool(name="review", description="独立读者视角评估"),
        check_agent.as_tool(name="check", description="机械一致性检查"),
    ]
```

**子 agent 的 system prompt 来源**：从 `plugins/academic-writing/agents/` 下的 `.md` 文件加载。frontmatter 解析后提取 `name`、`description` 等元数据，markdown body 作为 system prompt。

### 3.4 Plugin 目录结构

```
agent/plugins/
└── academic-writing/
    ├── SKILL.md              # Agent Skills 规范
    ├── agents/
    │   ├── check.md          # 子 agent 定义
    │   ├── review.md
    │   └── researcher.md
    ├── reference/            # 领域知识文件
    │   ├── narrative-theory.md
    │   ├── section-guide.md
    │   ├── sentence-construction.md
    │   └── word-choice.md
    └── rules/
        └── hard-constraints.mdc
```

子 agent `.md` 文件格式（兼容 Cursor subagent）：

```markdown
---
name: review
description: Independent reader-perspective evaluation
readonly: true
is_background: false
tools:
  - read_file
---

You are an independent reviewer...
（完整 system prompt）
```

---

## 关键设计决策速查

| 决策 | 选择 | 理由 |
|------|------|------|
| 工作区归属 | 后端拥有 | Agent 工具直接读磁盘，零延迟 |
| 文档真相源 | 后端 `open_buffers` + 磁盘 | overlay 优先，磁盘兜底 |
| 会话真相源 | 后端 SessionStore | 完整恢复（含 tool_use、agent state） |
| 前端持久化 | 只存 `session_id` 列表 | 前端是渲染层，不承担存储 |
| 前端 buffer 同步 | `chat/message` 带 `buffer_snapshot` | 不依赖 debounce，保证最新 |
| Strands 子 agent | Agent as Tool 模式 | 层级委托，主 agent 自主决定何时调用 |
| Skill 加载 | AgentSkills 插件 | 渐进式披露，遵循 Agent Skills 规范 |
| 用户配置 | 文件系统 + Chat 自然语言 | YAML 存储，Chat 内修改 |

---

## 实现顺序建议

```
Phase 1: 数据层改造                    ✓ 完成
  1. SessionState 升级
  2. SessionStore 新增
  3. read_file 叠加逻辑
  4. handler.py 协议路由升级

Phase 2: Session 管理                  ✓ 完成
  5. session/create、switch、list
  6. Connection 改造
  7. 前端协议更新
  8. 前端会话管理

Phase 3: 扩展性                        ✓ 完成
  9. AgentSkills 插件接入
  10. plugins/academic-writing 目录就位
  11. WritingPlugin 骨架
  12. 子 agent 注册（review、check、researcher、reference_list）
```

---

## 相关文档索引

- [设计原则](principle.md) — 六步流程、Review 设计、Memory 设计（产品层面）
- [后端设计](backend.md) — 架构分层、工作区、session、扩展性（实现层面）
- [协议定义](protocol.md) — 所有 WS 消息格式（接口层面）
- [前端设计](frontend.md) — 选型、代码地图、关键约定
- [Strands 学习笔记](strands-tutorial.md) — 框架 API 参考
- [原始设计文档](writing-agent-design.md) — Review 和 Memory 的详细设计

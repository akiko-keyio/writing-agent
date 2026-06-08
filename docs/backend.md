# Backend 设计文档

## 选型

| 选择 | 理由 |
|------|------|
| **Strands Agents** | 模型驱动、最小编排；内置 Agent Skills 插件、多 Agent 模式、Hooks；AWS 生产验证（Amazon Q、Kiro 等） |
| **Python + uv** | Strands SDK 原生 Python；uv 管理依赖快速且确定 |
| **WebSocket** | 全双工、低延迟流式推送；协议简单（JSON），前端无关 |

### 为什么不用 LangChain / CrewAI / 自建

- Strands 的 Agent Loop 最简单——`Model + Tools + Prompt` 三元组，没有 chain/graph/state machine 的概念开销
- 内置 `AgentSkills` 插件直接支持 Agent Skills 规范（和 Cursor 的 Skill 格式是同一个标准），不需要自建 loader
- `Agent as Tool` 模式原生支持子 agent 委托，不需要额外编排层
- Hooks 系统足够做横切关注点（日志、拦截、状态通知），不需要中间件抽象

---

## 代码地图

```
agent/
├── main.py              # 入口：WebSocket 服务 :8765
├── config.py            # 环境变量配置（OpenAI key、host、port）
├── connection.py        # 每 WebSocket 连接封装（SessionState + Runner）
├── handler.py           # 协议路由：WS 消息 → action
├── strands_runner.py    # 核心：WritingAgentRunner（Agent 实例 + 流式调用）
├── writing_tools.py     # @tool 工具定义（当前只有 read_file）
├── stream_events.py     # Strands 流事件 → WS 消息映射
├── protocol.py          # SessionState 定义 + apply_replacements
├── project_root.py      # 工作区路径解析
├── pyproject.toml       # 依赖：strands-agents、websockets、openai
└── data/                # 运行时数据（resolved-edits.md 等）
```

### 调用链

```
Frontend
  │ WebSocket (ws://localhost:8765)
  ▼
main.py            ← websockets.serve()
  ▼
connection.py      ← 每连接：SessionState + WritingAgentRunner
  ▼
handler.py         ← 消息路由（chat/message、document/open 等）
  ▼
strands_runner.py  ← WritingAgentRunner.chat_turn_stream()
  ▼
Strands Agent      ← stream_async() → 流式事件
  ▼
stream_events.py   ← 事件 → WS 消息转换
  ▼
Frontend           ← chat/message_delta、chat/tool_update 等
```

---

## 架构设计

### 分层

```
┌─────────────────────────────────────┐
│  Frontend (React)                   │  只认识 WS 协议
├─────────────────────────────────────┤
│  WebSocket 协议（JSON 消息）         │  依赖倒置边界
├─────────────────────────────────────┤
│  handler.py（协议路由）              │  薄层适配
├─────────────────────────────────────┤
│  WritingAgentRunner                  │  Agent 编排层
│  ├── Agent（主 agent）              │
│  ├── Agent as Tool（子 agent）      │
│  ├── AgentSkills（Skill 加载）      │
│  └── Plugin（hooks + 工具）         │
├─────────────────────────────────────┤
│  writing_tools.py                   │  业务工具层
└─────────────────────────────────────┘
```

### 关键设计决策

**1. 前端不依赖 Strands**

前端只认识 WebSocket JSON 协议（`chat/message`、`chat/stream_start` 等）。换前端（VS Code 插件、CLI）只需实现同样协议，后端零改动。

**2. 后端是会话真相源**

对话历史、agent state、文档 overlay 全部由后端持有。前端只存 `session_id` 列表用于 UI。切换会话时后端完整恢复（含 tool_use/result、agent state、open_buffers）。

**3. 文档不全文嵌入 prompt**

Agent 用 `read_file` 工具按需读取文件，避免 context 窗口被长文档撑爆。

**4. 流式输出**

`stream_async()` → `chat/stream_start` → `message_delta` / `reasoning_delta` → `stream_end`。前端逐字显示，不等全部生成。

**5. 后端拥有工作区**

文件系统由后端管理。前端通过 WS 协议与后端交互，不直接访问磁盘。

---

## 工作区与文档真相源

### 设计原则

```
后端 owns filesystem
session owns dirty buffer overlay
read_file = overlay first, disk second
frontend = editor/rendering + explicit sync
```

### 为什么后端拥有工作区

| 方案 | 问题 |
|------|------|
| 前端拥有（FileSystemDirectoryHandle） | Agent 工具需要通过 WS 向前端请求文件，延迟高、复杂度高、tab 关了就断 |
| **后端拥有（project_root）** | Agent 工具直接读磁盘，零延迟，架构简单 |

Cursor 能直接读编辑器 buffer 是因为它运行在同一个进程（Electron）中。我们是前后端分离，必须在架构层面统一真相源。

### Session Buffer Overlay

`SessionState` 维护一个 `open_buffers` 字典，覆盖磁盘文件：

```python
@dataclass
class SessionState:
    open_buffers: dict[str, str] = field(default_factory=dict)  # 相对路径 → 内容
    active_path: str | None = None                               # 当前焦点文件（project-relative）
    pending_replacements: list[Replacement] = field(default_factory=list)
```

- `open_buffers`：前端打开的所有文件的最新内容（含未保存编辑）
- `active_path`：当前焦点文件的 project-relative 路径（如 `chapters/intro.md`），不是 basename
- 键是规范化后的 project-relative 路径，不是 basename（避免同名文件碰撞）

### read_file 叠加逻辑

```python
@tool(context=True)
def read_file(path: str, tool_context: ToolContext) -> dict:
    session = tool_context.invocation_state["session"]
    norm_path = _normalize(path)

    # 1. overlay 优先：前端打开的文件，返回最新内容（含未保存编辑）
    if norm_path in session.open_buffers:
        return _success(session.open_buffers[norm_path])

    # 2. 磁盘兜底：未打开的文件，读磁盘
    root = tool_context.invocation_state["project_root"]
    abs_path = resolve_workspace_path(root, path)
    return _success(abs_path.read_text())
```

### Flush before chat

`document/change` 是 1s debounce，用户打完字立刻发消息可能拿到旧内容。

解决方案：`chat/message` 带当前 buffer 快照，handler 收到后先更新 `open_buffers` 再调 agent。

```json
{
  "type": "chat/message",
  "text": "帮我看看引言",
  "context": {
    "active_path": "chapters/intro.md",
    "buffer_snapshot": "# Introduction\nThis paper..."
  }
}
```

不依赖之前的 debounce 消息，保证 agent 拿到最新编辑。

### 前端本地文件夹模式

`FileSystemDirectoryHandle` 仅用于**初始化**——用户选择文件夹后，把路径告诉后端作为 `project_root`。后续所有文件读写由后端管理。

---

## Session 管理

### 问题

WebSocket 连接和会话的生命周期绑定——刷新页面 = 会话丢失。但 skills 激活、edit groups、memory 学习等状态恢复成本高，不应丢失。

### 方案

后端 `SessionStore` 持有所有会话的完整快照。前端只存 `session_id` 列表。

```python
@dataclass
class SessionSnapshot:
    session_id: str
    title: str                              # 首条用户消息摘要
    created_at: float
    messages: list[Message]                 # 完整 agent.messages（含 tool_use/result）
    agent_state: dict                       # agent.state 快照
    open_buffers: dict[str, str]            # 文档 overlay
    active_path: str | None

class SessionStore:
    """MVP 用内存 dict，后续可替换为文件/数据库。"""
    sessions: dict[str, SessionSnapshot] = {}

    def save(self, runner, session) -> None: ...
    def load(self, session_id: str) -> SessionSnapshot | None: ...
    def list_all(self) -> list[dict]: ...
```

### 切换流程

```
前端发 session/switch(session_id)
  → 后端 save 当前 runner 状态到 SessionStore
  → 后端 load 目标 SessionSnapshot
  → 重建 runner（messages + agent state + open_buffers）
  → 前端收到 session/restored 确认
```

### 完整恢复内容

| 数据 | 是否恢复 |
|------|---------|
| 对话历史（含 tool_use/result） | ✓ |
| Agent state（skills 激活状态等） | ✓ |
| Open buffers（文档 overlay） | ✓ |
| Edit groups | ✓ |
| Memory | ✓ |

---

## 扩展性设计

### 插件机制

通过 Strands 的 `Plugin` 类和 `AgentSkills` 插件，新功能以**插件形式**加入，不修改核心 runner 代码。

```
WritingAgentRunner（核心，不变）
    │
    ├── AgentSkills plugin       ← 按需加载 SKILL.md
    ├── WritingPlugin            ← 项目级 hooks + 工具
    │   ├── hooks: 工具拦截、状态通知
    │   └── tools: write_file、propose_edit 等
    └── 子 agent（Agent as Tool）
        ├── review agent
        ├── check agent
        └── ...
```

**添加新 Skill**：在 `plugins/` 目录放一个包含 `SKILL.md` 的文件夹，AgentSkills 自动发现。

**添加新子 agent**：在 Plugin 的 `init_agent()` 中创建 Agent 实例，用 `as_tool()` 注册。

**添加新工具**：在 Plugin 中用 `@tool` 装饰器定义方法，自动注册。

**添加新 hook**：在 Plugin 中用 `@hook` 装饰器定义方法，自动注册到对应事件。

### 工具与框架解耦

工具的业务逻辑和 Strands `@tool` 装饰器分层。业务逻辑层不依赖 Strands，可以独立测试和复用。

```python
# 业务逻辑层（零框架依赖）
def read_file_impl(
    project_root: Path,
    path: str,
    open_buffers: dict[str, str] | None = None,
) -> dict:
    norm = _normalize(path)
    if open_buffers and norm in open_buffers:
        return {"content": open_buffers[norm], "source": "buffer"}
    abs_path = resolve_workspace_path(project_root, path)
    return {"content": abs_path.read_text(), "source": "disk"}

# Strands 适配层（薄壳）
@tool(context=True)
def read_file(path: str, tool_context: ToolContext) -> dict:
    session = tool_context.invocation_state["session"]
    root = tool_context.invocation_state["project_root"]
    result = read_file_impl(root, path, session.open_buffers)
    return {"status": "success", "content": [{"text": result["content"]}]}
```

如果未来需要通过 MCP 暴露工具给其他客户端（Cursor、Claude 等），只需加一个 MCP 适配层，业务逻辑不变。

---

## 子 Agent 架构

### 模式：Agent as Tool

使用 Strands 的层级委托模式——主 agent 通过工具调用委托子 agent。

```python
# 子 agent 定义
review_agent = Agent(
    system_prompt="你是独立评审人...",
    tools=[read_file],
)

# 注册为工具
orchestrator = Agent(tools=[
    review_agent.as_tool(name="review", description="独立读者视角评估"),
])
```

主 agent 的 system prompt 中会说明何时调用哪个子 agent，由 LLM 自主决定。

### 上下文隔离

- 子 agent 默认每次调用重置上下文（干净基线），避免上一次调用的残留影响
- 通过 `invocation_state` 共享 session、project_root 等全局状态
- 子 agent 通过 `read_file` 工具自行读取需要的文件，主 agent 不传全文

---

## Skill 加载

### 机制：AgentSkills 插件（渐进式披露）

```
1. Discovery：启动时只注入 skill 的 name + description 到 system prompt
2. Activation：agent 通过内置 skills 工具按需加载完整 SKILL.md
3. Execution：按指令执行，可访问 skill 目录下的资源文件
```

好处：context 窗口只放 skill 的元数据（几十字），完整指令（几千字）按需加载。

### Skill 目录规范

遵循 [Agent Skills 规范](https://agentskills.io)：

```
plugins/
└── academic-writing/
    ├── SKILL.md              # 必须：frontmatter (name, description) + markdown 指令
    ├── agents/               # 可选：子 agent 定义
    │   ├── check.md
    │   └── review.md
    ├── reference/            # 可选：领域知识文件
    │   ├── narrative-theory.md
    │   └── word-choice.md
    └── rules/                # 可选：硬约束
        └── hard-constraints.mdc
```

子 agent 的 `.md` 文件使用 YAML frontmatter + markdown body 格式（和 Cursor 的 subagent 格式兼容）。frontmatter 包含 name、description、readonly、is_background 等元数据；markdown body 是 system prompt。

---

## 用户配置

三层配置，从底层到用户界面：

### 第一层：文件系统（存储）

```
workspace/
└── .writing-agent/
    ├── plugins-config.yaml    # 启用哪些插件、模型选择
    └── rules/                 # 用户自定义规则（markdown 文件）
        └── my-style.md
```

### 第二层：Chat 内自然语言（最友好）

用户在聊天中说"启用 academic-writing 插件"、"review 用强模型"，agent 调用工具修改配置文件。

### 第三层：前端 UI（锦上添花）

设置面板中启用/禁用插件、选择模型、管理规则。UI 读写第一层的文件。

---

## 环境变量

```env
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
AGENT_HOST=localhost
AGENT_PORT=8765
```

---

## 相关文档

- [Strands 框架学习笔记](strands-tutorial.md) — 框架 API 和概念详解
- [Agent IDE 协议](protocol.md) — WebSocket 消息格式
- [设计原则](principle.md) — 六步流程、Review、Memory 设计
- [Strands 官方文档缓存](strands-agents-llms-full.txt)

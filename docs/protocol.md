# Writing Agent Protocol

WebSocket JSON 协议，连接前端（浏览器）和后端（Python Agent）。

## 传输

- `ws://localhost:8765`（开发环境）
- 前端通过 Vite 代理 `/ws`
- 每个 WebSocket 连接可以切换多个会话（session），会话生命周期独立于连接

## 消息格式

所有消息都是 JSON 对象，必须包含 `type` 字段。

---

## Frontend → Agent

| type | 字段 | 说明 |
|------|------|------|
| `document/open` | `document`, `path` | 打开/切换文件，`path` 为 project-relative 路径 |
| `document/change` | `document`, `path` | 文档内容变更（防抖 1s） |
| `chat/message` | `text`, `context?` | 用户消息（context 中可带 `buffer_snapshot`） |
| `session/create` | — | 新建会话，后端返回 `session_id` |
| `session/switch` | `session_id` | 切换到已有会话（后端完整恢复） |
| `session/list` | — | 请求会话列表 |
| `ping` | — | 健康检查 |

### `document/open`

```json
{
  "type": "document/open",
  "path": "chapters/intro.md",
  "document": "# Introduction\nThis paper presents..."
}
```

- `path`：project-relative 路径（**不是 basename**，避免同名文件碰撞）
- `document`：文件完整内容
- 后端将此路径设为 `session.active_path`，内容写入 `session.open_buffers[path]`

### `document/change`

```json
{
  "type": "document/change",
  "path": "chapters/intro.md",
  "document": "# Introduction\nUpdated content..."
}
```

- 防抖 1s 后发送
- 后端更新 `session.open_buffers[path]`

### `chat/message`

```json
{
  "type": "chat/message",
  "text": "帮我看看引言",
  "context": {
    "active_path": "chapters/intro.md",
    "buffer_snapshot": "# Introduction\nThis paper...",
    "selection": { "from": 0, "to": 12, "text": "selected text" },
    "mentions": ["examples/other.md"]
  }
}
```

- `active_path`：当前焦点文件（project-relative）
- `buffer_snapshot`：发送时刻的编辑器内容快照（**不依赖 debounce，保证 agent 拿到最新编辑**）
- `selection`：编辑器选中文本
- `mentions`：`@` 引用的其他文件路径

handler 收到后先用 `buffer_snapshot` 更新 `session.open_buffers[active_path]`，再调 agent。

---

## Agent → Frontend

### 流式聊天（一个 `chat/message` 产生多帧）

| type | 字段 | 说明 |
|------|------|------|
| `chat/stream_start` | `stream_id` | 开始回复 |
| `chat/reasoning_delta` | `stream_id`, `text` | 推理片段 |
| `chat/message_delta` | `stream_id`, `text` | 回复片段 |
| `chat/tool_update` | `stream_id`, `tool_id`, `name`, `status`, `input?`, `output?`, `error?` | 工具调用进度 |
| `chat/stream_end` | `stream_id`, `text`, `reasoning?` | 回复结束 |

### Session

| type | 字段 | 说明 |
|------|------|------|
| `session/created` | `session_id`, `messages?` | 新建会话确认 |
| `session/cleared` | `session_id?`, `messages` | 当前会话已重置（通常 `messages: []`） |
| `session/restored` | `session_id`, `messages` | 会话切换确认（后端完成完整恢复） |
| `session/list` | `sessions: {session_id, title, created_at}[]` | 会话列表响应 |

### 其他

| type | 字段 | 说明 |
|------|------|------|
| `document/patch` | `document?`, `replacements?` | 文档补丁（当前未启用） |
| `error` | `message` | 用户可见错误 |
| `pong` | — | ping 响应 |

---

## Session 管理

后端是会话真相源。前端只持有 `session_id` 列表用于 UI 展示，不存储会话内容。

### 切换流程

```
前端发 session/switch(session_id)
  → 后端保存当前 session 完整状态（messages + agent state + open_buffers）
  → 后端加载目标 session 完整状态
  → 前端收到 session/restored 确认
```

### 后端 SessionStore

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
```

MVP 阶段用内存 dict 存储，后续可替换为文件/数据库。

### 前端职责

- localStorage 只存 `session_id` 列表（用于 tab UI 展示标题和顺序）
- 连接建立后发 `session/list` 获取会话列表
- 用户切换 tab 时发 `session/switch`
- 用户新建 tab 时发 `session/create`

### 完整恢复

| 数据 | 是否恢复 |
|------|---------|
| 对话历史（含 tool_use/result） | ✓ |
| Agent state（skills 激活状态等） | ✓ |
| Open buffers（文档 overlay） | ✓ |
| Edit groups | ✓ |
| Memory | ✓ |

---

## Review 协议（P1，data structure TBD）

Agent 提出结构化编辑组，用户逐编辑审查后批量应用。

### Agent → Frontend

| type | 字段 | 说明 |
|------|------|------|
| `group/propose` | `group_id`, `title`, `path`, `edits` | 提交编辑组（data structure TBD，见下） |
| `group/update` | `group_id`, `edit_id`, `edits` | 调整后的编辑（含 `replaces` 指针） |

### Frontend → Agent

| type | 字段 | 说明 |
|------|------|------|
| `group/apply` | `group_id` | 确认应用该组中所有 pending 编辑 |
| `group/delete` | `group_id`, `edit_id` | 删除某个编辑（用户拒绝） |

adjust 和 explain 不需要独立消息——用户在 chat 中表达，走 `chat/message`，context 带 `related_edit_id` 让 agent 知道在说哪个编辑。

### Data structure 待定

`group/propose` 和 `group/update` 的 edit 数据结构需要解决以下问题后才能定义：

- **文本定位**：字符偏移 / 行号 / 内容匹配 / 上下文锚点——用户在审查期间编辑文档时，定位如何追踪
- **状态同步**：edit 与文档的实时对应关系，重叠编辑处理
- **生命周期**：`replaced_by` 指针如何与 edit 状态配合

这些问题依赖前端编辑器集成（TipTap 位置追踪能力）的技术约束，留到 P1 Review UI 实现阶段设计。

---

## 真相源

- **对话历史**：后端 `agent.messages`（唯一真相源）
- **文档内容**：后端 `session.open_buffers`（overlay）+ 磁盘（兜底）
- **编辑器状态**：前端 TipTap editor（渲染层，不承担存储职责）

---

## 代码引用

- TypeScript: `frontend/src/lib/agent-protocol.ts`
- Python: `agent/protocol.py`, `agent/handler.py`

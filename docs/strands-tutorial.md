# Strands Agent 框架文档

> 基于 `strands-agents>=1.42.0`（Python SDK）。  
> 参考：[Strands Agents 官方文档](https://strandsagents.com) | [GitHub](https://github.com/strands-agents/sdk-python)  
> 本地完整文档缓存：`docs/strands-agents-llms-full.txt`

---

## 1. 设计哲学

Strands 的核心理念是**模型驱动、最小编排**：

> "You supply the prompt and tools and trust the model to figure out the sequence."

- **Agent = Model + Tools + System Prompt**——三元组定义一个 agent，没有 graph/workflow 编排层
- **Agent Loop 是唯一执行原语**——模型推理 → 工具选择 → 执行 → 结果反馈 → 循环，直到模型给出最终回答
- **渐进复杂度**——从单 agent 到 multi-agent，用同一套原语自然扩展
- **Hooks 做横切关注点**——日志、验证、重试、拦截通过生命周期钩子实现，不侵入核心逻辑

与 LangChain 的对比：LangChain 偏向显式编排（chain、graph、state machine），Strands 偏向让模型自己决定执行路径。

---

## 2. Agent Loop

```
Input & Context → [Reasoning (LLM) → Tool Selection → Tool Execution] → Response
                              ↑                           |
                              └───────────────────────────┘
```

### 2.1 执行流程

1. 用户输入成为对话历史的第一条消息
2. Agent 调用 Model，传入 system prompt + 对话历史 + 工具描述
3. Model 返回：文本回复（end_turn）或工具调用请求（tool_use）
4. 如果是工具调用：执行工具 → 结果追加到对话历史 → 回到步骤 2
5. 如果是文本回复：返回给调用方

### 2.2 Stop Reasons

| 原因 | 含义 | 处理方式 |
|------|------|---------|
| `end_turn` | 正常结束 | 返回最终回复 |
| `tool_use` | 请求工具执行 | 执行工具后继续循环 |
| `cancelled` | 外部调用 `agent.cancel()` | 终止循环 |
| `max_tokens` | 输出被截断 | 不可恢复，需增大限制 |
| `stop_sequence` | 遇到停止序列 | 正常终止 |
| `interrupt` | 人类审批中断 | 等待用户响应后恢复 |

### 2.3 上下文累积

每次循环迭代都会往对话历史追加消息。模型看到的不仅是原始请求，还有每次工具调用和结果。这种累积上下文是多步推理的基础。

---

## 3. 创建 Agent

### 3.1 最简形式

```python
from strands import Agent

agent = Agent(
    model=openai_model,
    system_prompt="你是写作助手",
    tools=[read_file],
)
result = agent("帮我看看这段文字")
```

### 3.2 完整参数

```python
agent = Agent(
    model=model,                              # 模型提供者（OpenAIModel / BedrockModel 等）
    system_prompt="...",                       # 系统提示
    tools=[tool1, tool2],                     # 工具列表
    plugins=[plugin1],                         # 插件列表
    hooks=[hook1],                             # 钩子列表
    conversation_manager=SlidingWindowConversationManager(window_size=40),
    callback_handler=None,                     # 回调处理器（旧 API，推荐用 hooks）
    messages=[],                               # 预填充对话历史
    state={"key": "value"},                    # Agent 状态（KV 存储）
)
```

### 3.3 流式调用

```python
# 同步调用
result = agent("任务")

# 异步流式调用
async for event in agent.stream_async("任务"):
    # event 包含 data/reasoningText/tool_use_stream 等
    ...
```

### 3.4 Agent Result

```python
result = agent("任务")
result.stop_reason    # "end_turn" / "tool_use" / "cancelled" / ...
result.message        # 完整的 assistant 消息
result.state          # invocation_state 快照
```

---

## 4. 模型提供者

### 4.1 OpenAI（当前项目使用）

```python
from strands.models.openai import OpenAIModel

model = OpenAIModel(
    client_args={
        "api_key": "sk-...",
        "base_url": "https://api.openai.com/v1",
    },
    model_id="gpt-4o-mini",
    params={"temperature": 0.3},
)
```

### 4.2 其他支持的提供者

| 提供者 | 包 | 示例 model_id |
|--------|---|---------------|
| Amazon Bedrock | `strands.models.bedrock` | `anthropic.claude-sonnet-4-6-v1:0` |
| Anthropic | `strands.models.anthropic` | `claude-sonnet-4-20250514` |
| Google | `strands.models.google` | `gemini-2.0-flash` |
| Ollama | `strands.models.ollama` | `llama3` |
| LiteLLM | `strands.models.litellm` | 任意模型 |
| 自定义 | 实现 `Model` 接口 | — |

---

## 5. 工具系统

### 5.1 `@tool` 装饰器（推荐）

```python
from strands import tool
from strands.types.tools import ToolContext

@tool
def read_file(path: str) -> dict:
    """Read a text file.

    Args:
        path: Project-relative file path.

    Returns:
        File contents and metadata.
    """
    text = Path(path).read_text()
    return {"status": "success", "content": [{"text": text}]}
```

**Docstring 约定**：
- 第一段 = 工具描述
- `Args:` 部分 = 参数描述
- 类型注解 → 自动生成 JSON Schema

### 5.2 上下文感知工具

```python
@tool(context=True)
def read_file(path: str, tool_context: ToolContext) -> dict:
    """Read a file under the project root."""
    root = tool_context.invocation_state["project_root"]
    # ...
```

`ToolContext` 提供：
- `tool_context.tool_use`——当前工具调用的原始请求
- `tool_context.invocation_state`——跨工具共享状态（session、project_root 等）
- `tool_context.agent`——所属 agent 实例

### 5.3 模块化工具（Module-Based Tools）

不使用装饰器，通过 `TOOL_SPEC` + 同名函数定义：

```python
# weather.py
TOOL_SPEC = {
    "name": "weather",
    "description": "Get weather info",
    "inputSchema": {"json": {"type": "object", "properties": {"location": {"type": "string"}}}},
}

def weather(tool, **kwargs):
    tool_input = tool["input"]
    return {"toolUseId": tool["toolUseId"], "status": "success", "content": [{"text": "Sunny"}]}
```

```python
# agent.py
from strands import Agent
import weather

agent = Agent(tools=[weather])
```

### 5.4 文件路径加载

```python
agent = Agent(tools=["./tools/weather.py"])
```

### 5.5 自动加载目录

```python
agent = Agent(load_tools_from_directory=True)
# ./tools/ 下的 .py 文件自动注册，修改后自动重载
```

### 5.6 直接调用工具

```python
# 绕过 LLM，直接调用工具
result = agent.tool.read_file(path="example.md")
```

---

## 6. Plugin 系统

Plugin 将 hooks + tools + 初始化逻辑打包成可复用组件。

### 6.1 基本结构

```python
from strands import Agent, tool
from strands.plugins import Plugin, hook
from strands.hooks import BeforeToolCallEvent

class WritingPlugin(Plugin):
    name = "writing-tools"

    @hook
    def log_tool(self, event: BeforeToolCallEvent) -> None:
        print(f"Tool: {event.tool_use['name']}")

    @tool
    def read_file(self, path: str) -> str:
        """Read a project file."""
        return Path(path).read_text()

agent = Agent(plugins=[WritingPlugin()])
```

### 6.2 生命周期

```
Plugin Attached → Discover @tool methods → Add Tools
                → Discover @hook methods → Register Hooks
                → Call init_agent(agent)  → Custom setup
```

### 6.3 自定义初始化

```python
class MyPlugin(Plugin):
    name = "my-plugin"

    def init_agent(self, agent: Agent) -> None:
        if self.verbose:
            agent.add_hook(self.verbose_log, BeforeToolCallEvent)
```

### 6.4 状态管理

```python
class MetricsPlugin(Plugin):
    name = "metrics"

    def init_agent(self, agent: Agent) -> None:
        if "call_count" not in agent.state:
            agent.state.set("call_count", 0)

    @hook
    def count(self, event: BeforeToolCallEvent) -> None:
        current = event.agent.state.get("call_count", 0)
        event.agent.state.set("call_count", current + 1)
```

---

## 7. Hooks 生命周期

### 7.1 事件顺序

```
BeforeInvocationEvent
  → MessageAddedEvent
  → BeforeModelCallEvent
    → AfterModelCallEvent
    → MessageAddedEvent
  → BeforeToolCallEvent
    → AfterToolCallEvent
    → MessageAddedEvent
  → （重复 Model + Tool 循环）
→ AfterInvocationEvent
```

### 7.2 注册方式

```python
# 方式 1：agent.add_hook
agent.add_hook(my_callback, BeforeToolCallEvent)

# 方式 2：HookProvider 协议
class MyHooks(HookProvider):
    def register_hooks(self, registry: HookRegistry):
        registry.add_callback(BeforeToolCallEvent, self.on_tool)
    def on_tool(self, event: BeforeToolCallEvent):
        ...

# 方式 3：Plugin 内 @hook 装饰器
```

### 7.3 可修改的事件属性

| 事件 | 可修改属性 | 用途 |
|------|-----------|------|
| `BeforeToolCallEvent` | `cancel_tool` | 取消工具执行 |
| `BeforeToolCallEvent` | `selected_tool` | 替换要执行的工具 |
| `BeforeToolCallEvent` | `tool_use` | 修改工具参数 |
| `AfterToolCallEvent` | `result` | 修改工具返回值 |
| `AfterToolCallEvent` | `retry` | 重试工具调用 |
| `AfterModelCallEvent` | `retry` | 重试模型调用 |
| `AfterInvocationEvent` | `resume` | 触发后续 agent 调用 |

### 7.4 回调注册顺序

Before 事件按注册顺序（A, B, C）执行；After 事件按反序（C, B, A）执行——保证清理的对称性。

---

## 8. 多 Agent 模式

### 8.1 Agents as Tools（层级委托）——最适合本项目

将专业 agent 包装为工具，由编排 agent 按需委托。

```python
from strands import Agent

# 方式 1：直接传入（最简单）
review_agent = Agent(
    system_prompt="你是独立评审人，从读者视角评估文本...",
    tools=[read_file],
)
orchestrator = Agent(tools=[review_agent])

# 方式 2：.as_tool()（自定义名称/描述）
orchestrator = Agent(tools=[
    review_agent.as_tool(
        name="review",
        description="Independent reader-perspective evaluation",
    )
])

# 方式 3：@tool 装饰器（完全控制）
@tool
def review(task: str) -> str:
    """Delegate review task."""
    agent = Agent(system_prompt="...", tools=[read_file])
    return str(agent(task))
```

**上下文管理**：
- 默认每次调用重置子 agent 上下文（干净基线）
- `as_tool(preserve_context=True)` 保持会话历史

### 8.2 Graph（确定性流程 + LLM 决策）

开发者定义节点和边，LLM 在每个节点决定走哪条路径。

```python
from strands.multiagent import Graph

graph = Graph(
    agents={"reviewer": reviewer_agent, "editor": editor_agent},
    edges=[("reviewer", "editor")],  # reviewer 完成后到 editor
)
result = graph("Review and edit this paper")
```

### 8.3 Swarm（自主协作）

Agent 团队自主交接控制权，共享上下文。

```python
from strands.multiagent import Swarm

swarm = Swarm(
    nodes=[researcher, analyzer, writer],
    max_handoffs=20,
    execution_timeout=900.0,
)
result = swarm("Research and write about quantum computing")
```

每个 agent 自动获得 `handoff_to_agent` 工具。

### 8.4 Workflow（确定性并行）

预定义 DAG，独立任务并行执行。

### 8.5 模式选择

| 模式 | 执行流 | 适用场景 |
|------|--------|---------|
| Agent as Tool | 层级委托，编排器决策 | 写作助手需要多种专业能力 |
| Graph | 开发者定义边，LLM 决定路径 | 条件分支、循环流程 |
| Swarm | 自主协作 | 探索、头脑风暴、多源综合 |
| Workflow | 确定性并行 | 可重复的复杂流程 |

---

## 9. 状态管理

### 9.1 三种状态

| 类型 | 作用域 | 用途 |
|------|--------|------|
| **Conversation History** (`agent.messages`) | 跨调用持久 | 对话上下文，自动传给模型 |
| **Agent State** (`agent.state`) | 跨调用持久 | KV 存储，不传给模型 |
| **Invocation State** (`invocation_state`) | 单次调用 | 跨工具共享（session、project_root） |

### 9.2 Invocation State（当前项目使用）

```python
# 在 stream_async 时传入
async for event in agent.stream_async(
    prompt,
    invocation_state={
        "session": session,
        "project_root": project_root,
        "outbound_queue": outbound_queue,
    },
):
    ...

# 在工具中通过 ToolContext 访问
@tool(context=True)
def read_file(path: str, tool_context: ToolContext) -> dict:
    root = tool_context.invocation_state["project_root"]
    queue = tool_context.invocation_state["outbound_queue"]
    ...
```

**传播规则**：
- 自动传播给所有 agent（通过 `**kwargs`）
- 通过 `ToolContext` 传播给所有工具
- 通过 Hook 事件传播给所有钩子
- 在 multi-agent 模式中共享给所有参与 agent

### 9.3 Agent State（可扩展）

```python
agent = Agent(state={"session_id": "abc123"})
agent.state.set("last_action", "review")
agent.state.get("last_action")  # "review"
```

JSON 序列化验证——不可序列化的值会抛出 `ValueError`。

---

## 10. 对话管理

### 10.1 内置管理器

| 管理器 | 策略 | 默认 |
|--------|------|------|
| `NullConversationManager` | 不修改历史 | — |
| `SlidingWindowConversationManager` | 滑动窗口 | **默认** |
| `SummarizingConversationManager` | 智能摘要 | — |

### 10.2 滑动窗口（当前项目推荐）

```python
from strands.agent.conversation_manager import SlidingWindowConversationManager

conversation_manager = SlidingWindowConversationManager(
    window_size=40,                    # 保留最近 40 条消息
    should_truncate_results=True,      # 超长工具结果自动截断
    per_turn=True,                     # 每轮模型调用前都检查
)
agent = Agent(conversation_manager=conversation_manager)
```

### 10.3 主动压缩

```python
SlidingWindowConversationManager(
    window_size=50,
    proactive_compression={"compression_threshold": 0.7},
)
# context 使用达到 70% 时自动压缩，而不是等到溢出
```

---

## 11. 中断系统（Human-in-the-Loop）

```python
from strands import tool

@tool
def write_file(path: str, content: str, tool_context: ToolContext) -> str:
    """Write content to a file."""
    # 人类审批
    tool_context.interrupt("write_approval", reason=f"Write to {path}?")
    # 如果用户拒绝，不会执行到这里
    Path(path).write_text(content)
    return f"Written to {path}"
```

**流程**：Raise → Return → Respond → Resume

- `interrupt()` 暂停 agent，返回中断给用户
- 用户提供响应（批准/拒绝）后 agent 恢复
- 支持 session 持久化（跨会话恢复中断状态）
- 支持 multi-agent 模式（Graph/Swarm 中的中断）

---

## 12. Agent Skills 插件

遵循 [Agent Skills 规范](https://agentskills.io)——和 Cursor 的 Skill 格式是同一个标准。

### 12.1 工作方式

渐进式披露（Progressive Disclosure）：

1. **Discovery**：启动时只注入 skill 的 name + description 到 system prompt（XML 块）
2. **Activation**：agent 通过内置 `skills` 工具按需加载完整 SKILL.md 指令
3. **Execution**：按指令执行，可访问 skill 目录下的资源文件

### 12.2 使用

```python
from strands import Agent
from strands.vended_plugins.skills.agent_skills import AgentSkills

skill_plugin = AgentSkills(skills=[
    "./plugins/academic-writing/",   # 目录（包含 SKILL.md）
    "https://example.com/skill.md",  # URL
])
agent = Agent(plugins=[skill_plugin])
```

### 12.3 SKILL.md 格式

```yaml
---
name: academic-writing
description: Refine academic writing for high-impact STEM journals.
allowed-tools: read_file write_file
metadata:
  author: akiko-keyio
---

（markdown 指令 = 完整的工作流）
```

| Frontmatter 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 唯一标识，小写 + 连字符 |
| `description` | 是 | 功能描述，出现在 system prompt |
| `allowed-tools` | 否 | 空格分隔的工具白名单 |
| `metadata` | 否 | 自定义 KV 数据 |

### 12.4 参数

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `skills` | `SkillSources` | 必填 | 路径/URL/Skill 实例 |
| `state_key` | `str` | `"agent_skills"` | session 持久化的 state key |
| `max_resource_files` | `int` | `20` | 激活时列出的最大资源文件数 |
| `strict` | `bool` | `False` | 验证失败时抛异常 vs 警告 |

---

## 13. 本项目的 Strands 架构

### 13.1 当前架构

```python
# strands_runner.py
from strands import Agent
from strands.models.openai import OpenAIModel

class WritingAgentRunner:
    def __init__(self, project_root):
        self._agent = Agent(
            model=OpenAIModel(...),
            system_prompt="你是写作助手...",
            tools=[read_file],               # 唯一工具
            callback_handler=None,
        )

    async def chat_turn_stream(self, session, user_text, context):
        async for event in self._agent.stream_async(
            prompt,
            invocation_state={"session": session, "project_root": root, "outbound_queue": queue},
            limits=Limits(turns=12),
        ):
            yield ws_event
```

### 13.2 目标架构（Plugin + Subagent + Skills）

```python
from strands import Agent
from strands.models.openai import OpenAIModel
from strands.agent.conversation_manager import SlidingWindowConversationManager
from strands.vended_plugins.skills.agent_skills import AgentSkills

# 专业子 agent（Agent as Tool）
review_agent = Agent(
    system_prompt=review_prompt,  # 从 agents/review.md 加载
    tools=[read_file],
)
check_agent = Agent(
    system_prompt=check_prompt,
    tools=[read_file],
)

# Skills 插件（渐进式披露）
skill_plugin = AgentSkills(skills=["./plugins/academic-writing/"])

# 主编排 agent
orchestrator = Agent(
    model=OpenAIModel(...),
    system_prompt=base_prompt,
    tools=[read_file, review_agent, check_agent],
    plugins=[skill_plugin, WritingPlugin()],
    conversation_manager=SlidingWindowConversationManager(window_size=40),
)
```

### 13.3 依赖关系图

```
Frontend (React)
    │ WebSocket JSON 协议（依赖倒置边界）
    ▼
handler.py          ← 协议路由（薄层适配）
    ▼
strands_runner.py   ← WritingAgentRunner
    ▼
Strands Agent        ← Model + Tools + Plugins + Hooks
    ├── @tool read_file        ← 写作工具
    ├── Agent as Tool: review  ← 独立评审子 agent
    ├── Agent as Tool: check   ← 一致性检查子 agent
    ├── AgentSkills plugin     ← Skill 渐进式加载
    └── WritingPlugin          ← 自定义 hooks + 工具
```

---

## 14. 关键 API 速查

```python
# 创建 Agent
agent = Agent(model=..., system_prompt=..., tools=..., plugins=...)

# 同步调用
result = agent("任务描述")

# 异步流式调用
async for event in agent.stream_async("任务", invocation_state={...}):
    ...

# 访问对话历史
agent.messages

# 管理状态
agent.state.set("key", value)
agent.state.get("key")

# 取消执行
agent.cancel()

# 直接调用工具
agent.tool.read_file(path="...")

# 添加钩子
agent.add_hook(callback, BeforeToolCallEvent)

# 注册插件
agent = Agent(plugins=[MyPlugin()])

# 子 agent 作为工具
orchestrator = Agent(tools=[specialist_agent.as_tool(name="specialist")])
```

---

## 15. 参考资源

- [官方文档](https://strandsagents.com)
- [GitHub SDK](https://github.com/strands-agents/sdk-python)
- [GitHub 工具包](https://github.com/strands-agents/tools)
- [Agent Skills 规范](https://agentskills.io)
- [本地文档缓存](strands-agents-llms-full.txt)
- [示例仓库](https://github.com/strands-agents/samples)

---

## 16. 概念深入：Agent 到底是什么

Agent 就是一个循环：

```python
def agent_loop(user_input, model, tools, system_prompt):
    messages = [user_input]

    while True:
        # 1. 把所有信息喂给 LLM
        response = model.generate(
            system=system_prompt,
            messages=messages,
            tools=tools,
        )

        # 2. LLM 说"我要调用工具 X"
        if response.tool_calls:
            for call in response.tool_calls:
                result = tools[call.name](**call.args)
                messages.append(result)

        # 3. LLM 说"我回答完了"
        else:
            return response.text
```

Strands 的 `Agent` 类就是这个循环的生产级实现，加了错误处理、流式输出、上下文管理等。

---

## 17. 概念深入：Hooks 的工作原理

### 17.1 事件是什么

Agent 循环中有几个关键时刻：

```
循环开始前        ← BeforeInvocationEvent
调用模型前        ← BeforeModelCallEvent
调用模型后        ← AfterModelCallEvent
执行工具前        ← BeforeToolCallEvent
执行工具后        ← AfterToolCallEvent
循环结束后        ← AfterInvocationEvent
```

这些时刻就是**事件**（Event）。

### 17.2 没有 Hooks 时

Agent 的循环是封闭的，你无法在关键时刻插入自己的代码。

### 17.3 有 Hooks 时

Agent 在每个事件发生时主动调用你注册的函数。关键理解：**不是你调用 Agent，是 Agent 调用你的函数。**

```python
def my_log(event):
    print(f"要调用工具了: {event.tool_use['name']}")

agent.add_hook(my_log, BeforeToolCallEvent)
```

Agent 内部变为：

```python
# 伪代码
if response.tool_calls:
    for call in response.tool_calls:
        # 通知所有 hook
        event = BeforeToolCallEvent(tool_use=call)
        for hook in hooks:
            hook(event)                    # 你的 my_log 在这里执行
        if event.cancel_tool:
            continue                       # hook 说取消就不执行了

        result = tools[call.name](**call.args)
```

### 17.4 Hook 能做什么

| 能力 | 方式 | 场景 |
|------|------|------|
| 打日志 | 读 `event.tool_use` | 监控 |
| 取消工具 | `event.cancel_tool = "不允许"` | 安全拦截 |
| 改参数 | `event.tool_use["input"]["path"] = ...` | 参数修正 |
| 改结果 | `event.result["content"] = ...` | 结果加工 |
| 重试 | `event.retry = True` | 失败恢复 |
| 触发后续调用 | `event.resume = "继续做..."` | 自主循环 |

---

## 18. 概念深入：Plugin 的工作原理

Plugin 是 hooks + tools 的打包格式。

### 18.1 没有 Plugin 时

```python
agent.add_hook(hook1, BeforeToolCallEvent)
agent.add_hook(hook2, AfterToolCallEvent)
agent.add_hook(hook3, BeforeModelCallEvent)
agent = Agent(tools=[tool1, tool2, tool3])
```

散落各处，不好管理。

### 18.2 有 Plugin 时

```python
class MyBundle(Plugin):
    name = "my-bundle"

    @hook
    def hook1(self, event: BeforeToolCallEvent): ...
    @hook
    def hook2(self, event: AfterToolCallEvent): ...

    @tool
    def tool1(self, x: str) -> str: ...

agent = Agent(plugins=[MyBundle()])
```

一行 `plugins=[MyBundle()]` 注册了 2 个 hook + 1 个工具。

### 18.3 @hook 装饰器

`@hook` 做两件事：

1. **标记**——告诉框架"这个方法是一个 hook"
2. **自动推断事件类型**——通过函数的类型注解

```python
@hook
def on_model_call(self, event: BeforeModelCallEvent): ...
#                                ↑ 类型注解告诉框架：在 BeforeModelCallEvent 时调用
```

框架在 `Agent(plugins=[MyPlugin()])` 时自动扫描并注册。

### 18.4 self 是谁

在 Plugin 的方法中，`self` 是 **Plugin 实例**，不是 Agent。

```python
@hook
def log(self, event: BeforeToolCallEvent):
    agent = event.agent              # 通过 event 访问 agent
    session = event.invocation_state["session"]  # 通过 invocation_state 访问共享状态
```

### 18.5 总结

```
Hooks：Agent 循环中的拦截点（单个函数）
Plugin：一组 hooks + tools 的打包（一个类）
@hook：标记 + 自动推断事件类型的装饰器
```

---

## 19. 概念深入：async / await / yield

### 19.1 为什么需要异步

调用 LLM 是网络请求，要等几秒到几十秒。同步等待时 CPU 空转，异步等待时 CPU 可以做别的事。

### 19.2 async/await 是什么

`async/await` 是事件循环的**语法糖**。底层是回调（callback），但写法看起来像同步代码。

没有 async/await 时（回调地狱）：

```python
step1(result1, lambda:
    step2(result2, lambda:
        step3(result3, lambda:
            print("完成"))))
```

有 async/await 时：

```python
async def process():
    result1 = await step1()
    result2 = await step2(result1)
    result3 = await step3(result2)
    print("完成")
```

逻辑完全一样，只是写法从回调变成了顺序。编译器会把 `await` 后面的代码自动转换成回调。

### 19.3 实现机制：协程

`await` 做了三件事：

1. 保存当前状态（执行到第几行、变量是什么）
2. 把 CPU 让给别人
3. 等待完成后，恢复状态，从暂停的地方继续

事件循环（Event Loop）是调度员：

```python
# 伪代码
while pending_tasks:
    for task in pending_tasks:
        if task.is_ready():    # 网络请求有结果了？
            task.resume()      # 唤醒它，继续执行
```

### 19.4 项目中的用法

```python
async def chat_turn_stream(self, session, user_text, context):
    async for event in self._agent.stream_async(prompt, ...):
    #   ↑ 异步循环：每拿到一个流式事件就处理一个
        yield ws_event
    #   ↑ 产出一个事件，等调用方拿走后继续
```

| 关键字 | 作用 |
|--------|------|
| `async def` | 声明异步函数（内有要等的操作） |
| `async for` | 异步循环（流式数据来一条处理一条） |
| `yield` | 产出一个值，暂停，等调用方来取 |

三个关键字组合实现了**流式输出**——LLM 每生成一个字，前端就看到一个字，不用等全部生成完。

### 19.5 跨语言支持

`async/await` 不是 Python 特有的，几乎所有现代语言都有：JavaScript、C#、Rust、Go、Kotlin 等。最早由 C# 在 2012 年引入，Python 在 3.5（2015 年）加入。

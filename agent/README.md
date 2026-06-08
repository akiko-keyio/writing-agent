# Writing Agent (Python)

WebSocket server for the Writing Agent IDE. The intelligence layer uses **[Strands Agents](https://strandsagents.com/)** (`strands-agents`) with OpenAI-compatible models and writing tools.

See [docs/agent-strands-migration.md](../docs/agent-strands-migration.md) for architecture and roadmap.

## Run

```bash
cd agent
uv sync
uv run python main.py
```

## Configure (repo root `.env`)

```env
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Listens on `ws://localhost:8765` (frontend proxies `/ws` in dev).

## Layout

| File | Role |
|------|------|
| `handler.py` | WebSocket → protocol messages |
| `strands_runner.py` | Strands `Agent` + `invoke_async` |
| `writing_tools.py` | `@tool apply_text_replacements` |
| `connection.py` | 每连接 `session` + `runner` |
| `protocol.py` | `SessionState`（文档与 pending patch，无聊天列表） |

## Test

```bash
cd agent && uv run pytest
```

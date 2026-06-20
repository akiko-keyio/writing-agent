# Writing Agent (Python)

WebSocket server for the Writing Agent IDE. Uses **[Strands Agents](https://strandsagents.com/)** with OpenAI-compatible models and writing tools.

## Run

```bash
cd agent
uv sync
uv run python main.py
```

Configure via repo-root `.env` and `config/models.yaml`, `config/tools.yaml`, `config/subagents.yaml` (copy from `config/*.example`).

Listens on `ws://localhost:8765` (frontend proxies `/ws` in dev).

## Package layout

```
agent/
├── writing_agent/          # importable package
│   ├── server/             # WebSocket entry, handler, protocol, review handlers
│   ├── domain/             # edit groups, memory, sessions, storage
│   ├── runtime/            # Strands runner, models, subagents, plugins
│   ├── tools/              # writing tools, reference check, verification
│   ├── adapters/           # Strands community tools, file read adapter
│   └── workspace/          # project root resolution
├── plugins/                # academic-writing skill + subagent specs
├── evals/                  # deterministic behavior evals
├── scripts/                # smoke / CLI helpers
├── tests/
└── main.py                 # thin entrypoint shim
```

## Test

```bash
cd agent && uv run pytest -q
uv run python -m evals.runner --suite smoke
```

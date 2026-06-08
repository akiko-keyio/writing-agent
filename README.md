# Writing Agent

一个智能写作 Agent IDE：在干净文档中写作，通过右侧 Chat 与 LLM 协作改稿（直接 patch，无分组 Review 面板）。

## 功能特性

- **Agent IDE 壳层**：顶栏、Explorer（文件树 + 大纲）、多标签编辑区、Chat 面板
- **WebSocket Agent**：Python 服务（`:8765`），OpenAI 兼容 API
- **Chat 改稿**：用户发起对话 → Agent 回复并可选 `document/patch` 写入编辑器
- **上下文**：当前文件、编辑器选区、`@` 提及工作区中的 `.md` 文件
- **工作区**：内置项目 API 或本地文件夹（File System Access API）
- **保存 / 导出**：File 菜单 Save、Export `.md`
- **会话**：Chat 历史存 localStorage；新对话清空 Agent 会话

## 技术栈

- **前端**：React + Vite + TypeScript + TipTap（Markdown）
- **UI**：[coss ui](https://coss.com/ui)
- **Agent**：Python + websockets + OpenAI SDK（uv）

## 快速开始

### 1. 配置 LLM

复制根目录 `.env.example` 为 `.env` 并填写 API Key：

```bash
cp .env.example .env
```

### 2. 一键启动（推荐）

在仓库根目录：

```bash
npm install          # 首次：安装 concurrently
cd frontend && pnpm install && cd ..
npm run dev          # 同时启动 Agent :8765 + 前端 :5173
```

浏览器打开 `http://localhost:5173`。Chat 面板顶部显示 **Connected** 即表示 WebSocket 已接通。

### 2b. 分开启动

**Agent**（`ws://localhost:8765`）：

```bash
cd agent
uv sync
uv run python main.py
```

**前端**（Vite 将 `/ws` 代理到 Agent）：

```bash
cd frontend
pnpm install
pnpm dev
```

### 3. 使用

浏览器打开 `http://localhost:5173`，打开 `examples/test-text.md`，在 Chat 中描述想要的修改（例如：「把 utilize 改成 use」）。

协议说明见 [docs/agent-ide-protocol.md](docs/agent-ide-protocol.md)。

## 项目结构

```
writing-agent/
├── agent/                 # Python WebSocket + LLM
├── frontend/              # React IDE
├── examples/              # 示例 Markdown
├── docs/
│   ├── agent-ide-protocol.md
│   ├── writing-agent-design.md
│   └── writing-agent-spec.md   # 含 Review 规格（当前实现走 Chat-First）
└── .env
```

## 开发

```bash
cd agent && uv run pytest
cd frontend && pnpm exec tsc --noEmit && pnpm run build
```

## 许可证

MIT

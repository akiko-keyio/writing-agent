# Writing Agent

一个智能写作代理，帮助作者优化文档以适应读者需求。

## 功能特性

- **画布 + 停靠面板**：全屏文档区，左侧 Explorer，右侧 Edits / Chat 芽状面板
- **文件与大纲**：Explorer 中 Files / Outline（当前为占位 UI）
- **编辑与对话**：Edits、Chat 面板骨架（待接入后端 WebSocket）

## 技术栈

- **前端**：React + Vite + TypeScript
- **UI**：[coss ui](https://coss.com/ui)（Base UI，经 shadcn CLI 的 `@coss/*` registry 安装）
- **样式**：Tailwind CSS v4
- **后端**：Python + WebSocket（`agent/`）

## 快速开始

### 1. 启动后端

```bash
cd agent
uv sync
uv run python main.py
```

### 2. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

### 3. 访问

浏览器打开 `http://localhost:5173`

## 项目结构

```
writing-agent/
├── agent/              # Python 后端
├── frontend/           # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/     # coss ui 组件
│   │   │   └── layout.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── components.json # @coss registry
├── examples/
└── docs/
```

## 开发

```bash
cd frontend
pnpm run typecheck
pnpm run format
pnpm run build
```

## 许可证

MIT

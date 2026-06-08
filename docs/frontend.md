# Frontend

## 选型

| 选择 | 理由 |
|------|------|
| React + Vite | TipTap 一等支持，生态最大 |
| TipTap | Markdown 模式：输入 markdown 渲染富文本，序列化回 markdown |
| coss UI | 基于 Base UI 的组件库，shadcn CLI 安装 |
| Nexus UI | Chat/AI 展示组件（消息、输入框、推理折叠等） |
| Tailwind CSS v4 | 原子化样式，与 coss 配合 |
| TypeScript | 类型安全，协议定义与后端对齐 |

## 代码地图

```
frontend/src/
├── components/
│   ├── ui/                    # coss 基础组件（40+ 文件）
│   ├── nexus-ui/              # Chat/AI 组件（消息、输入框、推理等）
│   ├── layout.tsx             # 主布局（三列 Grid）
│   ├── workbench-top-bar.tsx  # 顶栏
│   ├── explorer-panel.tsx     # 文件浏览器面板
│   ├── document-panel.tsx     # 文档编辑面板
│   ├── chat-panel.tsx         # Chat 面板
│   └── ...
│
├── hooks/
│   ├── use-agent-session.ts   # Agent 会话状态管理
│   ├── use-workspace.ts       # 工作区状态
│   ├── use-document-tabs.ts   # 文档标签管理
│   ├── use-chat-sessions.ts   # 聊天会话管理
│   └── use-panel-resize.ts    # 面板拖拽调整
│
├── lib/
│   ├── agent-protocol.ts      # 协议类型定义
│   ├── agent-client.ts        # WebSocket 客户端
│   ├── shell-chrome.ts        # 壳层 token
│   ├── workbench-grid.ts      # Grid 布局工具
│   └── ...
│
└── index.css                  # 全局样式 + 主题变量
```

## 关键约定

- **协议**：`agent-protocol.ts` 定义所有消息类型，`agent-client.ts` 封装 WebSocket
- **状态**：hooks 管理业务逻辑，components 只负责渲染
- **会话**：前端 localStorage 只存 `session_id` 列表（tab UI 标题和顺序），完整会话数据在后端
- **样式**：用语义 token（`bg-background`、`text-muted-foreground`），禁止硬编码颜色
- **按钮/图标**：见 [`ui.md`](./ui.md)
- **图标**：统一用 `@hugeicons/react` + `@hugeicons/core-free-icons`（渲染入口 `@/lib/icons`）
- **布局**：三列 CSS Grid（Explorer + Editor + Chat），`workbench-grid.ts` 管理列宽

## 工作区模式

后端拥有文件系统。前端的角色是编辑器/渲染层，不承担文件管理职责。

- `FileSystemDirectoryHandle` 仅用于**初始化**：用户选择本地文件夹后，路径告知后端作为 `project_root`，后续所有文件读写由后端管理
- 前端通过 `document/open`、`document/change` 将编辑内容同步到后端 `session.open_buffers`
- 发送 `chat/message` 时带 `buffer_snapshot`，保证 agent 拿到最新编辑（不依赖 debounce）

## 构建

```bash
cd frontend && pnpm dev          # 开发
cd frontend && pnpm build        # 构建
cd frontend && pnpm exec tsc --noEmit  # 类型检查
```

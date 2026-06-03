# Frontend UI / 壳层 — 交接说明



> 状态截至 2026-06-03。



## Explorer 三标签



| 标签 | 内容 |

|------|------|

| **Projects** | 最近工作区列表 + Open Workspace… |

| **Files** | `.md` 文件树 |

| **Outline** | 当前文档标题大纲 |



工作区切换只在 **Projects**；Files / Outline 不再顶栏重复工作区条。



## 文档顶栏

- 侧栏收起时的展开钮 + 右侧 Chat（不显示当前文件名）。

## 本地工作区授权

- `workspace-handle-store.ts`：IndexedDB 保存 `FileSystemDirectoryHandle`。
- 刷新后点 Projects 里的本地项：恢复句柄；失效时 toast 提示用 **Open Workspace…** 重新关联。

## 壳层 token



见 `frontend/src/lib/shell-chrome.ts`（`workspaceRow`、`explorerTabs*` 等）。



## 关键文件



```

frontend/src/components/canvas-chrome.tsx

frontend/src/components/explorer-projects.tsx

frontend/src/components/explorer-file-tree.tsx

frontend/src/components/layout.tsx
frontend/src/lib/workspace-handle-store.ts

```



## 构建



```bash

cd frontend && pnpm dev

```



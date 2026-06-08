# Pierre 文件树集成备份（最小化重置前）

日期：2025-06-07

## 为何备份

此前为 hover 渐隐、选中态、行高等需求在 `pierre-tree-shell-theme.ts` 中堆叠了大量 `unsafeCss`（`::after` overlay、`truncate-marker` 强制色、hover/selected `!important` 等），与 Pierre 原生 `MiddleTruncate` + theme token 冲突，导致选中+hover 渐隐异常。

## 重置策略

1. 保留业务层：`pierre-explorer-file-tree.tsx`（drag、context menu、workspace paths、activePath）
2. 保留图标层：`pierre-coss-icons.ts`、`hugeicons-sprite.ts`（Hugeicons remap）
3. 重写 theme：仅用 Pierre 官方 CSS 变量 + 无法用变量表达的 layout（缩进、virtualized 满宽、Hugeicons stroke）

## 恢复方法

将本目录下同名文件复制回 `explorer-variants/file-tree/` 与 `components/pierre-explorer-file-tree.tsx`。

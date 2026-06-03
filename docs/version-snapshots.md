# UI 版本快照

## `ui-shell-v1`（当前已保存）

Explorer 三标签（Projects | Files | Outline）、Projects 工作区列表、IndexedDB 文件夹授权、文档顶栏无文件名。

### 恢复到此版本

```bash
# 查看快照提交
git show ui-shell-v1

# 整仓切回（会丢弃未提交改动，请先 stash 或建新分支）
git checkout ui-shell-v1

# 或基于快照开分支继续改，不动当前 main
git checkout -b my-fix ui-shell-v1

# 仅把快照上的 frontend 取回到当前分支（示例）
git restore --source ui-shell-v1 -- frontend/
```

### 归档分支

与标签指向同一提交：`archive/ui-shell-v1`

```bash
git checkout archive/ui-shell-v1
```

## 在新版本上开发

```bash
git checkout main
# 或
git checkout -b ui-v2
```

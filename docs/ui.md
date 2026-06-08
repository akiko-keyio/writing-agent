# UI 规范

## 字体

| 用途 | 字体 |
|------|------|
| 正文 / 标题（英文） | **Cal Sans UI**（与 coss.com/ui 官网一致） |
| 正文 / 标题（中文） | **MiSans VF**（可变字重 150–700，自托管 `public/fonts/MiSansVF.woff2`） |
| 代码 | **Geist Mono Variable** |

```css
--font-sans: "Cal Sans UI", "MiSans VF", ui-sans-serif, system-ui, sans-serif;
--font-heading: var(--font-sans);
--font-mono: "Geist Mono Variable", ui-monospace, monospace;
```

## 间距

项目有 `@/lib/spacing`，应用层从这里取 token。

### Gap（flex/grid 间距）

| Token | class | px | 场景 |
|-------|-------|----|------|
| `none` | `gap-0` | 0 | flush tabs / outline rail |
| `hairline` | `gap-0.5` | 2 | document tab chips |
| `xs` | `gap-1` | 4 | toolbar inner groups |
| `sm` | `gap-2` | 8 | button groups, footers |
| `md` | `gap-3` | 12 | content stacks |
| `lg` | `gap-4` | 16 | panels, markdown blocks |
| `xl` | `gap-8` | 32 | page sections |

- `stack.*` = `flex flex-col` + gap
- `row.*` = `flex items-center` + gap
- **禁止** `space-y-*` / `space-x-*`（用 `stack.*` / `row.*` 代替）

### Padding

`p[n].x` / `p[n].y` / `p[n].all` / `p[n].top` / `p[n].bottom` / `p[n].start` / `p[n].end`

标准步进：`0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8, 12`

- 应用层从 `spacing.ts` 取 `p[n]`，不裸写 `px-*` / `py-*`
- `ui/*` 原始组件内部自带 padding，不改

### Margin

`spacing.ts` 不覆盖 margin。文档排版（TipTap 编辑器、canvas 渲染）允许直接写 `mb-*` / `mt-*`。

### 组合 token

| Token | 值 | 用途 |
|-------|-----|------|
| `rowPad` | `px-3 py-2` | 紧凑卡片行 |
| `cardBarPad` | `px-3 py-2` | 卡片头/底栏 |
| `blockGapLg` | `var(--spacing(4))` | markdown 块间距 |
| `treeIndent` | `{ rowPadPx: 8, depthStepPx: 24 }` | 文件树缩进 |

### 内容宽度（文档 + Chat 共用）

两套水平尺度，定义在 `index.css`（`--content-*`）与 `@/lib/content-layout`：

| 尺度 | Token / 变量 | 值 | 用途 |
|------|----------------|-----|------|
| **阅读栏** | `--content-reading-max` / `contentReadingColumnClass` | **52rem**（832px） | 行长上限；壳层更宽时居中，不拉满全宽 |
| **方框** | `--content-inset-box` / `contentInset.box` / `chatBoxLaneClass` | **16px** | 气泡、输入框、Mermaid、建议 pill |
| **正文** | `--content-inset-text` / `contentInset.text` / `chatProseLaneClass` | **32px** | 过程层（Thought / 工具 / INPUT）、回答段落 = 方框 + Streamdown 嵌套，或直接 `chatProseLaneClass` |

Chat 面板默认宽度 = 阅读栏（`CHAT_PANEL_READING_WIDTH_PX` = 52rem）。文档编辑器壳层用 `documentEditorShellClass`（阅读栏 + `px-8` 正文 inset）。

### Chat / Markdown 输出

| 区域 | 间距 |
|------|------|
| **水平 — 方框**（输入框、Mermaid、用户气泡） | `contentInset.box` = **16px**（相对阅读栏内缘） |
| **水平 — 正文**（标题、段落、列表、**表格**、**代码块**） | `contentInset.text` = **32px** = 方框 + Streamdown `textNested` |
| 块间距（Streamdown 根） | **仅** `gap-4`（`gap.lg`，16px）；已中和 Streamdown 块级 `mt-6`/`my-6`/`my-4` |
| 表格单元格 | Streamdown 默认 `px-4 py-2`（左右 16px、上下 8px） |
| 列表项内缩进 | `padding-inline-start: 1.25rem`（20px） |
| 段落正文 | `text-sm leading-5`（14px / 20px） |
| 标题 H1 / H2 / H3 | `text-xl` / `text-lg` / `text-base` + `leading-7` / `leading-6` / `leading-6` |
| 标题 H4–H6 | `text-sm leading-5`（与正文同号，字重 560） |

块间距仅由 Streamdown 根 `gap-4`（16px）控制；标题行高只影响标题自身高度，不改变块间 16px。

### Agent 消息内层级

| 层级 | 内容 | 间距 |
|------|------|------|
| **过程层** | Thinking（Reasoning）、工具链、占位 shimmer | 彼此 `stack.sm`（8px） |
| **正文层** | Markdown 回答 | Streamdown `gap-4`（16px） |
| 过程层 ↔ 正文层 | — | `stack.lg`（16px） |

过程层按 `process` 时间线渲染：每个 reasoning 片段单独一步，工具首次出现时结束当前 Thinking 并收纳；工具完成后若模型继续想（含无 `reasoning_delta` 的间隔），开**新的** Thinking 步。链内步骤标题统一 `chatProcessStepTitleClass`（= `chatMetaLineClass`）；独立 Reasoning 触发器仍用 `chatProcessLineClass`（更浅）。过程层包在 `chatProseLaneClass`（**32px** 文本车道），与回答正文左缘对齐。

**Thinking 展开正文**（`reasoning-markdown`）：`chatReasoningBodyClass`（= `chatProcessLineClass`，14px / `muted-foreground/55`）；块间距 `gap.sm`（8px）；标题一律 `text-sm`（不做 H1–H3 字号梯）；列表编号/项目符号 `currentColor`（随正文浅色）；父级已在 `chatProseLaneClass`，`reasoning-markdown` CSS 不再叠加块级 `margin-inline`。`ChatReasoningMarkdown` 始终在框内滚动（`chatReasoningScrollMaxHeight` = 14rem）；流式时 `autoScrollBottom` 贴底；thread 在 `isStreaming` 时用 `resize="instant"`。链内工具/Skills 步：`defaultOpen=false`，仅 `running` 时展开，完成后 remount 折叠；`Tool` 卡片同样在 `running→completed` 时自动收起。链内展开区缩进 `pt-2 ps-6`；独立 `ReasoningContent` 用 `chatReasoningBodyShellClass`（左边线 + `pt-2 ps-3`）。步骤时间线竖线仅在**当前步展开**且**非最后一步**时绘制（`showConnector && open`）。

**回答正文**（`message-markdown`）：外包 `chatBoxLaneClass`（16px），Streamdown 对段落/标题/列表/表格/代码再嵌套 16px → 合计 **32px**，与过程层 `chatProseLaneClass` 左缘一致。

### Chat 输入与用户气泡

`shell.chatComposerChrome`：`w-full` + `rounded-2xl` + `border-input` + `bg-background`，用户气泡与 `PromptInput` 共用。

实现：`chat-markdown-overflow.css` 在 `message-markdown` 方框车道内对文本块施加 `margin-inline: var(--content-inset-box)`。代码块内边距与表格单元格一致（`px-4 py-2`），**无行号**。无语言 / `text` 的纯文本 fence 用正文字体（sans）。`mermaid-block` 与块级 KaTeX 不走文本嵌套规则，占满方框车道（距阅读栏内缘 **16px**）。

### Chat 字重

英文（Cal Sans UI）与中文（MiSans VF）均为可变字体，字重由 CSS 变量统一控制（`index.css`）：

| 变量 | 值 | 元素 |
|------|-----|------|
| `--chat-font-weight-body` | 400 | 正文 / 段落 / 列表 |
| `--chat-font-weight-emphasis` | 560 | 标题 H1–H6、`**strong**`、表头 `th` |

实现见 `chat-markdown-overflow.css`（覆盖 Streamdown 默认 `font-semibold`）。560 介于 `medium`（500）与 `semibold`（600）之间，中英文均可真实渲染，无需 `!important` 硬顶 600。

---

## 圆角

CSS 变量链定义在 `index.css`：`--radius: 0.625rem`（10px）

| Token | 值 | 场景 |
|-------|-----|------|
| `rounded-sm` | 6px | 菜单项、下拉项 |
| `rounded-md` | 8px | 代码块、内联代码、表格 |
| `rounded-lg` | 10px | **默认** — Button、Sidebar、Input、Select、Toast |
| `rounded-xl` | 14px | Toolbar、Command list |
| `rounded-2xl` | 18px | Dialog、Sheet、Drawer、Chat 输入框、用户气泡 |
| `rounded-full` | ∞ | 发送钮、滚动到底部、建议 pill |

### Markdown 输出圆角

| 元素 | 圆角 |
|------|------|
| 代码块（外层 streamdown 壳被 CSS 剥离） | — |
| 代码块（实际渲染体） | `rounded-md`（8px） |
| 内联代码 | `rounded-md`（8px） |
| 表格容器 | `rounded-md`（8px） |

### Chat 容器圆角

| 元素 | 圆角 |
|------|------|
| PromptInput 容器 | `rounded-2xl`（18px） |
| 用户消息气泡 | `rounded-2xl`（18px） |
| Chat 标签 | `rounded-lg`（10px） |
| 发送钮 | `rounded-full` |

---

## 按钮与图标

> 能用 coss 默认就不写自定义 className。只传 `variant` + `size`。

### 规则

- 图标库统一 **Hugeicons**：`@/lib/icons` 的 `HugeiconsIcon` + `@hugeicons/core-free-icons` 图标数据；禁止 `lucide-react`
- 图标钮用 `icon-lg`（36px）/ `icon-sm`（28px）/ `icon-xs`（24px），不写外框覆盖
- SVG 尺寸由 coss 自动管理（icon-lg → 16px，icon-sm → 16px，icon-xs → 14px），不写 `[&_svg]:size-*`
- 颜色/hover/pressed 由 variant 决定，不写 `hover:bg-*`、`data-[pressed]:bg-*`
- 统一用 coss `Button`，不用原始 `<button>`；右键菜单用 coss `Menu` + `MenuItem`
- 壳层封装 `ShellIconButton` / `ShellTooltipIconButton` 默认 `ghost` + `icon-lg`，只传 `data-pressed` 选中态

### 速查

| 用途 | size | 外框 | 图标 |
|------|------|------|------|
| 顶栏/面板头/弹窗关闭 | `icon-lg` | 36×36 | 16px |
| 文件树/代码块/气泡内 | `icon-sm` | 28×28 | 16px |
| 标签关闭 × | `icon-xs` | 24×24 | 14px |
| 带文字钮（标签、Chat 切换、项目名、表单） | `default` | h-32 | 16px |

| 用途 | variant |
|------|---------|
| 壳层图标钮、标签、工具栏 | `ghost` |
| Menu 触发、Toggle 分段 | `outline` |
| 主操作（确认、发送） | `default` |
| 辅助文字操作（View、Revert） | `link` |

### Do / Don't

```tsx
// Do — 只传 variant + size
<ShellTooltipIconButton label="Files" data-pressed={active ? "" : undefined}>
  <Files aria-hidden="true" />
</ShellTooltipIconButton>

<Button variant="ghost" size="sm" data-pressed={active ? "" : undefined}>
  test-text.md
</Button>

// Don't — 不要覆盖尺寸
<ShellTooltipIconButton label="Files" className="size-7 [&_svg]:size-4">
  <Files aria-hidden="true" />
</ShellTooltipIconButton>

// Don't — 不要写颜色
<Button className="hover:bg-accent/50 data-[pressed]:bg-accent">
  ...
</Button>
```

### 例外

- ChevronDown 在 sm 钮里可用 `className="size-3.5"`（14px），让箭头更紧凑
- 标签关闭 × 的 `shell.documentTabClose` 是纯定位 class，不涉及尺寸/颜色
- 文件树行用 `SidebarMenuButton size="sm"`，coss sidebar 自管尺寸

---

## Check Before Finalizing

1. 有没有裸写 `gap-*` / `px-*` / `py-*`？换成 `spacing.ts` token。
2. 有没有写 `space-y-*` / `space-x-*`？换成 `stack.*` / `row.*`。
3. 有没有写 `[&_svg]:size-*` 或 `size-7` 等覆盖？删掉。
4. 有没有写 `hover:bg-*`？交给 variant。
5. 圆角对不对？内容体 → `rounded-md`（8px），容器/钮 → `rounded-lg`（10px），浮层/气泡 → `rounded-2xl`（18px）。

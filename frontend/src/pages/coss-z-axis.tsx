import { HugeiconsIcon } from "@hugeicons/react"
import {
  Layers01Icon,
  Moon02Icon,
  Sun03Icon,
  HelpCircleIcon,
  MoreHorizontalCircle01Icon,
} from "@hugeicons/core-free-icons"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toastManager } from "@/components/ui/toast"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { shell } from "@/lib/shell-chrome"
import { gap, p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────────
// 源码审计数据 — 全部从 frontend/src/components/ui/*.tsx 提取
// ────────────────────────────────────────────────────────────

/** 外阴影 4 档 */
const OUTER_SHADOW = [
  {
    token: "shadow-xs/5",
    label: "微阴影",
    desc: "表面容器 / 表单控件",
    components: "Card, Frame, Input, Select Trigger, NumberField, OTPField, Combobox Trigger, Button outline/ghost",
  },
  {
    token: "shadow-xs",
    label: "微阴影（着色）",
    desc: "实心按钮，附带主色 tint",
    components: "Button default (shadow-primary/24), Button destructive (shadow-destructive/24)",
  },
  {
    token: "shadow-md/5",
    label: "中阴影",
    desc: "小型浮层",
    components: "Tooltip",
  },
  {
    token: "shadow-lg/5",
    label: "强阴影",
    desc: "浮层 / 模态弹出",
    components: "Menu, Popover, Select popup, Dialog, Sheet, Drawer, Toast, AlertDialog, Command, Combobox popup, Autocomplete popup, PreviewCard",
  },
] as const

/** 内高光模式 */
const INNER_HIGHLIGHT = {
  light: "before:shadow-[0_1px_--theme(--color-black/4%)]",
  dark: "dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
  usedBy: [
    "Card", "Frame", "Table", "Empty", "Group",
    "Button outline/ghost", "Input", "Textarea", "Select Trigger",
    "NumberField", "OTPField", "Combobox Trigger", "Slider", "Toggle", "RadioGroup", "Checkbox",
    "Menu popup", "Popover popup", "Tooltip popup", "Select popup",
    "Dialog popup", "Sheet popup", "Drawer popup", "Toast Root",
    "AlertDialog popup", "Command popup", "Combobox popup", "Autocomplete popup", "PreviewCard popup",
  ],
  notUsedBy: ["Alert", "Badge", "Button default/destructive（用 inset-shadow）", "Accordion"],
}

/** Button 独有的 inset-shadow */
const BUTTON_INSET = {
  light: "inset-shadow-[0_1px_--theme(--color-white/16%)]",
  pressed: "[:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)]",
  disabled: "[:disabled,:active,[data-pressed]]:shadow-none",
}

/** z-index 4 档 */
const Z_TIERS = [
  { z: "—", label: "页内", components: "Card, Frame, Input, Button, Alert, Badge, Table, Tabs, Accordion" },
  { z: "z-10", label: "壳层", components: "Sidebar" },
  { z: "z-50", label: "浮层 / 模态", components: "Menu, Popover, Tooltip, Select, Combobox, Autocomplete, PreviewCard, Dialog, Sheet, Drawer, AlertDialog, Command, ContextMenu" },
  { z: "z-60 → calc(9999−i)", label: "通知", components: "Toast Viewport, Toast Root" },
] as const

/** 遮罩 — 仅模态 */
const BACKDROP = {
  token: "bg-black/32 backdrop-blur-sm",
  transition: "duration-200",
  usedBy: ["Dialog", "Sheet", "Drawer", "AlertDialog", "Command"],
  notUsedBy: ["Menu", "Popover", "Tooltip", "Select", "Combobox", "Autocomplete", "PreviewCard"],
}

/** 背景色梯度 */
const BG_TIERS = [
  { token: "bg-background", desc: "页面基底", components: "body, Input, Select Trigger, NumberField, OTPField, Sidebar, Tabs" },
  { token: "bg-card", desc: "内容表面", components: "Card, CardFrame" },
  { token: "bg-popover", desc: "浮层 / 模态", components: "所有 *Popup 弹出内容, Button outline/ghost" },
  { token: "bg-sidebar", desc: "应用壳侧栏", components: "Sidebar container" },
  { token: "bg-primary", desc: "主按钮", components: "Button default" },
  { token: "bg-destructive", desc: "危险按钮", components: "Button destructive" },
]

// ────────────────────────────────────────────────────────────
// 辅助组件
// ────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  return <code className={cn("rounded bg-muted font-mono text-[11px]", p[1.5].x, p[0.5].y)}>{children}</code>
}

function SourceTag({ file, token }: { file: string; token: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border bg-muted/50 font-mono text-[11px]", gap.xs, p[2].x, p[0.5].y)}>
      <span className="text-muted-foreground">{file}</span>
      <span className="text-foreground">{token}</span>
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// §1 外阴影 — 4 档梯度
// ────────────────────────────────────────────────────────────

function OuterShadowSection() {
  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">外阴影（box-shadow）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          coss 的外阴影分 4 档，从表面容器到浮层弹出逐级增强。
          <Code>/5</Code> 后缀是 Tailwind v4 的 opacity modifier（5%）。
        </p>
      </div>

      <div className={stack.md}>
        {OUTER_SHADOW.map((s, i) => (
          <Card key={s.token}>
            <CardHeader>
              <div className={cn("flex flex-wrap items-center", gap.sm)}>
                <Badge variant="secondary" size="sm">{s.label}</Badge>
                <Code>{s.token}</Code>
              </div>
              <CardTitle className="text-sm">{s.desc}</CardTitle>
              <CardDescription className="font-mono text-xs">{s.components}</CardDescription>
            </CardHeader>
            <CardPanel>
              <div
                className={cn(
                  "rounded-xl border bg-card p-4 text-sm text-muted-foreground relative",
                  i === 0 && "shadow-xs/5",
                  i === 1 && "shadow-xs",
                  i === 2 && "shadow-md/5",
                  i === 3 && "shadow-lg/5",
                )}
              >
                {s.token} 实际效果
              </div>
            </CardPanel>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §2 内高光 — before 伪元素
// ────────────────────────────────────────────────────────────

function InnerHighlightSection() {
  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">内高光（before 伪元素）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          coss 用 <Code>::before</Code> 伪元素在组件内边缘绘制 1px 高光带。
          亮色模式顶部黑色 4%，暗色模式底部白色 6%。
          这是 coss 最通用的视觉语言——<strong>28 个组件</strong>都在用。
        </p>
      </div>

      {/* 代码 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">源码模式</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-col font-mono text-xs text-muted-foreground", gap.sm)}>
            <div className={cn("flex items-center", gap.sm)}>
              <Badge variant="secondary" size="sm">亮色</Badge>
              <span className="text-foreground">{INNER_HIGHLIGHT.light}</span>
            </div>
            <div className={cn("flex items-center", gap.sm)}>
              <Badge variant="secondary" size="sm">暗色</Badge>
              <span className="text-foreground">{INNER_HIGHLIGHT.dark}</span>
            </div>
          </div>
        </CardPanel>
      </Card>

      {/* 使用 / 不使用 */}
      <div className={cn("grid sm:grid-cols-2", gap.lg)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">使用内高光的组件</CardTitle>
          </CardHeader>
          <CardPanel>
            <div className={cn("flex flex-wrap", gap.hairline)}>
              {INNER_HIGHLIGHT.usedBy.map((c) => (
                <Badge key={c} variant="secondary" size="sm">{c}</Badge>
              ))}
            </div>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">不使用的组件</CardTitle>
          </CardHeader>
          <CardPanel>
            <div className={cn("flex flex-wrap", gap.hairline)}>
              {INNER_HIGHLIGHT.notUsedBy.map((c) => (
                <Badge key={c} variant="outline" size="sm">{c}</Badge>
              ))}
            </div>
          </CardPanel>
        </Card>
      </div>

      {/* 效果对比 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">效果对比：有 / 无内高光</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className={cn("grid sm:grid-cols-2", gap.lg)}>
            <div className={cn("flex flex-col items-center", gap.sm)}>
              <div className="relative size-24 rounded-xl border bg-card shadow-xs/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)]" />
              <span className="text-xs text-muted-foreground">有内高光（Card）</span>
            </div>
            <div className={cn("flex flex-col items-center", gap.sm)}>
              <div className="size-24 rounded-xl border bg-card shadow-xs/5" />
              <span className="text-xs text-muted-foreground">无内高光</span>
            </div>
          </div>
        </CardPanel>
      </Card>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §3 Button 独有模式 — inset-shadow
// ────────────────────────────────────────────────────────────

function ButtonInsetSection() {
  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">Button 的 inset-shadow</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Button default / destructive 不用 <Code>before</Code> 内高光，而是用{" "}
          <Code>inset-shadow</Code> 实现顶部光泽 + 按下变暗。
          outline / ghost 变体则走通用内高光。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Button default 源码</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-col font-mono text-xs text-muted-foreground", gap.sm)}>
            <div>
              <Badge variant="secondary" size="sm">常态</Badge>{" "}
              <span className="text-foreground">{BUTTON_INSET.light}</span>
              <span className="text-muted-foreground"> + shadow-xs + shadow-primary/24</span>
            </div>
            <div>
              <Badge variant="outline" size="sm">按下</Badge>{" "}
              <span className="text-foreground">{BUTTON_INSET.pressed}</span>
            </div>
            <div>
              <Badge variant="outline" size="sm">禁用</Badge>{" "}
              <span className="text-foreground">{BUTTON_INSET.disabled}</span>
            </div>
          </div>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">实际效果</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-wrap items-center", gap.sm)}>
            <Button size="sm">default（inset-shadow）</Button>
            <Button variant="destructive" size="sm">destructive</Button>
            <Button variant="outline" size="sm">outline（before 高光）</Button>
            <Button variant="ghost" size="sm">ghost（before 高光）</Button>
            <Button size="sm" disabled>disabled（无阴影）</Button>
          </div>
        </CardPanel>
      </Card>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §4 z-index 梯度
// ────────────────────────────────────────────────────────────

function ZIndexSection() {
  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">z-index 梯度</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          z-index 只有 4 档。页内组件不设 z-index；侧栏 z-10；浮层和模态同为 z-50（靠遮罩区分）；Toast 最高。
        </p>
      </div>

      <div className={stack.md}>
        {Z_TIERS.map((tier, i) => (
          <div
            key={tier.z}
            className={cn(
              "flex items-start rounded-xl border",
              gap.lg,
              p[4].all,
              i === 0 && "bg-background",
              i === 1 && "bg-sidebar shadow-sm/5",
              i === 2 && "bg-popover shadow-lg/5",
              i === 3 && "bg-popover shadow-lg/5",
            )}
          >
            <div className={cn("flex shrink-0 flex-col items-center", gap.xs)}>
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-xs font-bold",
                  "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              {i < Z_TIERS.length - 1 && <div className="h-4 w-px bg-border" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("flex flex-wrap items-center", gap.sm)}>
                <Badge variant="secondary" size="sm">{tier.label}</Badge>
                <Code>{tier.z}</Code>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{tier.components}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §5 遮罩 — 仅模态
// ────────────────────────────────────────────────────────────

function BackdropSection() {
  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">遮罩（backdrop）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          遮罩是模态组件的专属特征——<Code>{BACKDROP.token}</Code>。
          浮层（Menu、Popover 等）没有遮罩，这是模态与浮层的核心区别。
        </p>
      </div>

      <div className={cn("grid sm:grid-cols-2", gap.lg)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">有遮罩（模态）</CardTitle>
            <CardDescription className="font-mono text-xs">{BACKDROP.usedBy.join(", ")}</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className={cn("flex flex-wrap", gap.sm)}>
              <SourceTag file="backdrop" token={BACKDROP.token} />
              <SourceTag file="transition" token={BACKDROP.transition} />
            </div>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">无遮罩（浮层）</CardTitle>
            <CardDescription className="font-mono text-xs">{BACKDROP.notUsedBy.join(", ")}</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className="text-sm text-muted-foreground">
              背景内容完全可见，仅靠阴影区分层级
            </div>
          </CardPanel>
        </Card>
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §6 背景色梯度
// ────────────────────────────────────────────────────────────

function BackgroundSection() {
  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">背景色（bg-*）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          背景色表达表面层级。<Code>bg-background</Code> → <Code>bg-card</Code> →{" "}
          <Code>bg-popover</Code> 是主梯度；按钮用独立的 <Code>bg-primary</Code> / <Code>bg-destructive</Code>。
        </p>
      </div>

      <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", gap.md)}>
        {BG_TIERS.map((bg) => (
          <div
            key={bg.token}
            className={cn("flex flex-col rounded-xl border", bg.token, gap.sm, p[4].all)}
          >
            <Code>{bg.token}</Code>
            <span className="text-xs text-foreground">{bg.desc}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{bg.components}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §7 真组件交互演示
// ────────────────────────────────────────────────────────────

function LiveDemoSection() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const LANG_ITEMS = [
    { label: "简体中文", value: "zh" },
    { label: "English", value: "en" },
  ] as const

  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">真组件交互演示</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          以下全部是 coss registry 真实组件，可点击交互。
        </p>
      </div>

      {/* 表面层 */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-wrap items-center", gap.sm)}>
            <Badge variant="secondary" size="sm">表面层</Badge>
            <Code>shadow-xs/5 + 内高光 · z: —</Code>
          </div>
          <CardTitle className="text-sm">Card</CardTitle>
          <CardDescription>bg-card，留在文档流</CardDescription>
        </CardHeader>
        <CardPanel className="text-sm text-muted-foreground">
          你现在看到的就是 Card —— coss 的表面容器。
        </CardPanel>
      </Card>

      {/* 浮层 */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-wrap items-center", gap.sm)}>
            <Badge variant="info" size="sm">浮层</Badge>
            <Code>shadow-lg/5 + 内高光 · z-50 · 无遮罩</Code>
          </div>
          <CardTitle className="text-sm">Menu · Popover · Tooltip · Select</CardTitle>
          <CardDescription>临时浮出，背景可见</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-wrap items-center", gap.sm)}>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline" size="icon-sm" aria-label="帮助" />}
              >
                <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipPopup>Tooltip · shadow-md/5</TooltipPopup>
            </Tooltip>

            <Menu>
              <MenuTrigger
                render={<Button variant="outline" size="icon-sm" aria-label="更多" />}
              >
                <HugeiconsIcon icon={MoreHorizontalCircle01Icon} aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup>
                <MenuItem>Menu · shadow-lg/5</MenuItem>
                <MenuItem>无遮罩</MenuItem>
              </MenuPopup>
            </Menu>

            <Popover>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                Popover
              </PopoverTrigger>
              <PopoverPopup className="w-48">
                <PopoverTitle>Popover</PopoverTitle>
                <PopoverDescription>shadow-lg/5 + 内高光</PopoverDescription>
              </PopoverPopup>
            </Popover>

            <Select items={[...LANG_ITEMS]}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectPopup>
                {LANG_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </CardPanel>
      </Card>

      {/* 模态层 */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-wrap items-center", gap.sm)}>
            <Badge variant="outline" size="sm">模态层</Badge>
            <Code>shadow-lg/5 + 内高光 · z-50 · 遮罩 bg-black/32 + blur</Code>
          </div>
          <CardTitle className="text-sm">Dialog · Sheet</CardTitle>
          <CardDescription>遮罩压暗背景，强制聚焦</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-wrap", gap.sm)}>
            <Dialog>
              <DialogTrigger render={<Button size="sm" />}>Dialog</DialogTrigger>
              <DialogPopup>
                <DialogHeader>
                  <DialogTitle>Dialog</DialogTitle>
                  <DialogDescription>
                    shadow-lg/5 · 内高光 · 遮罩 bg-black/32 + backdrop-blur-sm
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="ghost" size="sm" />}>关闭</DialogClose>
                </DialogFooter>
              </DialogPopup>
            </Dialog>

            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="sm" />}>Sheet</SheetTrigger>
              <SheetPopup side="right">
                <SheetHeader>
                  <SheetTitle>Sheet</SheetTitle>
                  <SheetDescription>shadow-lg/5 · 遮罩同 Dialog</SheetDescription>
                </SheetHeader>
                <SheetPanel>
                  <div className="text-sm text-muted-foreground">侧栏内容</div>
                </SheetPanel>
                <SheetFooter>
                  <SheetClose render={<Button variant="ghost" size="sm" />}>完成</SheetClose>
                </SheetFooter>
              </SheetPopup>
            </Sheet>
          </div>
        </CardPanel>
      </Card>

      {/* 通知层 */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-wrap items-center", gap.sm)}>
            <Badge variant="warning" size="sm">通知层</Badge>
            <Code>shadow-lg/5 + 内高光 · z-60 → calc(9999−i)</Code>
          </div>
          <CardTitle className="text-sm">Toast</CardTitle>
          <CardDescription>最高 z-index，始终浮于一切之上</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-wrap", gap.sm)}>
            <Button
              size="sm"
              onClick={() =>
                toastManager.add({
                  type: "success",
                  title: "已保存",
                  description: "Toast 压在一切之上",
                })
              }
            >
              成功 Toast
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toastManager.add({
                  type: "error",
                  title: "出错了",
                  description: "错误通知也在最顶层",
                })
              }
            >
              错误 Toast
            </Button>
          </div>
        </CardPanel>
      </Card>

      {/* 叠放演示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">叠放演示</CardTitle>
          <CardDescription>
            同时打开 Menu（z-50）+ Dialog（z-50 + 遮罩）+ Toast（z-60），观察真实叠放
          </CardDescription>
        </CardHeader>
        <CardPanel className={stack.md}>
          <div className={cn("flex flex-wrap", gap.sm)}>
            <Button
              size="sm"
              onClick={() => {
                setMenuOpen(true)
                setDialogOpen(true)
                toastManager.add({
                  type: "info",
                  title: "Toast 在最上",
                  description: "z-60 > z-50",
                })
              }}
            >
              全部打开
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMenuOpen(false)
                setDialogOpen(false)
              }}
            >
              全部关闭
            </Button>
          </div>

          <Card>
            <CardPanel className={cn("flex flex-wrap", gap.sm)}>
              <Menu open={menuOpen} onOpenChange={setMenuOpen}>
                <MenuTrigger render={<Button variant="outline" size="sm" />}>
                  Menu
                </MenuTrigger>
                <MenuPopup>
                  <MenuItem>shadow-lg/5</MenuItem>
                  <MenuItem>无遮罩</MenuItem>
                </MenuPopup>
              </Menu>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button size="sm" />}>Dialog</DialogTrigger>
                <DialogPopup>
                  <DialogHeader>
                    <DialogTitle>Dialog</DialogTitle>
                    <DialogDescription>
                      遮罩盖住 Menu（同 z-50，靠 backdrop 区分）
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" size="sm" />}>关闭</DialogClose>
                  </DialogFooter>
                </DialogPopup>
              </Dialog>
            </CardPanel>
          </Card>
        </CardPanel>
      </Card>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// §8 速查表
// ────────────────────────────────────────────────────────────

function QuickRefSection() {
  const rows = [
    ["Card / Frame", "bg-card", "shadow-xs/5", "before 内高光", "border", "—", "—"],
    ["Button default", "bg-primary", "shadow-xs", "inset-shadow", "border", "—", "—"],
    ["Button outline", "bg-popover", "shadow-xs/5", "before 内高光", "border", "—", "—"],
    ["Input / Select Trigger", "bg-background", "shadow-xs/5", "before 内高光", "border", "—", "—"],
    ["Tooltip", "bg-popover", "shadow-md/5", "before 内高光", "border", "—", "z-50"],
    ["Menu / Popover", "bg-popover", "shadow-lg/5", "before 内高光", "border", "—", "z-50"],
    ["Select popup", "bg-popover", "shadow-lg/5", "before 内高光", "border", "—", "z-50"],
    ["Dialog / AlertDialog", "bg-popover", "shadow-lg/5", "before 内高光", "border", "bg-black/32 + blur", "z-50"],
    ["Sheet / Drawer", "bg-popover", "shadow-lg/5", "before 内高光", "border", "bg-black/32 + blur", "z-50"],
    ["Command", "bg-popover", "shadow-lg/5", "before 内高光", "border", "bg-black/32 + blur", "z-50"],
    ["Toast Root", "bg-popover*", "shadow-lg/5", "before 内高光", "border", "—", "z-60 → calc(9999−i)"],
    ["Sidebar", "bg-sidebar", "shadow-sm/5", "—", "—", "—", "z-10"],
    ["Alert", "bg-transparent", "—", "—", "border", "—", "—"],
    ["Badge", "按 variant", "—", "—", "—", "—", "—"],
  ]

  return (
    <section className={stack.lg}>
      <div>
        <h2 className="text-base font-semibold text-foreground">速查表</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          每个组件的视觉参数，全部来自 <Code>frontend/src/components/ui/*.tsx</Code> 源码。
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left font-medium">组件</th>
              <th className="p-3 text-left font-medium">bg</th>
              <th className="p-3 text-left font-medium">外阴影</th>
              <th className="p-3 text-left font-medium">内高光</th>
              <th className="p-3 text-left font-medium">border</th>
              <th className="p-3 text-left font-medium">遮罩</th>
              <th className="p-3 text-left font-medium">z</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-b last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "p-3",
                      j === 0 && "font-medium whitespace-nowrap",
                      j > 0 && "font-mono text-xs text-muted-foreground",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        * Toast Root 的 bg 实际是 <Code>color-mix(var(--popover), var(--color-black) * index)</Code>，
        堆叠时逐条变暗。
      </p>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// 主题切换
// ────────────────────────────────────────────────────────────

function useThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark")
  )
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])
  return { dark, toggle: () => setDark((v) => !v) }
}

// ────────────────────────────────────────────────────────────
// 页面导出
// ────────────────────────────────────────────────────────────

export function CossZAxisPage() {
  const { dark, toggle } = useThemeToggle()

  return (
    <div className="flex h-svh flex-col bg-background">
      <header
        className={cn(shell.panelHeader, "shrink-0 border-b border-border bg-sidebar")}
      >
        <HugeiconsIcon
          icon={Layers01Icon}
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="min-w-0 flex-1 text-sm font-medium text-foreground">
          coss UI 层级设计
        </h1>
        <div className={cn("flex shrink-0 items-center", gap.sm)}>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={dark ? "亮色" : "暗色"}
            onClick={toggle}
          >
            <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl",
            stack.xl,
            p[6].x,
            p[6].top,
            p[12].bottom,
          )}
        >
          <p className="text-sm text-muted-foreground">
            以下 5 种视觉手段全部从 <Code>frontend/src/components/ui/*.tsx</Code> 源码提取，
            非文档描述。本页本身也是 coss 真组件。
          </p>

          <OuterShadowSection />
          <InnerHighlightSection />
          <ButtonInsetSection />
          <ZIndexSection />
          <BackdropSection />
          <BackgroundSection />
          <LiveDemoSection />
          <QuickRefSection />
        </div>
      </ScrollArea>
    </div>
  )
}

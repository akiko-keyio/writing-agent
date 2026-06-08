import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Delete02Icon,
  File01Icon,
  HelpCircleIcon,
  Layers01Icon,
  Moon02Icon,
  MoreHorizontalCircle01Icon,
  Search01Icon,
  Settings02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { useEffect, useState, type ReactNode } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
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
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { Separator } from "@/components/ui/separator"
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
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { shell } from "@/lib/shell-chrome"
import { gap, p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

// ──────── 布局 primitive ────────

type LayerId = "in-page" | "floating" | "modals" | "toast"

const LAYER_META: Record<
  LayerId,
  { label: string; sub: string; badge: "secondary" | "outline" | "info" | "warning" }
> = {
  "in-page": { label: "页内", sub: "In-page", badge: "secondary" },
  floating: { label: "浮层", sub: "Floating layers", badge: "info" },
  modals: { label: "模态", sub: "Modals / overlays", badge: "outline" },
  toast: { label: "Toast", sub: "全局反馈", badge: "warning" },
}

function LayerBadge({ layer }: { layer: LayerId }) {
  const m = LAYER_META[layer]
  return (
    <Badge variant={m.badge} size="sm">
      {m.label}
      <span className="text-muted-foreground">· {m.sub}</span>
    </Badge>
  )
}

function PickBadge({ children }: { children: ReactNode }) {
  return (
    <Badge variant="success" size="sm" className="font-mono">
      → {children}
    </Badge>
  )
}

function SectionHeading({
  id,
  title,
  layer,
  count,
}: {
  id: string
  title: string
  layer?: LayerId
  count?: number
}) {
  return (
    <div id={id} className={cn("flex flex-wrap items-center", gap.sm)}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {layer && <LayerBadge layer={layer} />}
      {count !== undefined && (
        <Badge variant="outline" size="sm">
          {count} 个案例
        </Badge>
      )}
    </div>
  )
}

function ScenarioCard({
  scene,
  pick,
  layer,
  children,
}: {
  scene: string
  pick: string
  layer: LayerId
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className={stack.xs}>
        <div className={cn("flex flex-wrap items-center justify-between", gap.sm)}>
          <LayerBadge layer={layer} />
          <PickBadge>{pick}</PickBadge>
        </div>
        <CardTitle className="text-sm">{scene}</CardTitle>
      </CardHeader>
      <CardPanel>{children}</CardPanel>
    </Card>
  )
}

function VersusBlock({
  scene,
  goodLabel,
  goodPick,
  goodDemo,
  badLabel,
  badPick,
  badDemo,
}: {
  scene: string
  goodLabel: string
  goodPick: string
  goodDemo: ReactNode
  badLabel: string
  badPick: string
  badDemo: ReactNode
}) {
  return (
    <div className={stack.md}>
      <p className="text-sm font-medium text-foreground">{scene}</p>
      <div className={cn("grid lg:grid-cols-2", gap.md)}>
        <Card className="border-success/24">
          <CardHeader className={stack.xs}>
            <Badge variant="success" size="sm">
              {goodLabel}
            </Badge>
            <CardDescription className="font-mono text-xs">{goodPick}</CardDescription>
          </CardHeader>
          <CardPanel>{goodDemo}</CardPanel>
        </Card>
        <Card className="border-dashed opacity-90">
          <CardHeader className={stack.xs}>
            <Badge variant="outline" size="sm">
              {badLabel}
            </Badge>
            <CardDescription className="font-mono text-xs">{badPick}</CardDescription>
          </CardHeader>
          <CardPanel>{badDemo}</CardPanel>
        </Card>
      </div>
    </div>
  )
}

// ──────── 共享数据 ────────

const ROLE_ITEMS = [
  { label: "查看者", value: "viewer" },
  { label: "编辑者", value: "editor" },
  { label: "管理员", value: "admin" },
] as const

const LANG_ITEMS = [
  { label: "简体中文", value: "zh" },
  { label: "English", value: "en" },
  { label: "日本語", value: "ja" },
] as const

// ──────── 四层一览 ────────

function LayerOverviewCards() {
  return (
    <div className={cn("grid sm:grid-cols-2", gap.md)}>
      <Card>
        <CardHeader>
          <LayerBadge layer="in-page" />
          <CardTitle className="text-sm">项目设置</CardTitle>
          <CardDescription>Card · Input · Alert · Empty</CardDescription>
        </CardHeader>
        <CardPanel className={stack.sm}>
          <Field>
            <FieldLabel>项目名称</FieldLabel>
            <Input defaultValue="writing-agent" />
          </Field>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <LayerBadge layer="floating" />
          <CardTitle className="text-sm">工具栏旁</CardTitle>
          <CardDescription>Tooltip · Menu · Popover · Select</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-wrap", gap.sm)}>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline" size="icon-sm" aria-label="帮助" />}
              >
                <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipPopup>快捷键提示</TooltipPopup>
            </Tooltip>
            <Menu>
              <MenuTrigger
                render={<Button variant="outline" size="icon-sm" aria-label="更多" />}
              >
                <HugeiconsIcon icon={MoreHorizontalCircle01Icon} aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup>
                <MenuItem>重命名</MenuItem>
                <MenuItem>删除</MenuItem>
              </MenuPopup>
            </Menu>
            <Select items={[...LANG_ITEMS]}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="语言" />
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

      <Card>
        <CardHeader>
          <LayerBadge layer="modals" />
          <CardTitle className="text-sm">需先处理</CardTitle>
          <CardDescription>Dialog · AlertDialog · Sheet</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className={cn("flex flex-wrap", gap.sm)}>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                Dialog
              </DialogTrigger>
              <DialogPopup>
                <DialogTitle>新建文档</DialogTitle>
                <DialogFooter>
                  <DialogClose render={<Button variant="ghost" />}>关闭</DialogClose>
                </DialogFooter>
              </DialogPopup>
            </Dialog>
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="sm" />}>
                Sheet
              </SheetTrigger>
              <SheetPopup side="right">
                <SheetHeader>
                  <SheetTitle>侧栏设置</SheetTitle>
                  <SheetDescription>从边缘滑入</SheetDescription>
                </SheetHeader>
                <SheetPanel>
                  <Input defaultValue="侧栏内容" />
                </SheetPanel>
                <SheetFooter>
                  <SheetClose render={<Button variant="ghost" />}>完成</SheetClose>
                </SheetFooter>
              </SheetPopup>
            </Sheet>
          </div>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <LayerBadge layer="toast" />
          <CardTitle className="text-sm">几秒后消失</CardTitle>
          <CardDescription>toastManager · 非 Sonner</CardDescription>
        </CardHeader>
        <CardPanel>
          <Button
            size="sm"
            onClick={() =>
              toastManager.add({
                type: "success",
                title: "已保存",
                description: "更改已写入磁盘",
              })
            }
          >
            触发 Toast
          </Button>
        </CardPanel>
      </Card>
    </div>
  )
}

// ──────── 场景对照 ────────

function CompareSection() {
  const blocks: ReactNode[] = [
    <VersusBlock
      key="copy"
      scene="复制成功 — 几秒后自动消失"
      goodLabel="✓ 短暂反馈"
      goodPick="Toast"
      goodDemo={
        <Button
          size="sm"
          onClick={() =>
            toastManager.add({ type: "success", title: "已复制到剪贴板" })
          }
        >
          <HugeiconsIcon icon={Copy01Icon} aria-hidden="true" />
          复制
        </Button>
      }
      badLabel="✗ 占住版面"
      badPick="Alert"
      badDemo={
        <Alert variant="success">
          <AlertTitle>已复制</AlertTitle>
          <AlertDescription>应改用 Toast</AlertDescription>
        </Alert>
      }
    />,
    <VersusBlock
      key="delete"
      scene="删除文件 — 必须点确认才能继续"
      goodLabel="✓ 阻断确认"
      goodPick="AlertDialog"
      goodDemo={
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
            <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
            删除
          </AlertDialogTrigger>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>此操作无法撤销</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>
                取消
              </AlertDialogClose>
              <AlertDialogClose render={<Button variant="destructive" />}>
                删除
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      }
      badLabel="✗ 一闪而过"
      badPick="Toast"
      badDemo={
        <Button
          variant="destructive"
          size="sm"
          onClick={() =>
            toastManager.add({ type: "error", title: "已删除" })
          }
        >
          用 Toast 删除
        </Button>
      }
    />,
    <VersusBlock
      key="tooltip"
      scene="图标悬停 — 只有一句短提示"
      goodLabel="✓ 非交互"
      goodPick="Tooltip"
      goodDemo={
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline" size="icon-sm" aria-label="保存" />}
          >
            <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipPopup>保存当前文档</TooltipPopup>
        </Tooltip>
      }
      badLabel="✗ 太重"
      badPick="Dialog"
      badDemo={
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline" size="icon-sm" aria-label="保存" />}
          >
            <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
          </DialogTrigger>
          <DialogPopup>
            <DialogTitle>保存当前文档</DialogTitle>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>关闭</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      }
    />,
    <VersusBlock
      key="tooltip-link"
      scene="提示里要带可点的链接"
      goodLabel="✓ 可交互内容"
      goodPick="Popover"
      goodDemo={
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            了解更多
          </PopoverTrigger>
          <PopoverPopup className="w-52">
            <PopoverDescription>
              阅读{" "}
              <a href="#compare" className="text-foreground underline">
                完整文档
              </a>
            </PopoverDescription>
          </PopoverPopup>
        </Popover>
      }
      badLabel="✗ 不可交互"
      badPick="Tooltip"
      badDemo={
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="sm" />}>
            了解更多
          </TooltipTrigger>
          <TooltipPopup>Tooltip 里不宜放链接</TooltipPopup>
        </Tooltip>
      }
    />,
    <VersusBlock
      key="menu"
      scene="「更多」— 一串可点操作"
      goodLabel="✓ 操作列表"
      goodPick="Menu"
      goodDemo={
        <Menu>
          <MenuTrigger render={<Button variant="outline" size="sm" />}>
            更多操作
          </MenuTrigger>
          <MenuPopup>
            <MenuItem>导出 PDF</MenuItem>
            <MenuItem>分享链接</MenuItem>
            <MenuItem>归档</MenuItem>
          </MenuPopup>
        </Menu>
      }
      badLabel="✗ 不适合纯列表"
      badPick="Popover"
      badDemo={
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            更多操作
          </PopoverTrigger>
          <PopoverPopup className="w-48">
            <PopoverTitle>导出 PDF</PopoverTitle>
            <PopoverDescription>分享 · 归档</PopoverDescription>
          </PopoverPopup>
        </Popover>
      }
    />,
    <VersusBlock
      key="popover-form"
      scene="小号反馈表单 — 不关整页"
      goodLabel="✓ 锚在按钮旁"
      goodPick="Popover"
      goodDemo={
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            写反馈
          </PopoverTrigger>
          <PopoverPopup className={cn("w-64", stack.sm)}>
            <PopoverTitle>反馈</PopoverTitle>
            <Input placeholder="你的想法…" />
            <Button size="sm" className="w-full">
              提交
            </Button>
          </PopoverPopup>
        </Popover>
      }
      badLabel="✗ 独占焦点"
      badPick="Dialog"
      badDemo={
        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            写反馈
          </DialogTrigger>
          <DialogPopup>
            <DialogTitle>反馈</DialogTitle>
            <DialogPanel>
              <Input placeholder="你的想法…" />
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button />}>提交</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      }
    />,
    <VersusBlock
      key="select"
      scene="从固定列表里选一个"
      goodLabel="✓ 预定义选项"
      goodPick="Select"
      goodDemo={
        <Select items={[...ROLE_ITEMS]}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectPopup>
            {ROLE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      }
      badLabel="✗ 需搜索过滤"
      badPick="Combobox（未演示）"
      badDemo={
        <Input placeholder="应改用 Combobox 搜索…" />
      }
    />,
    <VersusBlock
      key="sheet"
      scene="设置面板 — 从侧边滑入"
      goodLabel="✓ 边缘滑入"
      goodPick="Sheet"
      goodDemo={
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>
            <HugeiconsIcon icon={Settings02Icon} aria-hidden="true" />
            偏好设置
          </SheetTrigger>
          <SheetPopup side="right">
            <SheetHeader>
              <SheetTitle>偏好设置</SheetTitle>
            </SheetHeader>
            <SheetPanel>
              <Field>
                <FieldLabel>主题</FieldLabel>
                <Input defaultValue="跟随系统" />
              </Field>
            </SheetPanel>
          </SheetPopup>
        </Sheet>
      }
      badLabel="✗ 居中弹窗"
      badPick="Dialog"
      badDemo={
        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            偏好设置
          </DialogTrigger>
          <DialogPopup>
            <DialogTitle>偏好设置</DialogTitle>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>关闭</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      }
    />,
    <VersusBlock
      key="dialog-info"
      scene="查看详情 — 信息展示，非破坏性"
      goodLabel="✓ 普通模态"
      goodPick="Dialog"
      goodDemo={
        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            版本说明
          </DialogTrigger>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>v2.0 更新</DialogTitle>
              <DialogDescription>新增协作与导出功能</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button />}>知道了</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      }
      badLabel="✗ 非破坏性确认"
      badPick="AlertDialog"
      badDemo={
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
            版本说明
          </AlertDialogTrigger>
          <AlertDialogPopup>
            <AlertDialogTitle>v2.0 更新</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button />}>知道了</AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      }
    />,
    <VersusBlock
      key="alert-network"
      scene="连网失败 — 一直挂在页面上"
      goodLabel="✓ 页内常驻"
      goodPick="Alert"
      goodDemo={
        <Alert variant="error">
          <AlertTitle>无法连接服务器</AlertTitle>
          <AlertDescription>请检查网络后重试</AlertDescription>
        </Alert>
      }
      badLabel="✗ 几秒消失"
      badPick="Toast"
      badDemo={
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toastManager.add({
              type: "error",
              title: "无法连接服务器",
            })
          }
        >
          用 Toast 报错
        </Button>
      }
    />,
    <VersusBlock
      key="search"
      scene="搜索并执行命令 — 需输入过滤"
      goodLabel="✓ 可搜索"
      goodPick="Command"
      badLabel="✗ 无过滤"
      badPick="Menu"
      goodDemo={
        <Button variant="outline" size="sm">
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
          Command 面板
        </Button>
      }
      badDemo={
        <Menu>
          <MenuTrigger render={<Button variant="outline" size="sm" />}>
            打开命令
          </MenuTrigger>
          <MenuPopup>
            <MenuItem>新建文件</MenuItem>
            <MenuItem>切换主题</MenuItem>
          </MenuPopup>
        </Menu>
      }
    />,
  ]

  return (
    <section id="compare" className={stack.lg}>
      <SectionHeading title="场景对照" count={blocks.length} />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">✓ 正确 vs ✗ 误用</CardTitle>
          <CardDescription>点按钮亲自对比</CardDescription>
        </CardHeader>
        <CardPanel className={stack.lg}>
          {blocks.map((block, i) => (
            <div key={i}>
              {i > 0 && <Separator />}
              {block}
            </div>
          ))}
        </CardPanel>
      </Card>
    </section>
  )
}

// ──────── 页内案例 ────────

function InPageScenarios() {
  return (
    <section id="in-page" className={stack.lg}>
      <SectionHeading title="页内案例" layer="in-page" count={6} />
      <div className={cn("grid md:grid-cols-2", gap.md)}>
        <ScenarioCard scene="设置页：分组 + 输入" pick="Card + Input" layer="in-page">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">账户</CardTitle>
            </CardHeader>
            <CardPanel className={stack.sm}>
              <Field>
                <FieldLabel>显示名称</FieldLabel>
                <Input defaultValue="作者" />
              </Field>
              <Field>
                <FieldLabel>邮箱</FieldLabel>
                <Input type="email" defaultValue="you@example.com" />
              </Field>
            </CardPanel>
          </Card>
        </ScenarioCard>

        <ScenarioCard scene="导入失败：信息要一直在" pick="Alert · warning" layer="in-page">
          <Alert variant="warning">
            <AlertTitle>部分文件跳过</AlertTitle>
            <AlertDescription>3 个文件格式不支持</AlertDescription>
          </Alert>
        </ScenarioCard>

        <ScenarioCard scene="首次使用：空状态引导" pick="Empty" layer="in-page">
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={File01Icon} aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>还没有文档</EmptyTitle>
              <EmptyDescription>创建第一篇草稿开始写作</EmptyDescription>
            </EmptyHeader>
            <Button size="sm">新建文档</Button>
          </Empty>
        </ScenarioCard>

        <ScenarioCard scene="协作状态：标签展示" pick="Badge" layer="in-page">
          <div className={cn("flex flex-wrap", gap.sm)}>
            <Badge variant="success">已同步</Badge>
            <Badge variant="warning">待审核</Badge>
            <Badge variant="info">草稿</Badge>
            <Badge variant="outline">只读</Badge>
          </div>
        </ScenarioCard>

        <ScenarioCard scene="表单分区：视觉分隔" pick="Separator" layer="in-page">
          <div className={stack.sm}>
            <Field>
              <FieldLabel>用户名</FieldLabel>
              <Input defaultValue="writer" />
            </Field>
            <Separator />
            <Field>
              <FieldLabel>密码</FieldLabel>
              <Input type="password" defaultValue="••••••" />
            </Field>
          </div>
        </ScenarioCard>

        <ScenarioCard scene="成功状态：可带操作" pick="Alert · success" layer="in-page">
          <Alert variant="success">
            <AlertTitle>备份完成</AlertTitle>
            <AlertDescription>最新快照已保存到云端</AlertDescription>
          </Alert>
        </ScenarioCard>
      </div>
    </section>
  )
}

// ──────── 浮层案例 ────────

function FloatingScenarios() {
  return (
    <section id="floating" className={stack.lg}>
      <SectionHeading title="浮层案例" layer="floating" count={7} />
      <div className={cn("grid md:grid-cols-2", gap.md)}>
        <ScenarioCard scene="工具栏：悬停看快捷键" pick="Tooltip" layer="floating">
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="粗体" />}>
              <span className="text-sm font-bold">B</span>
            </TooltipTrigger>
            <TooltipPopup>粗体 (⌘B)</TooltipPopup>
          </Tooltip>
        </ScenarioCard>

        <ScenarioCard scene="文件菜单：点选操作" pick="Menu" layer="floating">
          <Menu>
            <MenuTrigger render={<Button variant="outline" size="sm" />}>
              文件
            </MenuTrigger>
            <MenuPopup>
              <MenuItem>新建</MenuItem>
              <MenuItem>打开…</MenuItem>
              <MenuItem>保存</MenuItem>
            </MenuPopup>
          </Menu>
        </ScenarioCard>

        <ScenarioCard scene="筛选器：带输入的小面板" pick="Popover" layer="floating">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              筛选
            </PopoverTrigger>
            <PopoverPopup className={cn("w-56", stack.sm)}>
              <PopoverTitle>按标签</PopoverTitle>
              <Input placeholder="搜索标签…" />
            </PopoverPopup>
          </Popover>
        </ScenarioCard>

        <ScenarioCard scene="语言切换：固定列表" pick="Select" layer="floating">
          <Select items={[...LANG_ITEMS]}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectPopup>
              {LANG_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </ScenarioCard>

        <ScenarioCard scene="图标旁：紧凑说明" pick="Popover · tooltipStyle" layer="floating">
          <Popover>
            <PopoverTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="说明" />}
            >
              <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
            </PopoverTrigger>
            <PopoverPopup tooltipStyle className="max-w-48">
              <PopoverDescription>导出前请确认目录结构完整</PopoverDescription>
            </PopoverPopup>
          </Popover>
        </ScenarioCard>

        <ScenarioCard scene="成员角色：下拉选择" pick="Select" layer="floating">
          <Select items={[...ROLE_ITEMS]}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="角色" />
            </SelectTrigger>
            <SelectPopup>
              {ROLE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </ScenarioCard>

        <ScenarioCard
          scene="日期旁：日历类浮层（示意）"
          pick="Popover + Calendar"
          layer="floating"
        >
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              选择日期
            </PopoverTrigger>
            <PopoverPopup className="w-48">
              <PopoverTitle>2026-06-07</PopoverTitle>
              <PopoverDescription>完整日历见 Date Picker particle</PopoverDescription>
            </PopoverPopup>
          </Popover>
        </ScenarioCard>
      </div>
    </section>
  )
}

// ──────── 模态案例 ────────

function ModalScenarios() {
  return (
    <section id="modals" className={stack.lg}>
      <SectionHeading title="模态案例" layer="modals" count={5} />
      <div className={cn("grid md:grid-cols-2", gap.md)}>
        <ScenarioCard scene="邀请成员：多段表单" pick="Dialog" layer="modals">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              邀请成员
            </DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>邀请成员</DialogTitle>
                <DialogDescription>发送邮件邀请加入工作区</DialogDescription>
              </DialogHeader>
              <DialogPanel className={stack.sm}>
                <Field>
                  <FieldLabel>邮箱</FieldLabel>
                  <Input type="email" placeholder="colleague@company.com" />
                </Field>
                <Select items={[...ROLE_ITEMS]}>
                  <SelectTrigger>
                    <SelectValue placeholder="角色" />
                  </SelectTrigger>
                  <SelectPopup>
                    {ROLE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>取消</DialogClose>
                <DialogClose render={<Button />}>发送邀请</DialogClose>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </ScenarioCard>

        <ScenarioCard scene="清空回收站：破坏性确认" pick="AlertDialog" layer="modals">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
              清空回收站
            </AlertDialogTrigger>
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>清空回收站？</AlertDialogTitle>
                <AlertDialogDescription>所有项目将永久删除</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" />}>
                  取消
                </AlertDialogClose>
                <AlertDialogClose render={<Button variant="destructive" />}>
                  确认清空
                </AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>
        </ScenarioCard>

        <ScenarioCard scene="偏好设置：侧边滑入" pick="Sheet" layer="modals">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="sm" />}>
              打开设置
            </SheetTrigger>
            <SheetPopup side="right">
              <SheetHeader>
                <SheetTitle>编辑器</SheetTitle>
                <SheetDescription>字体、缩进、拼写检查</SheetDescription>
              </SheetHeader>
              <SheetPanel className={stack.sm}>
                <Field>
                  <FieldLabel>字体大小</FieldLabel>
                  <Input defaultValue="14" />
                </Field>
              </SheetPanel>
              <SheetFooter>
                <SheetClose render={<Button />}>保存</SheetClose>
              </SheetFooter>
            </SheetPopup>
          </Sheet>
        </ScenarioCard>

        <ScenarioCard scene="从菜单打开 Dialog" pick="Menu → Dialog" layer="modals">
          <Dialog>
            <Menu>
              <MenuTrigger render={<Button variant="outline" size="sm" />}>
                项目
              </MenuTrigger>
              <MenuPopup>
                <DialogTrigger render={<MenuItem />}>新建项目…</DialogTrigger>
                <MenuItem>打开最近</MenuItem>
              </MenuPopup>
            </Menu>
            <DialogPopup>
              <DialogTitle>新建项目</DialogTitle>
              <DialogPanel>
                <Input placeholder="项目名称" />
              </DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>取消</DialogClose>
                <DialogClose render={<Button />}>创建</DialogClose>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </ScenarioCard>

        <ScenarioCard scene="移动端底栏：底部 Sheet" pick="Sheet · side=bottom" layer="modals">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="sm" />}>
              分享
            </SheetTrigger>
            <SheetPopup side="bottom">
              <SheetHeader>
                <SheetTitle>分享到</SheetTitle>
              </SheetHeader>
              <SheetPanel>
                <div className={cn("flex flex-wrap", gap.sm)}>
                  <Button variant="outline" size="sm">
                    复制链接
                  </Button>
                  <Button variant="outline" size="sm">
                    导出 PDF
                  </Button>
                </div>
              </SheetPanel>
            </SheetPopup>
          </Sheet>
        </ScenarioCard>
      </div>
    </section>
  )
}

// ──────── Toast 案例 ────────

function ToastScenarios() {
  const cases = [
    {
      scene: "发布成功",
      pick: "success",
      label: "发布",
      payload: {
        type: "success" as const,
        title: "已发布",
        description: "文章对读者可见",
      },
    },
    {
      scene: "自动保存（同 id 更新）",
      pick: "info · id",
      label: "模拟保存",
      payload: {
        id: "autosave-gallery",
        type: "info" as const,
        title: "已自动保存",
      },
    },
    {
      scene: "上传过大",
      pick: "error",
      label: "上传",
      payload: {
        type: "error" as const,
        title: "上传失败",
        description: "文件超过 10MB",
      },
    },
    {
      scene: "磁盘空间不足",
      pick: "warning",
      label: "警告",
      payload: {
        type: "warning" as const,
        title: "存储空间不足",
        description: "剩余 120MB",
      },
    },
    {
      scene: "后台同步中",
      pick: "info",
      label: "同步",
      payload: {
        type: "info" as const,
        title: "正在同步",
        description: "3 个文件待上传",
      },
    },
    {
      scene: "撤销删除",
      pick: "success + 可扩展 action",
      label: "撤销",
      payload: {
        type: "success" as const,
        title: "已移至回收站",
        description: "30 天内可恢复",
      },
    },
  ]

  return (
    <section id="toast" className={stack.lg}>
      <SectionHeading title="Toast 案例" layer="toast" count={cases.length} />
      <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", gap.md)}>
        {cases.map((c) => (
          <ScenarioCard key={c.scene} scene={c.scene} pick={c.pick} layer="toast">
            <Button
              size="sm"
              variant={c.payload.type === "error" ? "destructive" : "outline"}
              className="w-full"
              onClick={() => toastManager.add(c.payload)}
            >
              {c.label}
            </Button>
          </ScenarioCard>
        ))}
      </div>
    </section>
  )
}

// ──────── 主题 ────────

function useThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark")
  )
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])
  return { dark, toggle: () => setDark((v) => !v) }
}

// ──────── 页面 ────────

export function CossDesignSystemPage() {
  const { dark, toggle } = useThemeToggle()
  const [tab, setTab] = useState("all")

  const show = (id: string) => tab === "all" || tab === id

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
        <div className={cn("flex min-w-0 flex-1 flex-col", gap.hairline)}>
          <h1 className="text-sm font-medium text-foreground">coss 层级 · 场景案例</h1>
          <p className="text-xs text-muted-foreground">
            In-page · Floating · Modals · Toast
          </p>
        </div>
        <div className={cn("flex shrink-0 items-center", gap.sm)}>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={dark ? "亮色" : "暗色"}
            onClick={toggle}
          >
            <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" render={<a href="/coss-z-axis" />}>
            Z 轴解析
          </Button>
          <Button variant="outline" size="sm" render={<a href="/design-spec" />}>
            应用规范
          </Button>
          <Button variant="outline" size="sm" render={<a href="/" />}>
            返回
          </Button>
        </div>
      </header>

      <div className={cn("shrink-0 border-b border-border bg-background", p[4].x, p[2].y)}>
        <div className="mx-auto max-w-5xl">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTab value="all">全部</TabsTab>
              <TabsTab value="overview">一览</TabsTab>
              <TabsTab value="compare">对照</TabsTab>
              <TabsTab value="in-page">页内</TabsTab>
              <TabsTab value="floating">浮层</TabsTab>
              <TabsTab value="modals">模态</TabsTab>
              <TabsTab value="toast">Toast</TabsTab>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div
          className={cn(
            "mx-auto flex w-full max-w-5xl",
            stack.xl,
            p[6].x,
            p[6].top,
            p[12].bottom
          )}
        >
          <Card>
            <CardHeader>
              <CardTitle>点案例，看该用哪一层</CardTitle>
              <CardDescription>
                分类来自 portal-props.md；选用逻辑来自各 primitive 的 When to use
              </CardDescription>
            </CardHeader>
            <CardFooter className={cn("flex flex-wrap", gap.sm)}>
              {(Object.keys(LAYER_META) as LayerId[]).map((k) => (
                <LayerBadge key={k} layer={k} />
              ))}
            </CardFooter>
          </Card>

          {show("overview") && (
            <section id="overview" className={stack.lg}>
              <SectionHeading title="四层一览" count={4} />
              <LayerOverviewCards />
            </section>
          )}

          {show("compare") && <CompareSection />}
          {show("in-page") && <InPageScenarios />}
          {show("floating") && <FloatingScenarios />}
          {show("modals") && <ModalScenarios />}
          {show("toast") && <ToastScenarios />}
        </div>
      </ScrollArea>
    </div>
  )
}

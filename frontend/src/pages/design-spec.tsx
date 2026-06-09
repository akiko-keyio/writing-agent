import type { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Clock01Icon,
  File01Icon,
  Files01Icon,
  Folder01Icon,
  ListTreeIcon,
  MoreHorizontalCircle01Icon,
  PanelLeftOpenIcon,
} from "@hugeicons/core-free-icons"

import { ShellTooltipIconButton } from "@/components/chrome-toolbar-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { shell } from "@/lib/shell-chrome"
import { gap, p, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

// ──────── Section wrapper ────────

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className={stack.lg}>
      <div className={stack.xs}>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ExampleFrame({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background",
        p[4].all
      )}
    >
      {label && (
        <p className={cn("text-xs font-mono text-muted-foreground", p[2].bottom)}>
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

function Annotation({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-tight text-muted-foreground">
      {children}
    </span>
  )
}

// ──────── 1. Design Principles ────────

function DesignPrinciplesSection() {
  return (
    <Section title="设计原则" description="Writing Agent UI 的三条核心设计准则">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "壳层极小化",
            desc: "顶栏 / 面板头尽可能薄（h-10 = 40px），把空间让给内容区。图标钮只占 32px，文字用 text-sm。",
          },
          {
            title: "内容区舒适",
            desc: "文字需要呼吸感：段落间距 16px（gap.lg），行高 leading-5（20px），内边距 p-4 起步。",
          },
          {
            title: "层级靠间距表达",
            desc: "紧密 = 同一组（gap.xs 4px），松散 = 不同组（gap.lg 16px）。不用颜色区分层级。",
          },
        ].map((item) => (
          <div
            key={item.title}
            className={cn(
              "rounded-lg border border-border bg-muted/40",
              p[4].all,
              stack.sm
            )}
          >
            <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ──────── 2. Button System ────────

function ButtonSystemSection() {
  const variants = [
    { name: "default", variant: "default" as const },
    { name: "secondary", variant: "secondary" as const },
    { name: "outline", variant: "outline" as const },
    { name: "ghost", variant: "ghost" as const },
    { name: "link", variant: "link" as const },
    { name: "destructive", variant: "destructive" as const },
  ]

  const sizes = [
    { name: "xs", size: "xs" as const, px: "28px" },
    { name: "sm", size: "sm" as const, px: "32px" },
    { name: "default", size: "default" as const, px: "36px" },
    { name: "lg", size: "lg" as const, px: "40px" },
  ]

  const iconSizes = [
    { name: "icon-xs", size: "icon-xs" as const, px: "24px" },
    { name: "icon-sm", size: "icon-sm" as const, px: "28px" },
    { name: "icon", size: "icon" as const, px: "32px" },
    { name: "icon-lg", size: "icon-lg" as const, px: "36px" },
  ]

  return (
    <Section title="按钮系统" description="统一使用 coss Button primitive，只传 variant + size，不写自定义 className">
      {/* Variants */}
      <ExampleFrame label="Variants">
        <div className={cn("flex flex-wrap items-center", gap.sm)}>
          {variants.map((v) => (
            <div key={v.name} className={cn("flex flex-col items-center", gap.xs)}>
              <Button variant={v.variant}>{v.name}</Button>
              <Annotation>{v.name}</Annotation>
            </div>
          ))}
        </div>
      </ExampleFrame>

      {/* Text sizes */}
      <ExampleFrame label="Text Sizes">
        <div className={cn("flex flex-wrap items-end", gap.sm)}>
          {sizes.map((s) => (
            <div key={s.name} className={cn("flex flex-col items-center", gap.xs)}>
              <Button size={s.size}>{s.name}</Button>
              <Annotation>{s.px}</Annotation>
            </div>
          ))}
        </div>
      </ExampleFrame>

      {/* Icon sizes */}
      <ExampleFrame label="Icon Sizes">
        <div className={cn("flex flex-wrap items-center", gap.sm)}>
          {iconSizes.map((s) => (
            <div key={s.name} className={cn("flex flex-col items-center", gap.xs)}>
              <Button size={s.size} aria-label={s.name}>
                <HugeiconsIcon icon={Files01Icon} aria-hidden="true" />
              </Button>
              <Annotation>{s.px}</Annotation>
            </div>
          ))}
        </div>
      </ExampleFrame>

      {/* Do / Don't */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ExampleFrame label="Do - 只传 variant + size">
          <div className={cn("flex items-center", gap.sm)}>
            <Button variant="ghost" size="icon-lg" aria-label="Files">
              <HugeiconsIcon icon={Files01Icon} aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-lg" aria-label="Outline">
              <HugeiconsIcon icon={ListTreeIcon} aria-hidden="true" />
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              &lt;Button variant="ghost" size="icon-lg"&gt;
            </span>
          </div>
        </ExampleFrame>
        <ExampleFrame label="Don't - 不要覆盖尺寸和颜色">
          <div className={cn("flex items-center", gap.sm)}>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Files"
              className="size-7 [&_svg]:size-4"
            >
              <HugeiconsIcon icon={Files01Icon} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Outline"
              className="size-7 [&_svg]:size-4"
            >
              <HugeiconsIcon icon={ListTreeIcon} aria-hidden="true" />
            </Button>
            <span className="font-mono text-xs text-destructive-foreground">
              className="size-7 [&_svg]:size-4"
            </span>
          </div>
        </ExampleFrame>
      </div>
    </Section>
  )
}

// ──────── 3. Spacing System ────────

function SpacingSystemSection() {
  return (
    <Section title="间距系统" description="所有间距从 @/lib/spacing 获取，禁止裸写 gap-* / p-*">
      {/* Gap scale */}
      <ExampleFrame label="Gap Scale (flex 间距)">
        <div className={stack.md}>
          {[
            { token: "gap.none", cls: gap.none, px: "0px" },
            { token: "gap.hairline", cls: gap.hairline, px: "2px" },
            { token: "gap.xs", cls: gap.xs, px: "4px" },
            { token: "gap.sm", cls: gap.sm, px: "8px" },
            { token: "gap.md", cls: gap.md, px: "12px" },
            { token: "gap.lg", cls: gap.lg, px: "16px" },
            { token: "gap.xl", cls: gap.xl, px: "32px" },
          ].map((item) => (
            <div key={item.token} className="flex items-center">
              <Annotation>{item.token}</Annotation>
              <span className="mx-2 text-xs text-muted-foreground">
                {item.px}
              </span>
              <div className={cn("flex", item.cls)}>
                <div className="size-4 rounded bg-primary/20" />
                <div className="size-4 rounded bg-primary/20" />
                <div className="size-4 rounded bg-primary/20" />
              </div>
            </div>
          ))}
        </div>
      </ExampleFrame>

      {/* Real toolbar example */}
      <ExampleFrame label="toolbar 内部组 - gap.xs (4px)">
        <div
          className={cn(
            "inline-flex items-center rounded-lg border border-border bg-sidebar",
            p[2].x,
            p[1.5].y,
            gap.xs
          )}
        >
          <Button size="icon-sm" variant="ghost" aria-label="Files">
            <HugeiconsIcon icon={Files01Icon} aria-hidden="true" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Outline">
            <HugeiconsIcon icon={ListTreeIcon} aria-hidden="true" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button size="icon-sm" variant="ghost" aria-label="Collapse">
            <HugeiconsIcon icon={PanelLeftOpenIcon} aria-hidden="true" />
          </Button>
        </div>
      </ExampleFrame>

      {/* Panel header example */}
      <ExampleFrame label="panelHeader - p[2].x (8px) + gap.xs (4px)">
        <div
          className={cn(
            "inline-flex items-center rounded-lg border border-border bg-sidebar",
            p[2].x,
            p[1.5].y,
            gap.xs
          )}
        >
          <HugeiconsIcon icon={Files01Icon} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className={shell.textMuted}>Files</span>
          <div className="ms-auto" />
          <Button size="icon-xs" variant="ghost" aria-label="New file">
            <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
          </Button>
        </div>
      </ExampleFrame>

      {/* Content stack example */}
      <ExampleFrame label="content stack - gap.lg (16px)">
        <div className={cn("max-w-md", stack.lg)}>
          <p className="text-sm leading-5 text-foreground">
            段落之间的间距使用 <Annotation>gap.lg</Annotation>（16px），对应 Tailwind
            的 <Annotation>gap-4</Annotation>。
          </p>
          <p className="text-sm leading-5 text-foreground">
            这保证了内容区的呼吸感，同时不会过于松散。
          </p>
          <p className="text-sm leading-5 text-foreground">
            紧密组合（如按钮组）使用 <Annotation>gap.xs</Annotation>（4px）。
          </p>
        </div>
      </ExampleFrame>
    </Section>
  )
}

// ──────── 4. Border Radius System ────────

function BorderRadiusSection() {
  return (
    <Section title="圆角系统" description="圆角变量链定义在 index.css：--radius: 0.625rem (10px)">
      <ExampleFrame label="圆角梯度">
        <div className={cn("flex flex-wrap items-end", gap.lg)}>
          {[
            { name: "rounded-sm", cls: "rounded-sm", px: "6px", usage: "菜单项" },
            { name: "rounded-md", cls: "rounded-md", px: "8px", usage: "代码块" },
            { name: "rounded-lg", cls: "rounded-lg", px: "10px", usage: "Button (默认)" },
            { name: "rounded-xl", cls: "rounded-xl", px: "14px", usage: "Toolbar" },
            { name: "rounded-2xl", cls: "rounded-2xl", px: "18px", usage: "Dialog / Chat" },
            { name: "rounded-full", cls: "rounded-full", px: "9999px", usage: "发送钮" },
          ].map((r) => (
            <div key={r.name} className={cn("flex flex-col items-center", gap.xs)}>
              <div
                className={cn(
                  "h-12 w-20 border border-border bg-muted/60",
                  r.cls
                )}
              />
              <Annotation>{r.name}</Annotation>
              <span className="text-[11px] text-muted-foreground">{r.px}</span>
              <span className="text-[11px] text-muted-foreground">{r.usage}</span>
            </div>
          ))}
        </div>
      </ExampleFrame>

      {/* Real examples */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ExampleFrame label="Button - rounded-lg (10px)">
          <Button>Button</Button>
        </ExampleFrame>
        <ExampleFrame label="Code block - rounded-md (8px)">
          <code className="inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs">
            const x = gap.lg
          </code>
        </ExampleFrame>
        <ExampleFrame label="Dialog - rounded-2xl (18px)">
          <div className="rounded-2xl border border-border bg-popover p-4 shadow-sm">
            <p className="text-sm font-medium">Dialog 弹窗</p>
            <p className="text-xs text-muted-foreground">rounded-2xl = 18px</p>
          </div>
        </ExampleFrame>
      </div>
    </Section>
  )
}

// ──────── 5. Color System ────────

function ColorSystemSection() {
  return (
    <Section title="颜色系统" description="使用语义 token，禁止硬编码颜色值">
      <ExampleFrame label="Surface 层级">
        <div className={cn("flex flex-wrap", gap.sm)}>
          {[
            { label: "bg-background", cls: "bg-background", desc: "内容区背景" },
            { label: "bg-sidebar", cls: "bg-sidebar", desc: "Explorer 背景" },
            { label: "bg-muted", cls: "bg-muted", desc: "辅助信息" },
            { label: "bg-accent", cls: "bg-accent", desc: "Hover 状态" },
            { label: "bg-primary", cls: "bg-primary text-primary-foreground", desc: "主操作" },
            { label: "bg-secondary", cls: "bg-secondary", desc: "次要操作" },
            { label: "bg-destructive", cls: "bg-destructive text-white", desc: "危险操作" },
          ].map((c) => (
            <div key={c.label} className={cn("flex flex-col", gap.xs)}>
              <div
                className={cn(
                  "h-10 w-24 rounded-lg border border-border",
                  c.cls
                )}
              />
              <Annotation>{c.label}</Annotation>
              <span className="text-[11px] text-muted-foreground">{c.desc}</span>
            </div>
          ))}
        </div>
      </ExampleFrame>

      <ExampleFrame label="Text 层级">
        <div className={stack.sm}>
          <p className="text-foreground">
            <Annotation>text-foreground</Annotation> 主要文字
          </p>
          <p className="text-muted-foreground">
            <Annotation>text-muted-foreground</Annotation> 辅助文字
          </p>
          <p className="text-sm text-muted-foreground">
            <Annotation>text-sm + text-muted-foreground</Annotation> 壳层描述
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Annotation>text-xs uppercase</Annotation> 分组标签
          </p>
        </div>
      </ExampleFrame>

      <ExampleFrame label="Border 层级">
        <div className={cn("flex flex-wrap", gap.sm)}>
          <div
            className={cn(
              "h-10 w-24 rounded-lg border border-border bg-background",
              p[2].all
            )}
          >
            <span className="text-xs text-muted-foreground">border</span>
          </div>
          <div
            className={cn(
              "h-10 w-24 rounded-lg border border-input bg-popover",
              p[2].all
            )}
          >
            <span className="text-xs text-muted-foreground">input</span>
          </div>
          <div
            className={cn(
              "h-10 w-24 rounded-lg border border-sidebar-border bg-sidebar",
              p[2].all
            )}
          >
            <span className="text-xs text-muted-foreground">sidebar</span>
          </div>
        </div>
      </ExampleFrame>
    </Section>
  )
}

// ──────── 6. Component Composition ────────

function CompositionSection() {
  return (
    <Section title="组件组合" description="真实壳层片段：用 coss primitive 拼装常见 UI 模式">
      {/* Mini top bar */}
      <ExampleFrame label="迷你顶栏 - ShellTooltipIconButton + ghost icon">
        <div
          className={cn(
            "flex items-center rounded-lg bg-sidebar border border-border",
            p[2].x,
            p[1.5].y,
            gap.xs
          )}
        >
          <Button size="sm" variant="ghost" className="font-normal text-sm">
            Writing Agent
          </Button>
          <div className="me-1 border-e border-border pe-2" />
          <ShellTooltipIconButton
            label="Files"
            tooltip="Files"
            side="bottom"
            data-pressed=""
          >
            <HugeiconsIcon icon={Files01Icon} aria-hidden="true" />
          </ShellTooltipIconButton>
          <ShellTooltipIconButton label="Outline" tooltip="Outline" side="bottom">
            <HugeiconsIcon icon={ListTreeIcon} aria-hidden="true" />
          </ShellTooltipIconButton>
          <div className="ms-auto" />
          <Button size="icon-lg" variant="ghost" aria-label="Collapse">
            <HugeiconsIcon icon={PanelLeftOpenIcon} aria-hidden="true" />
          </Button>
        </div>
      </ExampleFrame>

      {/* Mini panel header */}
      <ExampleFrame label="迷你面板头 - shell.panelHeader">
        <div className={shell.panelHeader}>
          <HugeiconsIcon icon={Files01Icon} className={shell.panelHeaderIcon} aria-hidden="true" />
          <span className={shell.textMuted}>Files</span>
          <div className="ms-auto flex shrink-0 items-center">
            <ShellTooltipIconButton label="New file" tooltip="New file" size="icon-xs">
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            </ShellTooltipIconButton>
            <ShellTooltipIconButton label="More" tooltip="More" size="icon-xs">
              <HugeiconsIcon icon={MoreHorizontalCircle01Icon} aria-hidden="true" />
            </ShellTooltipIconButton>
          </div>
        </div>
      </ExampleFrame>

      {/* File tree row */}
      <ExampleFrame label="文件树行 - SidebarMenuButton size='sm'">
        <SidebarProvider className="max-w-xs">
          <div className="rounded-lg border border-border bg-sidebar p-1.5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm">
                  <HugeiconsIcon icon={Folder01Icon} aria-hidden="true" />
                  <span className="truncate">src</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm">
                  <HugeiconsIcon icon={Folder01Icon} aria-hidden="true" />
                  <span className="truncate">components</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" isActive>
                  <HugeiconsIcon icon={File01Icon} aria-hidden="true" />
                  <span className="truncate">layout.tsx</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm">
                  <HugeiconsIcon icon={File01Icon} aria-hidden="true" />
                  <span className="truncate">App.tsx</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarProvider>
      </ExampleFrame>

      {/* Menu example */}
      <ExampleFrame label="Menu 弹出菜单">
        <Menu>
          <MenuTrigger
            render={<Button variant="outline" size="sm" />}
          >
            Open Menu
          </MenuTrigger>
          <MenuPopup>
            <MenuItem>
              <HugeiconsIcon icon={File01Icon} aria-hidden="true" />
              New File
            </MenuItem>
            <MenuItem>
              <HugeiconsIcon icon={Folder01Icon} aria-hidden="true" />
              Open Folder
            </MenuItem>
            <MenuItem>
              <HugeiconsIcon icon={Clock01Icon} aria-hidden="true" />
              Recent
            </MenuItem>
          </MenuPopup>
        </Menu>
      </ExampleFrame>

      {/* Complete Menu example */}
      <ExampleFrame label="Menu 完整示例 - Checkbox / Radio / Submenu">
        <Menu>
          <MenuTrigger
            render={<Button variant="outline" size="sm" />}
          >
            Complete Menu
          </MenuTrigger>
          <MenuPopup align="start" sideOffset={4}>
            <MenuItem>
              <HugeiconsIcon icon={File01Icon} aria-hidden="true" />
              New File
            </MenuItem>
            <MenuItem>
              <HugeiconsIcon icon={Folder01Icon} aria-hidden="true" />
              Open Folder
            </MenuItem>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Playback</MenuGroupLabel>
              <MenuItem>Play</MenuItem>
              <MenuItem>Pause</MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuCheckboxItem>Shuffle</MenuCheckboxItem>
            <MenuCheckboxItem>Repeat</MenuCheckboxItem>
            <MenuCheckboxItem variant="switch">Auto save</MenuCheckboxItem>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Sort by</MenuGroupLabel>
              <MenuRadioGroup>
                <MenuRadioItem value="artist">Artist</MenuRadioItem>
                <MenuRadioItem value="album">Album</MenuRadioItem>
                <MenuRadioItem value="title">Title</MenuRadioItem>
              </MenuRadioGroup>
            </MenuGroup>
            <MenuSeparator />
            <MenuSub>
              <MenuSubTrigger>Add to playlist</MenuSubTrigger>
              <MenuSubPopup>
                <MenuItem>Jazz</MenuItem>
                <MenuItem>Rock</MenuItem>
                <MenuItem>Classical</MenuItem>
              </MenuSubPopup>
            </MenuSub>
          </MenuPopup>
        </Menu>
      </ExampleFrame>

      {/* Dialog example */}
      <ExampleFrame label="Dialog 弹窗 - rounded-2xl">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Open Dialog
          </DialogTrigger>
          <DialogPopup>
            <DialogTitle>确认操作</DialogTitle>
            <DialogDescription>
              这是一个 Dialog 示例，展示 rounded-2xl (18px) 圆角。
            </DialogDescription>
            <div className={cn("flex justify-end", gap.sm, p[4].top)}>
              <DialogClose render={<Button variant="outline" />}>
                取消
              </DialogClose>
              <DialogClose render={<Button />}>
                确认
              </DialogClose>
            </div>
          </DialogPopup>
        </Dialog>
      </ExampleFrame>
    </Section>
  )
}

// ──────── 7. Typography ────────

function TypographySection() {
  return (
    <Section title="排版" description="文字尺寸与 Markdown 输出间距模型">
      <ExampleFrame label="文字尺寸">
        <div className={stack.md}>
          {[
            { cls: "text-xs", label: "text-xs", px: "12px", usage: "注释、标签、壳层辅助" },
            { cls: "text-sm", label: "text-sm", px: "14px", usage: "正文、按钮、菜单 (默认)" },
            { cls: "text-base", label: "text-base", px: "16px", usage: "表单输入、大按钮" },
            { cls: "text-lg", label: "text-lg", px: "18px", usage: "Section 标题" },
            { cls: "text-xl font-semibold", label: "text-xl", px: "20px", usage: "Dialog 标题" },
          ].map((t) => (
            <div key={t.label} className="flex items-baseline">
              <Annotation>{t.label}</Annotation>
              <span className="mx-2 text-[11px] text-muted-foreground">{t.px}</span>
              <span className={cn(t.cls, "text-foreground")}>
                {t.usage}
              </span>
            </div>
          ))}
        </div>
      </ExampleFrame>

      <ExampleFrame label="Markdown 间距模型">
        <div className="max-w-md rounded-lg border border-dashed border-border p-4">
          {/* Heading to text: 8px */}
          <div className="relative">
            <h3 className="text-base font-semibold text-foreground">
              标题 Heading
            </h3>
            <div className="absolute -right-3 top-0 flex items-center text-[10px] text-muted-foreground">
              <span className="inline-block border-r border-dashed border-primary/40 pr-1">
                mb-2
              </span>
            </div>
          </div>
          <p className="mb-0 text-sm leading-5 text-foreground">
            标题到正文的间距是 8px（mb-2），表示它们属于同一节。
          </p>

          {/* Paragraph gap: 16px */}
          <div className="relative mt-4 border-t border-dashed border-primary/30 pt-0">
            <div className="absolute -right-3 -top-3 text-[10px] text-muted-foreground">
              16px
            </div>
          </div>
          <p className="text-sm leading-5 text-foreground">
            段落间距是 16px（gap.lg），这是 Markdown 块间距标准值。
          </p>

          <div className="relative mt-4 border-t border-dashed border-primary/30 pt-0">
            <div className="absolute -right-3 -top-3 text-[10px] text-muted-foreground">
              16px
            </div>
          </div>
          <p className="text-sm leading-5 text-foreground">
            每个段落都遵循 <Annotation>text-sm leading-5</Annotation> 的正文规范。
          </p>
        </div>
      </ExampleFrame>
    </Section>
  )
}

// ──────── 8. Shell Chrome Tokens ────────

function ShellChromeSection() {
  return (
    <Section title="壳层 Token 速查" description="shell-chrome.ts 中定义的常用壳层样式组合">
      <ExampleFrame label="常用 token">
        <div className={cn("max-w-lg", stack.sm)}>
          {[
            { token: "shell.text", desc: "壳层文字", sample: <span className={shell.text}>text-sm leading-5</span> },
            { token: "shell.textMuted", desc: "壳层辅助文字", sample: <span className={shell.textMuted}>text-sm leading-5 text-muted-foreground</span> },
            { token: "shell.menuRow", desc: "侧栏行高", sample: <span className={cn(shell.menuRow, "inline-flex items-center rounded bg-sidebar-accent px-2")}>h-8 text-sm</span> },
            { token: "shell.workbenchTopBar", desc: "顶栏容器", sample: <span className="font-mono text-xs text-muted-foreground">grid h-10 shrink-0</span> },
            { token: "shell.panelHeader", desc: "面板头", sample: <span className="font-mono text-xs text-muted-foreground">flex min-h-10 border-b</span> },
            { token: "shell.chatRadius", desc: "Chat 圆角", sample: <span className="font-mono text-xs text-muted-foreground">rounded-2xl</span> },
            { token: "shell.chatUserBubble", desc: "用户气泡", sample: <span className="font-mono text-xs text-muted-foreground">ms-auto rounded-2xl border</span> },
          ].map((item) => (
            <div key={item.token} className="flex items-center gap-3">
              <Annotation>{item.token}</Annotation>
              <span className="min-w-[120px] text-xs text-muted-foreground">
                {item.desc}
              </span>
              <div className="flex-1">{item.sample}</div>
            </div>
          ))}
        </div>
      </ExampleFrame>
    </Section>
  )
}

// ──────── Main page ────────

export function DesignSpecPage() {
  return (
    <div className="flex h-svh flex-col bg-background">
      <header
        className={cn(
          shell.panelHeader,
          "shrink-0 border-b border-border bg-sidebar"
        )}
      >
        <div className={cn("flex min-w-0 flex-1 flex-col", gap.hairline)}>
          <h1 className="text-sm font-medium text-foreground">
            UI Design Spec
          </h1>
          <p className="text-xs text-muted-foreground">
            Writing Agent 设计系统参考 — 使用真实 coss 组件展示设计原则
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href="/coss-design-system" />}>
          coss 层级
        </Button>
        <Button variant="outline" size="sm" render={<a href="/" />}>
          返回应用
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl",
            stack.xl,
            p[6].x,
            p[6].top,
            p[12].bottom
          )}
        >
          <DesignPrinciplesSection />
          <ButtonSystemSection />
          <SpacingSystemSection />
          <BorderRadiusSection />
          <ColorSystemSection />
          <CompositionSection />
          <TypographySection />
          <ShellChromeSection />
        </div>
      </ScrollArea>
    </div>
  )
}

import type { ReactNode } from "react"

import {
  Add01Icon,
  CheckListIcon,
  HelpCircleIcon,
  Key01Icon,
  Layers01Icon,
  MoreHorizontalCircle01Icon,
  Search01Icon,
  Settings02Icon,
  ToolsIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { gap, p, row, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

type IconData = typeof Settings02Icon

interface DomainItem {
  name: string
  meta: string
  state: string
  badge: BadgeProps["variant"]
}

interface DomainDefinition {
  id: string
  label: string
  shortLabel: string
  description: string
  count: number
  attention: string
  icon: IconData
  badge: BadgeProps["variant"]
  items: DomainItem[]
}

const CONFIG_DOMAINS: DomainDefinition[] = [
  {
    id: "models",
    label: "Models",
    shortLabel: "模型",
    description: "唯一需要频繁新增、编辑、校验的配置区。",
    count: 2,
    attention: "1 个缺 Base URL",
    icon: Key01Icon,
    badge: "warning",
    items: [
      {
        name: "mimo-v2.5",
        meta: "https://token-plan-cn.xiaomimimo.com/v1",
        state: "可用于 Chat",
        badge: "success",
      },
      {
        name: "Unnamed model",
        meta: "No base URL",
        state: "需补全",
        badge: "warning",
      },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    shortLabel: "技能",
    description: "启动时加载的能力包，重点是查找、来源与引用文件。",
    count: 1,
    attention: "只读清单",
    icon: Layers01Icon,
    badge: "info",
    items: [
      {
        name: "academic-writing",
        meta: "Refine STEM academic writing",
        state: "含 references",
        badge: "info",
      },
    ],
  },
  {
    id: "rules",
    label: "Rules",
    shortLabel: "规则",
    description: "硬约束应高可见，最好能快速预览并跳转源文件。",
    count: 1,
    attention: "always-on",
    icon: CheckListIcon,
    badge: "success",
    items: [
      {
        name: "hard-constraints",
        meta: "never fabricate, never alter meaning",
        state: "强约束",
        badge: "success",
      },
    ],
  },
  {
    id: "subagents",
    label: "Subagents",
    shortLabel: "子代理",
    description: "需要展示运行方式：background、read-only、触发来源。",
    count: 4,
    attention: "2 个后台",
    icon: UserMultipleIcon,
    badge: "secondary",
    items: [
      {
        name: "check",
        meta: "Mechanical consistency check",
        state: "read-only",
        badge: "secondary",
      },
      {
        name: "reference-list",
        meta: "Generate APA-7 reference list",
        state: "background",
        badge: "info",
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    shortLabel: "工具",
    description: "内建能力不需要编辑，适合能力说明、输入输出与权限提示。",
    count: 1,
    attention: "内建",
    icon: ToolsIcon,
    badge: "outline",
    items: [
      {
        name: "read_file",
        meta: "Read a file from the project workspace",
        state: "overlay first",
        badge: "outline",
      },
    ],
  },
]

const RECOMMENDATIONS = [
  "把 Models 当作操作型表单，把 Skills / Rules / Subagents / Tools 当作只读能力目录。",
  "默认页先回答“现在能不能用、哪里有问题”，再进入单项详情。",
  "能力项数量变多后，需要搜索、来源路径、标签筛选，而不是只靠左侧分区。",
]

function PageHeader() {
  return (
    <header
      className={cn(shell.panelHeader, "shrink-0 border-b border-border bg-sidebar")}
    >
      <HugeiconsIcon
        icon={Settings02Icon}
        className="shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className={cn("flex min-w-0 flex-1 flex-col", gap.hairline)}>
        <h1 className="truncate text-sm font-medium text-foreground">
          配置页交互选型
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          Models · Skills · Rules · Subagents · Tools
        </p>
      </div>
      <Button variant="outline" size="sm" render={<a href="/" />}>
        返回应用
      </Button>
    </header>
  )
}

function DecisionSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>建议默认采用“总览矩阵 + 详情检查器”</CardTitle>
        <CardDescription>
          现有页面按分类纵向展开，信息真实但扫描成本偏高。配置页更像运维台：
          用户首先想知道可用性、异常项和来源，然后才进入编辑或查看详情。
        </CardDescription>
      </CardHeader>
      <CardPanel className={stack.md}>
        <div className={cn("grid lg:grid-cols-3", gap.md)}>
          {RECOMMENDATIONS.map((item, index) => (
            <div
              key={item}
              className={cn(
                "rounded-lg border border-border bg-background",
                p[3].all,
                stack.xs
              )}
            >
              <Badge variant={index === 0 ? "success" : "secondary"} size="sm">
                判断 {index + 1}
              </Badge>
              <p className="text-sm leading-5 text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </CardPanel>
      <CardFooter className={cn("flex flex-wrap", gap.sm)}>
        <Badge variant="success">推荐：总览矩阵</Badge>
        <Badge variant="info">备选：统一目录</Badge>
        <Badge variant="outline">场景：首次配置向导</Badge>
      </CardFooter>
    </Card>
  )
}

function OptionIntro({
  title,
  badge,
  children,
}: {
  title: string
  badge: string
  children: ReactNode
}) {
  return (
    <div className={stack.sm}>
      <div className={cn(row.sm, "flex-wrap")}>
        <Badge variant="success">{badge}</Badge>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

function DomainNavItem({
  domain,
  active = false,
}: {
  domain: DomainDefinition
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 items-center rounded-lg text-left text-sm leading-5",
        p[2].x,
        p[1.5].y,
        gap.sm,
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground"
      )}
    >
      <HugeiconsIcon icon={domain.icon} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{domain.label}</span>
      <Badge variant={domain.badge} size="sm">
        {domain.count}
      </Badge>
    </button>
  )
}

function DomainTile({ domain }: { domain: DomainDefinition }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", p[3].all, stack.sm)}>
      <div className={cn(row.sm, "min-w-0")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <HugeiconsIcon icon={domain.icon} aria-hidden="true" />
        </div>
        <div className={cn(stack.hairline, "min-w-0 flex-1")}>
          <span className="truncate text-sm font-medium text-foreground">
            {domain.label}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {domain.attention}
          </span>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{domain.description}</p>
    </div>
  )
}

function CompactItemRow({ item, icon }: { item: DomainItem; icon: IconData }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center rounded-lg border border-border bg-background",
        p[2].x,
        p[1.5].y,
        gap.sm
      )}
    >
      <HugeiconsIcon icon={icon} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className={cn(stack.hairline, "min-w-0 flex-1")}>
        <span className="truncate text-sm leading-5 text-foreground">{item.name}</span>
        <span className="truncate text-xs text-muted-foreground">{item.meta}</span>
      </div>
      <Badge variant={item.badge} size="sm">
        {item.state}
      </Badge>
    </div>
  )
}

function MatrixInspectorMock() {
  const active = CONFIG_DOMAINS[0]

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid min-h-[34rem] lg:grid-cols-[15rem_minmax(0,1fr)_19rem]">
        <aside className={cn("min-w-0 border-e border-border bg-sidebar", p[3].all, stack.sm)}>
          <div className={cn(row.sm, p[1].bottom)}>
            <HugeiconsIcon icon={Settings02Icon} aria-hidden="true" />
            <span className="text-sm font-medium text-sidebar-foreground">
              Configuration
            </span>
          </div>
          {CONFIG_DOMAINS.map((domain) => (
            <DomainNavItem
              key={domain.id}
              domain={domain}
              active={domain.id === active.id}
            />
          ))}
        </aside>

        <section className={cn("min-w-0 bg-background", p[4].all, stack.lg)}>
          <div className={cn(row.md, "min-w-0 flex-wrap justify-between")}>
            <div className={stack.xs}>
              <h3 className="text-base font-semibold text-foreground">
                配置健康度
              </h3>
              <p className="text-sm text-muted-foreground">
                先看异常、数量和能力范围，再进入具体项。
              </p>
            </div>
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
              Add Model
            </Button>
          </div>

          <div className={cn("grid md:grid-cols-2 xl:grid-cols-3", gap.md)}>
            {CONFIG_DOMAINS.map((domain) => (
              <DomainTile key={domain.id} domain={domain} />
            ))}
          </div>

          <div className={stack.sm}>
            <div className={cn(row.sm, "justify-between")}>
              <h4 className="text-sm font-medium text-foreground">
                Needs attention
              </h4>
              <Badge variant="warning" size="sm">
                1 issue
              </Badge>
            </div>
            {active.items.map((item) => (
              <CompactItemRow key={item.name} item={item} icon={active.icon} />
            ))}
          </div>
        </section>

        <aside className={cn("min-w-0 border-s border-border bg-muted/30", p[4].all, stack.md)}>
          <div className={stack.xs}>
            <Badge variant="warning" className="w-fit">
              Inspector
            </Badge>
            <h3 className="text-base font-semibold text-foreground">
              Unnamed model
            </h3>
            <p className="text-sm leading-5 text-muted-foreground">
              Base URL 缺失时，Chat 区选择模型会失败。详情栏把修复动作和上下文放在一起。
            </p>
          </div>
          <Separator />
          <div className={stack.sm}>
            <FieldPreview label="Model" value="Unnamed model" />
            <FieldPreview label="Base URL" value="No base URL" warning />
            <FieldPreview label="Provider" value="OpenAI-compatible" />
          </div>
          <div className={cn(row.sm, "flex-wrap")}>
            <Button size="sm">补全配置</Button>
            <Button variant="ghost" size="sm">
              稍后处理
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FieldPreview({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className={stack.hairline}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "truncate rounded-md border bg-background text-sm leading-5",
          p[2].x,
          p[1.5].y,
          warning ? "border-warning/40 text-warning-foreground" : "border-border text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function CatalogMock() {
  const rows = CONFIG_DOMAINS.flatMap((domain) =>
    domain.items.map((item) => ({ domain, item }))
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn("border-b border-border bg-background", p[4].all, stack.md)}>
        <div className={cn(row.md, "min-w-0 flex-wrap justify-between")}>
          <div className={stack.xs}>
            <h3 className="text-base font-semibold text-foreground">
              能力与配置目录
            </h3>
            <p className="text-sm text-muted-foreground">
              把五类对象合成一个可搜索清单，适合插件、规则、工具数量变多之后。
            </p>
          </div>
          <Button variant="outline" size="sm">
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} aria-hidden="true" />
            批量操作
          </Button>
        </div>
        <div className={cn("grid lg:grid-cols-[minmax(0,1fr)_auto]", gap.sm)}>
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input className={p[8].start} defaultValue="academic writing" />
          </div>
          <div className={cn(row.sm, "flex-wrap")}>
            <Badge variant="outline">all</Badge>
            <Badge variant="info">skills</Badge>
            <Badge variant="success">rules</Badge>
            <Badge variant="secondary">subagents</Badge>
          </div>
        </div>
      </div>

      <div className="grid min-h-[30rem] lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className={cn("border-e border-border bg-sidebar", p[3].all, stack.md)}>
          <div className={stack.xs}>
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Filters
            </span>
            {CONFIG_DOMAINS.map((domain) => (
              <DomainNavItem key={domain.id} domain={domain} />
            ))}
          </div>
          <Separator />
          <div className={stack.xs}>
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Source
            </span>
            <Badge variant="outline" className="w-fit">
              plugins/*
            </Badge>
            <Badge variant="outline" className="w-fit">
              built-in
            </Badge>
          </div>
        </aside>

        <section className={cn("min-w-0 bg-background", p[3].all, stack.xs)}>
          {rows.map(({ domain, item }) => (
            <div
              key={`${domain.id}-${item.name}`}
              className={cn(
                "grid min-w-0 rounded-lg border border-transparent",
                "bg-background",
                "lg:grid-cols-[minmax(10rem,1.3fr)_minmax(8rem,1fr)_auto]",
                p[2].x,
                p[1.5].y,
                gap.sm
              )}
            >
              <div className={cn(row.sm, "min-w-0")}>
                <HugeiconsIcon
                  icon={domain.icon}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className={cn(stack.hairline, "min-w-0")}>
                  <span className="truncate text-sm text-foreground">{item.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {domain.label}
                  </span>
                </div>
              </div>
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {item.meta}
              </span>
              <Badge variant={item.badge} size="sm" className="w-fit justify-self-start lg:justify-self-end">
                {item.state}
              </Badge>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

function SetupFlowMock() {
  const steps = [
    { label: "Connect Models", state: "current", badge: "warning" as const },
    { label: "Review Skills", state: "ready", badge: "info" as const },
    { label: "Confirm Rules", state: "ready", badge: "success" as const },
    { label: "Inspect Tools", state: "ready", badge: "outline" as const },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn("border-b border-border bg-background", p[4].all, stack.md)}>
        <div className={cn(row.md, "min-w-0 flex-wrap justify-between")}>
          <div className={stack.xs}>
            <h3 className="text-base font-semibold text-foreground">
              首次配置向导
            </h3>
            <p className="text-sm text-muted-foreground">
              当用户第一次打开项目，先把模型连通，再确认启动时加载的能力。
            </p>
          </div>
          <Badge variant="warning">1 required fix</Badge>
        </div>
        <div className={cn("grid md:grid-cols-4", gap.sm)}>
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={cn(
                "rounded-lg border bg-card",
                p[3].all,
                step.state === "current" ? "border-warning/40" : "border-border"
              )}
            >
              <div className={cn(row.sm, "justify-between")}>
                <span className="text-xs font-medium text-muted-foreground">
                  Step {index + 1}
                </span>
                <Badge variant={step.badge} size="sm">
                  {step.state}
                </Badge>
              </div>
              <p className="truncate text-sm font-medium text-foreground">
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-[30rem] lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className={cn("min-w-0 bg-background", p[4].all, stack.md)}>
          <div className={cn(row.sm, "flex-wrap justify-between")}>
            <h4 className="text-sm font-medium text-foreground">
              Connect Models
            </h4>
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
              Add Model
            </Button>
          </div>
          {CONFIG_DOMAINS[0].items.map((item) => (
            <div
              key={item.name}
              className={cn("rounded-lg border border-border bg-card", p[3].all, stack.sm)}
            >
              <div className={cn(row.sm, "min-w-0 justify-between")}>
                <div className={cn(row.sm, "min-w-0")}>
                  <HugeiconsIcon
                    icon={Key01Icon}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                </div>
                <Badge variant={item.badge} size="sm">
                  {item.state}
                </Badge>
              </div>
              <div className={cn("grid md:grid-cols-2", gap.sm)}>
                <FieldPreview label="Model" value={item.name} />
                <FieldPreview
                  label="Base URL"
                  value={item.meta}
                  warning={item.badge === "warning"}
                />
              </div>
            </div>
          ))}
        </section>

        <aside className={cn("border-s border-border bg-muted/30", p[4].all, stack.md)}>
          <div className={stack.xs}>
            <Badge variant="outline" className="w-fit">
              Launch checklist
            </Badge>
            <p className="text-sm leading-5 text-muted-foreground">
              向导适合首次运行或“修复配置”入口，不建议作为长期默认页。
            </p>
          </div>
          <Separator />
          <ChecklistItem done label="至少一个模型可用" />
          <ChecklistItem label="所有模型含 Base URL" />
          <ChecklistItem done label="规则已加载" />
          <ChecklistItem done label="工具权限已知" />
          <Button size="sm" disabled>
            Continue
          </Button>
        </aside>
      </div>
    </div>
  )
}

function ChecklistItem({ done = false, label }: { done?: boolean; label: string }) {
  return (
    <div className={cn(row.sm, "text-sm leading-5")}>
      <span
        className={cn(
          "size-2 rounded-full",
          done ? "bg-success" : "bg-warning"
        )}
      />
      <span className={done ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
    </div>
  )
}

function PatternNotes({
  bestFor,
  tradeoff,
}: {
  bestFor: string
  tradeoff: string
}) {
  return (
    <div className={cn("grid lg:grid-cols-2", gap.md)}>
      <div className={cn("rounded-lg border border-border bg-background", p[3].all, stack.xs)}>
        <Badge variant="success" size="sm" className="w-fit">
          适用
        </Badge>
        <p className="text-sm leading-5 text-foreground">{bestFor}</p>
      </div>
      <div className={cn("rounded-lg border border-border bg-background", p[3].all, stack.xs)}>
        <Badge variant="outline" size="sm" className="w-fit">
          取舍
        </Badge>
        <p className="text-sm leading-5 text-muted-foreground">{tradeoff}</p>
      </div>
    </div>
  )
}

export function SettingsDesignOptionsPage() {
  return (
    <div className="flex h-svh flex-col bg-background">
      <PageHeader />

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <main
          className={cn(
            "mx-auto flex w-full max-w-6xl",
            stack.xl,
            p[6].x,
            p[6].top,
            p[12].bottom
          )}
        >
          <DecisionSummary />

          <Tabs defaultValue="matrix" className={stack.lg}>
            <TabsList className="w-full flex-wrap justify-start">
              <TabsTab value="matrix">总览矩阵</TabsTab>
              <TabsTab value="catalog">统一目录</TabsTab>
              <TabsTab value="setup">首次向导</TabsTab>
            </TabsList>

            <TabsPanel value="matrix" className={stack.lg}>
              <OptionIntro title="方案 A：总览矩阵 + 右侧详情检查器" badge="推荐默认">
                适合作为常驻配置页。五类配置先以状态矩阵呈现，Models 的异常直接暴露，
                点击任意项后在右侧检查器中编辑或跳转源文件。
              </OptionIntro>
              <MatrixInspectorMock />
              <PatternNotes
                bestFor="日常管理、模型可用性检查、快速理解当前项目加载了哪些能力。"
                tradeoff="比现有列表多一个详情栏，需要为窄屏降级为底部 Sheet 或独立详情页。"
              />
            </TabsPanel>

            <TabsPanel value="catalog" className={stack.lg}>
              <OptionIntro title="方案 B：统一资源目录 + 搜索筛选" badge="数量增长时">
                当 Skills、Rules、Subagents、Tools 逐渐增多时，用户更需要搜索、
                标签和来源路径。这个模式把配置对象作为同一类“资源”处理。
              </OptionIntro>
              <CatalogMock />
              <PatternNotes
                bestFor="大量插件、多来源规则、需要排查某个能力从哪里加载时。"
                tradeoff="Models 的编辑体验会弱一些，最好保留详情页或 Sheet 表单。"
              />
            </TabsPanel>

            <TabsPanel value="setup" className={stack.lg}>
              <OptionIntro title="方案 C：任务导向首次配置向导" badge="首次运行">
                如果用户刚 clone 项目或第一次接入模型，向导能把最重要的失败点前置。
                它不适合作为默认管理页，但适合“修复配置”入口。
              </OptionIntro>
              <SetupFlowMock />
              <PatternNotes
                bestFor="首次安装、模型连接失败后的修复流程、非技术用户快速完成最低可用配置。"
                tradeoff="会隐藏完整能力清单；熟练用户日常使用会觉得路径太长。"
              />
            </TabsPanel>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>落地顺序建议</CardTitle>
              <CardDescription>
                先做最小可用改版，再逐步加入搜索和向导，避免一次性重写设置系统。
              </CardDescription>
            </CardHeader>
            <CardPanel className={stack.sm}>
              <CompactTakeaway
                icon={Key01Icon}
                title="第一步"
                body="把 Models 的无效配置提升为显性 warning，并提供就地修复入口。"
              />
              <CompactTakeaway
                icon={Layers01Icon}
                title="第二步"
                body="把 Skills / Rules / Subagents / Tools 合成只读能力目录，统一标签和来源展示。"
              />
              <CompactTakeaway
                icon={HelpCircleIcon}
                title="第三步"
                body="为首次打开或配置失败场景增加向导入口，而不是替换默认配置页。"
              />
            </CardPanel>
          </Card>
        </main>
      </ScrollArea>
    </div>
  )
}

function CompactTakeaway({
  icon,
  title,
  body,
}: {
  icon: IconData
  title: string
  body: string
}) {
  return (
    <div className={cn(row.sm, "items-start rounded-lg border border-border", p[3].all)}>
      <HugeiconsIcon icon={icon} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className={stack.hairline}>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm leading-5 text-muted-foreground">{body}</span>
      </div>
    </div>
  )
}

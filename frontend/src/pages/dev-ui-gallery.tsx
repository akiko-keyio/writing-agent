import { HugeiconsIcon } from "@hugeicons/react";
import { FileAttachmentIcon, Folder01Icon } from "@hugeicons/core-free-icons";
import { useState, type ReactNode } from "react"
import { ExplorerRailStyleSamples } from "@/components/dev/explorer-rail-style-samples"
import { ExplorerPanelToggle } from "@/components/canvas-chrome"
import { ShellTooltipIconButton } from "@/components/chrome-toolbar-button"
import { ExplorerFileSectionHeader } from "@/components/explorer-file-section-header"
import { ExplorerTopBarRail } from "@/components/explorer-top-bar-rail"
import { ProjectSwitcherIconTrigger } from "@/components/project-switcher-icon-trigger"
import type { ExplorerView } from "@/components/canvas-chrome"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { REPO_PROJECT, type ProjectEntry } from "@/lib/workspace/project-catalog"
import { shell } from "@/lib/shell/chrome"
import { gap, p, row, stack } from "@/lib/shell/spacing"
import { cn } from "@/lib/shared/utils"

const MOCK_PROJECTS: ProjectEntry[] = [
  REPO_PROJECT,
  {
    id: "folder:demo",
    name: "demo-folder",
    path: "Local folder · this device",
  },
  {
    id: "folder:orphan",
    name: "not-linked",
    path: "Local folder · this device",
  },
]

const MOCK_LINKED = new Set(["repo", "folder:demo"])

function GallerySection({
  title,
  description,
  primitive,
  children,
}: {
  title: string
  description: string
  primitive: string
  children: ReactNode
}) {
  return (
    <section className={stack.md}>
      <div className={stack.xs}>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="font-mono text-xs text-muted-foreground">{primitive}</p>
      </div>
      {children}
    </section>
  )
}

export function DevUiGallery() {
  const [railTab, setRailTab] = useState<ExplorerView>("file")

  return (
    <div className="flex h-svh flex-col bg-background">
      <header
        className={cn(
          shell.panelHeader,
          "shrink-0 border-b border-border bg-sidebar"
        )}
      >
        <div className={cn("flex min-w-0 flex-1 flex-col", gap.hairline)}>
          <h1 className="text-sm font-medium">coss UI 样式参考</h1>
          <p className="text-xs text-muted-foreground">
            开发专用 · 对比 Explorer 相关 primitive 的默认外观
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href="/" />}>
          返回应用
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className={cn("mx-auto flex w-full max-w-3xl", stack.xl, p[6].x, p[6].top, p[12].bottom)}>
          <GallerySection
            title="图标库"
            description="Explorer 图标轨与壳层统一使用 Hugeicons；在官网搜索后从 @hugeicons/core-free-icons 按名导入"
            primitive="@hugeicons/core-free-icons · Files01 · ListTree"
          >
            <div
              className={cn(
                "rounded-lg border border-border bg-muted/40 text-sm",
                stack.sm,
                p[4].x,
                p[3].y
              )}
            >
              <p>
                官网浏览：{" "}
                <a
                  href="https://hugeicons.com/icons"
                  className="text-foreground underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://hugeicons.com/icons
                </a>
              </p>
              <p className="text-muted-foreground">
                当前 Files / Outline 分别对应{" "}
                <span className="font-mono text-xs">LibraryIcon</span>、
                <span className="font-mono text-xs">ListIndentIncreaseIcon</span>
                （npm 包名{" "}
                <span className="font-mono text-xs">@hugeicons/core-free-icons</span>）
              </p>
            </div>
          </GallerySection>

          <Separator />

          <GallerySection
            title="顶栏图标轨 · 样式对照"
            description="Files / Outline 切换钮：对比尺寸与 primitive 组合（生产环境暂用 A）"
            primitive="ToggleGroup / Button icon-sm / Tabs"
          >
            <ExplorerRailStyleSamples />
          </GallerySection>

          <Separator />

          <GallerySection
            title="顶栏图标轨 · 当前生产"
            description="Library 项目 Menu + Files/Outline outline 钮（与主应用一致）"
            primitive="Menu + Button outline/secondary icon-sm"
          >
            <div
              className={cn(
                "flex min-h-14 items-center rounded-lg border border-border bg-sidebar",
                p[4].x,
                p[3].y
              )}
            >
              <ExplorerTopBarRail
                explorerView={railTab}
                onExplorerViewChange={setRailTab}
                activeProject={REPO_PROJECT}
                recentProjects={MOCK_PROJECTS}
                linkedFolderIds={MOCK_LINKED}
                onSelectProject={() => {}}
                onOpenFolder={() => {}}
              />
            </div>
          </GallerySection>

          <Separator />

          <GallerySection
            title="项目切换（Library 图标）"
            description="顶栏左侧；图标来自 hugeicons.com/icons"
            primitive="Menu + Button outline icon-sm + Library"
          >
            <ProjectSwitcherIconTrigger
              activeProject={REPO_PROJECT}
              recentProjects={MOCK_PROJECTS}
              linkedFolderIds={MOCK_LINKED}
              onSelectProject={() => {}}
              onOpenFolder={() => {}}
            />
          </GallerySection>

          <Separator />

          <GallerySection
            title="Files 区项目名行"
            description="项目名 + hover 新建；文件夹行 hover 新建、文件行 hover …"
            primitive="静态文本"
          >
            <div
              className={cn(
                "max-w-xs rounded-lg border border-border bg-sidebar",
                p[2].all
              )}
            >
              <ExplorerFileSectionHeader
                projectName="Writing Agent"
                onCreateFile={() => {}}
                onCreateFolder={() => {}}
              />
            </div>
          </GallerySection>

          <Separator />

          <GallerySection
            title="Sidebar 文件树行"
            description="Files 视图文件树使用的单行导航"
            primitive="SidebarMenu + SidebarMenuItem + SidebarMenuButton"
          >
            <SidebarProvider className="max-w-xs">
              <div
                className={cn(
                  "rounded-lg border border-border bg-sidebar",
                  p[2].all
                )}
              >
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="sm">
                      <HugeiconsIcon icon={Folder01Icon} aria-hidden="true" />
                      <span className="truncate">examples</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="sm" isActive>
                      <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
                      <span className="truncate">test-text.md</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            </SidebarProvider>
          </GallerySection>

          <Separator />

          <GallerySection
            title="壳层图标钮"
            description="侧栏收纳等"
            primitive="Button + Tooltip"
          >
            <div className={row.sm}>
              <ExplorerPanelToggle open onOpenChange={() => {}} />
              <ShellTooltipIconButton
                label="Sample action"
                tooltip="Sample tooltip"
                side="bottom"
                onClick={() => {}}
              >
                <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
              </ShellTooltipIconButton>
            </div>
          </GallerySection>
        </div>
      </ScrollArea>
    </div>
  )
}

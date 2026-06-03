import { IconFolderPlus } from "@tabler/icons-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { isFolderProject, type ProjectEntry } from "@/lib/project-catalog"
import { workspaceLocationLabel } from "@/lib/workspace-label"
import { shell, shellSidebarRowClass, spacing } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

function projectSubtitle(entry: ProjectEntry, linked: boolean): string {
  if (isFolderProject(entry) && !linked) {
    return "Not linked — click to choose folder"
  }
  return workspaceLocationLabel(entry)
}

/** Explorer「Projects」标签：最近工作区列表 + Open Workspace */
export function ExplorerProjects({
  activeProject,
  projects,
  linkedFolderIds,
  onSelectProject,
  onOpenFolder,
}: {
  activeProject: ProjectEntry | null
  projects: ProjectEntry[]
  linkedFolderIds: ReadonlySet<string>
  onSelectProject: (entry: ProjectEntry) => void
  onOpenFolder: () => void
}) {
  return (
    <div className={cn("flex flex-col", spacing.sm)}>
      <SidebarMenu className={shell.listMenu}>
        {projects.map((entry) => {
          const active = entry.id === activeProject?.id
          const linked = !isFolderProject(entry) || linkedFolderIds.has(entry.id)
          return (
            <SidebarMenuItem key={entry.id}>
              <SidebarMenuButton
                size="sm"
                className={cn(
                  shell.workspaceRow,
                  shellSidebarRowClass({ active }),
                )}
                isActive={active}
                onClick={() => onSelectProject(entry)}
              >
                <span
                  className={cn(
                    "flex min-w-0 flex-1 flex-col text-left",
                    spacing.xs,
                  )}
                >
                  <span className={cn(shell.text, "truncate")}>{entry.name}</span>
                  <span className={cn(shell.textMuted, "truncate")}>
                    {projectSubtitle(entry, linked)}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
      <SidebarMenu className={cn("border-t border-border/50 pt-1", shell.listMenu)}>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="sm"
            className={shell.workspaceRow}
            onClick={onOpenFolder}
          >
            <IconFolderPlus aria-hidden="true" />
            <span className={cn(shell.text, "truncate")}>Open Workspace…</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}

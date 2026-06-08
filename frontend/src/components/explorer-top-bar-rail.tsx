import type { ExplorerView } from "@/components/canvas-chrome"
import { ExplorerSidebarIconRail } from "@/components/explorer-sidebar-icon-rail"
import { ProjectSwitcherIconTrigger } from "@/components/project-switcher-icon-trigger"
import type { ProjectEntry } from "@/lib/project-catalog"
import { shell } from "@/lib/shell-chrome"

export function ExplorerTopBarRail({
  explorerView,
  onExplorerViewChange,
  activeProject,
  recentProjects,
  linkedFolderIds,
  onSelectProject,
  onOpenFolder,
}: {
  explorerView: ExplorerView
  onExplorerViewChange: (view: ExplorerView) => void
  activeProject: ProjectEntry | null
  recentProjects: ProjectEntry[]
  linkedFolderIds: ReadonlySet<string>
  onSelectProject: (entry: ProjectEntry) => void
  onOpenFolder: () => void
}) {
  return (
    <div className={shell.topBarExplorerIconRail}>
      <ProjectSwitcherIconTrigger
        activeProject={activeProject}
        recentProjects={recentProjects}
        linkedFolderIds={linkedFolderIds}
        onSelectProject={onSelectProject}
        onOpenFolder={onOpenFolder}
      />
      <ExplorerSidebarIconRail
        value={explorerView}
        onValueChange={onExplorerViewChange}
        placement="inline"
      />
    </div>
  )
}

import { ProjectPanelList } from "@/components/explorer-projects"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ProjectEntry } from "@/lib/project-catalog"
import { shell } from "@/lib/shell-chrome"
import { p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

export function ExplorerProjectPanel({
  activeProject,
  recentProjects,
  linkedFolderIds,
  onSelectProject,
  onOpenFolder,
}: {
  activeProject: ProjectEntry | null
  recentProjects: ProjectEntry[]
  linkedFolderIds: ReadonlySet<string>
  onSelectProject: (entry: ProjectEntry) => void
  onOpenFolder: () => void
}) {
  return (
    <ScrollArea className="min-h-0 flex-1" scrollFade>
      <div className={cn(shell.panelBody, p[3].bottom)}>
        <ProjectPanelList
          activeProject={activeProject}
          recentProjects={recentProjects}
          linkedFolderIds={linkedFolderIds}
          onSelectProject={onSelectProject}
          onOpenFolder={onOpenFolder}
        />
      </div>
    </ScrollArea>
  )
}

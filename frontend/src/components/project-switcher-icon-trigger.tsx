import { HugeiconsIcon } from "@hugeicons/react"
import { ProjectSwitcherMenuContent } from "@/components/explorer-projects"
import { Button } from "@/components/ui/button"
import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu"
import { REPO_PROJECT, type ProjectEntry } from "@/lib/project-catalog"
import { PROJECT_WORKSPACE_ICON } from "@/lib/project-chrome"
import { shell } from "@/lib/shell-chrome"

/** 顶栏项目切换：Library 图标 + Menu 浮层 */
export function ProjectSwitcherIconTrigger({
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
  const projectLabel = (activeProject ?? REPO_PROJECT).name

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Project: ${projectLabel}`}
            title={projectLabel}
            className="text-sidebar-foreground [&_svg:not([class*='opacity-'])]:opacity-100"
          />
        }
      >
        <HugeiconsIcon icon={PROJECT_WORKSPACE_ICON} aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="start" side="bottom" className={shell.projectMenuPopup}>
        <ProjectSwitcherMenuContent
          activeProject={activeProject}
          projects={recentProjects}
          linkedFolderIds={linkedFolderIds}
          onSelectProject={onSelectProject}
          onOpenFolder={onOpenFolder}
        />
      </MenuPopup>
    </Menu>
  )
}

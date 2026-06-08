import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { ProjectSwitcherMenuContent } from "@/components/explorer-projects"
import { Button } from "@/components/ui/button"
import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu"
import { REPO_PROJECT, type ProjectEntry } from "@/lib/project-catalog"
import { PROJECT_WORKSPACE_ICON } from "@/lib/project-chrome"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

export function ProjectSwitcherTrigger({
  activeProject,
  recentProjects,
  linkedFolderIds,
  onSelectProject,
  onOpenFolder,
  showDividerAfter = false,
  className,
}: {
  activeProject: ProjectEntry | null
  recentProjects: ProjectEntry[]
  linkedFolderIds: ReadonlySet<string>
  onSelectProject: (entry: ProjectEntry) => void
  onOpenFolder: () => void
  /** 编辑列内：项目名右侧竖线（与文档标签分隔） */
  showDividerAfter?: boolean
  className?: string
}) {
  const projectLabel = (activeProject ?? REPO_PROJECT).name

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="default"
            aria-label={`Project: ${projectLabel}`}
            className={cn(
              shell.topBarProjectButton,
              showDividerAfter && shell.topBarProjectButtonDivider,
              className
            )}
          />
        }
      >
        <HugeiconsIcon icon={PROJECT_WORKSPACE_ICON} aria-hidden="true" />
        <span className="min-w-0 truncate">{projectLabel}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3.5 opacity-70" />
      </MenuTrigger>
      <MenuPopup align="start" className={shell.projectMenuPopup}>
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

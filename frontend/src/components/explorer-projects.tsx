import { HugeiconsIcon } from "@hugeicons/react"

import {
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/menu"
import { Separator } from "@/components/ui/separator"
import { isFolderProject, REPO_PROJECT, type ProjectEntry } from "@/lib/project-catalog"
import {
  PROJECT_OPEN_NEW_ICON,
  projectEntryIcon,
  projectMenuIconClass,
} from "@/lib/project-chrome"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"
import { workspaceLocationLabel } from "@/lib/workspace-label"

export function ProjectEntryIcon({
  entry,
  className,
}: {
  entry: ProjectEntry
  className?: string
}) {
  return (
    <HugeiconsIcon
      icon={projectEntryIcon(entry)}
      aria-hidden="true"
      className={cn(projectMenuIconClass, className)}
    />
  )
}

function projectSubtitle(entry: ProjectEntry, linked: boolean): string {
  if (isFolderProject(entry) && !linked) {
    return "Not linked"
  }
  return workspaceLocationLabel(entry)
}

function OpenFolderRowContent() {
  return (
    <>
      <HugeiconsIcon
        icon={PROJECT_OPEN_NEW_ICON}
        aria-hidden="true"
        className={projectMenuIconClass}
      />
      <span>Open…</span>
    </>
  )
}

function ProjectEntryLines({
  entry,
  linked,
}: {
  entry: ProjectEntry
  linked: boolean
}) {
  return (
    <span className={shell.projectMenuEntry}>
      <span className={shell.projectMenuTitleRow}>
        <ProjectEntryIcon entry={entry} />
        <span className={shell.projectMenuLine}>{entry.name}</span>
      </span>
      <span className={shell.projectMenuSubtitle}>
        {projectSubtitle(entry, linked)}
      </span>
    </span>
  )
}

/** 侧栏静态行：视觉对齐 MenuItem，独立 button 避免内联 Menu 抢焦点 */
function ProjectPanelRow({
  active: _active = false,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(shell.projectMenuRow, shell.projectMenuItem, className)}
    >
      {children}
    </button>
  )
}

function ProjectMenuItem({
  entry,
  active: _active = false,
  linked,
  onSelect,
}: {
  entry: ProjectEntry
  active?: boolean
  linked: boolean
  onSelect: (entry: ProjectEntry) => void
}) {
  return (
    <MenuItem
      className={shell.projectMenuItem}
      onClick={() => onSelect(entry)}
    >
      <ProjectEntryLines entry={entry} linked={linked} />
    </MenuItem>
  )
}

/**
 * Project 侧栏列表（静态，非 Menu 浮层）。
 */
export function ProjectPanelList({
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
  const current = activeProject ?? REPO_PROJECT
  const others = recentProjects.filter((entry) => entry.id !== current.id)

  return (
    <div className={shell.projectPanelList}>
      <ProjectPanelRow onClick={onOpenFolder} className={shell.menuItem}>
        <OpenFolderRowContent />
      </ProjectPanelRow>

      <Separator className="my-1" />

      <p className={shell.projectPanelSectionLabel}>Current project</p>
      <ProjectPanelRow
        active
        onClick={() => onSelectProject(current)}
      >
        <ProjectEntryLines
          entry={current}
          linked={
            !isFolderProject(current) || linkedFolderIds.has(current.id)
          }
        />
      </ProjectPanelRow>

      {others.length > 0 ? (
        <>
          <Separator className="my-1" />
          <p className={shell.projectPanelSectionLabel}>Recent projects</p>
          <div className={cn(shell.listMenu, "w-full")}>
            {others.map((entry) => (
              <ProjectPanelRow
                key={entry.id}
                onClick={() => onSelectProject(entry)}
              >
                <ProjectEntryLines
                  entry={entry}
                  linked={
                    !isFolderProject(entry) || linkedFolderIds.has(entry.id)
                  }
                />
              </ProjectPanelRow>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * 顶栏项目下拉菜单（Menu 浮层内使用 MenuItem）。
 */
export function ProjectSwitcherMenuContent({
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
  const current = activeProject ?? REPO_PROJECT
  const recent = projects.filter((p) => p.id !== current.id)

  return (
    <>
      <MenuGroup>
        <MenuItem className={shell.menuItem} onClick={onOpenFolder}>
          <OpenFolderRowContent />
        </MenuItem>
      </MenuGroup>
      <MenuSeparator />
      <MenuGroup>
        <MenuGroupLabel>Current project</MenuGroupLabel>
        <ProjectMenuItem
          entry={current}
          active
          linked={!isFolderProject(current) || linkedFolderIds.has(current.id)}
          onSelect={onSelectProject}
        />
      </MenuGroup>
      {recent.length > 0 ? (
        <>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Recent projects</MenuGroupLabel>
            {recent.map((entry) => (
              <ProjectMenuItem
                key={entry.id}
                entry={entry}
                linked={
                  !isFolderProject(entry) || linkedFolderIds.has(entry.id)
                }
                onSelect={onSelectProject}
              />
            ))}
          </MenuGroup>
        </>
      ) : null}
    </>
  )
}

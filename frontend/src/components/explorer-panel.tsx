import { Settings02Icon } from "@hugeicons/core-free-icons"

import { ExplorerOutline } from "@/components/explorer-outline"
import { ExplorerFileSectionHeader } from "@/components/explorer-file-section-header"
import { PierreExplorerFileTree } from "@/components/pierre-explorer-file-tree"
import { SettingsNav, type SettingsSection } from "@/components/settings-editor"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarProvider,
} from "@/components/ui/sidebar"
import type { ExplorerView } from "@/components/canvas-chrome"
import type { DocumentTocEntry } from "@/lib/document-toc"
import { HugeiconsIcon } from "@/lib/icons"
import { REPO_PROJECT, type ProjectEntry } from "@/lib/project-catalog"
import type { WorkspaceFileNode } from "@/lib/workspace-api"
import { shell } from "@/lib/shell-chrome"
import { p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

interface ExplorerPanelProps {
  explorerView: ExplorerView | null
  fileTree: WorkspaceFileNode[]
  activePath: string | null
  treeLoading: boolean
  treeError: string | null
  tocEntries: DocumentTocEntry[]
  activeProject: ProjectEntry | null
  onOpenFile: (path: string) => void
  onOpenSettings: () => void
  onCreateFile: (parentDir: string) => void
  onCreateFolder: (parentDir: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
  onMoveFiles: (
    moves: ReadonlyArray<{ from: string; to: string }>
  ) => void
  onOutlineNavigate: (id: string) => void
  settingsActive?: boolean
  settingsSection?: SettingsSection
  onSettingsSectionChange?: (section: SettingsSection) => void
}

export function ExplorerPanel({
  explorerView,
  fileTree,
  activePath,
  treeLoading,
  treeError,
  tocEntries,
  activeProject,
  onOpenFile,
  onOpenSettings,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onCopyFileFolderPath,
  onOpenFileFolder,
  onMoveFiles,
  onOutlineNavigate,
  settingsActive = false,
  settingsSection = "models",
  onSettingsSectionChange,
}: ExplorerPanelProps) {
  const explorerOpen = explorerView != null || settingsActive
  const showFile = explorerView === "file"
  const showOutline = explorerView === "outline"
  const projectName = (activeProject ?? REPO_PROJECT).name

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-col overflow-hidden",
        !explorerOpen && "pointer-events-none"
      )}
      aria-hidden={!explorerOpen}
    >
      {explorerOpen ? (
        <aside
          aria-label={settingsActive ? "Settings" : "Explorer"}
          aria-expanded
          className={cn(
            shell.explorerSurface,
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          )}
        >
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              !settingsActive && "hidden",
            )}
            aria-hidden={!settingsActive}
          >
            <SettingsNav
              activeSection={settingsSection}
              onSectionChange={onSettingsSectionChange ?? (() => {})}
            />
          </div>
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              settingsActive && "hidden",
            )}
            aria-hidden={settingsActive}
          >
            <SidebarProvider
              open
              onOpenChange={() => {}}
              className={cn(
                "flex h-full !min-h-0 min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
                p[2].x,
                p[0].top,
                p[2].bottom,
              )}
            >
              <SidebarGroup
                className={cn("flex min-h-0 min-w-0 flex-1 flex-col", p[0].all)}
              >
                <SidebarGroupContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  {showFile ? (
                    <>
                      <ExplorerFileSectionHeader
                        projectName={projectName}
                        onCreateFile={onCreateFile}
                        onCreateFolder={onCreateFolder}
                      />
                      <PierreExplorerFileTree
                        tree={fileTree}
                        activePath={activePath}
                        onOpenFile={onOpenFile}
                        onRenameFile={onRenameFile}
                        onCopyFileFolderPath={onCopyFileFolderPath}
                        onOpenFileFolder={onOpenFileFolder}
                        onCreateFile={onCreateFile}
                        onCreateFolder={onCreateFolder}
                        onMoveFiles={onMoveFiles}
                        loading={treeLoading}
                        error={treeError}
                      />
                    </>
                  ) : null}
                  {showOutline ? (
                    <ScrollArea className="min-h-0 flex-1" scrollFade>
                      <ExplorerOutline
                        entries={tocEntries}
                        onNavigate={onOutlineNavigate}
                      />
                    </ScrollArea>
                  ) : null}
                </SidebarGroupContent>
              </SidebarGroup>
              <div className={cn("shrink-0", p[2].top)}>
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  className={cn(shell.textButton, "w-full justify-start")}
                  onClick={onOpenSettings}
                >
                  <HugeiconsIcon icon={Settings02Icon} aria-hidden="true" />
                  Settings
                </Button>
              </div>
            </SidebarProvider>
          </div>
        </aside>
      ) : null}
    </div>
  )
}

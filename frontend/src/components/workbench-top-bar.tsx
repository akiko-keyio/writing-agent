import {
  ChatPanelToggle,
  ExplorerPanelToggle,
  type ExplorerView,
} from "@/components/canvas-chrome"
import { ExplorerTopBarRail } from "@/components/explorer-top-bar-rail"
import { SettingsBackButton } from "@/components/settings-editor"
import type { ProjectEntry } from "@/lib/workspace/project-catalog"

import { ChatSwitcherTrigger } from "@/components/chat-switcher-trigger"

import { ChatToolbarActions } from "@/components/chat-toolbar-actions"

import { ShellTabChip } from "@/components/shell-tab-chip"

import type { ChatSessionListItem } from "@/lib/chat/session-groups"

import type { DocumentTab } from "@/lib/document/tabs"
import { SETTINGS_PATH } from "@/lib/document/tabs"

import { pathBasename } from "@/lib/shared/path"

import { shell } from "@/lib/shell/chrome"

import type { WorkbenchFullscreenPane } from "@/lib/shell/workbench-grid"
import { topBarGridTemplateColumns } from "@/lib/shell/workbench-grid"

import { cn } from "@/lib/shared/utils"

export type WorkbenchTopBarProps = {
  explorerPanelWidth: number
  explorerView: ExplorerView | null
  onExplorerPanelOpenChange: (open: boolean) => void
  onExplorerTabChange: (view: ExplorerView) => void
  chatPanelOpen: boolean
  chatPanelWidth: number
  onChatPanelOpenChange: (open: boolean) => void
  chatPendingCount?: number
  documentTabs: DocumentTab[]
  activeDocumentPath: string | null
  onSelectDocument: (path: string) => void
  onCloseDocument: (path: string) => void
  chatSessions: ChatSessionListItem[]
  activeChatId: string
  onSelectChat: (id: string) => void
  onNewChat: () => void
  chatHistorySessions: ChatSessionListItem[]
  onSelectChatHistorySession: (id: string) => void
  agentModelLabel?: string
  activeProject: ProjectEntry | null
  recentProjects: ProjectEntry[]
  linkedFolderIds: ReadonlySet<string>
  onSelectProject: (entry: ProjectEntry) => void
  onOpenFolder: () => void
  /** Settings document tab is active — show Back in explorer column */
  settingsActive?: boolean
  onSettingsBack?: () => void
  /** 极窄且侧栏 auto-hidden 时，全屏展示该栏 */
  fullscreenPane?: WorkbenchFullscreenPane | null
}

export function WorkbenchTopBar({
  explorerPanelWidth,
  explorerView,
  onExplorerPanelOpenChange,
  onExplorerTabChange,
  chatPanelOpen,
  chatPanelWidth,
  onChatPanelOpenChange,
  chatPendingCount = 0,
  documentTabs,
  activeDocumentPath,
  onSelectDocument,
  onCloseDocument,
  chatSessions,
  activeChatId,
  onSelectChat,
  onNewChat,
  chatHistorySessions,
  onSelectChatHistorySession,
  agentModelLabel,
  activeProject,
  recentProjects,
  linkedFolderIds,
  onSelectProject,
  onOpenFolder,
  settingsActive = false,
  onSettingsBack,
  fullscreenPane = null,
}: WorkbenchTopBarProps) {
  const explorerOpen = explorerView != null
  const showExplorerCol = explorerPanelWidth > 0
  const showChatCol = chatPanelWidth > 0
  const explorerShown = showExplorerCol || fullscreenPane === "explorer"
  const chatShown = showChatCol || fullscreenPane === "chat"

  if (fullscreenPane === "explorer" && explorerView != null) {
    return (
      <header
        className={cn(shell.workbenchTopBar, "grid-cols-1")}
        style={{ gridTemplateColumns: "1fr" }}
      >
        <div className={shell.topBarColExplorer}>
          {settingsActive ? (
            <SettingsBackButton
              onClick={onSettingsBack ?? (() => {})}
              className={cn(shell.topBarProjectButton, "max-w-none min-w-0 flex-1")}
            />
          ) : (
            <ExplorerTopBarRail
              explorerView={explorerView}
              onExplorerViewChange={onExplorerTabChange}
              activeProject={activeProject}
              recentProjects={recentProjects}
              linkedFolderIds={linkedFolderIds}
              onSelectProject={onSelectProject}
              onOpenFolder={onOpenFolder}
            />
          )}
          {!settingsActive ? (
            <div className={shell.topBarExplorerEndRail}>
              <ExplorerPanelToggle
                open={explorerOpen}
                shown={explorerShown}
                onOpenChange={onExplorerPanelOpenChange}
              />
            </div>
          ) : null}
        </div>
      </header>
    )
  }

  if (fullscreenPane === "chat" && chatPanelOpen) {
    return (
      <header
        className={cn(shell.workbenchTopBar, "grid-cols-1")}
        style={{ gridTemplateColumns: "1fr" }}
      >
        <div className={shell.topBarColChat}>
          <ChatSwitcherTrigger
            sessions={chatSessions}
            activeId={activeChatId}
            historySessions={chatHistorySessions}
            onNewChat={onNewChat}
            onSelectSession={onSelectChat}
            onSelectHistorySession={onSelectChatHistorySession}
          />
          <div className={shell.topBarChatEndActions}>
            <ChatToolbarActions agentModelLabel={agentModelLabel} />
            <ChatPanelToggle
              open={chatPanelOpen}
              shown={chatShown}
              onOpenChange={onChatPanelOpenChange}
              pendingCount={chatPendingCount}
            />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      className={shell.workbenchTopBar}
      style={{
        gridTemplateColumns: topBarGridTemplateColumns(
          explorerPanelWidth,
          chatPanelWidth
        ),
      }}
    >
      <div className={shell.topBarColExplorer} aria-hidden={!showExplorerCol}>
        {showExplorerCol && (settingsActive || explorerView != null) ? (
          <>
            {settingsActive ? (
              <SettingsBackButton
                onClick={onSettingsBack ?? (() => {})}
                className={cn(shell.topBarProjectButton, "max-w-none min-w-0 flex-1")}
              />
            ) : (
              <ExplorerTopBarRail
                explorerView={explorerView ?? "file"}
                onExplorerViewChange={onExplorerTabChange}
                activeProject={activeProject}
                recentProjects={recentProjects}
                linkedFolderIds={linkedFolderIds}
                onSelectProject={onSelectProject}
                onOpenFolder={onOpenFolder}
              />
            )}
            {!settingsActive ? (
              <div className={shell.topBarExplorerEndRail}>
                <ExplorerPanelToggle
                  open={explorerOpen}
                  shown={explorerShown}
                  onOpenChange={onExplorerPanelOpenChange}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={shell.topBarColEditor}>
        {!showExplorerCol && !settingsActive ? (
          <ExplorerPanelToggle
            open={explorerOpen}
            shown={explorerShown}
            onOpenChange={onExplorerPanelOpenChange}
          />
        ) : null}

        <DocumentTabStrip
          tabs={documentTabs}
          activePath={activeDocumentPath}
          onSelect={onSelectDocument}
          onClose={onCloseDocument}
        />

        {!showChatCol ? (
          <div className={shell.topBarEditorEndRail}>
            <ChatPanelToggle
              open={chatPanelOpen}
              shown={chatShown}
              onOpenChange={onChatPanelOpenChange}
              pendingCount={chatPendingCount}
            />
          </div>
        ) : null}
      </div>

      {showChatCol ? (
        <div className={shell.topBarColChat}>
          <ChatSwitcherTrigger
            sessions={chatSessions}
            activeId={activeChatId}
            historySessions={chatHistorySessions}
            onNewChat={onNewChat}
            onSelectSession={onSelectChat}
            onSelectHistorySession={onSelectChatHistorySession}
          />
          <div className={shell.topBarChatEndActions}>
            <ChatToolbarActions agentModelLabel={agentModelLabel} />
            <ChatPanelToggle
              open={chatPanelOpen}
              shown={chatShown}
              onOpenChange={onChatPanelOpenChange}
              pendingCount={chatPendingCount}
            />
          </div>
        </div>
      ) : null}
    </header>
  )
}

function DocumentTabStrip({
  tabs,
  activePath,
  onSelect,
  onClose,
}: {
  tabs: DocumentTab[]
  activePath: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
}) {
  return (
    <div
      className={shell.tabStripScroll}
      role="tablist"
      aria-label="Open documents"
    >
      {tabs.map((tab) => {
        const active = tab.path === activePath
        const label = tab.path === SETTINGS_PATH ? "Settings" : pathBasename(tab.path)
        return (
          <ShellTabChip
            key={tab.path}
            label={label}
            filePath={tab.path}
            dirty={tab.dirty}
            active={active}
            closeLabel={`Close ${label}`}
            onSelect={() => onSelect(tab.path)}
            onClose={() => onClose(tab.path)}
          />
        )
      })}
    </div>
  )
}

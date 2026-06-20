import { forwardRef, useLayoutEffect, useRef } from "react"

import {
  DocumentEditor,
  type DocumentEditorHandle,
  type EditHighlight,
  type EditorSelection,
} from "@/components/document-editor"
import { SettingsContent, type SettingsSection } from "@/components/settings-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  MemoryData,
  ModelEntryData,
  PluginsData,
  SettingsConfigData,
  ToolEntryData,
} from "@/lib/agent/protocol"
import { SETTINGS_PATH } from "@/lib/document/tabs"
import type { DocumentTocEntry } from "@/lib/document/toc"
import { p } from "@/lib/shell/spacing"
import { cn } from "@/lib/shared/utils"

interface DocumentPanelProps {
  activePath: string | null
  documentContent: string
  documentLoading: boolean
  settingsSection?: SettingsSection
  settingsConfig?: SettingsConfigData | null
  settingsTools?: ToolEntryData[] | null
  settingsPlugins?: PluginsData | null
  onMarkdownChange: (markdown: string) => void
  onSelectionChange: (selection: EditorSelection | null) => void
  onTocUpdate: (entries: DocumentTocEntry[]) => void
  onOpenFile?: (path: string) => void
  onAddModel?: (model: Omit<ModelEntryData, "api_key_masked"> & { api_key?: string }) => void
  onUpdateModel?: (modelId: string, updates: Partial<ModelEntryData> & { api_key?: string }) => void
  onRemoveModel?: (modelId: string) => void
  onSetToolEnabled?: (toolId: string, enabled: boolean) => void
  onSetSubagentEnabled?: (name: string, enabled: boolean) => void
  settingsMemory?: MemoryData | null
  settingsMemoryEnabled?: boolean
  onSetMemoryEnabled?: (enabled: boolean) => void
  onDeleteMemory?: (id: string) => void
  onAcceptCandidatePrinciple?: (id: string) => void
  onRejectCandidatePrinciple?: (id: string) => void
  onClearMemory?: () => void
  editHighlights?: EditHighlight[]
  onAddSelectionToChat?: (selection: EditorSelection) => void
}

export const DocumentPanel = forwardRef<DocumentEditorHandle, DocumentPanelProps>(
  function DocumentPanel(
    {
      activePath,
      documentContent,
      documentLoading,
      settingsSection = "models",
      settingsConfig,
      settingsTools,
      settingsPlugins,
      onMarkdownChange,
      onSelectionChange,
      onTocUpdate,
      onOpenFile,
      onAddModel,
      onUpdateModel,
      onRemoveModel,
      onSetToolEnabled,
      onSetSubagentEnabled,
      settingsMemory,
      settingsMemoryEnabled,
      onSetMemoryEnabled,
      onDeleteMemory,
      onAcceptCandidatePrinciple,
      onRejectCandidatePrinciple,
      onClearMemory,
      editHighlights,
      onAddSelectionToChat,
    },
    ref
  ) {
    const scrollAreaHostRef = useRef<HTMLDivElement>(null)
    const documentScrollRef = useRef<HTMLDivElement>(null)
    const isSettingsTab = activePath === SETTINGS_PATH

    useLayoutEffect(() => {
      const viewport = scrollAreaHostRef.current?.querySelector(
        '[data-slot="scroll-area-viewport"]',
      )
      if (viewport instanceof HTMLDivElement) {
        documentScrollRef.current = viewport
      }
    }, [activePath, documentLoading])

    if (isSettingsTab) {
      return (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <main className="chrome-editor-surface relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <SettingsContent
              section={settingsSection}
              config={settingsConfig ?? null}
              tools={settingsTools ?? null}
              plugins={settingsPlugins ?? null}
              onOpenFile={onOpenFile}
              onAddModel={onAddModel}
              onUpdateModel={onUpdateModel}
              onRemoveModel={onRemoveModel}
              onSetToolEnabled={onSetToolEnabled}
              onSetSubagentEnabled={onSetSubagentEnabled}
              memory={settingsMemory}
              memoryEnabled={settingsMemoryEnabled}
              onSetMemoryEnabled={onSetMemoryEnabled}
              onDeleteMemory={onDeleteMemory}
              onAcceptCandidatePrinciple={onAcceptCandidatePrinciple}
              onRejectCandidatePrinciple={onRejectCandidatePrinciple}
              onClearMemory={onClearMemory}
            />
          </main>
        </div>
      )
    }

    return (
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <main className="chrome-editor-surface relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            ref={scrollAreaHostRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
          <ScrollArea
            className="min-h-0 min-w-0 flex-1"
            scrollFade
          >
            {documentLoading ? (
              <p className={cn(p[12].x, p[8].top, "text-muted-foreground")}>
                Loading document…
              </p>
            ) : activePath ? (
              <DocumentEditor
                key={activePath}
                ref={ref}
                filePath={activePath}
                content={documentContent}
                scrollParentRef={documentScrollRef}
                onTocUpdate={onTocUpdate}
                onMarkdownChange={onMarkdownChange}
                onSelectionChange={onSelectionChange}
                editHighlights={editHighlights}
                onAddSelectionToChat={onAddSelectionToChat}
              />
            ) : (
              <p className={cn(p[12].x, p[8].top, "text-muted-foreground")}>
                Select a file from the explorer.
              </p>
            )}
          </ScrollArea>
          </div>
        </main>
      </div>
    )
  }
)

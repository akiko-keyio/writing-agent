import { forwardRef, useRef } from "react"

import {
  DocumentEditor,
  type DocumentEditorHandle,
  type EditorSelection,
} from "@/components/document-editor"
import { SettingsContent, type SettingsSection } from "@/components/settings-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  ModelEntryData,
  PluginsData,
  SettingsConfigData,
  ToolEntryData,
} from "@/lib/agent-protocol"
import { SETTINGS_PATH } from "@/lib/document-tabs"
import type { DocumentTocEntry } from "@/lib/document-toc"
import { p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

interface DocumentPanelProps {
  activePath: string | null
  documentContent: string
  documentLoading: boolean
  settingsSection?: SettingsSection
  settingsStartAddModel?: boolean
  onSettingsStartAddModelHandled?: () => void
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
}

export const DocumentPanel = forwardRef<DocumentEditorHandle, DocumentPanelProps>(
  function DocumentPanel(
    {
      activePath,
      documentContent,
      documentLoading,
      settingsSection = "models",
      settingsStartAddModel = false,
      onSettingsStartAddModelHandled,
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
    },
    ref
  ) {
    const documentScrollRef = useRef<HTMLDivElement>(null)
    const isSettingsTab = activePath === SETTINGS_PATH

    if (isSettingsTab) {
      return (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <main className="chrome-editor-surface relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <SettingsContent
              section={settingsSection}
              config={settingsConfig ?? null}
              tools={settingsTools ?? null}
              plugins={settingsPlugins ?? null}
              startAddModel={settingsStartAddModel}
              onStartAddModelHandled={onSettingsStartAddModelHandled}
              onOpenFile={onOpenFile}
              onAddModel={onAddModel}
              onUpdateModel={onUpdateModel}
              onRemoveModel={onRemoveModel}
              onSetToolEnabled={onSetToolEnabled}
            />
          </main>
        </div>
      )
    }

    return (
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <main className="chrome-editor-surface relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ScrollArea
            className="min-h-0 min-w-0 flex-1"
            scrollFade
            viewportRef={documentScrollRef}
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
              />
            ) : (
              <p className={cn(p[12].x, p[8].top, "text-muted-foreground")}>
                Select a file from the explorer.
              </p>
            )}
          </ScrollArea>
        </main>
      </div>
    )
  }
)

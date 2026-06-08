import type { WorkspaceFileNode } from "@/lib/workspace-api"

export interface ExplorerFileTreeProps {
  tree: WorkspaceFileNode[]
  activePath: string | null
  onOpenFile: (path: string) => void
  onPrefetchFile?: (path: string) => void
  onRenameFile: (path: string) => void
  onCopyFileFolderPath: (path: string) => void
  onOpenFileFolder: (path: string) => void
  loading?: boolean
  error?: string | null
}

import { flattenFolderPaths } from "@/lib/flatten-paths"
import { pathJoin } from "@/lib/path"
import type { WorkspaceFileNode } from "@/lib/workspace-api"

export function suggestNewFolderPath(
  fileTree: WorkspaceFileNode[],
  parentDir: string
): string {
  const existing = new Set(flattenFolderPaths(fileTree))
  let name = "untitled-folder"
  let n = 2
  while (existing.has(parentDir ? pathJoin(parentDir, name) : name)) {
    name = `untitled-folder-${n}`
    n += 1
  }
  return parentDir ? pathJoin(parentDir, name) : name
}

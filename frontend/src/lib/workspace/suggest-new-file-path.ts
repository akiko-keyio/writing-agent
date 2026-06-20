import { flattenMarkdownPaths } from "@/lib/shared/flatten-paths"
import { pathJoin } from "@/lib/shared/path"
import type { WorkspaceFileNode } from "@/lib/workspace/api"

export function suggestNewFilePath(
  fileTree: WorkspaceFileNode[],
  parentDir: string
): string {
  const existing = new Set(flattenMarkdownPaths(fileTree))
  let name = "untitled.md"
  let n = 2
  while (existing.has(parentDir ? pathJoin(parentDir, name) : name)) {
    name = `untitled-${n}.md`
    n += 1
  }
  return parentDir ? pathJoin(parentDir, name) : name
}

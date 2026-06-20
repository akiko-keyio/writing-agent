import { pathDirname, pathJoin } from "@/lib/path"
import type { WorkspaceFileNode } from "@/lib/workspace-api"

/** Parent folder of ``path`` relative to a linked local-folder workspace root. */
export function containingRelativeDir(
  relativePath: string,
  rootName?: string,
): string {
  const normalized = normalizeRelativeToRoot(relativePath, rootName)
  if (normalized.endsWith(".md")) {
    const dir = pathDirname(normalized)
    return dir === "." ? "" : dir
  }
  return normalized
}

/** Strip a linked-folder name mistakenly prefixed onto workspace-relative paths. */
export function normalizeRelativeToRoot(
  relativePath: string,
  rootName?: string,
): string {
  const norm = relativePath.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!rootName) return norm
  const prefix = `${rootName}/`
  if (norm === rootName) return ""
  if (norm.startsWith(prefix)) return norm.slice(prefix.length)
  return norm
}

export function joinAbsoluteFolder(
  absoluteRoot: string,
  relativeFolder: string,
): string {
  const root = absoluteRoot.replace(/[\\/]+$/, "")
  const normalized = relativeFolder.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized || normalized === ".") return root
  const sep = root.includes("\\") ? "\\" : "/"
  return `${root}${sep}${normalized.replace(/\//g, sep)}`
}

export function displayFolderPath(
  rootName: string,
  relativeFolder: string,
): string {
  if (!relativeFolder || relativeFolder === ".") return rootName
  return pathJoin(rootName, relativeFolder)
}

export function collectMarkdownPaths(
  nodes: WorkspaceFileNode[],
  limit = 64,
): string[] {
  const out: string[] = []
  const walk = (list: WorkspaceFileNode[]) => {
    for (const node of list) {
      if (out.length >= limit) return
      if (node.type === "file" && node.path.endsWith(".md")) {
        out.push(node.path)
      }
      if (node.children?.length) walk(node.children)
    }
  }
  walk(nodes)
  return out
}

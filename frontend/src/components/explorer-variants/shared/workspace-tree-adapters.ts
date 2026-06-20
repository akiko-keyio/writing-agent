import { flattenWorkspaceTreeRoots } from "@/lib/workspace/client"
import type { WorkspaceFileNode } from "@/lib/workspace/api"

export function collectWorkspacePaths(tree: WorkspaceFileNode[]): string[] {
  const paths: string[] = []

  const walk = (node: WorkspaceFileNode) => {
    if (node.type === "file" && node.path) {
      paths.push(node.path.replace(/\\/g, "/"))
    }
    node.children?.forEach(walk)
  }

  flattenWorkspaceTreeRoots(tree).forEach(walk)
  return paths.sort()
}

/** 打开某文件时需要展开的祖先文件夹（不含 tree 查询，仅解析路径） */
export function collectAncestorDirectoryPaths(activePath: string | null): string[] {
  if (!activePath) return []

  const normalized = activePath.replace(/\\/g, "/")
  const segments = normalized.split("/").filter(Boolean)
  const expanded: string[] = []

  for (let index = 0; index < segments.length - 1; index += 1) {
    expanded.push(segments.slice(0, index + 1).join("/"))
  }

  return expanded
}

/** 从文件路径列表推导所有中间文件夹路径 */
export function collectDirectoryPathsFromFilePaths(
  filePaths: readonly string[]
): string[] {
  const directories = new Set<string>()

  for (const filePath of filePaths) {
    const normalized = filePath.replace(/\\/g, "/")
    const segments = normalized.split("/").filter(Boolean)
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"))
    }
  }

  return [...directories]
}

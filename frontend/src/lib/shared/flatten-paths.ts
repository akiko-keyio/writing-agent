import type { WorkspaceFileNode } from "@/lib/workspace/api"

export function flattenMarkdownPaths(nodes: WorkspaceFileNode[]): string[] {
  const out: string[] = []
  function walk(list: WorkspaceFileNode[]) {
    for (const node of list) {
      if (node.type === "file" && node.path.endsWith(".md")) {
        out.push(node.path)
      }
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return out
}

export function flattenFolderPaths(nodes: WorkspaceFileNode[]): string[] {
  const out: string[] = []
  function walk(list: WorkspaceFileNode[]) {
    for (const node of list) {
      if (node.type === "folder") {
        if (node.path) out.push(node.path)
        if (node.children) walk(node.children)
      }
    }
  }
  walk(nodes)
  return out
}

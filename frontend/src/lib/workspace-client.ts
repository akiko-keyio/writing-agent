import {
  buildTreeFromDirectoryHandle,
  readFileFromDirectoryHandle,
  writeFileToDirectoryHandle,
} from "@/lib/local-workspace"
import type { WorkspaceFileNode } from "@/lib/workspace-api"
import {
  fetchWorkspaceTree,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/workspace-api"

export type { WorkspaceFileNode }

export interface WorkspaceClient {
  readonly id: "project" | "folder"
  readonly label: string
  listTree(): Promise<WorkspaceFileNode[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
}

export function createProjectWorkspaceClient(): WorkspaceClient {
  return {
    id: "project",
    label: "Project",
    listTree: fetchWorkspaceTree,
    readFile: readWorkspaceFile,
    writeFile: writeWorkspaceFile,
  }
}

export function createFolderWorkspaceClient(
  handle: FileSystemDirectoryHandle,
): WorkspaceClient {
  return {
    id: "folder",
    label: handle.name,
    listTree: () => buildTreeFromDirectoryHandle(handle),
    readFile: (path) => readFileFromDirectoryHandle(handle, path),
    writeFile: (path, content) =>
      writeFileToDirectoryHandle(handle, path, content),
  }
}

/** 去掉 API / 本地句柄包装的单一根文件夹，避免与顶栏工作区名称重复一层 */
export function flattenWorkspaceTreeRoots(
  tree: WorkspaceFileNode[],
): WorkspaceFileNode[] {
  if (
    tree.length === 1 &&
    tree[0].type === "folder" &&
    tree[0].path === ""
  ) {
    return tree[0].children ?? []
  }
  return tree
}

export function findFirstMarkdownPath(
  nodes: WorkspaceFileNode[],
): string | null {
  for (const node of nodes) {
    if (node.type === "file" && node.path.endsWith(".md")) {
      return node.path
    }
    if (node.children) {
      const nested = findFirstMarkdownPath(node.children)
      if (nested) return nested
    }
  }
  return null
}

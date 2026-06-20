import {
  copyLocalFolderContainingPath,
  openLocalFolderContainingPath,
} from "@/lib/workspace/local-folder-actions"
import { collectMarkdownPaths } from "@/lib/workspace/local-folder-paths"
import {
  buildTreeFromDirectoryHandle,
  createFolderInDirectoryHandle,
  renameFileInDirectoryHandle,
  readFileFromDirectoryHandle,
  writeFileToDirectoryHandle,
} from "@/lib/workspace/local-workspace"
import type { WorkspaceFileNode } from "@/lib/workspace/api"
import {
  createWorkspaceFolder,
  fetchWorkspaceFileFolderPath,
  fetchWorkspaceTree,
  openWorkspaceFileFolder,
  readWorkspaceFile,
  renameWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/workspace/api"

export type { WorkspaceFileNode }

export interface WorkspaceClient {
  readonly id: "project" | "folder"
  readonly label: string
  listTree(): Promise<WorkspaceFileNode[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  createFolder(path: string): Promise<void>
  renameFile(path: string, newPath: string): Promise<void>
  getFileFolderPath(path: string): Promise<string>
  openFileFolder(path: string): Promise<string>
}

export function createProjectWorkspaceClient(): WorkspaceClient {
  return {
    id: "project",
    label: "Project",
    listTree: fetchWorkspaceTree,
    readFile: readWorkspaceFile,
    writeFile: writeWorkspaceFile,
    createFolder: createWorkspaceFolder,
    renameFile: renameWorkspaceFile,
    getFileFolderPath: fetchWorkspaceFileFolderPath,
    openFileFolder: openWorkspaceFileFolder,
  }
}

export function createFolderWorkspaceClient(
  handle: FileSystemDirectoryHandle,
  projectId: string,
  samplePaths: () => string[],
): WorkspaceClient {
  const rootName = handle.name

  const ensureSamplePaths = async (): Promise<string[]> => {
    const cached = samplePaths()
    if (cached.length > 0) return cached
    const tree = await buildTreeFromDirectoryHandle(handle)
    return collectMarkdownPaths(flattenWorkspaceTreeRoots(tree))
  }

  return {
    id: "folder",
    label: handle.name,
    listTree: () => buildTreeFromDirectoryHandle(handle),
    readFile: (path) => readFileFromDirectoryHandle(handle, path),
    writeFile: (path, content) =>
      writeFileToDirectoryHandle(handle, path, content),
    createFolder: (path) => createFolderInDirectoryHandle(handle, path),
    renameFile: (path, newPath) =>
      renameFileInDirectoryHandle(handle, path, newPath),
    getFileFolderPath: async (path) =>
      copyLocalFolderContainingPath(
        projectId,
        rootName,
        path,
        await ensureSamplePaths(),
      ),
    openFileFolder: async (path) =>
      openLocalFolderContainingPath(
        projectId,
        rootName,
        path,
        await ensureSamplePaths(),
      ),
  }
}

/** 去掉 API / 本地句柄包装的单一根文件夹，避免与顶栏工作区名称重复一层 */
export function flattenWorkspaceTreeRoots(
  tree: WorkspaceFileNode[]
): WorkspaceFileNode[] {
  if (tree.length === 1 && tree[0].type === "folder" && tree[0].path === "") {
    return tree[0].children ?? []
  }
  return tree
}

export function findFirstMarkdownPath(
  nodes: WorkspaceFileNode[]
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

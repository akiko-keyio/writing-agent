import type { WorkspaceFileNode } from "@/lib/workspace-api"

import { pathDirname } from "@/lib/path"

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".cursor",
  "agent-transcripts",
  ".agents",
  "frontend",
])

function isMarkdownFile(name: string): boolean {
  return name.endsWith(".md")
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    mode?: "read" | "readwrite"
  }) => Promise<FileSystemDirectoryHandle>
}

export function isFolderPickerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function"
  )
}

export async function pickWorkspaceFolder(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker
  if (!picker) {
    throw new Error(
      "Your browser does not support opening folders. Use Chrome or Edge, or run the dev server to browse the project."
    )
  }
  return picker({ mode: "readwrite" })
}

async function listDirectory(
  dir: FileSystemDirectoryHandle,
  relativeDir: string
): Promise<WorkspaceFileNode[]> {
  const nodes: WorkspaceFileNode[] = []

  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith(".")) continue

    const rel = relativeDir ? `${relativeDir}/${name}` : name

    if (handle.kind === "directory") {
      if (SKIP_DIR_NAMES.has(name)) continue
      const children = await listDirectory(handle, rel)
      nodes.push({ name, path: rel, type: "folder", children })
      continue
    }

    if (handle.kind === "file" && isMarkdownFile(name)) {
      nodes.push({ name, path: rel, type: "file" })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

export async function buildTreeFromDirectoryHandle(
  root: FileSystemDirectoryHandle
): Promise<WorkspaceFileNode[]> {
  const children = await listDirectory(root, "")
  return [
    {
      name: root.name,
      type: "folder",
      path: "",
      children,
    },
  ]
}

async function resolveFileHandle(
  root: FileSystemDirectoryHandle,
  filePath: string
): Promise<FileSystemFileHandle> {
  const parts = filePath.split("/").filter(Boolean)
  if (parts.length === 0) {
    throw new Error("Invalid file path")
  }

  let dir = root
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i])
  }

  return dir.getFileHandle(parts[parts.length - 1])
}

async function resolveParentDirectory(
  root: FileSystemDirectoryHandle,
  filePath: string
): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
  const parts = filePath.split("/").filter(Boolean)
  if (parts.length === 0) {
    throw new Error("Invalid file path")
  }

  let dir = root
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i])
  }

  return { dir, name: parts[parts.length - 1] }
}

export async function readFileFromDirectoryHandle(
  root: FileSystemDirectoryHandle,
  filePath: string
): Promise<string> {
  const fileHandle = await resolveFileHandle(root, filePath)
  const file = await fileHandle.getFile()
  return file.text()
}

export async function createFolderInDirectoryHandle(
  root: FileSystemDirectoryHandle,
  folderPath: string
): Promise<void> {
  const parts = folderPath.split("/").filter(Boolean)
  if (parts.length === 0) throw new Error("Invalid folder path")

  let dir = root
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }
}

export async function writeFileToDirectoryHandle(
  root: FileSystemDirectoryHandle,
  filePath: string,
  content: string
): Promise<void> {
  if (!isMarkdownFile(filePath.split("/").pop() ?? "")) {
    throw new Error("Only .md files can be saved")
  }

  const parts = filePath.split("/").filter(Boolean)
  if (parts.length === 0) throw new Error("Invalid file path")

  let dir = root
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true })
  }

  const fileHandle = await dir.getFileHandle(parts[parts.length - 1], {
    create: true,
  })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export async function renameFileInDirectoryHandle(
  root: FileSystemDirectoryHandle,
  filePath: string,
  newPath: string
): Promise<void> {
  if (filePath === newPath) return
  if (!isMarkdownFile(newPath.split("/").pop() ?? "")) {
    throw new Error("Only .md files can be renamed")
  }

  const content = await readFileFromDirectoryHandle(root, filePath)

  try {
    await resolveFileHandle(root, newPath)
    throw new Error("A file already exists at the new path")
  } catch (err) {
    if (!(err instanceof DOMException) || err.name !== "NotFoundError") {
      throw err
    }
  }

  await writeFileToDirectoryHandle(root, newPath, content)
  const { dir, name } = await resolveParentDirectory(root, filePath)
  await dir.removeEntry(name)
}

export function relativeFolderPathForFile(filePath: string): string {
  return pathDirname(filePath)
}

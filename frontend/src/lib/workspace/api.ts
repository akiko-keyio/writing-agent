export interface WorkspaceFileNode {
  name: string
  path: string
  type: "folder" | "file"
  children?: WorkspaceFileNode[]
}

export const DEFAULT_WORKSPACE_FILE = "test-text.md"

export async function fetchWorkspaceTree(): Promise<WorkspaceFileNode[]> {
  const res = await fetch("/api/workspace/tree")
  if (!res.ok) {
    throw new Error(`Failed to load file tree (${res.status})`)
  }
  const data = (await res.json()) as { tree: WorkspaceFileNode[] }
  return data.tree
}

export async function readWorkspaceFile(filePath: string): Promise<string> {
  const res = await fetch(
    `/api/workspace/file?path=${encodeURIComponent(filePath)}`
  )
  if (!res.ok) {
    throw new Error(`Failed to read file (${res.status})`)
  }
  const data = (await res.json()) as { content: string }
  return data.content
}

async function errorFromResponse(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export async function writeWorkspaceFile(
  filePath: string,
  content: string
): Promise<void> {
  const res = await fetch("/api/workspace/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, content }),
  })
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to save file (${res.status})`)
    )
  }
}

export async function renameWorkspaceFile(
  filePath: string,
  newPath: string
): Promise<void> {
  const res = await fetch("/api/workspace/file", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, newPath }),
  })
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to rename file (${res.status})`)
    )
  }
}

export async function fetchWorkspaceFileFolderPath(
  filePath: string
): Promise<string> {
  const res = await fetch(
    `/api/workspace/folder-path?path=${encodeURIComponent(filePath)}`
  )
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to get folder path (${res.status})`)
    )
  }
  const data = (await res.json()) as { path: string }
  return data.path
}

export async function createWorkspaceFolder(
  folderPath: string
): Promise<void> {
  const res = await fetch("/api/workspace/folder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: folderPath }),
  })
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to create folder (${res.status})`)
    )
  }
}

export async function openContainingFolder(input: {
  rootName: string
  itemPath: string
  samplePaths: string[]
}): Promise<void> {
  const res = await fetch("/api/workspace/open-containing-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to open folder (${res.status})`),
    )
  }
}

export async function openWorkspaceFileFolder(
  filePath: string,
): Promise<string> {
  const folderPath = await fetchWorkspaceFileFolderPath(filePath)
  await openAbsoluteFolder(folderPath)
  return folderPath
}

export async function resolveLocalFolderRoot(input: {
  rootName: string
  samplePaths: string[]
}): Promise<string> {
  const res = await fetch("/api/workspace/resolve-local-root", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to resolve local folder (${res.status})`),
    )
  }
  const data = (await res.json()) as { rootPath: string }
  return data.rootPath
}

export async function openAbsoluteFolder(folderPath: string): Promise<void> {
  const res = await fetch("/api/workspace/open-absolute-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: folderPath }),
  })
  if (!res.ok) {
    throw new Error(
      await errorFromResponse(res, `Failed to open folder (${res.status})`),
    )
  }
}

export async function verifyLocalFolderRoot(input: {
  rootPath: string
  samplePaths: string[]
}): Promise<string | null> {
  const res = await fetch("/api/workspace/verify-local-root", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { rootPath?: string }
  return typeof data.rootPath === "string" ? data.rootPath : input.rootPath
}

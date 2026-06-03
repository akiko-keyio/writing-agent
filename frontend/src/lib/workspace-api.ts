export interface WorkspaceFileNode {
  name: string
  path: string
  type: "folder" | "file"
  children?: WorkspaceFileNode[]
}

export const DEFAULT_WORKSPACE_FILE = "examples/test-text.md"

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
    `/api/workspace/file?path=${encodeURIComponent(filePath)}`,
  )
  if (!res.ok) {
    throw new Error(`Failed to read file (${res.status})`)
  }
  const data = (await res.json()) as { content: string }
  return data.content
}

export async function writeWorkspaceFile(
  filePath: string,
  content: string,
): Promise<void> {
  const res = await fetch("/api/workspace/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, content }),
  })
  if (!res.ok) {
    throw new Error(`Failed to save file (${res.status})`)
  }
}

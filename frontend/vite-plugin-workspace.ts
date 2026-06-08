import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"

export interface WorkspaceFileNode {
  name: string
  path: string
  type: "folder" | "file"
  children?: WorkspaceFileNode[]
}

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".cursor",
  "agent-transcripts",
  ".agents",
  "frontend",
])

const MARKDOWN_EXT = ".md"

function resolveWorkspaceRoot(frontendDir: string): string {
  return path.resolve(frontendDir, "..")
}

function safeResolve(root: string, relativePath: string): string {
  const normalized = relativePath.replace(/^[/\\]+/, "")
  const resolved = path.resolve(root, normalized)
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error("Path escapes workspace root")
  }
  return resolved
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk) => chunks.push(chunk as Buffer))
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8")
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T))
      } catch (err) {
        reject(err)
      }
    })
    req.on("error", reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(data))
}

function openFolder(folderPath: string): Promise<void> {
  const command =
    process.platform === "win32"
      ? "explorer.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open"

  return new Promise((resolve, reject) => {
    execFile(command, [folderPath], (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function buildTree(
  root: string,
  dir: string,
  relativeDir: string
): WorkspaceFileNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const nodes: WorkspaceFileNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue

    const abs = path.join(dir, entry.name)
    const rel = relativeDir ? `${relativeDir}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue
      const children = buildTree(root, abs, rel)
      nodes.push({
        name: entry.name,
        path: rel,
        type: "folder",
        children,
      })
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith(MARKDOWN_EXT)) continue
    nodes.push({ name: entry.name, path: rel, type: "file" })
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

function workspaceTree(root: string): WorkspaceFileNode[] {
  const rootName = path.basename(root)
  const children = buildTree(root, root, "")
  return [
    {
      name: rootName,
      type: "folder",
      path: "",
      children,
    },
  ]
}

export function workspaceApiPlugin(): Plugin {
  let workspaceRoot = ""

  return {
    name: "writing-agent-workspace-api",
    configResolved(config) {
      workspaceRoot = resolveWorkspaceRoot(config.root)
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/workspace")) {
          next()
          return
        }

        try {
          const url = new URL(req.url, "http://localhost")
          const pathname = url.pathname

          if (pathname === "/api/workspace/tree" && req.method === "GET") {
            sendJson(res, 200, {
              root: workspaceRoot,
              tree: workspaceTree(workspaceRoot),
            })
            return
          }

          if (pathname === "/api/workspace/file" && req.method === "GET") {
            const filePath = url.searchParams.get("path")
            if (!filePath) {
              sendJson(res, 400, { error: "Missing path" })
              return
            }
            const abs = safeResolve(workspaceRoot, filePath)
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
              sendJson(res, 404, { error: "File not found" })
              return
            }
            const content = fs.readFileSync(abs, "utf8")
            sendJson(res, 200, { path: filePath, content })
            return
          }

          if (pathname === "/api/workspace/file" && req.method === "PUT") {
            const body = await readJsonBody<{
              path?: string
              content?: string
            }>(req)
            if (!body.path || typeof body.content !== "string") {
              sendJson(res, 400, { error: "Missing path or content" })
              return
            }
            const abs = safeResolve(workspaceRoot, body.path)
            if (!abs.endsWith(MARKDOWN_EXT)) {
              sendJson(res, 400, { error: "Only .md files can be saved" })
              return
            }
            fs.mkdirSync(path.dirname(abs), { recursive: true })
            fs.writeFileSync(abs, body.content, "utf8")
            sendJson(res, 200, { path: body.path })
            return
          }

          if (pathname === "/api/workspace/file" && req.method === "PATCH") {
            const body = await readJsonBody<{
              path?: string
              newPath?: string
            }>(req)
            if (!body.path || !body.newPath) {
              sendJson(res, 400, { error: "Missing path or newPath" })
              return
            }
            const abs = safeResolve(workspaceRoot, body.path)
            const nextAbs = safeResolve(workspaceRoot, body.newPath)
            if (
              !abs.endsWith(MARKDOWN_EXT) ||
              !nextAbs.endsWith(MARKDOWN_EXT)
            ) {
              sendJson(res, 400, { error: "Only .md files can be renamed" })
              return
            }
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
              sendJson(res, 404, { error: "File not found" })
              return
            }
            if (fs.existsSync(nextAbs)) {
              sendJson(res, 409, {
                error: "A file already exists at the new path",
              })
              return
            }
            fs.mkdirSync(path.dirname(nextAbs), { recursive: true })
            fs.renameSync(abs, nextAbs)
            sendJson(res, 200, { path: body.newPath })
            return
          }

          if (pathname === "/api/workspace/folder" && req.method === "PUT") {
            const body = await readJsonBody<{ path?: string }>(req)
            if (!body.path?.trim()) {
              sendJson(res, 400, { error: "Missing path" })
              return
            }
            const abs = safeResolve(workspaceRoot, body.path)
            if (fs.existsSync(abs) && !fs.statSync(abs).isDirectory()) {
              sendJson(res, 409, { error: "A file exists at the path" })
              return
            }
            fs.mkdirSync(abs, { recursive: true })
            sendJson(res, 200, { path: body.path })
            return
          }

          if (
            pathname === "/api/workspace/folder-path" &&
            req.method === "GET"
          ) {
            const filePath = url.searchParams.get("path")
            if (!filePath) {
              sendJson(res, 400, { error: "Missing path" })
              return
            }
            const abs = safeResolve(workspaceRoot, filePath)
            sendJson(res, 200, { path: path.dirname(abs) })
            return
          }

          if (
            pathname === "/api/workspace/open-folder" &&
            req.method === "POST"
          ) {
            const body = await readJsonBody<{ path?: string }>(req)
            if (!body.path) {
              sendJson(res, 400, { error: "Missing path" })
              return
            }
            const abs = safeResolve(workspaceRoot, body.path)
            await openFolder(path.dirname(abs))
            sendJson(res, 200, { ok: true })
            return
          }

          sendJson(res, 404, { error: "Not found" })
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          sendJson(res, 500, { error: message })
        }
      })
    },
  }
}

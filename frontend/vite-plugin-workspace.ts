import { execFile, spawn } from "node:child_process"
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
const WORKSPACE_TREE_CHANGED_EVENT = "workspace:tree-changed"
const WORKSPACE_FILE_CHANGED_EVENT = "workspace:file-changed"

function resolveWorkspaceRoot(frontendDir: string): string {
  return path.resolve(frontendDir, "..", "examples")
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

export function windowsExplorerLaunchArgs(folderPath: string): {
  command: string
  args: string[]
} {
  return {
    command: "explorer.exe",
    args: [path.normalize(folderPath)],
  }
}

function openFolder(folderPath: string): Promise<void> {
  if (process.platform === "win32") {
    return new Promise((resolve, reject) => {
      const { command, args } = windowsExplorerLaunchArgs(folderPath)
      const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      })
      child.on("error", reject)
      child.on("spawn", () => {
        child.unref()
        resolve()
      })
    })
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open"

  return new Promise((resolve, reject) => {
    execFile(command, [folderPath], (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function folderContainsAllSamplePaths(
  rootDir: string,
  samplePaths: string[],
): boolean {
  return samplePaths.every((rel) => {
    const abs = path.join(rootDir, rel.replace(/\//g, path.sep))
    return fs.existsSync(abs) && fs.statSync(abs).isFile()
  })
}

function findLocalFolderRoot(
  searchRoot: string,
  rootName: string,
  samplePaths: string[],
  maxDepth = 8,
): string | null {
  if (samplePaths.length === 0) return null

  const direct = path.join(searchRoot, rootName)
  if (
    fs.existsSync(direct) &&
    fs.statSync(direct).isDirectory() &&
    folderContainsAllSamplePaths(direct, samplePaths)
  ) {
    return direct
  }

  const matches: string[] = []

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth || matches.length > 12) return

    if (folderContainsAllSamplePaths(dir, samplePaths)) {
      matches.push(dir)
    }

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue
      if (SKIP_DIR_NAMES.has(entry.name)) continue
      walk(path.join(dir, entry.name), depth + 1)
    }
  }

  walk(searchRoot, 0)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  const byName = matches.filter(
    (candidate) => path.basename(candidate).toLowerCase() === rootName.toLowerCase(),
  )
  if (byName.length > 0) {
    return byName.sort((a, b) => a.length - b.length)[0] ?? null
  }

  return matches.sort((a, b) => a.length - b.length)[0] ?? null
}

function openAbsoluteFolderPath(folderPath: string): Promise<void> {
  const normalized = path.normalize(folderPath)
  if (!path.isAbsolute(normalized)) {
    throw new Error("Absolute folder path required")
  }
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
    throw new Error(`Folder not found: ${normalized}`)
  }
  return openFolder(normalized)
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

export function shouldNotifyWorkspaceTreeChange(
  workspaceRoot: string,
  changedPath: string,
  eventName: string,
): boolean {
  const normalizedRoot = path.resolve(workspaceRoot)
  const normalizedChanged = path.resolve(changedPath)
  const rel = path.relative(normalizedRoot, normalizedChanged)
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false

  const segments = rel.split(path.sep)
  if (segments.some((segment) => segment.startsWith("."))) return false
  if (segments.some((segment) => SKIP_DIR_NAMES.has(segment))) return false

  if (eventName === "addDir" || eventName === "unlinkDir") return true
  if (!normalizedChanged.endsWith(MARKDOWN_EXT)) return false
  return eventName === "add" || eventName === "change" || eventName === "unlink"
}

export function workspaceApiPlugin(): Plugin {
  let workspaceRoot = ""

  return {
    name: "writing-agent-workspace-api",
    configResolved(config) {
      workspaceRoot = resolveWorkspaceRoot(config.root)
    },
    configureServer(server) {
      let treeChangeTimer: ReturnType<typeof setTimeout> | null = null
      const fileChangeTimers = new Map<string, ReturnType<typeof setTimeout>>()

      const scheduleTreeChanged = (eventName: string, filePath: string) => {
        if (!shouldNotifyWorkspaceTreeChange(workspaceRoot, filePath, eventName)) {
          return
        }
        if (treeChangeTimer) clearTimeout(treeChangeTimer)
        treeChangeTimer = setTimeout(() => {
          treeChangeTimer = null
          server.ws.send(WORKSPACE_TREE_CHANGED_EVENT, {
            root: workspaceRoot,
          })
        }, 75)

        // Emit per-file content-change event for open-buffer reload.
        if (eventName === "change" && filePath.endsWith(MARKDOWN_EXT)) {
          const rel = path.relative(workspaceRoot, filePath).replace(/\\/g, "/")
          const existing = fileChangeTimers.get(rel)
          if (existing) clearTimeout(existing)
          fileChangeTimers.set(
            rel,
            setTimeout(() => {
              fileChangeTimers.delete(rel)
              server.ws.send(WORKSPACE_FILE_CHANGED_EVENT, { path: rel })
            }, 100),
          )
        }
      }

      server.watcher.add(workspaceRoot)
      server.watcher.on("all", scheduleTreeChanged)
      server.httpServer?.once("close", () => {
        server.watcher.off("all", scheduleTreeChanged)
        if (treeChangeTimer) clearTimeout(treeChangeTimer)
      })

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
            if (!fs.existsSync(abs)) {
              sendJson(res, 404, { error: "Path not found" })
              return
            }
            const stat = fs.statSync(abs)
            const folderPath = stat.isDirectory() ? abs : path.dirname(abs)
            sendJson(res, 200, { path: folderPath })
            return
          }

          if (
            pathname === "/api/workspace/open-containing-folder" &&
            req.method === "POST"
          ) {
            const body = await readJsonBody<{
              rootName?: string
              itemPath?: string
              samplePaths?: string[]
            }>(req)
            const rootName =
              typeof body.rootName === "string" ? body.rootName.trim() : ""
            const itemPath =
              typeof body.itemPath === "string" ? body.itemPath.trim() : ""
            const samplePaths = Array.isArray(body.samplePaths)
              ? body.samplePaths.filter(
                  (p): p is string => typeof p === "string" && p.length > 0,
                )
              : []
            if (!rootName || samplePaths.length === 0) {
              sendJson(res, 400, { error: "Missing rootName or samplePaths" })
              return
            }

            let normalizedItem = itemPath.replace(/\\/g, "/").replace(/^\/+/, "")
            if (normalizedItem === rootName) {
              normalizedItem = ""
            } else {
              const prefix = `${rootName}/`
              if (normalizedItem.startsWith(prefix)) {
                normalizedItem = normalizedItem.slice(prefix.length)
              }
            }

            const relativeFolder = normalizedItem.endsWith(".md")
              ? path.dirname(normalizedItem.replace(/\//g, path.sep))
              : normalizedItem.replace(/\//g, path.sep)
            const relFolderNorm =
              relativeFolder === "." || relativeFolder === path.sep
                ? ""
                : relativeFolder

            let root = findLocalFolderRoot(workspaceRoot, rootName, samplePaths)
            if (!root) {
              sendJson(res, 404, { error: "Local folder root not found" })
              return
            }

            const folderToOpen = relFolderNorm
              ? path.join(root, relFolderNorm)
              : root
            if (
              !fs.existsSync(folderToOpen) ||
              !fs.statSync(folderToOpen).isDirectory()
            ) {
              sendJson(res, 404, {
                error: `Folder not found: ${folderToOpen}`,
              })
              return
            }
            await openFolder(folderToOpen)
            sendJson(res, 200, { ok: true, path: folderToOpen })
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
            if (!fs.existsSync(abs)) {
              sendJson(res, 404, { error: "Path not found" })
              return
            }
            const stat = fs.statSync(abs)
            const folderToOpen = stat.isDirectory() ? abs : path.dirname(abs)
            await openFolder(folderToOpen)
            sendJson(res, 200, { ok: true })
            return
          }

          if (
            pathname === "/api/workspace/resolve-local-root" &&
            req.method === "POST"
          ) {
            const body = await readJsonBody<{
              rootName?: string
              samplePaths?: string[]
            }>(req)
            const rootName =
              typeof body.rootName === "string" ? body.rootName.trim() : ""
            const samplePaths = Array.isArray(body.samplePaths)
              ? body.samplePaths.filter(
                  (p): p is string => typeof p === "string" && p.length > 0,
                )
              : []
            if (!rootName || samplePaths.length === 0) {
              sendJson(res, 400, { error: "Missing rootName or samplePaths" })
              return
            }
            const resolved = findLocalFolderRoot(
              workspaceRoot,
              rootName,
              samplePaths,
            )
            if (!resolved) {
              sendJson(res, 404, { error: "Local folder root not found" })
              return
            }
            sendJson(res, 200, { rootPath: resolved })
            return
          }

          if (
            pathname === "/api/workspace/verify-local-root" &&
            req.method === "POST"
          ) {
            const body = await readJsonBody<{
              rootPath?: string
              samplePaths?: string[]
            }>(req)
            const rootPath =
              typeof body.rootPath === "string" ? body.rootPath.trim() : ""
            const samplePaths = Array.isArray(body.samplePaths)
              ? body.samplePaths.filter(
                  (p): p is string => typeof p === "string" && p.length > 0,
                )
              : []
            if (!rootPath || !path.isAbsolute(rootPath) || samplePaths.length === 0) {
              sendJson(res, 400, { error: "Missing rootPath or samplePaths" })
              return
            }
            const normalized = path.normalize(rootPath)
            if (
              fs.existsSync(normalized) &&
              fs.statSync(normalized).isDirectory() &&
              folderContainsAllSamplePaths(normalized, samplePaths)
            ) {
              sendJson(res, 200, { ok: true, rootPath: normalized })
              return
            }
            sendJson(res, 404, { error: "Root path mismatch" })
            return
          }

          if (
            pathname === "/api/workspace/open-absolute-folder" &&
            req.method === "POST"
          ) {
            const body = await readJsonBody<{ path?: string }>(req)
            if (!body.path || !path.isAbsolute(body.path)) {
              sendJson(res, 400, { error: "Absolute path required" })
              return
            }
            await openAbsoluteFolderPath(body.path)
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

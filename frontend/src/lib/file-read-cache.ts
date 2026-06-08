type ReadyEntry = { status: "ready"; content: string }
type PendingEntry = { status: "pending"; promise: Promise<string> }
type CacheEntry = ReadyEntry | PendingEntry

const fileReadCache = new Map<string, CacheEntry>()

export function readFileCached(
  path: string,
  read: (filePath: string) => Promise<string>
): Promise<string> {
  const cached = fileReadCache.get(path)
  if (cached?.status === "ready") {
    return Promise.resolve(cached.content)
  }
  if (cached?.status === "pending") {
    return cached.promise
  }

  const promise = read(path)
    .then((content) => {
      fileReadCache.set(path, { status: "ready", content })
      return content
    })
    .catch((error) => {
      fileReadCache.delete(path)
      throw error
    })

  fileReadCache.set(path, { status: "pending", promise })
  return promise
}

export function prefetchFileRead(
  path: string,
  read: (filePath: string) => Promise<string>,
  options?: { skip?: (filePath: string) => boolean }
): void {
  if (options?.skip?.(path)) return
  const cached = fileReadCache.get(path)
  if (cached?.status === "ready" || cached?.status === "pending") return
  void readFileCached(path, read).catch(() => {})
}

export function invalidateFileReadCache(path: string): void {
  fileReadCache.delete(path)
}

const DB_NAME = "writing-agent-workspace-handles"
const STORE_NAME = "handles"
const DB_VERSION = 1

const PERMISSION = { mode: "readwrite" as const }

type DirectoryHandleWithPermission = FileSystemDirectoryHandle & {
  queryPermission: (descriptor: {
    mode: "read" | "readwrite"
  }) => Promise<PermissionState>
  requestPermission: (descriptor: {
    mode: "read" | "readwrite"
  }) => Promise<PermissionState>
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = run(store)
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
        tx.oncomplete = () => {
          db.close()
          resolve(request.result as T)
        }
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"))
      }),
  )
}

export async function saveWorkspaceHandle(
  projectId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(handle, projectId))
}

export async function loadWorkspaceHandle(
  projectId: string,
): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === "undefined") return null
  try {
    const handle = await runTransaction<FileSystemDirectoryHandle | undefined>(
      "readonly",
      (store) => store.get(projectId),
    )
    return handle ?? null
  } catch {
    return null
  }
}

export async function loadAllWorkspaceHandles(): Promise<
  Map<string, FileSystemDirectoryHandle>
> {
  const map = new Map<string, FileSystemDirectoryHandle>()
  if (typeof indexedDB === "undefined") return map

  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onerror = () => reject(request.error ?? new Error("IndexedDB cursor failed"))
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        const key = cursor.key
        const value = cursor.value
        if (typeof key === "string" && value instanceof Object) {
          map.set(key, value as FileSystemDirectoryHandle)
        }
        cursor.continue()
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"))
    })
  } catch {
    // ignore — fall back to picker
  }

  return map
}

export async function deleteWorkspaceHandle(projectId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return
  try {
    await runTransaction("readwrite", (store) => store.delete(projectId))
  } catch {
    // ignore
  }
}

/** 刷新后恢复句柄；必要时浏览器会弹出权限确认（非完整选目录） */
export async function ensureWorkspaceHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const dir = handle as DirectoryHandleWithPermission
  try {
    if ((await dir.queryPermission(PERMISSION)) === "granted") return true
    if ((await dir.requestPermission(PERMISSION)) === "granted") return true
  } catch {
    return false
  }
  return false
}

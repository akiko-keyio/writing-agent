import {
  clearFolderAbsoluteRoot,
  getFolderAbsoluteRoot,
  setFolderAbsoluteRoot,
} from "@/lib/folder-root-store"
import {
  containingRelativeDir,
  displayFolderPath,
  joinAbsoluteFolder,
  normalizeRelativeToRoot,
} from "@/lib/local-folder-paths"
import {
  openAbsoluteFolder,
  openContainingFolder,
  resolveLocalFolderRoot,
  verifyLocalFolderRoot,
} from "@/lib/workspace-api"

function isAbsoluteFolderPath(folderPath: string): boolean {
  return /^([A-Za-z]:[\\/]|\\\\)/.test(folderPath) || folderPath.startsWith("/")
}

async function validateCachedRoot(
  projectId: string,
  samplePaths: string[],
): Promise<string | null> {
  const cached = getFolderAbsoluteRoot(projectId)
  if (!cached || samplePaths.length === 0) return null
  const verified = await verifyLocalFolderRoot({
    rootPath: cached,
    samplePaths,
  })
  if (!verified) {
    clearFolderAbsoluteRoot(projectId)
    return null
  }
  if (verified !== cached) {
    setFolderAbsoluteRoot(projectId, verified)
  }
  return verified
}

export async function bindLocalFolderRoot(
  projectId: string,
  rootName: string,
  samplePaths: string[],
): Promise<string | null> {
  if (samplePaths.length === 0) return null

  const cached = await validateCachedRoot(projectId, samplePaths)
  if (cached) return cached

  try {
    const rootPath = await resolveLocalFolderRoot({ rootName, samplePaths })
    const verified = await verifyLocalFolderRoot({ rootPath, samplePaths })
    if (!verified) return null
    setFolderAbsoluteRoot(projectId, verified)
    return verified
  } catch {
    return null
  }
}

async function resolveContainingFolderPath(
  projectId: string,
  rootName: string,
  relativePath: string,
  samplePaths: string[],
): Promise<string> {
  const normalizedPath = normalizeRelativeToRoot(relativePath, rootName)
  const relativeFolder = containingRelativeDir(normalizedPath, rootName)

  let absoluteRoot = await validateCachedRoot(projectId, samplePaths)
  if (!absoluteRoot) {
    absoluteRoot =
      (await bindLocalFolderRoot(projectId, rootName, samplePaths)) ?? null
  }

  if (absoluteRoot) {
    return joinAbsoluteFolder(absoluteRoot, relativeFolder)
  }
  return displayFolderPath(rootName, relativeFolder)
}

export async function openLocalFolderContainingPath(
  projectId: string,
  rootName: string,
  relativePath: string,
  samplePaths: string[],
): Promise<string> {
  if (samplePaths.length === 0) {
    throw new Error(`Could not read files in “${rootName}”.`)
  }

  const folderPath = await resolveContainingFolderPath(
    projectId,
    rootName,
    relativePath,
    samplePaths,
  )

  if (isAbsoluteFolderPath(folderPath)) {
    await openAbsoluteFolder(folderPath)
    return folderPath
  }

  try {
    await openContainingFolder({
      rootName,
      itemPath: normalizeRelativeToRoot(relativePath, rootName),
      samplePaths,
    })
    return folderPath
  } catch (firstError) {
    clearFolderAbsoluteRoot(projectId)
    const rebound = await bindLocalFolderRoot(projectId, rootName, samplePaths)
    if (rebound) {
      const retryPath = joinAbsoluteFolder(
        rebound,
        containingRelativeDir(
          normalizeRelativeToRoot(relativePath, rootName),
          rootName,
        ),
      )
      await openAbsoluteFolder(retryPath)
      return retryPath
    }
    throw firstError
  }
}

export async function copyLocalFolderContainingPath(
  projectId: string,
  rootName: string,
  relativePath: string,
  samplePaths: string[],
): Promise<string> {
  if (samplePaths.length === 0) {
    return displayFolderPath(
      rootName,
      containingRelativeDir(
        normalizeRelativeToRoot(relativePath, rootName),
        rootName,
      ),
    )
  }
  return resolveContainingFolderPath(
    projectId,
    rootName,
    relativePath,
    samplePaths,
  )
}

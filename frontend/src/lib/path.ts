/** 工作区内路径的显示用文件名（支持 `/` 与 `\\`） */
export function pathBasename(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"))
  return i >= 0 ? filePath.slice(i + 1) : filePath
}

export function pathDirname(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"))
  return i >= 0 ? filePath.slice(0, i) : "."
}

export function pathJoin(dirPath: string, name: string): string {
  if (!dirPath || dirPath === ".") return name
  return `${dirPath.replace(/[\\/]+$/, "")}/${name}`
}

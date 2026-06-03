import { REPO_PROJECT, type ProjectEntry } from "@/lib/project-catalog"

/** Explorer 工作区条第二行：说明位置，不与树节点字号/字重混淆 */
export function workspaceLocationLabel(entry: ProjectEntry): string {
  if (entry.id === REPO_PROJECT.id) {
    return "Built-in · /api/workspace"
  }
  if (entry.id.startsWith("folder:")) {
    return "Local folder · this device"
  }
  return entry.path
}

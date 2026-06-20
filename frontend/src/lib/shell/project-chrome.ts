import {

  Home01Icon,

  Home04Icon,

  Home05Icon,

  HousePlusIcon,

} from "@hugeicons/core-free-icons"

import type { IconSvgElement } from "@/lib/shared/icons"



import { REPO_PROJECT, type ProjectEntry } from "@/lib/workspace/project-catalog"



/** 工作区条目图标：内置项目 Home05，本地文件夹 Home04 */

export function projectEntryIcon(entry: ProjectEntry): IconSvgElement {

  return entry.id === REPO_PROJECT.id ? Home05Icon : Home04Icon

}



/** 顶栏项目切换按钮图标 */

export const PROJECT_WORKSPACE_ICON = Home01Icon



/** 项目菜单：Open… 动作 */

export const PROJECT_OPEN_NEW_ICON = HousePlusIcon



export const projectMenuIconClass = "size-4 shrink-0"



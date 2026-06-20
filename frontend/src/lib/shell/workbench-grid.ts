/**
 * Workbench 与顶栏共用的列宽计算。
 *
 * 缩窄视口时的策略（始终三列 Grid，侧栏列 0 或固定 px）：
 * 1. 优先按用户拖拽宽度并排；不够则**收缩**侧栏（不低于各自 min），先动余量更大的那侧
 * 2. 三栏连 min 都放不下 → **隐藏** Chat（grid 0，用户开关状态不变）
 * 3. 仍放不下 → **隐藏** Explorer
 * 4. 最终只留正文列；用户用顶栏按钮开关侧栏，视口变宽后自动重新显示
 *
 * 用户偏好宽度（拖拽）存在 panel resize state，此处只算当前 grid 列宽。
 */

/** 与 `panelChromeToggleSlot` 一致的图标轨宽度 */
export const CHROME_TOGGLE_RAIL_PX = 40

export const EXPLORER_PANEL_WIDTH_DEFAULT = 272
export const EXPLORER_PANEL_MIN_PX = 200
export const CHAT_PANEL_MIN_PX = 320
/** 正文列保留的最小宽度 */
export const WORKBENCH_CENTER_MIN_PX = 280

/** Chat 初始宽度：Explorer 固定后，剩余空间与编辑器均分。 */
export function computeInitialChatPanelWidth(
  viewportWidth: number,
  explorerWidth: number = EXPLORER_PANEL_WIDTH_DEFAULT,
): number {
  return Math.floor(Math.max(0, viewportWidth - explorerWidth) / 2)
}

/** Chat 可拖最大宽：保证正文列不低于 `WORKBENCH_CENTER_MIN_PX`。 */
export function computeMaxChatPanelWidth(
  viewportWidth: number,
  explorerWidth: number = EXPLORER_PANEL_WIDTH_DEFAULT,
  editorMin: number = WORKBENCH_CENTER_MIN_PX,
): number {
  return Math.max(
    CHAT_PANEL_MIN_PX,
    viewportWidth - explorerWidth - editorMin,
  )
}

export type WorkbenchFullscreenPane = "explorer" | "chat"

export type WorkbenchLayoutState = {
  gridExplorerWidth: number
  gridChatWidth: number
  /** 用户仍视为打开，但视口不足而 grid 列宽为 0 */
  explorerAutoHidden: boolean
  chatAutoHidden: boolean
}

function fits(
  viewportWidth: number,
  explorer: number,
  chat: number,
  editorMin: number,
): boolean {
  return explorer + chat + editorMin <= viewportWidth
}

/** 在不低于 min 的前提下，收缩侧栏直到装进视口或触达 min */
function shrinkSidePanelsToFit(
  viewportWidth: number,
  explorerPref: number,
  chatPref: number,
  explorerOpen: boolean,
  chatOpen: boolean,
  explorerMin: number,
  chatMin: number,
  editorMin: number,
): { explorer: number; chat: number } {
  let explorer = explorerOpen ? explorerPref : 0
  let chat = chatOpen ? chatPref : 0
  const budget = Math.max(0, viewportWidth - editorMin)

  if (explorer + chat <= budget) {
    return { explorer, chat }
  }

  if (!explorerOpen && !chatOpen) {
    return { explorer: 0, chat: 0 }
  }

  if (!explorerOpen) {
    if (budget < chatMin) return { explorer: 0, chat: 0 }
    return { explorer: 0, chat: Math.min(chatPref, budget) }
  }

  if (!chatOpen) {
    if (budget < explorerMin) return { explorer: 0, chat: 0 }
    return { explorer: Math.min(explorerPref, budget), chat: 0 }
  }

  while (
    explorer + chat > budget &&
    (explorer > explorerMin || chat > chatMin)
  ) {
    const explorerSlack = explorer - explorerMin
    const chatSlack = chat - chatMin
    if (chatSlack > explorerSlack && chat > chatMin) {
      chat -= 1
    } else if (explorer > explorerMin) {
      explorer -= 1
    } else if (chat > chatMin) {
      chat -= 1
    } else {
      break
    }
  }

  return { explorer, chat }
}

function maxSideWidth(
  viewportWidth: number,
  preferred: number,
  sideMin: number,
  editorMin: number,
): number {
  const budget = viewportWidth - editorMin
  if (budget < sideMin) return 0
  return Math.min(preferred, budget)
}

export function resolveWorkbenchLayout(
  viewportWidth: number,
  explorerOpen: boolean,
  chatOpen: boolean,
  explorerWidth: number,
  chatWidth: number,
  explorerMin = EXPLORER_PANEL_MIN_PX,
  chatMin = CHAT_PANEL_MIN_PX,
  editorMin = WORKBENCH_CENTER_MIN_PX,
): WorkbenchLayoutState {
  if (!explorerOpen && !chatOpen) {
    return {
      gridExplorerWidth: 0,
      gridChatWidth: 0,
      explorerAutoHidden: false,
      chatAutoHidden: false,
    }
  }

  const shrunk = shrinkSidePanelsToFit(
    viewportWidth,
    explorerWidth,
    chatWidth,
    explorerOpen,
    chatOpen,
    explorerMin,
    chatMin,
    editorMin,
  )

  if (fits(viewportWidth, shrunk.explorer, shrunk.chat, editorMin)) {
    return {
      gridExplorerWidth: shrunk.explorer,
      gridChatWidth: shrunk.chat,
      explorerAutoHidden: false,
      chatAutoHidden: false,
    }
  }

  // 收缩到 min 仍放不下：先藏 Chat，再藏 Explorer，最后只留正文
  if (explorerOpen && chatOpen) {
    const explorerOnly = maxSideWidth(
      viewportWidth,
      explorerWidth,
      explorerMin,
      editorMin,
    )
    if (explorerOnly > 0) {
      return {
        gridExplorerWidth: explorerOnly,
        gridChatWidth: 0,
        explorerAutoHidden: false,
        chatAutoHidden: true,
      }
    }
  }

  if (explorerOpen) {
    const explorerOnly = maxSideWidth(
      viewportWidth,
      explorerWidth,
      explorerMin,
      editorMin,
    )
    if (explorerOnly > 0) {
      return {
        gridExplorerWidth: explorerOnly,
        gridChatWidth: 0,
        explorerAutoHidden: false,
        chatAutoHidden: chatOpen,
      }
    }
  }

  if (chatOpen) {
    const chatOnly = maxSideWidth(viewportWidth, chatWidth, chatMin, editorMin)
    if (chatOnly > 0) {
      return {
        gridExplorerWidth: 0,
        gridChatWidth: chatOnly,
        explorerAutoHidden: explorerOpen,
        chatAutoHidden: false,
      }
    }
  }

  return {
    gridExplorerWidth: 0,
    gridChatWidth: 0,
    explorerAutoHidden: explorerOpen,
    chatAutoHidden: chatOpen,
  }
}

function gridSideColumn(width: number): string {
  return width > 0 ? `${width}px` : "0px"
}

export function workbenchGridTemplateColumns(
  explorerPanelWidth: number,
  chatPanelWidth: number,
): string {
  return `${gridSideColumn(explorerPanelWidth)} minmax(0, 1fr) ${gridSideColumn(chatPanelWidth)}`
}

export function topBarGridTemplateColumns(
  explorerPanelWidth: number,
  chatPanelWidth: number,
): string {
  return `${gridSideColumn(explorerPanelWidth)} minmax(0, 1fr) ${gridSideColumn(chatPanelWidth)}`
}

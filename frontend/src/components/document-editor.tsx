import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import { EditorContent, Extension, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import TableOfContents, {
  type TableOfContentData,
} from "@tiptap/extension-table-of-contents"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

import { Button } from "@/components/ui/button"
import { selectionToLineRange } from "@/lib/chat/context-label"
import {
  normalizeMarkdownHeadings,
  parseMarkdownHeadings,
  tocHeadingIdFromTitle,
  type DocumentTocEntry,
} from "@/lib/document/toc"
import { documentEditorShellClass } from "@/lib/shell/content-layout"
import { cn } from "@/lib/shared/utils"

export type EditorSelection = {
  from: number
  to: number
  text: string
  startLine: number
  endLine: number
  filePath: string
}

export type DocumentEditorHandle = {
  getMarkdown: () => string
  scrollToHeading: (id: string) => void
  setMarkdown: (markdown: string) => void
  /** Locate plain text in the document, select it, and scroll it into view. */
  scrollToText: (text: string) => boolean
}

export type EditHighlight = {
  id: string
  /** Plain text to locate in the document (old_text, or insertion anchor). */
  text: string
  stale?: boolean
}

export interface DocumentEditorProps {
  filePath: string
  content: string
  scrollParentRef: RefObject<HTMLElement | null>
  onTocUpdate?: (entries: DocumentTocEntry[]) => void
  onMarkdownChange?: (markdown: string) => void
  onSelectionChange?: (selection: EditorSelection | null) => void
  /** Proposed edit anchors to decorate in the document. */
  editHighlights?: EditHighlight[]
  /** Add the current selection to the chat as a context attachment. */
  onAddSelectionToChat?: (selection: EditorSelection) => void
}

const editHighlightKey = new PluginKey<DecorationSet>("editHighlight")

type HighlightSpan = { from: number; to: number; stale: boolean }

/** ProseMirror plugin that renders inline decorations for proposed edits. */
const EditHighlightExtension = Extension.create({
  name: "editHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: editHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(editHighlightKey) as HighlightSpan[] | undefined
            if (meta) {
              const decos = meta.map((s) =>
                Decoration.inline(s.from, s.to, {
                  class: s.stale ? "edit-anchor edit-anchor-stale" : "edit-anchor",
                }),
              )
              return DecorationSet.create(tr.doc, decos)
            }
            return old.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return editHighlightKey.getState(state)
          },
        },
      }),
    ]
  },
})

/**
 * Locate ``needle`` in the document, searching across text-node boundaries
 * within the same block. Falls back to normalized whitespace matching when
 * the raw text indexOf fails (handles markdown serialization quirks).
 */
function findTextSpan(
  editor: Editor,
  needle: string,
): { from: number; to: number } | null {
  const trimmed = needle.trim()
  if (!trimmed) return null

  // Collect all text segments with their document positions.
  const segments: { text: string; from: number }[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ text: node.text, from: pos })
    }
    return undefined
  })
  if (!segments.length) return null

  // Build concatenated text and position map for cross-node search.
  let fullText = ""
  const posMap: number[] = [] // posMap[i] = document position of fullText[i]
  for (const seg of segments) {
    for (let i = 0; i < seg.text.length; i++) {
      posMap.push(seg.from + i)
      fullText += seg.text[i]
    }
  }

  // Try exact match first.
  let idx = fullText.indexOf(trimmed)

  // Fallback: collapse whitespace in both needle and haystack for matching.
  if (idx < 0) {
    const collapseWS = (s: string) => s.replace(/\s+/g, " ")
    const collapsed = collapseWS(fullText)
    const collapsedNeedle = collapseWS(trimmed)
    const cIdx = collapsed.indexOf(collapsedNeedle)
    if (cIdx >= 0) {
      // Map back through whitespace-collapsed index to original positions.
      let origIdx = 0
      let collIdx = 0
      while (collIdx < cIdx && origIdx < fullText.length) {
        if (/\s/.test(fullText[origIdx])) {
          while (origIdx < fullText.length && /\s/.test(fullText[origIdx])) origIdx++
          collIdx++
        } else {
          origIdx++
          collIdx++
        }
      }
      idx = origIdx
    }
  }

  if (idx < 0 || idx >= posMap.length) return null
  const endIdx = Math.min(idx + trimmed.length, posMap.length) - 1
  return { from: posMap[idx], to: posMap[endIdx] + 1 }
}

const TOC_UPDATE_DEBOUNCE_MS = 150
const SELECTION_UPDATE_DEBOUNCE_MS = 100

function isEditorLive(editor: Editor | null): editor is Editor {
  return editor != null && !editor.isDestroyed && editor.commands != null
}

function mapTocData(data: TableOfContentData): DocumentTocEntry[] {
  return data.map((item) => ({
    id: item.id,
    level: item.level,
    headingLevel: item.originalLevel,
    title: item.textContent,
    isActive: item.isActive,
  }))
}

const OUTLINE_SCROLL_TOP_OFFSET_PX = 20

function resolveHeadingElement(
  editor: Editor,
  item: TableOfContentData[number],
): HTMLElement | null {
  const byAttr = editor.view.dom.querySelector<HTMLElement>(
    `[data-toc-id="${CSS.escape(item.id)}"]`,
  )
  if (byAttr) return byAttr

  let node: Node | null = item.dom
  if (node instanceof HTMLElement) return node
  if (node?.parentElement instanceof HTMLElement) return node.parentElement
  return null
}

function scrollElementIntoScrollParent(
  element: HTMLElement,
  scrollParent: HTMLElement,
  offsetPx = OUTLINE_SCROLL_TOP_OFFSET_PX,
): void {
  const parentTop = scrollParent.getBoundingClientRect().top
  const elementTop = element.getBoundingClientRect().top
  const top =
    elementTop - parentTop + scrollParent.scrollTop - offsetPx
  scrollParent.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  })
}

export const DocumentEditor = forwardRef<
  DocumentEditorHandle,
  DocumentEditorProps
>(function DocumentEditor(
  {
    filePath,
    content,
    scrollParentRef,
    onTocUpdate,
    onMarkdownChange,
    onSelectionChange,
    editHighlights,
    onAddSelectionToChat,
  },
  ref,
) {
  const [selectionToolbar, setSelectionToolbar] = useState<{
    left: number
    top: number
    selection: EditorSelection
  } | null>(null)
  const onAddSelectionRef = useRef(onAddSelectionToChat)
  onAddSelectionRef.current = onAddSelectionToChat
  const normalizedContent = normalizeMarkdownHeadings(content)
  const normalizedContentRef = useRef(normalizedContent)
  normalizedContentRef.current = normalizedContent
  const onTocUpdateRef = useRef(onTocUpdate)
  onTocUpdateRef.current = onTocUpdate
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  const tocDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const flushToc = useCallback((data: TableOfContentData) => {
    const fromEditor = mapTocData(data)
    onTocUpdateRef.current?.(
      fromEditor.length > 0
        ? fromEditor
        : parseMarkdownHeadings(normalizedContentRef.current),
    )
  }, [])

  const publishToc = useCallback(
    (data: TableOfContentData, immediate = false) => {
      if (immediate) {
        if (tocDebounceRef.current) {
          clearTimeout(tocDebounceRef.current)
          tocDebounceRef.current = null
        }
        flushToc(data)
        return
      }
      if (tocDebounceRef.current) clearTimeout(tocDebounceRef.current)
      tocDebounceRef.current = setTimeout(() => {
        tocDebounceRef.current = null
        flushToc(data)
      }, TOC_UPDATE_DEBOUNCE_MS)
    },
    [flushToc],
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown,
        EditHighlightExtension,
        TableOfContents.configure({
          getId: tocHeadingIdFromTitle,
          scrollParent: () =>
            scrollParentRef.current ?? globalThis.window,
          onUpdate: publishToc,
        }),
      ],
      content: normalizedContent,
      contentType: "markdown",
      editorProps: {
        attributes: {
          class: cn(
            "document-editor min-h-full outline-none",
            "font-serif text-[20px] leading-[1.8] text-foreground",
            "[&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-snug",
            "[&_h2]:mb-3.5 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-snug",
            "[&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-semibold",
            "[&_p]:mb-4",
          ),
          spellcheck: "false",
          autocorrect: "off",
          autocapitalize: "off",
        },
      },
      onCreate: ({ editor: ed }) => {
        publishToc(ed.storage.tableOfContents.content, true)
      },
      onUpdate: ({ editor: ed, transaction }) => {
        publishToc(ed.storage.tableOfContents.content)
        // Ignore decoration-only and programmatic transactions (setContent with
        // emitUpdate:false). Only user edits should reach autosave.
        if (!transaction.docChanged) return
        if (transaction.getMeta("addToHistory") === false) return
        onMarkdownChange?.(ed.getMarkdown())
      },
      onSelectionUpdate: ({ editor: ed }) => {
        if (selectionDebounceRef.current) {
          clearTimeout(selectionDebounceRef.current)
        }
        selectionDebounceRef.current = setTimeout(() => {
          selectionDebounceRef.current = null
          if (ed.isDestroyed) return
          const { from, to } = ed.state.selection
          if (from === to) {
            onSelectionChangeRef.current?.(null)
            setSelectionToolbar(null)
            return
          }
          const startLine = ed.state.doc.textBetween(0, from, "\n", "\n")
          const endLine = ed.state.doc.textBetween(0, to, "\n", "\n")
          const lines = selectionToLineRange(startLine, endLine)
          const selection: EditorSelection = {
            from,
            to,
            text: ed.state.doc.textBetween(from, to, " "),
            startLine: lines.startLine,
            endLine: lines.endLine,
            filePath,
          }
          onSelectionChangeRef.current?.(selection)
          if (onAddSelectionRef.current) {
            try {
              const start = ed.view.coordsAtPos(from)
              setSelectionToolbar({
                left: Math.round(start.left),
                top: Math.round(start.top - 8),
                selection,
              })
            } catch {
              setSelectionToolbar(null)
            }
          }
        }, SELECTION_UPDATE_DEBOUNCE_MS)
      },
    },
    [filePath],
  )

  useEffect(() => {
    if (!isEditorLive(editor)) return
    try {
      const current = editor.getMarkdown()
      if (current !== normalizedContent) {
        editor.commands.setContent(normalizedContent, {
          contentType: "markdown",
          emitUpdate: false,
        })
        publishToc(editor.storage.tableOfContents.content, true)
      }
    } catch {
      // Editor may be mid-teardown under React Strict Mode.
    }
  }, [editor, normalizedContent, publishToc])

  // Recompute proposed-edit decorations when the anchors or document change.
  useEffect(() => {
    if (!isEditorLive(editor)) return
    const spans = (editHighlights ?? [])
      .map((h) => {
        const span = findTextSpan(editor, h.text)
        return span ? { from: span.from, to: span.to, stale: !!h.stale } : null
      })
      .filter((s): s is { from: number; to: number; stale: boolean } => s != null)
    const tr = editor.state.tr.setMeta(editHighlightKey, spans)
    tr.setMeta("addToHistory", false)
    editor.view.dispatch(tr)
  }, [editor, editHighlights, normalizedContent])

  useEffect(() => {
    return () => {
      if (tocDebounceRef.current) clearTimeout(tocDebounceRef.current)
      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current)
      }
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () =>
        isEditorLive(editor) ? editor.getMarkdown() : content,
      setMarkdown: (markdown: string) => {
        if (!isEditorLive(editor)) return
        editor.commands.setContent(markdown, {
          contentType: "markdown",
          emitUpdate: false,
        })
        publishToc(editor.storage.tableOfContents.content, true)
      },
      scrollToHeading: (id: string) => {
        if (!isEditorLive(editor)) return

        const tocItem = editor.storage.tableOfContents.content.find(
          (item) => item.id === id,
        )
        if (!tocItem) return

        editor.chain().focus().setTextSelection(tocItem.pos + 1).run()

        const heading = resolveHeadingElement(editor, tocItem)
        if (!heading) return

        const scrollParent = scrollParentRef.current
        if (scrollParent) {
          scrollElementIntoScrollParent(heading, scrollParent)
          return
        }

        heading.scrollIntoView({ behavior: "smooth", block: "start" })
      },
      scrollToText: (text: string) => {
        if (!isEditorLive(editor)) return false
        const span = findTextSpan(editor, text)
        if (!span) return false
        editor.chain().focus().setTextSelection(span).run()
        const domAt = editor.view.domAtPos(span.from)
        const node = domAt?.node
        const el =
          node instanceof HTMLElement ? node : (node?.parentElement ?? null)
        const scrollParent = scrollParentRef.current
        if (el && scrollParent) {
          scrollElementIntoScrollParent(el, scrollParent)
        } else if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        return true
      },
    }),
    [editor, content, scrollParentRef],
  )

  if (!isEditorLive(editor)) return null

  return (
    <div className={documentEditorShellClass}>
      <EditorContent editor={editor} />
      {selectionToolbar && onAddSelectionToChat
        ? createPortal(
            <div
              className="fixed z-50 -translate-x-1/2 -translate-y-full"
              style={{ left: selectionToolbar.left, top: selectionToolbar.top }}
            >
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="rounded-full shadow-md hover:bg-popover hover:brightness-[0.98] dark:hover:brightness-105"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAddSelectionToChat(selectionToolbar.selection)
                  setSelectionToolbar(null)
                }}
              >
                Add to Chat
              </Button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
})

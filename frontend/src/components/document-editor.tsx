import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import TableOfContents, {
  type TableOfContentData,
} from "@tiptap/extension-table-of-contents"

import { selectionToLineRange } from "@/lib/chat-context-label"
import {
  normalizeMarkdownHeadings,
  parseMarkdownHeadings,
  tocHeadingIdFromTitle,
  type DocumentTocEntry,
} from "@/lib/document-toc"
import { documentEditorShellClass } from "@/lib/content-layout"
import { cn } from "@/lib/utils"

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
}

export interface DocumentEditorProps {
  filePath: string
  content: string
  scrollParentRef: RefObject<HTMLElement | null>
  onTocUpdate?: (entries: DocumentTocEntry[]) => void
  onMarkdownChange?: (markdown: string) => void
  onSelectionChange?: (selection: EditorSelection | null) => void
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
  },
  ref,
) {
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
            "font-serif text-[17px] leading-8 text-foreground",
            "[&_h1]:mb-5 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-snug",
            "[&_h2]:mb-3.5 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-medium [&_h2]:leading-snug",
            "[&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-medium",
            "[&_p]:mb-3.5",
          ),
        },
      },
      onCreate: ({ editor: ed }) => {
        publishToc(ed.storage.tableOfContents.content, true)
      },
      onUpdate: ({ editor: ed }) => {
        publishToc(ed.storage.tableOfContents.content)
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
            return
          }
          const startLine = ed.state.doc.textBetween(0, from, "\n", "\n")
          const endLine = ed.state.doc.textBetween(0, to, "\n", "\n")
          const lines = selectionToLineRange(startLine, endLine)
          onSelectionChangeRef.current?.({
            from,
            to,
            text: ed.state.doc.textBetween(from, to, " "),
            startLine: lines.startLine,
            endLine: lines.endLine,
            filePath,
          })
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
    }),
    [editor, content, scrollParentRef],
  )

  if (!isEditorLive(editor)) return null

  return (
    <div className={documentEditorShellClass}>
      <EditorContent editor={editor} />
    </div>
  )
})

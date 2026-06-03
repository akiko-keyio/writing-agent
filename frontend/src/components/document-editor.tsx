import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  type RefObject,
} from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import TableOfContents, {
  type TableOfContentData,
} from "@tiptap/extension-table-of-contents"

import {
  normalizeMarkdownHeadings,
  parseMarkdownHeadings,
  type DocumentTocEntry,
} from "@/lib/document-toc"
import { cn } from "@/lib/utils"

export type DocumentEditorHandle = {
  getMarkdown: () => string
  scrollToHeading: (id: string) => void
}

export interface DocumentEditorProps {
  filePath: string
  content: string
  scrollParentRef: RefObject<HTMLElement | null>
  onTocUpdate?: (entries: DocumentTocEntry[]) => void
}

function mapTocData(data: TableOfContentData): DocumentTocEntry[] {
  return data.map((item) => ({
    id: item.id,
    level: item.level,
    title: item.textContent,
    isActive: item.isActive,
  }))
}

export const DocumentEditor = forwardRef<
  DocumentEditorHandle,
  DocumentEditorProps
>(function DocumentEditor(
  { filePath, content, scrollParentRef, onTocUpdate },
  ref,
) {
  const normalizedContent = normalizeMarkdownHeadings(content)

  const publishToc = useCallback(
    (data: TableOfContentData) => {
      const fromEditor = mapTocData(data)
      onTocUpdate?.(
        fromEditor.length > 0
          ? fromEditor
          : parseMarkdownHeadings(normalizedContent),
      )
    },
    [normalizedContent, onTocUpdate],
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown,
        TableOfContents.configure({
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
            "font-serif text-lg leading-loose text-foreground",
            "[&_h1]:mb-5 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-snug",
            "[&_h2]:mb-3.5 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-medium [&_h2]:leading-snug",
            "[&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-medium",
            "[&_p]:mb-3.5",
          ),
        },
      },
      onCreate: ({ editor: ed }) => {
        publishToc(ed.storage.tableOfContents.content)
      },
      onUpdate: ({ editor: ed }) => {
        publishToc(ed.storage.tableOfContents.content)
      },
    },
    [filePath],
  )

  useEffect(() => {
    if (!editor) return
    publishToc(editor.storage.tableOfContents.content)
  }, [editor, normalizedContent, publishToc])

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () => editor?.getMarkdown() ?? content,
      scrollToHeading: (id: string) => {
        const scrollParent = scrollParentRef.current
        const heading =
          scrollParent?.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ??
          document.getElementById(id)
        heading?.scrollIntoView({ behavior: "smooth", block: "start" })
      },
    }),
    [editor, content, scrollParentRef],
  )

  if (!editor) return null

  return (
    <div className="mx-auto max-w-3xl px-12 pb-24 pt-16">
      <EditorContent editor={editor} />
    </div>
  )
})

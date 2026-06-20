"use client"

import {
  isValidElement,
  memo,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react"
import {
  CodeBlockCopyButton,
  CodeBlockSkeleton,
  StreamdownContext,
  useIsCodeFenceIncomplete,
  type StreamdownContextType,
} from "streamdown"

import { ChromeInlineScroll } from "@/components/chrome-scroll-area"
import { chatStreamdownPlugins } from "@/lib/chat-streamdown"
import { gap, p } from "@/lib/spacing"
import { cn } from "@/lib/utils"

const LANGUAGE_RE = /language-(\S+)/
const START_LINE_RE = /\{(\d+)\}/

const PLAIN_TEXT_LANGUAGES = new Set([
  "",
  "text",
  "plaintext",
  "plain",
  "txt",
])

function isPlainTextFence(language: string): boolean {
  return PLAIN_TEXT_LANGUAGES.has(language.toLowerCase())
}

const codeBlockBodyPad = cn(p[4].x, p[2].y)

/** Code block outer chrome — border on wrapper, scroll inside. */
const codeBlockChromeClass =
  "relative overflow-hidden rounded-md border border-border bg-background"

/** Preview — markdown table chrome at L2 (aligned with Review / Tool cards). */
const markdownTableChromeClass =
  "overflow-hidden rounded-lg border border-border bg-background"

const lineNumberClass = cn(
  "block before:content-[counter(line)] before:inline-block before:[counter-increment:line]",
  "before:w-6 before:mr-4 before:text-[13px] before:text-right",
  "before:text-muted-foreground/50 before:font-mono before:select-none",
)

const codeLineClass = "block"

function ChatCodeBlockCopyHost({
  code,
  show,
}: {
  code: string
  show: boolean
}) {
  if (!show) return null
  return (
    <div className="flex h-8 items-center justify-end">
      <div
        data-streamdown="code-block-actions"
        className={cn("pointer-events-auto flex shrink-0 items-center", gap.sm)}
      >
        <CodeBlockCopyButton code={code} />
      </div>
    </div>
  )
}

type HighlightToken = {
  content: string
  color?: string
  bgColor?: string
  htmlStyle?: Record<string, string>
  htmlAttrs?: Record<string, string>
}

type HighlightResult = {
  bg?: string
  fg?: string
  rootStyle?: string
  tokens: HighlightToken[][]
}

function getMetastring(node: unknown): string | undefined {
  const props = (node as { properties?: { metastring?: string } })?.properties
  return props?.metastring
}

function extractCodeString(children: unknown): string {
  if (typeof children === "string") return children
  if (isValidElement(children)) {
    const childProps = children.props as { children?: unknown }
    if (typeof childProps.children === "string") return childProps.children
  }
  return ""
}

function trimTrailingNewlines(code: string): string {
  let end = code.length
  while (end > 0 && code[end - 1] === "\n") end -= 1
  return code.slice(0, end)
}

function fallbackHighlight(code: string): HighlightResult {
  return {
    bg: "transparent",
    fg: "inherit",
    tokens: code.split("\n").map((line) => [
      {
        content: line,
        color: "inherit",
        bgColor: "transparent",
        htmlStyle: {},
      },
    ]),
  }
}

function parseRootStyle(rootStyle?: string): Record<string, string> {
  if (!rootStyle) return {}
  const style: Record<string, string> = {}
  for (const part of rootStyle.split(";")) {
    const index = part.indexOf(":")
    if (index <= 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key && value) style[key] = value
  }
  return style
}

function codeControlFlag(
  controls: StreamdownContextType["controls"],
  key: "copy" | "download",
): boolean {
  if (typeof controls === "boolean") return controls
  const code = controls.code
  if (code === false) return false
  if (code === true || code === undefined) return true
  return code[key] !== false
}

function showsCodeCopy(controls: StreamdownContextType["controls"]): boolean {
  if (typeof controls === "boolean") return controls
  const code = controls.code
  if (code === false) return false
  if (code === true || code === undefined) return true
  return codeControlFlag(controls, "copy")
}

function mermaidRenderId(source: string): string {
  const hash = source
    .split("")
    .reduce((acc, ch) => (acc << 5) - acc + ch.charCodeAt(0), 0)
  return `mermaid-${Math.abs(hash)}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function ChatMermaidBlock({
  chart,
  isIncomplete,
}: {
  chart: string
  isIncomplete: boolean
}) {
  const { mermaid: mermaidOptions } = useContext(StreamdownContext)
  const [svg, setSvg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isIncomplete) return

    let cancelled = false
    const source = chart.trim()
    if (!source) return

    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        setSvg("")
        const instance = chatStreamdownPlugins.mermaid.getMermaid(
          mermaidOptions?.config,
        )
        const { svg: nextSvg } = await instance.render(
          mermaidRenderId(source),
          source,
        )
        if (!cancelled) setSvg(nextSvg)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render Mermaid chart",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [chart, isIncomplete, mermaidOptions?.config])

  return (
    <div
      data-streamdown="mermaid-block"
      className="relative w-full min-w-0"
      data-incomplete={isIncomplete || undefined}
    >
      <div className="overflow-hidden rounded-md border border-border bg-background">
        {isIncomplete || loading ? (
          <div className={cn("flex justify-center", p[4].all)}>
            <CodeBlockSkeleton />
          </div>
        ) : error ? (
          <div className={cn("font-mono text-destructive text-sm", p[4].all)}>
            Mermaid: {error}
          </div>
        ) : svg ? (
          <div
            className={cn("flex w-full items-center justify-center", p[4].all)}
            // Mermaid SVG is generated locally via the plugin — not user HTML.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
      </div>
    </div>
  )
}

type ChatShikiCodeBodyProps = {
  result: HighlightResult
  language: string
  startLine?: number
  lineNumbers?: boolean
}

function ChatShikiCodeBody({
  result,
  language,
  startLine,
  lineNumbers = false,
}: ChatShikiCodeBodyProps) {
  const preStyle = useMemo(() => {
    const style: Record<string, string> = {}
    if (result.bg) style["--sdm-bg"] = result.bg
    if (result.fg) style["--sdm-fg"] = result.fg
    Object.assign(style, parseRootStyle(result.rootStyle))
    return style
  }, [result.bg, result.fg, result.rootStyle])

  return (
    <ChromeInlineScroll
      data-streamdown="code-block-body"
      data-language={language}
      className={cn(
        "min-w-0 font-mono text-sm leading-5",
        codeBlockBodyPad,
      )}
    >
      <pre
        className={cn(
          "m-0 bg-[var(--sdm-bg,inherit)] dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit))]",
        )}
        style={preStyle}
      >
        <code
          className={lineNumbers ? "[counter-increment:line_0] [counter-reset:line]" : undefined}
          style={
            lineNumbers && startLine && startLine > 1
              ? { counterReset: `line ${startLine - 1}` }
              : undefined
          }
        >
          {result.tokens.map((line, lineIndex) => (
            <span
              key={lineIndex}
              className={lineNumbers ? lineNumberClass : codeLineClass}
            >
              {line.length === 0 || (line.length === 1 && line[0]?.content === "")
                ? "\n"
                : line.map((token, tokenIndex) => {
                    const tokenStyle: Record<string, string> = {}
                    const hasBg = Boolean(token.bgColor)
                    if (token.color) tokenStyle["--sdm-c"] = token.color
                    if (token.bgColor) tokenStyle["--sdm-tbg"] = token.bgColor
                    if (token.htmlStyle) {
                      for (const [key, value] of Object.entries(token.htmlStyle)) {
                        if (key === "color") tokenStyle["--sdm-c"] = value
                        else if (key === "background-color") tokenStyle["--sdm-tbg"] = value
                        else tokenStyle[key] = value
                      }
                    }
                    return (
                      <span
                        key={tokenIndex}
                        className={cn(
                          "text-[var(--sdm-c,inherit)] dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]",
                          hasBg && "bg-[var(--sdm-tbg)]",
                          hasBg && "dark:bg-[var(--shiki-dark-bg,var(--sdm-tbg))]",
                        )}
                        style={tokenStyle}
                        {...token.htmlAttrs}
                      >
                        {token.content}
                      </span>
                    )
                  })}
            </span>
          ))}
        </code>
      </pre>
    </ChromeInlineScroll>
  )
}

function ChatShikiHighlight({
  code,
  language,
  startLine,
  lineNumbers = false,
}: {
  code: string
  language: string
  startLine?: number
  lineNumbers?: boolean
}) {
  const { shikiTheme } = useContext(StreamdownContext)
  const highlighter = chatStreamdownPlugins.code
  const trimmed = useMemo(() => trimTrailingNewlines(code), [code])
  const [result, setResult] = useState<HighlightResult>(() =>
    fallbackHighlight(trimmed),
  )

  useEffect(() => {
    const sync = highlighter.highlight(
      {
        code: trimmed,
        language: language as never,
        themes: shikiTheme,
      },
      (next) => setResult(next as HighlightResult),
    )
    if (sync) setResult(sync as HighlightResult)
  }, [trimmed, language, shikiTheme])

  return (
    <Suspense
      fallback={
        <ChromeInlineScroll
          data-streamdown="code-block-body"
          data-language={language}
          className={cn("min-w-0 font-mono text-sm leading-5", codeBlockBodyPad)}
        >
          <CodeBlockSkeleton />
        </ChromeInlineScroll>
      }
    >
      <ChatShikiCodeBody
        result={result}
        language={language}
        startLine={startLine}
        lineNumbers={lineNumbers}
      />
    </Suspense>
  )
}

function ChatPlainTextBlock({
  code,
  isIncomplete,
  showCopy,
}: {
  code: string
  isIncomplete: boolean
  showCopy: boolean
}) {
  return (
    <div
      data-streamdown="code-block"
      data-language="text"
      data-incomplete={isIncomplete || undefined}
      className="min-w-0 w-full"
    >
      <div className={codeBlockChromeClass}>
        <ChatCodeBlockCopyHost code={code} show={showCopy} />
        <ChromeInlineScroll
          data-streamdown="code-block-body"
          data-language="text"
          className={cn("min-w-0 text-sm leading-5", codeBlockBodyPad)}
        >
          <pre className="m-0 whitespace-pre-wrap break-words font-sans">
            <code>{code}</code>
          </pre>
        </ChromeInlineScroll>
      </div>
    </div>
  )
}

type MarkdownCodeProps = ComponentProps<"code"> & { node?: unknown }

function ChatMarkdownCodeInner({
  className,
  children,
  node,
  ...props
}: MarkdownCodeProps) {
  const { controls } = useContext(StreamdownContext)
  const isIncomplete = useIsCodeFenceIncomplete()
  const isInline = !("data-block" in props)

  if (isInline) {
    return (
      <code
        className={cn(
          cn("rounded-md bg-muted font-mono text-sm", p[1.5].x, p[0.5].y),
          className,
        )}
        data-streamdown="inline-code"
        {...props}
      >
        {children}
      </code>
    )
  }

  const match = className?.match(LANGUAGE_RE)
  const language = match?.[1] ?? ""
  const metastring = getMetastring(node)
  const startLineMatch = metastring?.match(START_LINE_RE)
  const parsedStart = startLineMatch
    ? Number.parseInt(startLineMatch[1], 10)
    : undefined
  const startLine =
    parsedStart !== undefined && parsedStart >= 1 ? parsedStart : undefined
  const codeText = extractCodeString(children)
  const showCopy = showsCodeCopy(controls)

  if (language === "mermaid") {
    return (
      <ChatMermaidBlock chart={codeText} isIncomplete={isIncomplete} />
    )
  }

  if (isPlainTextFence(language)) {
    return (
      <ChatPlainTextBlock
        code={codeText}
        isIncomplete={isIncomplete}
        showCopy={showCopy}
      />
    )
  }

  return (
    <div
      data-streamdown="code-block"
      data-language={language}
      data-incomplete={isIncomplete || undefined}
      className="min-w-0 w-full"
    >
      <div className={codeBlockChromeClass}>
        <ChatCodeBlockCopyHost code={codeText} show={showCopy} />
        <ChatShikiHighlight
          code={codeText}
          language={language}
          startLine={startLine}
          lineNumbers={false}
        />
      </div>
    </div>
  )
}

export const ChatMarkdownCode = memo(
  ChatMarkdownCodeInner,
  (prev, next) => prev.className === next.className && prev.node === next.node,
)

type MarkdownTableProps = ComponentProps<"table"> & { node?: unknown }

export const ChatMarkdownTable = memo(function ChatMarkdownTable({
  children,
  className,
  ...props
}: MarkdownTableProps) {
  return (
    <div data-streamdown="table-wrapper" className="min-w-0">
      <div
        className={cn(
          markdownTableChromeClass,
          "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-muted/80",
          "[&_th]:whitespace-normal [&_td]:whitespace-normal",
          "[&_th]:break-words [&_td]:break-words",
        )}
      >
        <table
          className={cn("w-full divide-y divide-border", className)}
          data-streamdown="table"
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  )
})

export const chatStreamdownComponents = {
  code: ChatMarkdownCode,
  table: ChatMarkdownTable,
} as const

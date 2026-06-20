import DiffMatchPatch from "diff-match-patch"

export type TextDiffOp = "equal" | "insert" | "delete"

export type TextDiffPart = {
  op: TextDiffOp
  text: string
}

const dmp = new DiffMatchPatch()

/** Max characters shown in Review Queue inline diff preview. */
export const EDIT_DIFF_PREVIEW_MAX = 280 as const

function encodeWords(text: string, wordArray: string[], wordHash: Map<string, number>): string {
  let chars = ""
  for (const token of text.split(/(\s+)/)) {
    if (token === "") continue
    let index = wordHash.get(token)
    if (index === undefined) {
      index = wordArray.length
      wordArray.push(token)
      wordHash.set(token, index)
    }
    chars += String.fromCharCode(index + 0xe000)
  }
  return chars
}

function decodeWords(encoded: string, wordArray: string[]): string {
  let text = ""
  for (const ch of encoded) {
    const index = ch.charCodeAt(0) - 0xe000
    text += wordArray[index] ?? ch
  }
  return text
}

function diffOpFromCode(code: number): TextDiffOp {
  if (code === 0) return "equal"
  if (code === 1) return "insert"
  return "delete"
}

/** Word-aware inline diff (avoids splitting mid-token). */
export function computeEditTextDiff(
  oldText: string,
  newText: string,
): TextDiffPart[] {
  if (!oldText.trim() && newText) {
    return [{ op: "insert", text: newText }]
  }
  if (!newText.trim() && oldText) {
    return [{ op: "delete", text: oldText }]
  }

  if (!oldText && !newText) return []

  const wordArray: string[] = []
  const wordHash = new Map<string, number>()
  const chars1 = encodeWords(oldText, wordArray, wordHash)
  const chars2 = encodeWords(newText, wordArray, wordHash)

  const diffs = dmp.diff_main(chars1, chars2)
  dmp.diff_cleanupSemantic(diffs)

  return diffs.map(([op, encoded]) => ({
    op: diffOpFromCode(op),
    text: decodeWords(encoded, wordArray),
  }))
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const trimmed = slice.replace(/\s+\S*$/, "").trimEnd()
  return `${trimmed || slice.trim()}…`
}

/** Diff parts capped for queue preview — keeps the start of the change readable. */
export function truncateDiffParts(
  parts: TextDiffPart[],
  maxChars = EDIT_DIFF_PREVIEW_MAX,
): TextDiffPart[] {
  const total = parts.reduce((n, p) => n + p.text.length, 0)
  if (total <= maxChars) return parts

  let used = 0
  const out: TextDiffPart[] = []

  for (const part of parts) {
    if (used >= maxChars) break
    const remaining = maxChars - used
    if (part.text.length <= remaining) {
      out.push(part)
      used += part.text.length
      continue
    }
    out.push({
      op: part.op,
      text: truncateAtWord(part.text, remaining),
    })
    break
  }

  return out
}

/** Semantic inline diff for one edit (old → new), truncated for queue rows. */
export function computeEditTextDiffPreview(
  oldText: string,
  newText: string,
  maxChars = EDIT_DIFF_PREVIEW_MAX,
): TextDiffPart[] {
  return truncateDiffParts(computeEditTextDiff(oldText, newText), maxChars)
}

/** Review queue — hide unchanged context; show only insert/delete hunks. */
export function computeEditTextDiffPreviewChanges(
  oldText: string,
  newText: string,
  maxChars = EDIT_DIFF_PREVIEW_MAX,
): TextDiffPart[] {
  const parts = computeEditTextDiffPreview(oldText, newText, maxChars)
  const changed = parts.filter((part) => part.op !== "equal")
  return changed.length > 0 ? changed : parts
}

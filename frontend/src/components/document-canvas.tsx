import { useRef } from "react"

import { EditAnchor } from "@/components/edit-anchor"
import { cn } from "@/lib/utils"
import { DEMO_EDITS, type EditDefinition } from "@/lib/writing-demo"

export interface DocumentCanvasProps {
  editStates: Record<string, { applied: boolean }>
  focusedEditId: string | null
  onAnchorSelect: (editId: string) => void
  anchorRefs: React.MutableRefObject<Record<string, HTMLSpanElement | null>>
}

const editById = Object.fromEntries(DEMO_EDITS.map((e) => [e.id, e])) as Record<
  string,
  EditDefinition
>

function Anchor({
  id,
  editStates,
  focusedEditId,
  onAnchorSelect,
  anchorRefs,
}: {
  id: string
} & DocumentCanvasProps) {
  const edit = editById[id]
  if (!edit) return null
  const applied = editStates[id]?.applied ?? false

  return (
    <EditAnchor
      ref={(el) => {
        anchorRefs.current[id] = el
      }}
      edit={edit}
      applied={applied}
      focused={focusedEditId === id}
      onSelect={onAnchorSelect}
    />
  )
}

export function DocumentCanvas({
  editStates,
  focusedEditId,
  onAnchorSelect,
  anchorRefs,
}: DocumentCanvasProps) {
  const docRef = useRef<HTMLDivElement>(null)

  return (
    <article
      ref={docRef}
      className={cn(
        "mx-auto max-w-3xl px-12 pb-24 pt-16",
        "font-serif text-lg leading-loose text-foreground",
      )}
    >
      <h1
        id="heading-1"
        className="mb-5 font-serif text-3xl font-semibold leading-snug text-foreground"
      >
        The craft of academic writing
      </h1>
      <p className="mb-3.5">
        Academic writing is often perceived as a rigid, formulaic exercise — a
        necessary hurdle in the pursuit of scholarly recognition. Yet the most
        influential works in any discipline succeed not merely because of their
        findings, but because of the clarity and force with which those findings
        are presented. Writing is not the container for ideas; it is the medium
        through which ideas achieve their full shape.
      </p>

      <h2
        id="heading-2"
        className="mb-3.5 mt-8 font-serif text-xl font-medium leading-snug"
      >
        Why clarity matters
      </h2>
      <p className="mb-3.5">
        The opening paragraph of any academic paper carries a disproportionate
        burden. It must orient the reader, establish relevance, and signal
        intellectual seriousness — all within a few sentences. Researchers often{" "}
        <Anchor
          id="e1"
          editStates={editStates}
          focusedEditId={focusedEditId}
          onAnchorSelect={onAnchorSelect}
          anchorRefs={anchorRefs}
        />{" "}
        complex methodologies{" "}
        <Anchor
          id="e2"
          editStates={editStates}
          focusedEditId={focusedEditId}
          onAnchorSelect={onAnchorSelect}
          anchorRefs={anchorRefs}
        />{" "}
        demonstrate rigor, but this impulse can obscure the very clarity that
        makes research persuasive.
      </p>
      <p className="mb-3.5">
        <Anchor
          id="e3"
          editStates={editStates}
          focusedEditId={focusedEditId}
          onAnchorSelect={onAnchorSelect}
          anchorRefs={anchorRefs}
        />
        a strong introduction does not merely summarize; it frames a problem
        that the reader now wants solved. Consider the difference between these
        two openings: &ldquo;This study investigates the impact of remote work on
        employee productivity&rdquo; versus &ldquo;When offices emptied in March
        2020, managers lost their primary tool for measuring work:
        presence.&rdquo; The second does more with less.
      </p>

      <h2
        id="heading-3"
        className="mb-3.5 mt-8 font-serif text-xl font-medium leading-snug"
      >
        The methodology trap
      </h2>
      <p className="mb-3.5">
        The methodology section presents its own challenges. Too often, methods
        are described with a false objectivity —{" "}
        <Anchor
          id="e4"
          editStates={editStates}
          focusedEditId={focusedEditId}
          onAnchorSelect={onAnchorSelect}
          anchorRefs={anchorRefs}
        />
        . Transparent methods sections acknowledge these choices. They explain not
        just what was done, but why alternatives were rejected.
      </p>
      <p className="mb-3.5">
        Citation practices reveal another tension. The academic convention of
        extensive citation serves legitimate purposes: it situates work within a
        tradition, credits intellectual debts, and provides readers with paths for
        further exploration.
      </p>
    </article>
  )
}

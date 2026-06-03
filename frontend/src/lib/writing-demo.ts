export type EditType = "replace" | "delete"

export interface DemoEdit {
  id: string
  old: string
  new: string
  type: EditType
}

/** @deprecated Use DemoEdit */
export type EditDefinition = DemoEdit

export const DEMO_EDIT_GROUP = {
  id: "g1",
  issue: "Verbose phrasing in introduction",
  edits: [
    { id: "e1", old: "utilize", new: "use", type: "replace" },
    { id: "e2", old: "in order to", new: "to", type: "replace" },
    { id: "e3", old: "It is worth noting that ", new: "", type: "delete" },
    {
      id: "e4",
      old:
        'as though the researcher simply "collected data" rather than making a series of consequential choices about what to measure, whom to study, and which frameworks to apply',
      new: "as though data collection were passive rather than a series of deliberate choices",
      type: "replace",
    },
  ] satisfies DemoEdit[],
}

export const DEMO_EDITS = DEMO_EDIT_GROUP.edits

export type EditAppliedState = Record<string, boolean>

export function createInitialEditState(
  edits: DemoEdit[],
  defaultApplied: boolean,
): EditAppliedState {
  return Object.fromEntries(edits.map((e) => [e.id, defaultApplied]))
}

export function isLongEdit(edit: DemoEdit): boolean {
  return edit.old.length + (edit.new?.length ?? 0) > 70
}

export function truncateText(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

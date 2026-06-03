export interface OutlineSection {
  id: string
  title: string
  children?: { id: string; title: string }[]
}

export const OUTLINE_SECTIONS: OutlineSection[] = [
  {
    id: "heading-1",
    title: "The craft of academic writing",
    children: [
      { id: "heading-2", title: "Why clarity matters" },
      { id: "heading-3", title: "The methodology trap" },
    ],
  },
]

export function outlineBreadcrumbTrail(activeId: string): { id: string; title: string }[] {
  for (const section of OUTLINE_SECTIONS) {
    if (section.id === activeId) {
      return [{ id: section.id, title: section.title }]
    }
    const child = section.children?.find((c) => c.id === activeId)
    if (child) {
      return [
        { id: section.id, title: section.title },
        { id: child.id, title: child.title },
      ]
    }
  }
  return []
}

export function allOutlineIds(): string[] {
  const ids: string[] = []
  for (const section of OUTLINE_SECTIONS) {
    ids.push(section.id)
    section.children?.forEach((c) => ids.push(c.id))
  }
  return ids
}

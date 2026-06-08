import type { DocumentTocEntry } from "@/lib/document-toc"

export interface ExplorerOutlineProps {
  entries: DocumentTocEntry[]
  onNavigate: (id: string) => void
}

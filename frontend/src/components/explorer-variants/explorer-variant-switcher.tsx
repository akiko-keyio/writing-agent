import { useSyncExternalStore } from "react"

import {
  FILE_TREE_VARIANT_LABELS,
  FILE_TREE_VARIANTS,
  getFileTreeVariant,
  getOutlineVariant,
  OUTLINE_VARIANT_LABELS,
  OUTLINE_VARIANTS,
  setFileTreeVariant,
  setOutlineVariant,
  type FileTreeVariant,
  type OutlineVariant,
} from "@/components/explorer-variants/explorer-variant-config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

const VARIANT_EVENT = "writing-agent:explorer-variant-change"

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange()
  window.addEventListener(VARIANT_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(VARIANT_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

function notifyVariantChange() {
  window.dispatchEvent(new Event(VARIANT_EVENT))
}

function useFileTreeVariant(): FileTreeVariant {
  return useSyncExternalStore(subscribe, getFileTreeVariant, () => "coss-sidebar")
}

function useOutlineVariant(): OutlineVariant {
  return useSyncExternalStore(subscribe, getOutlineVariant, () => "tabs")
}

export function useExplorerVariantRevision() {
  const fileTreeVariant = useFileTreeVariant()
  const outlineVariant = useOutlineVariant()
  return `${fileTreeVariant}:${outlineVariant}`
}

interface ExplorerVariantSwitcherProps {
  surface: "file-tree" | "outline"
  className?: string
}

export function ExplorerVariantSwitcher({
  surface,
  className,
}: ExplorerVariantSwitcherProps) {
  const fileTreeVariant = useFileTreeVariant()
  const outlineVariant = useOutlineVariant()

  if (surface === "file-tree") {
    return (
      <div className={cn("shrink-0 pb-1.5", className)}>
        <Select
          value={fileTreeVariant}
          onValueChange={(value) => {
            if (!value) return
            setFileTreeVariant(value as FileTreeVariant)
            notifyVariantChange()
          }}
        >
          <SelectTrigger size="sm" className="h-8 w-full min-w-0">
            <SelectValue placeholder="File tree variant" />
          </SelectTrigger>
          <SelectContent>
            {FILE_TREE_VARIANTS.map((variant) => (
              <SelectItem key={variant} value={variant}>
                {FILE_TREE_VARIANT_LABELS[variant]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className={cn(shell.panelBody, "border-b border-border pb-2 pt-1", className)}>
      <Select
        value={outlineVariant}
        onValueChange={(value) => {
          if (!value) return
          setOutlineVariant(value as OutlineVariant)
          notifyVariantChange()
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-full min-w-0">
          <SelectValue placeholder="Outline variant" />
        </SelectTrigger>
        <SelectContent>
          {OUTLINE_VARIANTS.map((variant) => (
            <SelectItem key={variant} value={variant}>
              {OUTLINE_VARIANT_LABELS[variant]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

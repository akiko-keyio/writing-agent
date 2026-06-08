import { ExplorerFileTree } from "@/components/explorer-file-tree"
import {
  FILE_TREE_VARIANTS,
  getFileTreeVariant,
  type FileTreeVariant,
} from "@/components/explorer-variants/explorer-variant-config"
import { PierreTreesFileTree } from "@/components/explorer-variants/file-tree/pierre-trees"
import { useExplorerVariantRevision } from "@/components/explorer-variants/explorer-variant-switcher"
import type { ExplorerFileTreeProps } from "@/components/explorer-variants/shared/file-tree-props"
import { ScrollArea } from "@/components/ui/scroll-area"

const FILE_TREE_BY_VARIANT = {
  "coss-sidebar": ExplorerFileTree,
  "pierre-trees": PierreTreesFileTree,
} satisfies Record<FileTreeVariant, React.ComponentType<ExplorerFileTreeProps>>

export function FileTreeByVariant(props: ExplorerFileTreeProps) {
  useExplorerVariantRevision()
  const variant = getFileTreeVariant()
  const Component = FILE_TREE_BY_VARIANT[variant]

  if (variant === "pierre-trees") {
    return (
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden">
        <Component {...props} />
      </div>
    )
  }

  return (
    <ScrollArea className="min-h-0 w-full flex-1" scrollFade>
      <Component {...props} />
    </ScrollArea>
  )
}

export { FILE_TREE_VARIANTS }

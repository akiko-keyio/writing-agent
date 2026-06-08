import { ExplorerOutline } from "@/components/explorer-outline"
import {
  getOutlineVariant,
  OUTLINE_VARIANTS,
  type OutlineVariant,
} from "@/components/explorer-variants/explorer-variant-config"
import { useExplorerVariantRevision } from "@/components/explorer-variants/explorer-variant-switcher"
import { AnchorNavOutline } from "@/components/explorer-variants/outline/anchor-nav"
import type { ExplorerOutlineProps } from "@/components/explorer-variants/shared/outline-props"

const OUTLINE_BY_VARIANT = {
  tabs: ExplorerOutline,
  "anchor-nav": AnchorNavOutline,
} satisfies Record<OutlineVariant, React.ComponentType<ExplorerOutlineProps>>

export function OutlineByVariant(props: ExplorerOutlineProps) {
  useExplorerVariantRevision()
  const variant = getOutlineVariant()
  const Component = OUTLINE_BY_VARIANT[variant]
  return <Component {...props} />
}

export { OUTLINE_VARIANTS }

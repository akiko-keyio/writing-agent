import { splitExtensionLabel } from "@/lib/middle-truncate"
import { cn } from "@/lib/utils"

export function MiddleTruncateLabel({
  children,
  className,
  title,
}: {
  children: string
  className?: string
  title?: string
}) {
  const [leading, trailing] = splitExtensionLabel(children)

  if (!trailing) {
    return (
      <span className={cn("min-w-0 truncate", className)} title={title ?? children}>
        {leading}
      </span>
    )
  }

  return (
    <span
      className={cn("flex min-w-0 items-center overflow-hidden", className)}
      title={title ?? children}
    >
      <span className="min-w-0 truncate">{leading}</span>
      <span className="shrink-0" data-middle-truncate-suffix="">
        {trailing}
      </span>
    </span>
  )
}

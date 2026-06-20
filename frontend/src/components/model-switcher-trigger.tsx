import { ArrowDown01Icon, Key01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import type { ModelEntryData } from "@/lib/agent-protocol"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

/** Host label for model endpoint (Settings subtitle / composer hint). */
export function modelEndpointLabel(apiBase: string | undefined): string {
  const trimmed = apiBase?.trim() ?? ""
  if (!trimmed) return "No base URL"
  try {
    return new URL(trimmed).host
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] ?? trimmed
  }
}

function endpointHost(base: string): string {
  return modelEndpointLabel(base)
}

/** Readable label — model id only; no provider prefix. */
export function modelDisplayName(model: ModelEntryData): string {
  const name = model.model?.trim() ?? ""
  if (name) return name
  const host = endpointHost(model.api_base ?? "")
  if (host) return host
  return model.id || "Unnamed model"
}

function AddModelsMenuItem({
  className,
  onOpenModelsSettings,
}: {
  className: string
  onOpenModelsSettings?: () => void
}) {
  if (!onOpenModelsSettings) return null
  return (
    <MenuItem className={className} onClick={() => onOpenModelsSettings()}>
      Add Models
    </MenuItem>
  )
}

export function ModelSwitcherTrigger({
  models,
  activeModelId,
  onSelectModel,
  onOpenModelsSettings,
  disabled = false,
  variant = "outline",
}: {
  models: ModelEntryData[]
  activeModelId: string | null
  onSelectModel: (modelId: string) => void
  onOpenModelsSettings?: () => void
  disabled?: boolean
  variant?: "outline" | "composer"
}) {
  const active = models.find((m) => m.id === activeModelId) ?? models[0]
  const label = active ? modelDisplayName(active) : "No model"
  const isComposer = variant === "composer"
  const menuItemClass = isComposer ? shell.projectMenuItem : shell.menuItem
  const selectedModelId = activeModelId ?? models[0]?.id ?? ""

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant={isComposer ? "ghost" : "outline"}
            size={isComposer ? "sm" : "default"}
            disabled={disabled}
            className={cn(
              isComposer
                ? shell.composerMenuTrigger
                : cn(shell.topBarProjectButton, "max-w-[min(100%,14rem)] font-normal"),
            )}
          />
        }
      >
        {!isComposer ? (
          <HugeiconsIcon icon={Key01Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
        ) : null}
        <span className="min-w-0 truncate">{label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </MenuTrigger>
      <MenuPopup align="start" className={shell.projectMenuPopup}>
        {models.length === 0 ? (
          <MenuGroup>
            <AddModelsMenuItem
              className={menuItemClass}
              onOpenModelsSettings={onOpenModelsSettings}
            />
          </MenuGroup>
        ) : (
          <>
            <MenuRadioGroup
              className="min-w-0 w-full"
              value={selectedModelId}
              onValueChange={onSelectModel}
            >
              <MenuGroup>
                {models.map((model) => (
                  <MenuRadioItem
                    key={model.id}
                    value={model.id}
                    className={shell.menuRadioItem}
                  >
                    {modelDisplayName(model)}
                  </MenuRadioItem>
                ))}
              </MenuGroup>
            </MenuRadioGroup>
            {onOpenModelsSettings ? <MenuSeparator /> : null}
            <MenuGroup>
              <AddModelsMenuItem
                className={menuItemClass}
                onOpenModelsSettings={onOpenModelsSettings}
              />
            </MenuGroup>
          </>
        )}
      </MenuPopup>
    </Menu>
  )
}

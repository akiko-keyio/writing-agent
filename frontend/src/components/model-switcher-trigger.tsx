import { ArrowDown01Icon, CircleIcon, Key01Icon, Tick01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import type { ModelEntryData } from "@/lib/agent-protocol"
import { HugeiconsIcon } from "@/lib/icons"
import { shell } from "@/lib/shell-chrome"
import { cn } from "@/lib/utils"

function endpointHost(base: string): string {
  const trimmed = base.trim()
  if (!trimmed) return ""
  try {
    return new URL(trimmed).host
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] ?? ""
  }
}

/** Readable label: provider + model, falling back to endpoint host or id. */
export function modelDisplayName(model: ModelEntryData): string {
  const name = model.model?.trim() ?? ""
  const provider = model.provider?.trim() ?? ""
  if (name) {
    if (provider && !name.toLowerCase().includes(provider.toLowerCase())) {
      return `${provider} · ${name}`
    }
    return name
  }
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
            <MenuGroup>
              {models.map((model) => {
                const isActive = model.id === (activeModelId ?? models[0]?.id)
                return (
                  <MenuItem
                    key={model.id}
                    className={cn(
                      menuItemClass,
                      isActive && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => onSelectModel(model.id)}
                  >
                    {isActive ? (
                      <HugeiconsIcon
                        icon={CircleIcon}
                        aria-hidden="true"
                        className="size-2 shrink-0 fill-primary text-primary"
                      />
                    ) : (
                      <span aria-hidden="true" className="size-2 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {modelDisplayName(model)}
                    </span>
                    {isActive ? (
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                    ) : null}
                  </MenuItem>
                )
              })}
            </MenuGroup>
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

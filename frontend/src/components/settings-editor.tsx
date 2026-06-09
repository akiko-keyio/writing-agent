import { useCallback, useEffect, useId, useState } from "react"

import {
  Add01Icon,
  ArrowLeft02Icon,
  Bookmark02Icon,
  BrainIcon,
  CheckListIcon,
  Delete01Icon,
  EyeIcon,
  EyeOffIcon,
  Key01Icon,
  Layers01Icon,
  Loading03Icon,
  Settings02Icon,
  ToolsIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardPanel } from "@/components/ui/card"
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import { MenuTwoLineEntry } from "@/components/menu-two-line-entry"
import { modelDisplayName as modelLabel } from "@/components/model-switcher-trigger"
import { HugeiconsIcon } from "@/lib/icons"
import { contentReadingColumnClass } from "@/lib/content-layout"
import { shell } from "@/lib/shell-chrome"
import { p, row, stack } from "@/lib/spacing"
import { cn } from "@/lib/utils"

import type {
  MemoryData,
  MemoryEntry,
  ModelEntryData,
  PluginItem,
  PluginsData,
  SettingsConfigData,
  ToolEntryData,
} from "@/lib/agent-protocol"

/** Settings page — reading column + 32px inset; panels on the same page use stack.xl. */
const settingsPageClass = cn(contentReadingColumnClass, p[8].all, stack.xl)

/** List row Card (`rounded-lg` per Settings surfaces). */
const settingsListCardClass =
  "overflow-hidden rounded-lg before:rounded-[calc(var(--radius-lg)-1px)]"

/** Section header actions — same size as row Edit / Open. */
const settingsActionButtonClass = "shrink-0" as const

function formatModelBasePreview(apiBase: string | undefined): string {
  const trimmed = apiBase?.trim() ?? ""
  return trimmed || "No base URL"
}

/** Sidebar item — each maps to its own content page. */
export type SettingsSection =
  | "models"
  | "rules"
  | "skills"
  | "tools"
  | "subagents"
  | "memory"

interface SettingsNavProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

interface SettingsContentProps {
  section: SettingsSection
  config: SettingsConfigData | null
  tools: ToolEntryData[] | null
  plugins: PluginsData | null
  startAddModel?: boolean
  onStartAddModelHandled?: () => void
  onOpenFile?: (path: string) => void
  onAddModel?: (model: Omit<ModelEntryData, "api_key_masked"> & { api_key?: string }) => void
  onUpdateModel?: (modelId: string, updates: Partial<ModelEntryData> & { api_key?: string }) => void
  onRemoveModel?: (modelId: string) => void
  onSetActiveModel?: (modelId: string) => void
  onSetToolEnabled?: (toolId: string, enabled: boolean) => void
  onSetSubagentEnabled?: (name: string, enabled: boolean) => void
  memory?: MemoryData | null
  memoryEnabled?: boolean
  onSetMemoryEnabled?: (enabled: boolean) => void
  onDeleteMemory?: (id: string) => void
  onClearMemory?: () => void
}

/** Top-bar back — same chrome as Settings `SidebarMenuButton` (coss sidebar row). */
export function SettingsBackButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        sidebarMenuButtonVariants({ size: "default" }),
        "min-w-0 flex-1 text-sidebar-foreground",
        className,
      )}
      onClick={onClick}
    >
      <HugeiconsIcon icon={ArrowLeft02Icon} aria-hidden="true" />
      <span>Back to app</span>
    </button>
  )
}

/** Settings nav — group labels (Basic / Instructions / Capabilities) + item rows. */
export function SettingsNav({
  activeSection,
  onSectionChange,
}: SettingsNavProps) {
  return (
    <SidebarProvider
      open
      onOpenChange={() => {}}
      className={cn(
        "flex h-full !min-h-0 min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        p[0].top,
        p[2].bottom,
      )}
    >
      <SidebarContent className="min-h-0 w-full min-w-0">
        <SidebarGroup className={cn(p[2].x, p[2].bottom, p[0].top)}>
          <SettingsNavGroupLabel>Basic</SettingsNavGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SettingsNavItem
                icon={Key01Icon}
                label="Models"
                active={activeSection === "models"}
                onClick={() => onSectionChange("models")}
              />
            </SidebarMenu>
          </SidebarGroupContent>

          <SettingsNavGroupLabel sectionGap>Instructions</SettingsNavGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SettingsNavItem
                icon={CheckListIcon}
                label="Rules"
                active={activeSection === "rules"}
                onClick={() => onSectionChange("rules")}
              />
              <SettingsNavItem
                icon={Layers01Icon}
                label="Skills"
                active={activeSection === "skills"}
                onClick={() => onSectionChange("skills")}
              />
              <SettingsNavItem
                icon={Bookmark02Icon}
                label="Memory"
                active={activeSection === "memory"}
                onClick={() => onSectionChange("memory")}
              />
            </SidebarMenu>
          </SidebarGroupContent>

          <SettingsNavGroupLabel sectionGap>Capabilities</SettingsNavGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SettingsNavItem
                icon={ToolsIcon}
                label="Tools"
                active={activeSection === "tools"}
                onClick={() => onSectionChange("tools")}
              />
              <SettingsNavItem
                icon={UserMultipleIcon}
                label="Subagents"
                active={activeSection === "subagents"}
                onClick={() => onSectionChange("subagents")}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarProvider>
  )
}

export function SettingsContent({
  section,
  config,
  tools,
  plugins,
  startAddModel = false,
  onStartAddModelHandled,
  onOpenFile,
  onAddModel,
  onUpdateModel,
  onRemoveModel,
  onSetActiveModel,
  onSetToolEnabled,
  onSetSubagentEnabled,
  memory,
  memoryEnabled = true,
  onSetMemoryEnabled,
  onDeleteMemory,
  onClearMemory,
}: SettingsContentProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <ScrollArea className="min-h-0 min-w-0 flex-1" scrollFade>
        <div className={settingsPageClass}>
          {section === "models" ? (
            <ModelsPanel
              config={config}
              startAdding={startAddModel}
              onStartAddingHandled={onStartAddModelHandled}
              onAdd={onAddModel}
              onUpdate={onUpdateModel}
              onRemove={onRemoveModel}
              onSetActive={onSetActiveModel}
            />
          ) : null}
          {section === "rules" ? (
            <RulesPanel rules={plugins?.rules} onOpenFile={onOpenFile} />
          ) : null}
          {section === "skills" ? (
            <SkillsPanel skills={plugins?.skills} onOpenFile={onOpenFile} />
          ) : null}
          {section === "tools" ? (
            <ToolsPanel tools={tools} onSetToolEnabled={onSetToolEnabled} />
          ) : null}
          {section === "subagents" ? (
            <SubagentsPanel
              subagents={plugins?.subagents}
              onOpenFile={onOpenFile}
              onSetSubagentEnabled={onSetSubagentEnabled}
            />
          ) : null}
          {section === "memory" ? (
            <MemoryPanel
              memory={memory ?? null}
              enabled={memoryEnabled}
              onSetEnabled={onSetMemoryEnabled}
              onDelete={onDeleteMemory}
              onClear={onClearMemory}
            />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}

function SettingsNavGroupLabel({
  children,
  sectionGap = false,
}: {
  children: React.ReactNode
  sectionGap?: boolean
}) {
  return (
    <SidebarGroupLabel className={cn(sectionGap && "mt-2")}>
      {children}
    </SidebarGroupLabel>
  )
}

function SettingsNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Settings02Icon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className={cn(
          "text-sidebar-accent-foreground",
          "data-[active=true]:font-normal",
        )}
        onClick={onClick}
      >
        <HugeiconsIcon icon={icon} aria-hidden="true" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className={cn(row.md, "items-start justify-between")}>
      <div className={stack.sm}>
        <h2 className="text-lg font-semibold leading-6 text-foreground">{title}</h2>
        {description ? (
          <p className={cn(shell.textMuted, "max-w-prose")}>{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** p-switch-3 — tool preference row with label + description + switch. */
function SettingsToolSwitchRow({
  tool,
  onEnabledChange,
}: {
  tool: ToolEntryData
  onEnabledChange?: (enabled: boolean) => void
}) {
  const switchId = useId()

  return (
    <div className={cn(row.md, "justify-between text-sm font-normal")}>
      <div className={cn(shell.projectMenuEntry, "min-w-0 flex-1")}>
        <Label
          htmlFor={switchId}
          className={cn(shell.projectMenuLine, "cursor-pointer font-normal")}
        >
          {tool.name}
        </Label>
        <span className={shell.projectMenuLineMuted}>{tool.description}</span>
      </div>
      <Switch
        id={switchId}
        checked={tool.enabled}
        onCheckedChange={(checked) => onEnabledChange?.(checked)}
      />
    </div>
  )
}

/** One white Card — browse rows divided inside (coss Card + CardPanel pattern). */
function SettingsBrowseList({ children }: { children: React.ReactNode }) {
  return (
    <Card className={settingsListCardClass}>
      <CardPanel className={p[0].all}>{children}</CardPanel>
    </Card>
  )
}

/** Row inside SettingsBrowseList — border-b between items. */
function SettingsBrowseRow({
  title,
  subtitle,
  meta,
  onOpen,
}: {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  onOpen?: () => void
}) {
  return (
    <div
      className={cn(
        row.md,
        "justify-between border-b border-border text-sm font-normal last:border-b-0",
        p[4].all,
      )}
    >
      <MenuTwoLineEntry title={title} subtitle={subtitle} meta={meta} />
      {onOpen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={settingsActionButtonClass}
          onClick={onOpen}
        >
          Open
        </Button>
      ) : null}
    </div>
  )
}

type ModelDialogState =
  | { mode: "add" }
  | { mode: "edit"; model: ModelEntryData }

function SettingsModelRow({
  title,
  endpoint,
  maskedKey,
  active,
  onEdit,
  onDelete,
  onSetActive,
}: {
  title: string
  endpoint?: string
  maskedKey?: string
  active: boolean
  onEdit: () => void
  onDelete: () => void
  onSetActive?: () => void
}) {
  const subtitleParts = [endpoint, maskedKey ? `key ${maskedKey}` : ""].filter(Boolean)
  return (
    <Card className={settingsListCardClass}>
      <div className={cn(row.md, "justify-between text-sm font-normal", p[4].all)}>
        <MenuTwoLineEntry
          title={title}
          subtitle={subtitleParts.join("  ·  ")}
          meta={
            active ? (
              <Badge variant="success" size="sm">
                Active
              </Badge>
            ) : undefined
          }
        />
        <div className={cn(row.sm, "shrink-0 items-center")}>
          {!active && onSetActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={settingsActionButtonClass}
              onClick={onSetActive}
            >
              Set active
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={settingsActionButtonClass}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            onClick={onDelete}
          >
            <HugeiconsIcon icon={Delete01Icon} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ModelDialog({
  open,
  state,
  onOpenChange,
  onAdd,
  onUpdate,
}: {
  open: boolean
  state: ModelDialogState | null
  onOpenChange: (open: boolean) => void
  onAdd?: (model: Omit<ModelEntryData, "api_key_masked"> & { api_key?: string }) => void
  onUpdate?: (modelId: string, updates: Partial<ModelEntryData> & { api_key?: string }) => void
}) {
  if (!state) return null

  const isAdd = state.mode === "add"
  const initial = isAdd ? undefined : state.model
  const dialogKey = isAdd ? "add" : state.model.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{isAdd ? "Add model" : "Edit model"}</DialogTitle>
        </DialogHeader>
        <ModelForm
          key={dialogKey}
          initial={initial}
          onCancel={() => onOpenChange(false)}
          onSave={(data) => {
            if (isAdd) onAdd?.(data)
            else onUpdate?.(state.model.id, data)
            onOpenChange(false)
          }}
        />
      </DialogPopup>
    </Dialog>
  )
}

function ModelsPanel({
  config,
  startAdding = false,
  onStartAddingHandled,
  onAdd,
  onUpdate,
  onRemove,
  onSetActive,
}: {
  config: SettingsConfigData | null
  startAdding?: boolean
  onStartAddingHandled?: () => void
  onAdd?: (model: Omit<ModelEntryData, "api_key_masked"> & { api_key?: string }) => void
  onUpdate?: (modelId: string, updates: Partial<ModelEntryData> & { api_key?: string }) => void
  onRemove?: (modelId: string) => void
  onSetActive?: (modelId: string) => void
}) {
  const [dialogState, setDialogState] = useState<ModelDialogState | null>(null)

  useEffect(() => {
    if (!startAdding || !config) return
    setDialogState({ mode: "add" })
    onStartAddingHandled?.()
  }, [startAdding, config, onStartAddingHandled])

  if (!config) {
    return (
      <div className={cn("flex items-center justify-center", p[8].y)}>
        <HugeiconsIcon
          icon={Loading03Icon}
          className="size-5 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    )
  }

  return (
    <div className={stack.lg}>
      <SectionHeader
        title="Models"
        action={
          <Button
            type="button"
            size="sm"
            className={settingsActionButtonClass}
            onClick={() => setDialogState({ mode: "add" })}
          >
            <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            Add
          </Button>
        }
      />

      <ModelDialog
        open={dialogState != null}
        state={dialogState}
        onOpenChange={(next) => {
          if (!next) setDialogState(null)
        }}
        onAdd={onAdd}
        onUpdate={onUpdate}
      />

      {config.models.length === 0 ? (
        <EmptyState
          icon={Key01Icon}
          title="No models configured"
          description="Add a model to get started."
        />
      ) : (
        <div className={stack.lg}>
          {config.models.map((model) => (
            <SettingsModelRow
              key={model.id}
              title={modelLabel(model)}
              endpoint={formatModelBasePreview(model.api_base)}
              maskedKey={model.api_key_masked}
              active={model.id === config.active}
              onEdit={() => setDialogState({ mode: "edit", model })}
              onDelete={() => onRemove?.(model.id)}
              onSetActive={onSetActive ? () => onSetActive(model.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ModelForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: ModelEntryData
  onCancel: () => void
  onSave: (data: Omit<ModelEntryData, "api_key_masked"> & { api_key?: string }) => void
}) {
  const [keyVisible, setKeyVisible] = useState(false)
  const [draft, setDraft] = useState({
    model: initial?.model ?? "",
    api_key: "",
    api_base: initial?.api_base ?? "",
  })

  const canSave =
    draft.model.trim().length > 0 &&
    draft.api_base.trim().length > 0 &&
    (initial != null || draft.api_key.trim().length > 0)

  const handleSave = useCallback(() => {
    if (!canSave) return
    onSave({
      id: initial?.id ?? "",
      provider: initial?.provider ?? "OpenAI",
      model: draft.model.trim(),
      api_key: draft.api_key.trim() || undefined,
      api_base: draft.api_base.trim(),
      temperature: initial?.temperature ?? 0.3,
    })
  }, [canSave, draft, initial, onSave])

  return (
    <Form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        handleSave()
      }}
    >
      <DialogPanel scrollFade={false}>
        <div className={stack.lg}>
          <Field name="model">
            <FieldLabel>Model Name</FieldLabel>
            <Input
              type="text"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder="gpt-4o, claude-sonnet-4-6..."
            />
          </Field>
          <Field name="api_base">
            <FieldLabel>OpenAI Base URL</FieldLabel>
            <Input
              type="text"
              value={draft.api_base}
              onChange={(e) => setDraft({ ...draft, api_base: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </Field>
          <Field name="api_key">
            <FieldLabel>OpenAI API Key</FieldLabel>
            <InputGroup>
              <InputGroupInput
                type={keyVisible ? "text" : "password"}
                value={draft.api_key}
                onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                placeholder={initial ? "Leave empty to keep current" : "sk-..."}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setKeyVisible(!keyVisible)}
                  aria-label={keyVisible ? "Hide API key" : "Reveal API key"}
                >
                  <HugeiconsIcon icon={keyVisible ? EyeOffIcon : EyeIcon} aria-hidden="true" />
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </div>
      </DialogPanel>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave}>
          {initial ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </Form>
  )
}

function SkillsPanel({
  skills,
  onOpenFile,
}: {
  skills?: PluginItem[]
  onOpenFile?: (path: string) => void
}) {
  return (
    <div className={stack.lg}>
      <SectionHeader
        title="Skills"
        description="Capabilities loaded at startup. Each skill bundles reference knowledge and may delegate to subagents."
      />
      {skills?.length ? (
        <SettingsBrowseList>
          {skills.map((skill) => (
            <SettingsBrowseRow
              key={skill.id}
              title={skill.name}
              subtitle={skill.description}
              onOpen={skill.path ? () => onOpenFile?.(skill.path) : undefined}
            />
          ))}
        </SettingsBrowseList>
      ) : (
        <EmptyState
          icon={Layers01Icon}
          title="No skills installed"
          description="Skills are defined in plugins/*/SKILL.md"
        />
      )}
    </div>
  )
}

function RulesPanel({
  rules,
  onOpenFile,
}: {
  rules?: PluginItem[]
  onOpenFile?: (path: string) => void
}) {
  return (
    <div className={stack.lg}>
      <SectionHeader
        title="Rules"
        description="Hard constraints that the agent must always follow."
      />
      {rules?.length ? (
        <SettingsBrowseList>
          {rules.map((rule) => (
            <SettingsBrowseRow
              key={rule.id}
              title={rule.name || rule.id}
              subtitle={
                rule.description && rule.description !== rule.name
                  ? rule.description
                  : rule.preview || undefined
              }
              onOpen={rule.path ? () => onOpenFile?.(rule.path) : undefined}
            />
          ))}
        </SettingsBrowseList>
      ) : (
        <EmptyState
          icon={CheckListIcon}
          title="No rules defined"
          description="Rules are defined in plugins/*/rules/*.mdc"
        />
      )}
    </div>
  )
}

const MEMORY_KIND_LABELS: Record<MemoryEntry["kind"], string> = {
  principle: "Principles",
  knowledge: "Knowledge",
  example: "Examples",
}

function MemoryEntryRow({
  entry,
  onDelete,
}: {
  entry: MemoryEntry
  onDelete?: (id: string) => void
}) {
  const meta =
    entry.polarity && entry.polarity !== "neutral" ? (
      <Badge variant="secondary" size="sm">
        {entry.polarity}
      </Badge>
    ) : undefined
  return (
    <div
      className={cn(
        row.md,
        "justify-between border-b border-border text-sm font-normal last:border-b-0",
        p[4].all,
      )}
    >
      <MenuTwoLineEntry
        title={entry.content || "(empty)"}
        subtitle={entry.path ?? entry.scope}
        meta={meta}
      />
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete memory entry"
          onClick={() => onDelete(entry.id)}
        >
          <HugeiconsIcon icon={Delete01Icon} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

function MemoryPanel({
  memory,
  enabled,
  onSetEnabled,
  onDelete,
  onClear,
}: {
  memory: MemoryData | null
  enabled: boolean
  onSetEnabled?: (enabled: boolean) => void
  onDelete?: (id: string) => void
  onClear?: () => void
}) {
  const kinds: MemoryEntry["kind"][] = ["principle", "knowledge", "example"]
  const total = memory
    ? memory.principle.length + memory.knowledge.length + memory.example.length
    : 0

  return (
    <div className={stack.lg}>
      <SectionHeader
        title="Memory"
        description="What the agent has learned from your edit decisions. Visible and controllable — never hidden prompt state."
        action={
          total > 0 && onClear ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={settingsActionButtonClass}
              onClick={onClear}
            >
              Clear all
            </Button>
          ) : undefined
        }
      />

      <Card className={settingsListCardClass}>
        <div className={cn(row.md, "justify-between text-sm font-normal", p[4].all)}>
          <MenuTwoLineEntry
            title="Enable memory"
            subtitle="Record accepted, rejected, and replaced edits as examples."
          />
          {onSetEnabled ? (
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => onSetEnabled(checked)}
              aria-label="Enable memory"
            />
          ) : null}
        </div>
      </Card>

      {!memory || total === 0 ? (
        <EmptyState
          icon={BrainIcon}
          title="No memory yet"
          description="Apply, reject, or refine a suggested edit and it will be recorded here."
        />
      ) : (
        kinds
          .filter((kind) => memory[kind].length > 0)
          .map((kind) => (
            <div key={kind} className={stack.sm}>
              <SectionHeader title={MEMORY_KIND_LABELS[kind]} />
              <SettingsBrowseList>
                {memory[kind].map((entry) => (
                  <MemoryEntryRow key={entry.id} entry={entry} onDelete={onDelete} />
                ))}
              </SettingsBrowseList>
            </div>
          ))
      )}
    </div>
  )
}

function SubagentsPanel({
  subagents,
  onOpenFile,
  onSetSubagentEnabled,
}: {
  subagents?: PluginItem[]
  onOpenFile?: (path: string) => void
  onSetSubagentEnabled?: (name: string, enabled: boolean) => void
}) {
  return (
    <div className={stack.lg}>
      <SectionHeader
        title="Subagents"
        description="Specialist agents invoked by skills for focused tasks."
      />
      {subagents?.length ? (
        <SettingsBrowseList>
          {subagents.map((agent) => {
            const tags = [
              ...(agent.readonly ? ["read-only"] : []),
              ...(agent.is_background ? ["background"] : []),
            ]
            const enabled = agent.enabled ?? true
            return (
              <SettingsBrowseRow
                key={agent.id}
                title={agent.name}
                subtitle={agent.description}
                meta={
                  <div className={cn(row.sm, "flex-wrap items-center")}>
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {onSetSubagentEnabled ? (
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          onSetSubagentEnabled(agent.name, checked)
                        }
                        aria-label={`Enable ${agent.name}`}
                      />
                    ) : null}
                  </div>
                }
                onOpen={agent.path ? () => onOpenFile?.(agent.path) : undefined}
              />
            )
          })}
        </SettingsBrowseList>
      ) : (
        <EmptyState
          icon={UserMultipleIcon}
          title="No subagents found"
          description="Subagents are defined in plugins/*/agents/*.md"
        />
      )}
    </div>
  )
}

function ToolsPanel({
  tools,
  onSetToolEnabled,
}: {
  tools: ToolEntryData[] | null
  onSetToolEnabled?: (toolId: string, enabled: boolean) => void
}) {
  return (
    <div className={stack.lg}>
      <SectionHeader
        title="Tools"
        description="Built-in capabilities available to the agent."
      />
      {!tools ? (
        <div className={cn("flex items-center justify-center", p[8].y)}>
          <HugeiconsIcon
            icon={Loading03Icon}
            className="size-5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      ) : tools.length ? (
        <SettingsBrowseList>
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                "border-b border-border last:border-b-0",
                p[4].all,
              )}
            >
              <SettingsToolSwitchRow
                tool={tool}
                onEnabledChange={(enabled) => onSetToolEnabled?.(tool.id, enabled)}
              />
            </div>
          ))}
        </SettingsBrowseList>
      ) : (
        <EmptyState
          icon={ToolsIcon}
          title="No tools available"
          description="Built-in tools are registered by the agent runtime."
        />
      )}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: typeof Settings02Icon
  title: string
  description?: string
}) {
  return (
    <div className={cn(stack.md, "items-center", p[12].y)}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <HugeiconsIcon icon={icon} className="text-muted-foreground/40" aria-hidden="true" />
      </div>
      <div className={cn(stack.xs, "items-center text-center")}>
        <span className={cn(shell.text, "font-medium text-muted-foreground")}>{title}</span>
        {description ? (
          <span className={shell.textMuted}>{description}</span>
        ) : null}
      </div>
    </div>
  )
}

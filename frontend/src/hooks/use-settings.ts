import { useCallback, useState } from "react"

import { getAgentClient } from "@/lib/agent-client"
import type {
  AgentOutboundMessage,
  ModelEntryData,
  PluginsData,
  SettingsConfigData,
  ToolEntryData,
} from "@/lib/agent-protocol"

export function useSettings() {
  const [config, setConfig] = useState<SettingsConfigData | null>(null)
  const [tools, setTools] = useState<ToolEntryData[] | null>(null)
  const [plugins, setPlugins] = useState<PluginsData | null>(null)

  const load = useCallback(() => {
    getAgentClient().send({ type: "settings/read" })
  }, [])

  const addModel = useCallback((model: Omit<ModelEntryData, "api_key_masked"> & { api_key?: string }) => {
    getAgentClient().send({
      type: "settings/update",
      action: "add_model",
      model,
    })
  }, [])

  const updateModel = useCallback((modelId: string, updates: Partial<ModelEntryData> & { api_key?: string }) => {
    getAgentClient().send({
      type: "settings/update",
      action: "update_model",
      model_id: modelId,
      model: updates,
    })
  }, [])

  const removeModel = useCallback((modelId: string) => {
    getAgentClient().send({
      type: "settings/update",
      action: "remove_model",
      model_id: modelId,
    })
  }, [])

  const setActiveModel = useCallback((modelId: string) => {
    getAgentClient().send({
      type: "settings/update",
      action: "set_active_model",
      model_id: modelId,
    })
  }, [])

  const setToolEnabled = useCallback((toolId: string, enabled: boolean) => {
    setTools((prev) =>
      prev?.map((tool) =>
        tool.id === toolId ? { ...tool, enabled } : tool,
      ) ?? prev,
    )
    getAgentClient().send({
      type: "settings/update",
      action: "set_tool_enabled",
      tool_id: toolId,
      enabled,
    })
  }, [])

  const handleMessage = useCallback((msg: AgentOutboundMessage) => {
    if (msg.type === "settings/data") {
      setConfig(msg.config)
      setTools(msg.tools)
      setPlugins(msg.plugins)
    }
    if (msg.type === "settings/updated") {
      if (msg.config) setConfig(msg.config)
      if (msg.tools) setTools(msg.tools)
    }
    if (msg.type === "plugins/data") {
      setPlugins(msg.plugins)
    }
  }, [])

  return {
    config,
    tools,
    plugins,
    load,
    addModel,
    updateModel,
    removeModel,
    setActiveModel,
    setToolEnabled,
    handleMessage,
  }
}

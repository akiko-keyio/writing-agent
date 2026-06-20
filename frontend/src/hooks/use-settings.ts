import { useCallback, useState } from "react"

import { getAgentClient } from "@/lib/agent/client"
import type {
  AgentOutboundMessage,
  MemoryData,
  ModelEntryData,
  PluginsData,
  SettingsConfigData,
  ToolEntryData,
} from "@/lib/agent/protocol"

export function useSettings() {
  const [config, setConfig] = useState<SettingsConfigData | null>(null)
  const [tools, setTools] = useState<ToolEntryData[] | null>(null)
  const [plugins, setPlugins] = useState<PluginsData | null>(null)
  const [memory, setMemory] = useState<MemoryData | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(true)

  const load = useCallback(() => {
    getAgentClient().send({ type: "settings/read" })
    getAgentClient().send({ type: "memory/read" })
  }, [])

  const setMemoryEnabledRemote = useCallback((enabled: boolean) => {
    getAgentClient().send({
      type: "memory/update",
      action: "set_enabled",
      enabled,
    })
  }, [])

  const deleteMemoryEntry = useCallback((id: string) => {
    getAgentClient().send({ type: "memory/update", action: "delete", id })
  }, [])

  const acceptCandidatePrinciple = useCallback((id: string, content?: string) => {
    getAgentClient().send({
      type: "memory/update",
      action: "accept_candidate",
      id,
      content,
    })
  }, [])

  const rejectCandidatePrinciple = useCallback((id: string) => {
    getAgentClient().send({
      type: "memory/update",
      action: "reject_candidate",
      id,
    })
  }, [])

  const clearMemory = useCallback(() => {
    getAgentClient().send({ type: "memory/update", action: "clear_all" })
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

  // Toggles are authoritative: state updates from the backend response
  // (settings/updated tools/plugins). On failure the backend sends an `error`
  // (toasted by the session hook) and the displayed state is unchanged.
  const setToolEnabled = useCallback((toolId: string, enabled: boolean) => {
    getAgentClient().send({
      type: "settings/update",
      action: "set_tool_enabled",
      tool_id: toolId,
      enabled,
    })
  }, [])

  const setSubagentEnabled = useCallback((name: string, enabled: boolean) => {
    getAgentClient().send({
      type: "settings/update",
      action: "set_subagent_enabled",
      subagent_id: name,
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
      if (msg.plugins) setPlugins(msg.plugins)
    }
    if (msg.type === "plugins/data") {
      setPlugins(msg.plugins)
    }
    if (msg.type === "memory/data") {
      setMemory(msg.memory)
      setMemoryEnabled(msg.enabled)
    }
  }, [])

  return {
    config,
    tools,
    plugins,
    memory,
    memoryEnabled,
    load,
    addModel,
    updateModel,
    removeModel,
    setActiveModel,
    setToolEnabled,
    setSubagentEnabled,
    setMemoryEnabled: setMemoryEnabledRemote,
    deleteMemoryEntry,
    acceptCandidatePrinciple,
    rejectCandidatePrinciple,
    clearMemory,
    handleMessage,
  }
}

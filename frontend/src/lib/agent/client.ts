import type {
  AgentConnectionState,
  AgentInboundMessage,
  AgentOutboundMessage,
} from "@/lib/agent/protocol"
import { isAgentOutboundMessage } from "@/lib/agent/protocol"

export type AgentClientOptions = {
  url?: string
  onStateChange?: (state: AgentConnectionState) => void
  onMessage?: (message: AgentOutboundMessage) => void
  onError?: (message: string) => void
}

const DEFAULT_WS_URL =
  typeof location !== "undefined"
    ? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
    : "ws://localhost:8765"

export class AgentClient {
  private ws: WebSocket | null = null
  private queue: AgentInboundMessage[] = []
  private state: AgentConnectionState = "closed"
  private readonly url: string
  private readonly onStateChange?: (state: AgentConnectionState) => void
  private readonly onMessage?: (message: AgentOutboundMessage) => void
  private readonly onError?: (message: string) => void
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true

  constructor(options: AgentClientOptions = {}) {
    this.url = options.url ?? DEFAULT_WS_URL
    this.onStateChange = options.onStateChange
    this.onMessage = options.onMessage
    this.onError = options.onError
  }

  get connectionState(): AgentConnectionState {
    return this.state
  }

  connect(): void {
    this.shouldReconnect = true
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.setState("connecting")
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.setState("open")
      this.flushQueue()
    }

    this.ws.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(String(event.data))
        if (!isAgentOutboundMessage(parsed)) return
        if (parsed.type === "error") {
          this.onError?.(parsed.message)
        }
        this.onMessage?.(parsed)
      } catch {
        this.onError?.("Invalid message from agent")
      }
    }

    this.ws.onclose = () => {
      this.setState("closed")
      this.ws = null
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000)
      }
    }

    this.ws.onerror = () => {
      // Connection failures are represented by connectionState and retried
      // automatically. A transient error toast remains visible after recovery.
      this.setState("closed")
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.setState("closed")
  }

  send(message: AgentInboundMessage): void {
    if (
      message.type === "document/change" ||
      message.type === "document/open"
    ) {
      this.queue = this.queue.filter(
        (m) =>
          !(
            m.type === message.type &&
            "path" in m &&
            "path" in message &&
            m.path === message.path
          ),
      )
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return
    }
    this.queue.push(message)
    if (this.state === "closed") this.connect()
  }

  private flushQueue(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    while (this.queue.length > 0) {
      const msg = this.queue.shift()
      if (msg) this.ws.send(JSON.stringify(msg))
    }
  }

  private setState(next: AgentConnectionState): void {
    if (this.state === next) return
    this.state = next
    this.onStateChange?.(next)
  }
}

let sharedClient: AgentClient | null = null

export function getAgentClient(options?: AgentClientOptions): AgentClient {
  if (!sharedClient) {
    sharedClient = new AgentClient(options)
  }
  return sharedClient
}

export function resetAgentClient(): void {
  sharedClient?.disconnect()
  sharedClient = null
}

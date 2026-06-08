import type React from "react"
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layout } from "@/components/layout"
import { CossDesignSystemPage } from "@/pages/coss-design-system"
import { CossZAxisPage } from "@/pages/coss-z-axis"
import { DesignSpecPage } from "@/pages/design-spec"
import { DevUiGallery } from "@/pages/dev-ui-gallery"
import { ChatComposerDesignOptionsPage } from "@/pages/chat-composer-design-options"
import { SettingsDesignOptionsPage } from "@/pages/settings-design-options"
import { SettingsInspectorMockupPage } from "@/pages/settings-inspector-mockup"

/** Normalize pathname; tolerate trailing junk from pasted markdown links (e.g. `）`). */
function routePath(): string {
  const raw = decodeURIComponent(window.location.pathname).replace(/\/$/, "") || "/"
  return raw
}

function matchesRoute(expected: string): boolean {
  const path = routePath()
  if (path === expected) return true
  // `/chat-composer-design-options**）` — suffix has no extra path segment
  if (path.startsWith(expected) && !path.slice(expected.length).includes("/")) {
    return true
  }
  return false
}

function isDevUiGalleryRoute(): boolean {
  if (!import.meta.env.DEV) return false
  return matchesRoute("/dev/ui")
}

function isDesignSpecRoute(): boolean {
  return matchesRoute("/design-spec")
}

function isCossDesignSystemRoute(): boolean {
  return matchesRoute("/coss-design-system")
}

function isCossZAxisRoute(): boolean {
  return matchesRoute("/coss-z-axis")
}

function isSettingsDesignOptionsRoute(): boolean {
  return matchesRoute("/settings-design-options")
}

function isSettingsInspectorMockupRoute(): boolean {
  return matchesRoute("/settings-inspector-mockup")
}

function isChatComposerDesignOptionsRoute(): boolean {
  return matchesRoute("/chat-composer-design-options")
}

export default function App() {
  const showDevGallery = isDevUiGalleryRoute()
  const showDesignSpec = isDesignSpecRoute()
  const showCossDesignSystem = isCossDesignSystemRoute()
  const showCossZAxis = isCossZAxisRoute()
  const showSettingsDesignOptions = isSettingsDesignOptionsRoute()
  const showChatComposerDesignOptions = isChatComposerDesignOptionsRoute()

  let content: React.ReactNode
  if (showDevGallery) {
    content = <DevUiGallery />
  } else if (showChatComposerDesignOptions) {
    content = <ChatComposerDesignOptionsPage />
  } else if (showSettingsDesignOptions) {
    content = <SettingsDesignOptionsPage />
  } else if (isSettingsInspectorMockupRoute()) {
    content = <SettingsInspectorMockupPage />
  } else if (showCossZAxis) {
    content = <CossZAxisPage />
  } else if (showCossDesignSystem) {
    content = <CossDesignSystemPage />
  } else if (showDesignSpec) {
    content = <DesignSpecPage />
  } else {
    content = <Layout />
  }

  return (
    <div className="isolate relative flex min-h-svh flex-col font-sans text-foreground">
      <ToastProvider position="bottom-center">
        <AnchoredToastProvider>
          <TooltipProvider>
            {content}
          </TooltipProvider>
        </AnchoredToastProvider>
      </ToastProvider>
    </div>
  )
}

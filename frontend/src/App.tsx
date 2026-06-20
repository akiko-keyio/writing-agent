import type React from "react"
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layout } from "@/components/layout"
import { DevUiGallery } from "@/pages/dev-ui-gallery"

/** Normalize pathname; tolerate trailing junk from pasted markdown links (e.g. `）`). */
function routePath(): string {
  const raw = decodeURIComponent(window.location.pathname).replace(/\/$/, "") || "/"
  return raw
}

function matchesRoute(expected: string): boolean {
  const path = routePath()
  if (path === expected) return true
  if (path.startsWith(expected) && !path.slice(expected.length).includes("/")) {
    return true
  }
  return false
}

function isDevUiGalleryRoute(): boolean {
  if (!import.meta.env.DEV) return false
  return matchesRoute("/dev/ui")
}

export default function App() {
  const content: React.ReactNode = isDevUiGalleryRoute() ? <DevUiGallery /> : <Layout />

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

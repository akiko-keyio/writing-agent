import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layout } from "@/components/layout"

export default function App() {
  return (
    <div className="isolate relative flex min-h-svh flex-col font-sans text-foreground">
      <ToastProvider>
        <AnchoredToastProvider>
          <TooltipProvider>
            <Layout />
          </TooltipProvider>
        </AnchoredToastProvider>
      </ToastProvider>
    </div>
  )
}

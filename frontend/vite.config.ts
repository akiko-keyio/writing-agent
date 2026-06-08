import path from "path"
import { fileURLToPath } from "url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { workspaceApiPlugin } from "./vite-plugin-workspace.ts"

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [react(), tailwindcss(), workspaceApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:8765",
        ws: true,
      },
    },
  },
})

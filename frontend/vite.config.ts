import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { workspaceApiPlugin } from "./vite-plugin-workspace"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), workspaceApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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

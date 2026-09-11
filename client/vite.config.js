import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Expose to local network
    proxy: {
      '/api': {
        target: 'http://localhost:8747',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:8747',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
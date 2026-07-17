import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to localhost only — Vite prints just the Local URL, no Network.
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
    open: true,
  },
})

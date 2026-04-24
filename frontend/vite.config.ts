import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Use port 5001 (dev-server) when running with VITE_DEV_TEST=true
const backendPort = process.env.VITE_DEV_TEST === 'true' ? 5001 : 5000;
const frontendPort = process.env.VITE_DEV_TEST === 'true' ? 5174 : 5173;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: frontendPort,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      }
    }
  }
})

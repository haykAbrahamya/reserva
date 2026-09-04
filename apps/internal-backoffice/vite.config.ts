import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { requireEnv } from '../../tools/vite/require-env.mjs'

// Shared design-system styles folder. Added to SCSS loadPaths so any
// .module.scss can simply `@use 'variables' as *` regardless of its depth.
const uiStyles = fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))

export default defineConfig({
  // A production build without an absolute VITE_API_URL is a broken deploy, so
  // it fails here instead of in a visitor's browser. See tools/vite/require-env.mjs.
  plugins: [react(), requireEnv(['VITE_API_URL'])],
  // Fixed port so it never collides with the partner-backoffice (5173) or client.
  server: { port: 5175 },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [uiStyles],
      },
    },
  },
  optimizeDeps: {
    exclude: ['@reserva/ui', '@reserva/shared'],
  },
})

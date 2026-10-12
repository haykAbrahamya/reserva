import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// The shared design-system styles folder, exposed to SCSS loadPaths so any
// .module.scss can `@use 'variables'` regardless of depth — same arrangement as
// the other apps.
const uiStyles = fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))

/*
 * No API URL and no proxy, unlike the other apps: every tool runs entirely in
 * the visitor's browser. Add the same `requireEnv(['VITE_API_URL'])` guard the
 * other apps use on the day a tool first talks to the backend.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [uiStyles] },
    },
  },
  optimizeDeps: {
    exclude: ['@reserva/ui', '@reserva/shared', '@reserva/i18n'],
  },
  server: {
    // Pinned so the dev servers never trade ports between restarts
    // (partner 5173, client 5174, internal 5175, vacancies 5176).
    port: 5177,
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor code that never changes stays cached across releases.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})

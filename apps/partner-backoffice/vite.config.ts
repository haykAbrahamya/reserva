import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// Shared design-system styles folder. Added to SCSS loadPaths so any
// .module.scss can simply `@use 'variables' as *` regardless of its depth.
const uiStyles = fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))

export default defineConfig({
  plugins: [react()],
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
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the vendor libraries out of the app bundle.
         *
         * Route-level splitting already keeps pages out of the first load; this
         * handles the other half. These libraries change only when we upgrade
         * them, so giving them their own hashed files means a normal app deploy
         * leaves them cached in every partner's browser instead of re-shipping
         * ~200 kB of React on every release.
         *
         * `socket.io` is separated for a second reason: only the support chat
         * needs it, so it is never on the critical path of a first paint.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\/]node_modules[\/](react|react-dom|scheduler|react-router)/.test(id)) return 'react'
          if (id.includes('socket.io') || id.includes('engine.io')) return 'realtime'
          if (id.includes('@sentry')) return 'sentry'
          if (id.includes('lucide-react')) return 'icons'
          return 'vendor'
        },
      },
    },
  },
  optimizeDeps: {
    // Workspace packages are consumed as source — don't pre-bundle them
    // so edits hot-reload across the monorepo boundary.
    exclude: ['@reserva/ui', '@reserva/shared'],
  },
})

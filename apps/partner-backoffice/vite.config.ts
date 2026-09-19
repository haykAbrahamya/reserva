import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { requireEnv } from '../../tools/vite/require-env.mjs'

// Shared design-system styles folder. Added to SCSS loadPaths so any
// .module.scss can simply `@use 'variables' as *` regardless of its depth.
const uiStyles = fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))
const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  /*
   * Proxy the API in development so the browser makes a SAME-ORIGIN request.
   *
   * The deployed API allow-lists only *.reserva.am for CORS, so a dev server on
   * http://localhost never gets an Access-Control-Allow-Origin back and every
   * call dies at preflight. Proxying removes CORS from development entirely.
   *
   * Target comes from VITE_PROXY_TARGET, read via loadEnv so it can live in
   * .env.local rather than having to be exported in the shell.
   */
  const env = loadEnv(mode, appRoot, 'VITE_')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:4000'
  const forward = (extra = {}) => ({ target, changeOrigin: true, ...extra })

  return {
    // A production build without an absolute VITE_API_URL is a broken deploy, so
    // it fails here instead of in a visitor's browser. See tools/vite/require-env.mjs.
    plugins: [react(), requireEnv(['VITE_API_URL'])],
    server: {
      proxy: {
        '/api': forward(),
        '/uploads': forward(),
        /*
         * The support chat. With a relative VITE_API_URL, http.ts derives
         * API_ORIGIN = '' and socket.io connects to THIS origin, so its
         * handshake needs forwarding too. ws:true carries the Upgrade through —
         * without it the transport silently falls back to polling forever.
         */
        '/socket.io': forward({ ws: true }),
      },
    },
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
  }
})

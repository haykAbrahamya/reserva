import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { requireEnv } from '../../tools/vite/require-env.mjs'

// Shared design-system styles folder, exposed to SCSS loadPaths so any
// .module.scss can `@use 'variables' as *` regardless of its depth.
const uiStyles = fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))
const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  /*
   * Proxy the API in development so the browser makes a SAME-ORIGIN request.
   *
   * The deployed API allow-lists only *.reserva.am for CORS, so a dev server on
   * http://localhost never gets an Access-Control-Allow-Origin back and every
   * call dies at preflight. Proxying removes CORS from development entirely —
   * the same approach apps/vacancies already used.
   *
   * Target comes from VITE_PROXY_TARGET, read via loadEnv so it can live in
   * .env.local rather than having to be exported in the shell.
   *
   * Production is unaffected: .env.production is mode-specific and therefore
   * outranks .env.local, so the build still bakes the absolute URL.
   */
  const env = loadEnv(mode, appRoot, 'VITE_')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:4000'
  const forward = () => ({ target, changeOrigin: true })

  return {
    // A production build without an absolute VITE_API_URL is a broken deploy, so
    // it fails here instead of in a visitor's browser. See tools/vite/require-env.mjs.
    plugins: [react(), requireEnv(['VITE_API_URL'])],
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
    server: {
      proxy: {
        '/api': forward(),
        // Logos and gallery images are served from the API origin as /uploads/..
        // paths. With a relative API base they resolve against THIS origin, so
        // they need the same proxy or every image 404s in development.
        '/uploads': forward(),
      },
    },
    optimizeDeps: {
      exclude: ['@reserva/ui', '@reserva/shared'],
    },
  }
})

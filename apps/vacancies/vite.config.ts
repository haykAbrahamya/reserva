import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { requireEnv } from '../../tools/vite/require-env.mjs'

// The shared design-system styles folder, exposed to SCSS loadPaths so any
// .module.scss can `@use 'variables' as *` regardless of its depth — same
// arrangement as the other three apps.
const uiStyles = fileURLToPath(new URL('../../packages/ui/src/styles', import.meta.url))

export default defineConfig({
  // A production build without an absolute VITE_API_URL is a broken deploy, so
  // it fails here instead of in a visitor's browser. See tools/vite/require-env.mjs.
  plugins: [react(), requireEnv(['VITE_API_URL'])],
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
    // Pinned so the three existing dev servers and this one never trade ports
    // between restarts, which silently breaks whatever was pointed at 5175.
    port: 5176,
    /*
     * Proxy the API in development so the browser makes a SAME-ORIGIN request.
     *
     * The alternative is adding this port to the backend CORS allow-list, which
     * works but means a new dev port is a backend config change plus a restart
     * — and a contributor who skips it sees an app that renders and silently
     * loads nothing. Proxying removes CORS from local development entirely.
     *
     * Production is unaffected: the deploy bakes an absolute VITE_API_URL, and
     * vacancies.reserva.am is already covered by the *.reserva.am CORS rule.
     */
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
      // Salon logos are served from the API origin as /uploads/.. paths. With a
      // relative API base those resolve against THIS origin, so they need the
      // same proxy or every logo 404s in development.
      '/uploads': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the vendor code that never changes away from ours, so a copy
         * tweak does not invalidate 150kB of React for every returning
         * visitor. The board is a page people come back to.
         */
        manualChunks: {
          // 'react-dom/client' explicitly: the entry imports that subpath, and
          // without naming it react-dom landed in the app chunk instead — so a
          // copy change invalidated 130kB of vendor code for every visitor.
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})

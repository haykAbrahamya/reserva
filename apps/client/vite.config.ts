import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// Shared design-system styles folder, exposed to SCSS loadPaths so any
// .module.scss can `@use 'variables' as *` regardless of its depth.
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
  optimizeDeps: {
    exclude: ['@reserva/ui', '@reserva/shared'],
  },
})

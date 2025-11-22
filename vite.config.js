import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Use relative paths for Electron production builds
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [react()],
  server: {
    watch: {
      // Ignore non-code files to prevent auto-reload during analysis
      // BUT allow .tsx/.jsx so Vite can transform them for dynamic imports
      ignored: [
        '**/src/generated/**/*.html',
        '**/src/generated/**/*.png',
        '**/src/generated/**/*.jpg',
        '**/src/generated/**/*.svg',
        '**/src/generated/**/*.json',
        '**/src/generated/**/*.xml',
        '**/src/generated/**/*.md',
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Exclude src/generated/ files EXCEPT puck/ directories
        if (id.includes('/src/generated/')) {
          // Allow ALL files in puck/ directories (puck.config.tsx + components it imports)
          if (id.includes('/puck/')) {
            return false // Include in bundle
          }
          // Exclude everything else in src/generated/
          return true
        }
        return false
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copy } from 'fs-extra'
import { resolve } from 'path'

// Плагин для копирования файлов работ
const copyWorksPlugin = () => {
  return {
    name: 'copy-works',
    writeBundle() {
      // Копируем папку works в dist
      copy(resolve(__dirname, 'src/works'), resolve(__dirname, 'dist/works'))
        .then(() => console.log('✅ Works files copied to dist'))
        .catch(err => console.error('❌ Error copying works files:', err))
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyWorksPlugin()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
})

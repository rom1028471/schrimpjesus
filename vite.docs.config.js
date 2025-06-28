import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copy } from 'fs-extra'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-works',
      writeBundle() {
        return copy('src/works', 'docs/works')
          .then(() => copy('public/assets', 'docs/assets'))
      }
    }
  ],
  build: {
    outDir: 'docs'
  },
  base: '/schrimpjesus/'
}) 
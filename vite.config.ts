import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages sert le site sous /<nom du dépôt>/
export default defineConfig({
  base: '/Vacances-app/',
  plugins: [react(), tailwindcss()],
  build: {
    // La liste des communes (~950 Ko, ~285 Ko gzip) est un fichier à part, chargé seulement à la demande.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

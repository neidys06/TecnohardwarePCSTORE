import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:demo` genera un único HTML autocontenido (router en memoria) para compartir la demo.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // `npm run dev:api`: el frontend llama a la API Spring Boot local (backend/, puerto 8080).
  server: { proxy: { '/api': 'http://localhost:8080' } },
  build:
    mode === 'demo'
      ? { outDir: 'dist-demo', assetsInlineLimit: () => true }
      : {
          // `npm run build:api` deja el frontend dentro del backend: Spring Boot lo sirve desde static/.
          ...(mode === 'api'
            ? { outDir: 'backend/src/main/resources/static', emptyOutDir: true }
            : {}),
          // El paquete de librerías (React, Radix, router) ronda 500 kB sin comprimir; ~160 kB con gzip.
          chunkSizeWarningLimit: 600,
          rolldownOptions: {
            output: {
              // React y las librerías cambian poco: van en su propio archivo para aprovechar la caché.
              codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] },
            },
          },
        },
}))

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROUTER?: 'browser' | 'memory'
  /** '1' = la aplicación usa la API (backend/) en vez de los datos del prototipo. */
  readonly VITE_API?: string
  readonly VITE_API_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

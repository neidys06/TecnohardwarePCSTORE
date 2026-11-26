import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import './fonts.css'
import './index.css'
import { Toaster } from '@/components/ui/toaster'
import { MODO_API } from '@/lib/api'
import { AppProvider } from '@/lib/store'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AppProvider>
  </StrictMode>,
)

// Acta 6 · uso sin conexión: guarda la aplicación para que abra aunque el local se quede sin
// wifi. El navegador solo lo permite en HTTPS o en localhost.
if (MODO_API && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin service worker la aplicación funciona igual, solo que no abre sin conexión */
    })
  })
}

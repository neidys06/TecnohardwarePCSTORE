import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import './fonts.css'
import './index.css'
import { Toaster } from '@/components/ui/toaster'
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

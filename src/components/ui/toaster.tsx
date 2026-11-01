import * as React from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'

import { cerrarAviso, getAvisos, suscribir } from '@/lib/toast'

/** Muestra los avisos abajo y al centro; en móvil quedan por encima de las pestañas inferiores. */
export function Toaster() {
  const avisos = React.useSyncExternalStore(suscribir, getAvisos, getAvisos)
  return (
    <div
      data-avisos
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[96px] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          className="pointer-events-auto flex w-full max-w-[420px] animate-in items-center gap-3 rounded-xl bg-foreground py-3 pr-2 pl-4 text-[15px] font-medium text-background shadow-float fade-in-0 slide-in-from-bottom-2"
        >
          {a.tipo === 'success' ? (
            <CircleCheck className="size-[18px] shrink-0" />
          ) : a.tipo === 'error' ? (
            <CircleAlert className="size-[18px] shrink-0 text-[#ff8a8a]" />
          ) : (
            <Info className="size-[18px] shrink-0" />
          )}
          <span className="min-w-0 flex-1">{a.texto}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => cerrarAviso(a.id)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

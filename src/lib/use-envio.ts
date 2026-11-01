import * as React from 'react'

import { mensajeError } from './acciones'
import { ApiError } from './api'
import { toast } from './toast'

/**
 * Ejecuta una acción que puede tardar (subir fotos, llamar al servidor), evita el doble
 * clic y muestra el error si algo falla. Devuelve los errores por campo que mande el servidor.
 */
export function useEnvio() {
  const [enviando, setEnviando] = React.useState(false)
  const enviar = React.useCallback(
    async (fn: () => Promise<void>, alFallar?: (campos: Record<string, string>) => void) => {
      if (enviando) return
      setEnviando(true)
      try {
        await fn()
      } catch (e) {
        toast.error(mensajeError(e))
        if (e instanceof ApiError) alFallar?.(e.campos)
      } finally {
        setEnviando(false)
      }
    },
    [enviando],
  )
  return { enviando, enviar }
}

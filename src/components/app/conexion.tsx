import * as React from 'react'
import { CloudOff, KeyRound, RefreshCw, Trash2 } from 'lucide-react'

import { Notice } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { MODO_API } from '@/lib/api'
import {
  accesoEnviado,
  accesosPendientes,
  descartarPrimero,
  describir,
  estaSincronizando,
  pendientes,
  sinConexion,
  sincronizar,
  suscribir,
} from '@/lib/sin-conexion'
import { useApp } from '@/lib/store'
import { toast } from '@/lib/toast'

/** Foto del estado de la conexión y de la cola; cambia solo cuando cambia algo visible. */
function useConexion() {
  const foto = React.useSyncExternalStore(
    suscribir,
    () =>
      JSON.stringify({
        sin: sinConexion(),
        sinc: estaSincronizando(),
        cola: pendientes().map((p) => [p.n, describir(p), p.error ?? '']),
        accesos: accesosPendientes(),
      }),
    () => '',
  )
  return foto
    ? (JSON.parse(foto) as {
        sin: boolean
        sinc: boolean
        cola: [number, string, string][]
        accesos: ReturnType<typeof accesosPendientes>
      })
    : null
}

/**
 * Aviso del panel de la administradora (Acta 6): sin conexión, cambios pendientes de enviar,
 * cambios que el servidor rechazó y usuarios con contraseña por enviar a los clientes
 * registrados sin conexión.
 */
export function EstadoConexion() {
  const { recargar, openDialog } = useApp()
  const c = useConexion()
  if (!MODO_API || !c) return null
  const { sin, sinc, cola, accesos } = c
  const rechazado = cola.find(([, , e]) => e)
  const reintentar = () =>
    void sincronizar().then((n) => {
      if (n) toast.success(`${n} ${n === 1 ? 'cambio enviado' : 'cambios enviados'} al servidor`)
      // recarga lo que el servidor guardó (ids reales, usuarios generados)
      return recargar().catch(() => {})
    })

  return (
    <>
      {sin && (
        <Notice tone="warning" title="Sin conexión a internet">
          Puedes seguir registrando clientes, equipos, órdenes, diagnósticos, fotos, mantenimientos
          y entregas: se guardan en este equipo y se envían solos cuando vuelva la conexión. La
          autorización del cliente y los mensajes de WhatsApp esperan a que vuelva.
          {cola.length > 0 &&
            ` Pendientes por enviar: ${cola.length} ${cola.length === 1 ? 'cambio' : 'cambios'}.`}
        </Notice>
      )}
      {!sin && cola.length > 0 && !rechazado && (
        <Notice
          tone="info"
          title={sinc ? 'Enviando lo registrado sin conexión…' : 'Hay cambios sin enviar'}
          action={
            !sinc && (
              <Button variant="secondary" size="sm" onClick={reintentar}>
                <RefreshCw />
                Enviar ahora
              </Button>
            )
          }
        >
          {cola.length} {cola.length === 1 ? 'cambio pendiente' : 'cambios pendientes'}:{' '}
          {cola.map(([, d]) => d).join(' · ')}.
        </Notice>
      )}
      {rechazado && (
        <Notice
          tone="danger"
          title="El servidor no aceptó un cambio hecho sin conexión"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={reintentar}>
                <RefreshCw />
                Reintentar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void descartarPrimero().then(() => {
                    toast.success('Cambio descartado')
                    reintentar()
                  })
                }
              >
                <Trash2 />
                Descartar
              </Button>
            </div>
          }
        >
          «{rechazado[1]}»: {rechazado[2]} Revisa los datos y vuelve a registrarlo, o descártalo
          para enviar los demás.
        </Notice>
      )}
      {accesos.map((a) => (
        <Notice
          key={a.cid}
          tone="info"
          title={`Acceso por enviar: ${a.nombre}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="whatsapp"
                size="sm"
                onClick={() => openDialog('cliente-creado', { id: a.cid, pass: a.pass })}
              >
                <KeyRound />
                Enviar usuario y contraseña
              </Button>
              <Button variant="secondary" size="sm" onClick={() => accesoEnviado(a.cid)}>
                Ya lo envié
              </Button>
            </div>
          }
        >
          Se registró sin conexión; el servidor ya generó su usuario ({a.usuario}) y su contraseña
          temporal.
        </Notice>
      ))}
    </>
  )
}

/** Ícono pequeño para la barra superior cuando no hay conexión. */
export function IndicadorSinConexion() {
  const c = useConexion()
  if (!MODO_API || !c?.sin) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[13px] font-medium text-warning">
      <CloudOff className="size-4" />
      Sin conexión
    </span>
  )
}

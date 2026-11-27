import * as React from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Camera, Check, ChevronRight, PackageCheck, Send } from 'lucide-react'
import { toast } from '@/lib/toast'

import { DropZone, sampleImage, useImageFiles } from '@/components/app/photos'
import { Field, KV, Notice, Segmented, StateBadge, Thumb, ToneBadge } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ago, digits, money } from '@/lib/dates'
import {
  nombreEquipo,
  adicionalPendiente,
  clienteDeOrden,
  cuentaCliente,
  equipoDe,
  missingEvidence,
  totalOrden,
} from '@/lib/domain'
import { mensajeError } from '@/lib/acciones'
import { useApp } from '@/lib/store'
import { useEnvio } from '@/lib/use-envio'
import { cn } from '@/lib/utils'

import { CancelButton, Modal, MoneyInput } from './modal'

export function NotificacionesDialog() {
  const { db, acciones, closeDialog } = useApp()
  const navigate = useNavigate()
  const leer = (id?: string) => {
    acciones.leerNotificaciones(id).catch((e) => toast.error(mensajeError(e)))
  }
  return (
    <Modal
      title="Notificaciones"
      description="Lo que necesita tu atención hoy."
      footer={
        <Button
          variant="secondary"
          onClick={() => {
            leer()
            closeDialog()
          }}
        >
          <Check />
          Marcar todo como leído
        </Button>
      }
    >
      <ul className="flex flex-col gap-2">
        {db.notifs.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                leer(n.id)
                closeDialog()
                navigate(n.to)
              }}
              className="flex w-full items-start gap-3 rounded-xl border p-4 text-left hover:bg-surface-2"
            >
              <span
                className={cn(
                  'mt-1.5 size-2.5 shrink-0 rounded-full',
                  n.leida ? 'bg-input' : 'bg-primary',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {n.titulo}
                  {!n.leida && <span className="sr-only"> (sin leer)</span>}
                </span>
                <span className="block text-[14px] text-ink-2">{n.detalle}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export function VistaRapidaDialog({ id }: { id: string }) {
  const { db, closeDialog, openDialog } = useApp()
  const navigate = useNavigate()
  const o = db.ordenes.find((x) => x.id === id)
  if (!o) return null
  const e = equipoDe(db, o.eq)
  const c = clienteDeOrden(db, o)
  const miss = missingEvidence(o)
  const pend = adicionalPendiente(o)
  return (
    <Modal
      title={`Orden ${o.id}`}
      description={`${c.nombre} · ${nombreEquipo(e)}`}
      footer={
        <>
          {miss.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => openDialog('evidencia', { id: o.id, tipo: miss[0] })}
            >
              <Camera />
              Adjuntar evidencia
            </Button>
          )}
          <Button
            onClick={() => {
              closeDialog()
              navigate(`/admin/ordenes/${o.id}`)
            }}
          >
            Abrir orden
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <StateBadge estado={o.estado} />
        {miss.length > 0 && <ToneBadge tone="danger">Faltan fotos de {miss.join(' y ')}</ToneBadge>}
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <KV k="Ingreso" v={`${o.ingreso} · ${ago(o.ingreso)}`} mono />
        <KV k="Valor" v={o.costo == null ? 'Por definir' : money(totalOrden(o))} mono />
        <div className="col-span-2">
          <KV k="Falla reportada" v={o.falla} />
        </div>
        {o.diag && (
          <div className="col-span-2">
            <KV k="Diagnóstico" v={o.diag} />
          </div>
        )}
        {pend && (
          <div className="col-span-2">
            <KV k="Adicional por autorizar" v={`${pend.desc} · +${money(pend.costo)}`} />
          </div>
        )}
        <div className="col-span-2">
          <KV
            k="Fotos"
            v={`${o.fotos.ingreso.length} de ingreso · ${o.fotos.proceso.length} del proceso · ${o.fotos.salida.length} de salida`}
          />
        </div>
      </dl>
    </Modal>
  )
}

export function NoAutorizoDialog({ id }: { id: string }) {
  const { db, acciones, closeDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const g = db.valorDiagnostico
  return (
    <Modal
      title="El cliente no autorizó"
      description={`Orden ${id}`}
      size="sm"
      footer={
        <>
          <CancelButton>Volver</CancelButton>
          <Button
            disabled={enviando}
            onClick={() =>
              enviar(async () => {
                await acciones.responderAutorizacion(id, false)
                closeDialog()
                toast.success('Orden cerrada solo con diagnóstico')
              })
            }
          >
            Cerrar la orden
          </Button>
        </>
      }
    >
      <p className="text-ink-2">La orden se cierra y se cobra solo el diagnóstico general:</p>
      <p className="text-[28px] font-semibold tnum">{money(g)}</p>
    </Modal>
  )
}

export function AdicionalDialog({ id }: { id: string }) {
  const { acciones, closeDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const [d0, setD] = React.useState('')
  const [c, setC] = React.useState('')
  const [err, setErr] = React.useState<{ d?: string; c?: string }>({})
  const save = () => {
    const er: typeof err = {}
    if (d0.trim().length < 10) er.d = 'Describe la nueva falla.'
    const n = Number(digits(c))
    if (!n) er.c = 'Escribe el costo adicional.'
    setErr(er)
    if (Object.keys(er).length) return
    enviar(async () => {
      await acciones.pedirAdicional(id, d0.trim(), n)
      closeDialog()
      toast.success('Se pidió una autorización adicional')
    })
  }
  return (
    <Modal
      title="Diagnóstico adicional"
      description={`Orden ${id} · el monto ya autorizado se conserva`}
      footer={
        <>
          <CancelButton />
          <Button onClick={save} disabled={enviando}>
            <Send />
            Pedir autorización
          </Button>
        </>
      }
    >
      <Field id="ad-d" label="Nueva falla encontrada" required error={err.d}>
        <Textarea
          id="ad-d"
          rows={3}
          value={d0}
          onChange={(e) => setD(e.target.value)}
          aria-invalid={!!err.d}
          aria-describedby={err.d ? 'ad-d-error' : undefined}
        />
      </Field>
      <Field id="ad-c" label="Costo adicional" required error={err.c}>
        <MoneyInput id="ad-c" value={c} onChange={setC} invalid={!!err.c} />
      </Field>
    </Modal>
  )
}

type Momento = 'ingreso' | 'proceso' | 'salida'
const AYUDA: Record<Momento, string> = {
  ingreso: 'Opcional. Muestra cómo llegó el equipo, antes de abrirlo.',
  proceso: 'Opcional. Registra lo que se va haciendo: piezas, daños encontrados, pruebas.',
  salida: 'Opcional. Muestra cómo se entrega el equipo.',
}

export function EvidenciaDialog({ id, tipo: t0 }: { id: string; tipo?: string }) {
  const { db, acciones, closeDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const o = db.ordenes.find((x) => x.id === id)
  const inicial: Momento =
    t0 === 'ingreso' || t0 === 'proceso' || t0 === 'salida'
      ? t0
      : o?.fotos.ingreso.length
        ? 'proceso'
        : 'ingreso'
  const [tipo, setTipo] = React.useState<Momento>(inicial)
  const [fotos, setFotos] = React.useState<string[]>([])
  const [nota, setNota] = React.useState('')
  const [err, setErr] = React.useState<{ f?: string; n?: string }>({})
  const onAdd = React.useCallback((urls: string[]) => {
    setErr({})
    setFotos((f) => [...f, ...urls])
  }, [])
  const files = useImageFiles(onAdd)
  if (!o) return null

  const save = () => {
    const er: typeof err = {}
    if (!fotos.length) er.f = 'Elige al menos una foto.'
    setErr(er)
    if (Object.keys(er).length) return
    enviar(async () => {
      await acciones.agregarEvidencia(id, tipo, fotos, nota.trim())
      closeDialog()
      toast.success(`${fotos.length} foto${fotos.length > 1 ? 's guardadas' : ' guardada'}`)
    })
  }

  return (
    <Modal
      title="Adjuntar evidencia fotográfica"
      description={`Orden ${id}`}
      footer={
        <>
          <CancelButton />
          <Button onClick={save} disabled={enviando}>
            <Check />
            {enviando ? 'Subiendo…' : 'Guardar fotos'}
          </Button>
        </>
      }
    >
      <Segmented
        label="Momento de la foto"
        value={tipo}
        onChange={setTipo}
        items={[
          { value: 'ingreso', label: 'Ingreso' },
          { value: 'proceso', label: 'Durante el servicio' },
          { value: 'salida', label: 'Salida' },
        ]}
      />
      <p className="-mt-1 text-[14px] text-ink-2">{AYUDA[tipo]}</p>
      {tipo === 'proceso' && (
        <Field id="ev-n" label="¿Qué se está haciendo? (opcional)" error={err.n}>
          <Input
            id="ev-n"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: se retiró el ventilador; tenía mucho polvo."
            aria-invalid={!!err.n}
            aria-describedby={err.n ? 'ev-n-error' : undefined}
          />
        </Field>
      )}
      <DropZone
        id="evf"
        label="Fotos"
        onFiles={files.handle}
        error={err.f || files.error}
        onSample={() => onAdd([sampleImage()])}
      />
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((s, i) => (
            <Thumb
              key={i}
              src={s}
              label={`Foto ${i + 1}`}
              onRemove={() => setFotos((f) => f.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}

export function EntregarDialog({ id }: { id: string }) {
  const { db, acciones, closeDialog } = useApp()
  const navigate = useNavigate()
  const { enviando, enviar } = useEnvio()
  const o = db.ordenes.find((x) => x.id === id)
  const [r, setR] = React.useState(() => (o ? clienteDeOrden(db, o).nombre : ''))
  const [quien, setQuien] = React.useState('')
  // Acta 6: los demás equipos del mismo cliente que ya están listos se pueden entregar y
  // cobrar en el mismo pago (cuenta única). Por defecto van marcados.
  const otrasListas = o
    ? cuentaCliente(db, clienteDeOrden(db, o).id).listas.filter((x) => x.id !== o.id)
    : []
  const [junto, setJunto] = React.useState<string[]>(() => otrasListas.map((x) => x.id))
  if (!o) return null
  const falta = missingEvidence(o).length > 0
  const seleccion = [o, ...otrasListas.filter((x) => junto.includes(x.id))]
  const total = seleccion.reduce((s, x) => s + totalOrden(x), 0)
  const pendientes = cuentaCliente(db, clienteDeOrden(db, o).id).ordenes.filter(
    (x) => x.estado !== 'fin',
  )
  return (
    <Modal
      title={
        seleccion.length > 1 ? `Entregar ${seleccion.length} equipos` : 'Marcar como entregada'
      }
      description={seleccion.map((x) => x.id).join(' · ')}
      size="sm"
      footer={
        <>
          <CancelButton />
          <Button
            disabled={falta || !r.trim() || !quien || enviando}
            onClick={() =>
              enviar(async () => {
                if (seleccion.length > 1)
                  await acciones.entregarVarias(
                    seleccion.map((x) => x.id),
                    r.trim(),
                    quien,
                  )
                else await acciones.entregar(id, r.trim(), quien)
                closeDialog()
                // Se hace el recibo de la entrega (uno o varios equipos, cuenta única).
                navigate(`/admin/recibo/${id}`)
                toast.success(
                  seleccion.length > 1
                    ? `${seleccion.length} órdenes entregadas`
                    : 'Orden entregada',
                )
              })
            }
          >
            <PackageCheck />
            Confirmar entrega · {money(total)}
          </Button>
        </>
      }
    >
      {falta && (
        <Notice tone="warning" title="Faltan las fotos de salida">
          Adjúntalas antes de confirmar la entrega.
        </Notice>
      )}
      {otrasListas.length > 0 && (
        <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
          <legend className="px-1 text-[14px] font-medium">
            Cuenta única: otros equipos listos de este cliente
          </legend>
          {otrasListas.map((x) => (
            <label key={x.id} className="flex items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={junto.includes(x.id)}
                onChange={(e) =>
                  setJunto((j) => (e.target.checked ? [...j, x.id] : j.filter((k) => k !== x.id)))
                }
              />
              <span className="min-w-0 flex-1">
                {nombreEquipo(equipoDe(db, x.eq))}{' '}
                <span className="text-muted-foreground">({x.id})</span>
              </span>
              <span className="tnum">{money(totalOrden(x))}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex items-baseline justify-between rounded-lg bg-secondary px-4 py-3">
        <span className="text-ink-2">Total a pagar ahora</span>
        <span className="text-xl font-semibold tnum">{money(total)}</span>
      </div>
      {pendientes.length > 0 && (
        <p className="text-[14px] text-muted-foreground">
          El cliente tiene{' '}
          {pendientes.length === 1 ? 'otro equipo' : `${pendientes.length} equipos más`} en el
          taller que aún no está{pendientes.length === 1 ? '' : 'n'} listo
          {pendientes.length === 1 ? '' : 's'}; se cobra{pendientes.length === 1 ? '' : 'n'} al
          entregarlo{pendientes.length === 1 ? '' : 's'}.
        </p>
      )}
      <Field id="en-q" label="Entregado por" required>
        <Select value={quien} onValueChange={setQuien}>
          <SelectTrigger id="en-q">
            <SelectValue placeholder="Elige quién entrega el equipo" />
          </SelectTrigger>
          <SelectContent>
            {(db.personal ?? []).map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="en-r" label="Recibido por (quien recoge el equipo)" required>
        <Input id="en-r" value={r} onChange={(e) => setR(e.target.value)} />
      </Field>
    </Modal>
  )
}

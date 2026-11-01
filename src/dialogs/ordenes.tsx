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
  adicionalPendiente,
  clienteDeOrden,
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
      description={`${c.nombre} · ${e.nombre}`}
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
  ingreso: 'Obligatoria. Muestra cómo llegó el equipo, antes de abrirlo.',
  proceso: 'Opcional. Registra lo que se va haciendo: piezas, daños encontrados, pruebas.',
  salida: 'Obligatoria. Muestra cómo se entrega el equipo.',
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
    if (tipo === 'proceso' && nota.trim().length < 5)
      er.n = 'Escribe qué se está haciendo en este momento.'
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
        <Field id="ev-n" label="¿Qué se está haciendo?" required error={err.n}>
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
  const { enviando, enviar } = useEnvio()
  const o = db.ordenes.find((x) => x.id === id)
  const [r, setR] = React.useState(() => (o ? clienteDeOrden(db, o).nombre : ''))
  const [quien, setQuien] = React.useState('')
  if (!o) return null
  const falta = missingEvidence(o).length > 0
  return (
    <Modal
      title="Marcar como entregada"
      description={`Orden ${id}`}
      size="sm"
      footer={
        <>
          <CancelButton />
          <Button
            disabled={falta || !r.trim() || !quien || enviando}
            onClick={() =>
              enviar(async () => {
                await acciones.entregar(id, r.trim(), quien)
                closeDialog()
                toast.success('Orden entregada')
              })
            }
          >
            <PackageCheck />
            Confirmar entrega
          </Button>
        </>
      }
    >
      {falta && (
        <Notice tone="warning" title="Faltan las fotos de salida">
          Adjúntalas antes de confirmar la entrega.
        </Notice>
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

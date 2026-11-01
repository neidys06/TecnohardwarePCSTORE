import * as React from 'react'
import { Check, RotateCcw, Send } from 'lucide-react'
import { toast } from '@/lib/toast'

import { Field, ToneBadge } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { digits } from '@/lib/dates'
import { clienteDe, equipoDe, fillTemplate, semaforo } from '@/lib/domain'
import { DEFAULT_TPL } from '@/lib/seed'
import { mensajeError } from '@/lib/acciones'
import { useApp } from '@/lib/store'
import { useEnvio } from '@/lib/use-envio'
import { enlaceWhatsApp } from '@/lib/whatsapp'

import { CancelButton, CopyBox, Modal } from './modal'

export function RecordatorioDialog({ eid }: { eid: string }) {
  const { db, acciones, closeDialog, openDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const e = equipoDe(db, eid)
  const c = clienteDe(db, e.cliente)
  const s = semaforo(db, e)
  const txt = fillTemplate(db.plantilla, {
    nombre: c.nombre.split(' ')[0],
    equipo: e.nombre,
    fecha: s.next ?? '',
    estado: (s.days ?? 0) < 0 ? 'venció' : 'vence',
  })
  const [mensaje, setMensaje] = React.useState(txt)
  const registrar = () =>
    enviar(async () => {
      await acciones.registrarRecordatorio(eid)
      closeDialog()
      toast.success('Recordatorio registrado')
    })
  return (
    <Modal
      title="Recordatorio de mantenimiento"
      description={`${c.nombre} · ${c.tel || 'sin teléfono'}`}
      footer={
        <>
          <CancelButton />
          {c.tel ? (
            <Button variant="whatsapp" disabled={enviando} asChild>
              <a
                href={enlaceWhatsApp(c.tel, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registrar}
              >
                <Send />
                Enviar por WhatsApp
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge tone={s.tone}>{s.k}</ToneBadge>
        <span className="text-ink-2">{s.texto}</span>
      </div>
      <CopyBox text={txt} onChange={setMensaje} />
      <Button
        variant="plain"
        size="sm"
        className="self-start px-0 text-brand-text"
        onClick={() => openDialog('plantilla', { volver: eid })}
      >
        Editar la plantilla para todos los recordatorios
      </Button>
    </Modal>
  )
}

const VARS = [
  ['{nombre}', 'Nombre del cliente'],
  ['{equipo}', 'Equipo'],
  ['{estado}', 'vence / venció'],
  ['{fecha}', 'Fecha del mantenimiento'],
] as const

export function PlantillaDialog({ volver }: { volver?: string }) {
  const { db, acciones, closeDialog, openDialog } = useApp()
  const [t, setT] = React.useState(db.plantilla)
  const [err, setErr] = React.useState('')
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const insertar = (x: string) => {
    const el = ref.current
    const a = el?.selectionStart ?? t.length
    const b = el?.selectionEnd ?? a
    setT(t.slice(0, a) + x + t.slice(b))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(a + x.length, a + x.length)
    })
  }
  const save = () => {
    if (!t.includes('{equipo}') || t.trim().length < 20)
      return setErr('El mensaje debe incluir {equipo} y explicar el recordatorio.')
    acciones
      .guardarPlantilla(t)
      .then(() => {
        toast.success('Plantilla de recordatorio guardada')
        if (volver) openDialog('recordatorio', { eid: volver })
        else closeDialog()
      })
      .catch((e) => setErr(mensajeError(e)))
  }
  return (
    <Modal
      title="Mensaje de recordatorio"
      description="Es el texto base para todos los recordatorios de mantenimiento. Al enviar cada uno, todavía puedes ajustarlo."
      footer={
        <>
          <Button variant="secondary" onClick={() => setT(DEFAULT_TPL)}>
            <RotateCcw />
            Restablecer
          </Button>
          <Button onClick={save}>
            <Check />
            Guardar plantilla
          </Button>
        </>
      }
    >
      <Field id="tp-t" label="Plantilla" error={err}>
        <Textarea
          id="tp-t"
          ref={ref}
          rows={5}
          value={t}
          onChange={(e) => setT(e.target.value)}
          aria-invalid={!!err}
          aria-describedby={err ? 'tp-t-error' : undefined}
        />
      </Field>
      <div>
        <p className="text-[14px] font-medium">Datos que se completan solos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {VARS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => insertar(k)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-[14px] hover:bg-surface-2"
              aria-label={`Insertar ${l}`}
            >
              <span className="font-semibold text-brand-text">{k}</span>
              <span className="text-ink-2">{l}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-secondary p-4">
        <p className="text-[14px] text-muted-foreground">Vista previa</p>
        <p className="mt-1">
          {fillTemplate(t, {
            nombre: 'Carlos',
            equipo: 'Lenovo IdeaPad 3 15ITL6',
            estado: 'venció',
            fecha: '12/10/2026',
          })}
        </p>
      </div>
    </Modal>
  )
}

export function UmbralDialog() {
  const { db, acciones, closeDialog } = useApp()
  const [v, setV] = React.useState(String(db.umbral))
  const [err, setErr] = React.useState('')
  const save = () => {
    const n = Number(digits(v))
    if (!n || n > 90) return setErr('Escribe un número de días entre 1 y 90.')
    acciones
      .guardarUmbral(n)
      .then(() => {
        closeDialog()
        toast.success(`Aviso actualizado a ${n} días`)
      })
      .catch((e) => setErr(mensajeError(e)))
  }
  return (
    <Modal
      title="Aviso de «próximo a vencer»"
      size="sm"
      footer={
        <>
          <CancelButton />
          <Button onClick={save}>
            <Check />
            Guardar
          </Button>
        </>
      }
    >
      <Field
        id="um-v"
        label="Días de anticipación"
        error={err}
        help="Un equipo pasa a «Próximo» cuando faltan estos días o menos."
      >
        <Input
          id="um-v"
          inputMode="numeric"
          className="tnum"
          value={v}
          onChange={(e) => setV(digits(e.target.value))}
          aria-invalid={!!err}
          aria-describedby={err ? 'um-v-error' : undefined}
        />
      </Field>
    </Modal>
  )
}

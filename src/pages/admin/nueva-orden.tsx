import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Check, Plus } from 'lucide-react'
import { toast } from '@/lib/toast'

import { DropZone, sampleImage, useImageFiles } from '@/components/app/photos'
import { Field, PageHeader, Thumb } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { fmtDate, HOY } from '@/lib/dates'
import { openOrder } from '@/lib/domain'
import { useApp } from '@/lib/store'
import { useEnvio } from '@/lib/use-envio'
import type { DB } from '@/lib/types'

const libre = (db: DB, cid: string) => {
  const eqs = db.equipos.filter((e) => e.cliente === cid)
  return (eqs.find((e) => !openOrder(db, e.id)) ?? eqs[0])?.id ?? ''
}

export default function NuevaOrdenPage() {
  const { db, acciones, openDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const e0 = db.equipos.find((e) => e.id === params.get('equipo'))
  const [cid, setCid] = React.useState(e0?.cliente ?? 'c1')
  const [eidSel, setEid] = React.useState(e0?.id ?? libre(db, e0?.cliente ?? 'c1'))
  const [falla, setFalla] = React.useState('')
  const [acc, setAcc] = React.useState('')
  const [recibio, setRecibio] = React.useState('')
  const [fotos, setFotos] = React.useState<string[]>([])
  const [err, setErr] = React.useState<{ e?: string; f?: string; r?: string }>({})
  const personal = db.personal ?? []
  const onAdd = React.useCallback((urls: string[]) => setFotos((f) => [...f, ...urls]), [])
  const files = useImageFiles(onAdd)

  const eqs = db.equipos.filter((e) => e.cliente === cid)
  // Si el equipo elegido no es del cliente (cambio de cliente o equipo recién creado), se toma uno libre.
  const eid = eqs.some((e) => e.id === eidSel) ? eidSel : libre(db, cid)
  const busy = eid ? openOrder(db, eid) : null

  const submit = () => {
    const er: typeof err = {}
    if (!eid) er.e = 'Este cliente no tiene equipos. Registra uno primero.'
    if (busy) er.e = `Este equipo ya tiene la orden ${busy.id} en curso.`
    if (falla.trim().length < 5) er.f = 'Describe la falla que reporta el cliente.'
    if (!recibio) er.r = 'Elige quién recibió el equipo.'
    setErr(er)
    if (Object.keys(er).length) return
    enviar(async () => {
      const n = await acciones.crearOrden({
        eq: eid,
        falla: falla.trim(),
        accesorios: acc.trim(),
        recibio,
        fotos,
      })
      toast.success(`Orden ${n} creada`)
      navigate(`/admin/ordenes/${n}`)
    })
  }

  return (
    <>
      <PageHeader
        back={{ to: '/admin/ordenes', label: 'Órdenes' }}
        title="Nueva orden de servicio"
        description="Registra el ingreso del equipo. La orden empieza «En diagnóstico»."
      />
      <Card className="flex max-w-[760px] flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="no-c" label="Cliente">
            <Select value={cid} onValueChange={setCid}>
              <SelectTrigger id="no-c">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {db.clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                    {c.cedula && ` · ${c.cedula}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="no-e" label="Equipo" error={err.e}>
            <Select value={eid} onValueChange={setEid} disabled={!eqs.length}>
              <SelectTrigger id="no-e" aria-invalid={!!err.e}>
                <SelectValue placeholder="Sin equipos registrados" />
              </SelectTrigger>
              <SelectContent>
                {eqs.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.tipo} · {e.nombre}
                    {openOrder(db, e.id) && ' (orden en curso)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button
          variant="plain"
          size="sm"
          className="-mt-2 self-start px-0 text-brand-text"
          onClick={() => openDialog('equipo', { cid })}
        >
          <Plus />
          Registrar un equipo nuevo para este cliente
        </Button>
        <Field id="no-f" label="Falla reportada" required error={err.f}>
          <Textarea
            id="no-f"
            rows={3}
            value={falla}
            onChange={(e) => setFalla(e.target.value)}
            placeholder="Lo que cuenta el cliente, con sus palabras."
            aria-invalid={!!err.f}
            aria-describedby={err.f ? 'no-f-error' : undefined}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="no-a" label="Accesorios recibidos">
            <Input
              id="no-a"
              value={acc}
              onChange={(e) => setAcc(e.target.value)}
              placeholder="Ej.: cargador original"
            />
          </Field>
          <Field id="no-d" label="Fecha de ingreso">
            <Input id="no-d" readOnly value={fmtDate(HOY)} className="tnum" />
          </Field>
        </div>
        <Field id="no-r" label="Recibido por" required error={err.r}>
          <Select value={recibio} onValueChange={setRecibio}>
            <SelectTrigger id="no-r" aria-invalid={!!err.r}>
              <SelectValue placeholder="Elige quién recibe el equipo" />
            </SelectTrigger>
            <SelectContent>
              {personal.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DropZone
          id="no-up"
          label="Fotos de ingreso (opcional: también puedes agregarlas después, antes del diagnóstico)"
          onFiles={files.handle}
          error={files.error}
          onSample={() => setFotos((f) => [...f, sampleImage()])}
        />
        {fotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fotos.map((s, i) => (
              <Thumb
                key={i}
                src={s}
                label={`Ingreso ${i + 1}`}
                onRemove={() => setFotos((f) => f.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}
        <div className="flex gap-2 max-md:flex-col-reverse md:justify-end max-md:[&>*]:w-full">
          <Button variant="secondary" asChild>
            <Link to="/admin/ordenes">Cancelar</Link>
          </Button>
          <Button onClick={submit} disabled={enviando}>
            <Check />
            Crear orden
          </Button>
        </div>
      </Card>
    </>
  )
}

import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Check, Package, Plus, X } from 'lucide-react'
import { toast } from '@/lib/toast'

import { DropZone, sampleImage, useImageFiles } from '@/components/app/photos'
import { Field, Notice, PageHeader, Thumb } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { digits, fmtDate, HOY, money } from '@/lib/dates'
import { equipoDe, totalOrden } from '@/lib/domain'
import { useApp } from '@/lib/store'
import { useEnvio } from '@/lib/use-envio'
import NotFound from '@/pages/not-found'

export default function RegistrarMantenimientoPage() {
  const { id = '' } = useParams()
  const { db, acciones, sesion } = useApp()
  const { enviando, enviar } = useEnvio()
  const navigate = useNavigate()
  const [t, setT] = React.useState('')
  const [rep, setRep] = React.useState<[string, number][]>([])
  const [rn, setRn] = React.useState('')
  const [rq, setRq] = React.useState('1')
  const [fotos, setFotos] = React.useState<string[]>([])
  const [err, setErr] = React.useState<{ t?: string; f?: string }>({})
  const onAdd = React.useCallback((urls: string[]) => setFotos((f) => [...f, ...urls]), [])
  const files = useImageFiles(onAdd)

  const o = db.ordenes.find((x) => x.id === id)
  if (!o) return <NotFound inline />
  const e = equipoDe(db, o.eq)
  const back = { to: `/admin/ordenes/${id}`, label: `Orden ${id}` }

  if (o.estado !== 'aut')
    return (
      <>
        <PageHeader back={back} title="Registrar mantenimiento" />
        <Notice tone="info" title="Esta orden no está en reparación">
          Solo se registra el mantenimiento de órdenes autorizadas.{' '}
          <Link to={back.to} className="font-medium underline">
            Volver a la orden
          </Link>
        </Notice>
      </>
    )

  const addRep = () => {
    if (!rn.trim()) return
    setRep((r) => [...r, [rn.trim(), Number(rq) || 1]])
    setRn('')
    setRq('1')
  }
  const submit = () => {
    const er: typeof err = {}
    if (t.trim().length < 10) er.t = 'Describe el trabajo realizado (mínimo 10 caracteres).'
    if (!fotos.length) er.f = 'Las fotos de salida son obligatorias. Adjunta al menos una.'
    setErr(er)
    if (Object.keys(er).length) return
    enviar(async () => {
      await acciones.registrarMantenimiento(o.id, {
        trabajo: t.trim(),
        repuestos: rep,
        responsable: sesion.nombre,
        fotos,
      })
      toast.success('Mantenimiento registrado. La orden quedó «Finalizada».')
      navigate(back.to)
    })
  }

  return (
    <>
      <PageHeader
        back={back}
        title="Registrar mantenimiento"
        description={`${e.nombre} · Al guardar, la orden pasa a «Finalizada» y queda en el historial del equipo.`}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-5">
          <Field id="rm-t" label="¿Qué se hizo?" required error={err.t}>
            <Textarea
              id="rm-t"
              rows={4}
              value={t}
              onChange={(ev) => setT(ev.target.value)}
              placeholder="Ej.: limpieza interna, cambio de pasta térmica y reemplazo de la bisagra izquierda."
              aria-invalid={!!err.t}
              aria-describedby={err.t ? 'rm-t-error' : undefined}
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[14px] font-medium">Repuestos utilizados</legend>
            {rep.length > 0 && (
              <ul className="flex flex-col gap-2">
                {rep.map(([n, q], i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border px-3.5 py-1.5">
                    <Package className="size-[18px] text-ink-2" />
                    <span className="min-w-0 flex-1">{n}</span>
                    <span className="text-ink-2 tnum">{q} und</span>
                    <Button
                      variant="quiet"
                      size="icon"
                      className="size-9"
                      aria-label={`Quitar ${n}`}
                      onClick={() => setRep((r) => r.filter((_, j) => j !== i))}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-[1fr_80px] gap-2 md:grid-cols-[1fr_96px_auto]">
              <label htmlFor="rm-rn" className="sr-only">
                Repuesto
              </label>
              <Input
                id="rm-rn"
                value={rn}
                onChange={(ev) => setRn(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    ev.preventDefault()
                    addRep()
                  }
                }}
                placeholder="Nombre del repuesto"
              />
              <label htmlFor="rm-rq" className="sr-only">
                Cantidad
              </label>
              <Input
                id="rm-rq"
                value={rq}
                onChange={(ev) => setRq(digits(ev.target.value))}
                inputMode="numeric"
                className="text-center tnum"
              />
              <Button variant="secondary" className="max-md:col-span-2" onClick={addRep}>
                <Plus />
                Agregar
              </Button>
            </div>
            <p className="text-[14px] text-muted-foreground">
              Si no se usaron repuestos, deja la lista vacía.
            </p>
          </fieldset>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="rm-f" label="Fecha del mantenimiento">
              <Input id="rm-f" readOnly value={fmtDate(HOY)} className="tnum" />
            </Field>
          </div>
          <DropZone
            id="rm-up"
            label="Fotos de salida"
            required
            onFiles={files.handle}
            error={err.f || files.error}
            onSample={() => setFotos((f) => [...f, sampleImage()])}
          />
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((s, i) => (
                <Thumb
                  key={i}
                  src={s}
                  label={`Salida ${i + 1}`}
                  onRemove={() => setFotos((f) => f.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
          <div className="flex gap-2 max-md:flex-col-reverse md:justify-end max-md:[&>*]:w-full">
            <Button variant="secondary" asChild>
              <Link to={back.to}>Cancelar</Link>
            </Button>
            <Button onClick={submit} disabled={enviando}>
              <Check />
              Guardar y finalizar
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold">Lo autorizado</h2>
          <p className="text-ink-2">{o.diag}</p>
          {o.adicionales
            ?.filter((a) => a.ok)
            .map((a, i) => (
              <p key={i} className="text-[14px] text-ink-2">
                Adicional: {a.desc}
              </p>
            ))}
          <div className="flex justify-between border-t pt-3">
            <span className="text-ink-2">Total</span>
            <span className="text-xl font-semibold tnum">{money(totalOrden(o))}</span>
          </div>
        </Card>
      </div>
    </>
  )
}

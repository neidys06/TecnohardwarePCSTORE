import * as React from 'react'
import { Download, Eye, FileText, Upload } from 'lucide-react'

import { Field } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmtDate, HOY } from '@/lib/dates'
import { mensajeError } from '@/lib/acciones'
import { useApp } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { ListaPdf } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Límite del prototipo: el archivo se guarda en el navegador. En producción lo guarda el servidor. */
const MAX = 3 * 1024 * 1024
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const nombreMes = (d: Date) => `${MESES[d.getMonth()]} ${d.getFullYear()}`

const kb = (n: number) =>
  n < 1024
    ? '1 KB'
    : n >= 1024 * 1024
      ? `${(n / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(n / 1024)} KB`

function toBlobUrl(src: string) {
  const [meta, data] = src.split(',')
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return URL.createObjectURL(
    new Blob([bytes], { type: meta.match(/:(.*?);/)?.[1] ?? 'application/pdf' }),
  )
}

/** Con la API el PDF lo sirve el servidor (src = /api/...); en el prototipo es un data URL. */
const esUrl = (src: string) => !src.startsWith('data:')

export function verPdf(pdf: ListaPdf) {
  if (esUrl(pdf.src)) return void window.open(pdf.src, '_blank', 'noopener')
  const url = toBlobUrl(pdf.src)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function descargarPdf(pdf: ListaPdf) {
  if (esUrl(pdf.src)) {
    const a = document.createElement('a')
    a.href = `${pdf.src}?descargar=1`
    a.download = pdf.nombre
    return a.click()
  }
  const url = toBlobUrl(pdf.src)
  const a = document.createElement('a')
  a.href = url
  a.download = pdf.nombre
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Tarjeta con la lista vigente: mes, archivo y acciones. */
function Vigente({ pdf, portal }: { pdf: ListaPdf; portal?: boolean }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-text">
        <FileText className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-muted-foreground">
          {portal ? 'Lista de precios del mes' : 'Lista vigente en el portal'}
        </p>
        <h2 className="text-xl font-semibold">{pdf.mes}</h2>
        <p className="text-[14px] text-ink-2 tnum">
          {portal
            ? `Publicada el ${pdf.fecha}`
            : `${pdf.nombre} · ${kb(pdf.tamano)} · subida el ${pdf.fecha}`}
        </p>
      </div>
      <div className="flex gap-2 max-sm:[&>*]:flex-1">
        <Button variant={portal ? 'default' : 'secondary'} onClick={() => verPdf(pdf)}>
          <Eye />
          Ver lista
        </Button>
        <Button variant="secondary" onClick={() => descargarPdf(pdf)}>
          <Download />
          Descargar
        </Button>
      </div>
    </Card>
  )
}

/** Administración: subir el PDF de la lista de precios del mes (RF-13). */
export function ListaPdfAdmin() {
  const { db, acciones } = useApp()
  const ref = React.useRef<HTMLInputElement>(null)
  const [error, setError] = React.useState('')
  const [over, setOver] = React.useState(false)
  const pdf = db.listaPdf ?? null
  const opciones = [nombreMes(HOY), nombreMes(new Date(HOY.getFullYear(), HOY.getMonth() + 1, 1))]
  const [mes, setMes] = React.useState(pdf?.mes === opciones[0] ? opciones[1] : opciones[0])

  const elegir = (f?: File) => {
    if (!f) return
    if (f.type !== 'application/pdf') return setError('El archivo debe ser un PDF.')
    if (f.size > MAX) return setError('El PDF debe pesar máximo 3 MB.')
    setError('')
    const r = new FileReader()
    r.onload = () => {
      acciones
        .subirListaPdf({
          mes,
          nombre: f.name,
          src: String(r.result),
          tamano: f.size,
          fecha: fmtDate(HOY),
        })
        .then(() => toast.success(`Lista de ${mes} publicada en el portal`))
        .catch((e) => setError(mensajeError(e)))
    }
    r.readAsDataURL(f)
  }

  return (
    <>
      {pdf && <Vigente pdf={pdf} />}
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-[17px] font-semibold">
            {pdf ? 'Subir la lista de otro mes' : 'Subir la lista del mes'}
          </h2>
          <p className="mt-1 text-[14px] text-ink-2">
            Al subirla, reemplaza la lista vigente y los clientes la ven de inmediato en su portal.
          </p>
        </div>
        <div className="max-w-[320px]">
          <Field id="lp-mes" label="Mes de la lista">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger id="lp-mes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opciones.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            elegir(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition',
            error
              ? 'border-destructive bg-danger-soft/50'
              : over
                ? 'border-ring bg-brand-soft/60'
                : 'border-input bg-surface-2',
          )}
        >
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-ink-2">
            <Upload className="size-5" />
          </span>
          <p className="text-[15px]">Arrastra el PDF aquí o</p>
          <input
            ref={ref}
            type="file"
            accept="application/pdf"
            className="sr-only"
            aria-label="Elegir la lista de precios en PDF"
            onChange={(e) => {
              elegir(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Button onClick={() => ref.current?.click()}>
            <Upload />
            Elegir PDF
          </Button>
          <p className="text-[14px] text-muted-foreground">Solo PDF · máximo 3 MB</p>
        </div>
        {error && (
          <p role="alert" className="text-[14px] text-destructive">
            {error}
          </p>
        )}
      </Card>
    </>
  )
}

/** Portal: el cliente abre o descarga la lista del mes (RF-14). */
export function ListaPdfPortal() {
  const { db } = useApp()
  const pdf = db.listaPdf
  if (!pdf)
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-ink-2">
          <FileText className="size-6" />
        </span>
        <p className="font-semibold">La lista de este mes aún no está publicada</p>
        <p className="max-w-md text-[14px] text-ink-2">
          Escríbenos por WhatsApp y con gusto te damos el precio que necesitas.
        </p>
      </Card>
    )
  return <Vigente pdf={pdf} portal />
}

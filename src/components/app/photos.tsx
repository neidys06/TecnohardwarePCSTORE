import * as React from 'react'
import { ImageIcon, TriangleAlert, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MODO_API } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX = 5 * 1024 * 1024
/** Fotos de celular de hasta 25 MB: se reducen en el navegador antes de enviarlas. */
const MAX_ORIGINAL = 25 * 1024 * 1024
const LADO_MAX = 1600

/**
 * Reunión 7: las fotos del celular suelen pasar de 5 MB. Se reducen a 1600 px por lado y se
 * guardan como JPG (calidad 0,82), lo que deja cada foto en unos cientos de KB.
 */
async function reducir(f: File): Promise<string> {
  const url = URL.createObjectURL(f)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k)
    c.height = Math.round(img.naturalHeight * k)
    const g = c.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, 0, 0, c.width, c.height)
    const dataUrl = c.toDataURL('image/jpeg', 0.82)
    if (dataUrl.length * 0.75 > MAX) throw new Error('grande')
    return dataUrl
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Lee las fotos (JPG, PNG o la cámara del celular), las reduce y reporta las que no se pudieron usar. */
export function useImageFiles(onAdd: (urls: string[]) => void) {
  const [error, setError] = React.useState('')
  const handle = React.useCallback(
    (files: FileList | File[]) => {
      const list = [...files]
      if (!list.length) return
      setError('')
      Promise.all(
        list.map((f) =>
          f.type.startsWith('image/') && f.size <= MAX_ORIGINAL
            ? reducir(f).catch(() => null)
            : Promise.resolve(null),
        ),
      ).then((res) => {
        const urls = res.filter((u): u is string => !!u)
        if (urls.length < list.length)
          setError(
            'Una o más fotos no se pudieron usar. Usa fotos JPG o PNG (las del celular sirven) de máximo 25 MB.',
          )
        if (urls.length) onAdd(urls)
      })
    },
    [onAdd],
  )
  return { error, setError, handle }
}

/** Imagen de ejemplo dibujada en el navegador, para probar el flujo sin tener fotos a mano. */
export function sampleImage() {
  const c = document.createElement('canvas')
  c.width = 400
  c.height = 300
  const g = c.getContext('2d')!
  g.fillStyle = '#d9d6de'
  g.fillRect(0, 0, 400, 300)
  g.fillStyle = '#4c4955'
  g.fillRect(70, 70, 260, 150)
  g.fillStyle = '#131217'
  g.fillRect(85, 85, 230, 120)
  g.fillStyle = '#e6007e'
  g.fillRect(85, 205, 230, 8)
  g.fillStyle = '#4c4955'
  g.font = '600 18px Inter, sans-serif'
  g.fillText('Foto de ejemplo', 132, 260)
  return c.toDataURL('image/jpeg', 0.8)
}

export function DropZone({
  id,
  label,
  required,
  onFiles,
  onSample,
  error,
}: {
  id: string
  label: string
  required?: boolean
  onFiles: (f: FileList) => void
  onSample?: () => void
  error?: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[14px] font-medium">
        {label}
        {required && <span className="text-brand-text"> *</span>}
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          onFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border border-dashed p-5 text-center transition',
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
        <p className="text-[15px]">Arrastra las fotos aquí o</p>
        <input
          id={id}
          ref={ref}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => ref.current?.click()}>
            <ImageIcon />
            Elegir fotos
          </Button>
          {/* Con la API solo se suben fotos reales. */}
          {onSample && !MODO_API && (
            <Button variant="plain" size="sm" onClick={onSample}>
              Usar foto de ejemplo
            </Button>
          )}
        </div>
        <p className="text-[14px] text-muted-foreground">
          JPG o PNG · las fotos grandes del celular se reducen solas
        </p>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-[14px] text-destructive">
          <TriangleAlert className="size-4" />
          {error}
        </p>
      )}
    </div>
  )
}

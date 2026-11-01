import * as React from 'react'
import { ImageIcon, TriangleAlert, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MODO_API } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX = 5 * 1024 * 1024

/** Lee fotos JPG/PNG de hasta 5 MB como data URL y reporta las que no son válidas. */
export function useImageFiles(onAdd: (urls: string[]) => void) {
  const [error, setError] = React.useState('')
  const handle = React.useCallback(
    (files: FileList | File[]) => {
      const list = [...files]
      if (!list.length) return
      const ok = list.filter((f) => /image\/(jpeg|png)/.test(f.type) && f.size <= MAX)
      setError(
        ok.length < list.length
          ? 'Uno o más archivos no son válidos. Usa fotos JPG o PNG de máximo 5 MB.'
          : '',
      )
      Promise.all(
        ok.map(
          (f) =>
            new Promise<string>((res) => {
              const r = new FileReader()
              r.onload = () => res(String(r.result))
              r.readAsDataURL(f)
            }),
        ),
      ).then((urls) => urls.length && onAdd(urls))
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
          accept="image/png,image/jpeg"
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
        <p className="text-[14px] text-muted-foreground">JPG o PNG · máximo 5 MB por foto</p>
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

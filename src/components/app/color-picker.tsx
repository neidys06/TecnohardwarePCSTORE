import * as React from 'react'
import { Check, Palette } from 'lucide-react'

import { asegurarContraste, hexDe, PALETA } from '@/lib/temas'
import { mensajeError } from '@/lib/acciones'
import { useApp } from '@/lib/store'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/**
 * Colores del sistema (Acta 4): paleta de colores para elegir el que se desee o un color
 * personalizado. Se aplica al panel y al portal de los clientes.
 */
export function ColorPicker() {
  const { db, acciones } = useApp()
  const actual = db.color ?? 'rosado'
  const personalizado = /^#[0-9a-f]{6}$/i.test(actual) ? actual : null
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = React.useState('')

  const elegir = (valor: string, nombre: string) => {
    acciones
      .guardarColor(valor)
      .then(() => toast.success(`Color del sistema: ${nombre}`))
      .catch((e) => toast.error(mensajeError(e)))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Paleta */}
      <div className="flex flex-col gap-3">
        <p id="paleta-label" className="text-[14px] font-medium">
          Paleta de colores
        </p>
        <div
          role="radiogroup"
          aria-labelledby="paleta-label"
          className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-9"
        >
          {PALETA.map((c) => {
            const on = actual === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={c.label}
                onClick={() => elegir(c.id, c.label)}
                className="group flex flex-col items-center gap-1.5 rounded-lg py-1 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <span
                  className={cn(
                    'inline-flex size-11 items-center justify-center rounded-full text-white transition',
                    on
                      ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                      : 'group-hover:scale-105',
                  )}
                  style={{ background: c.hex }}
                >
                  {on && <Check className="size-5" strokeWidth={3} />}
                </span>
                <span className={cn('text-[12px] leading-4', on ? 'font-semibold' : 'text-ink-2')}>
                  {c.label}
                </span>
              </button>
            )
          })}
          {/* Personalizado */}
          <button
            type="button"
            role="radio"
            aria-checked={!!personalizado}
            aria-label="Color personalizado"
            onClick={() => inputRef.current?.click()}
            className="group relative flex flex-col items-center gap-1.5 rounded-lg py-1 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <span
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-full text-white transition',
                personalizado
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                  : 'group-hover:scale-105',
              )}
              style={{
                background:
                  personalizado ??
                  'conic-gradient(#e6007e, #c8102e, #c2410c, #a16207, #15803d, #0f766e, #1d4ed8, #7e22ce, #e6007e)',
              }}
            >
              {personalizado ? (
                <Check className="size-5" strokeWidth={3} />
              ) : (
                <Palette className="size-5" />
              )}
            </span>
            <span
              className={cn(
                'text-[12px] leading-4',
                personalizado ? 'font-semibold' : 'text-ink-2',
              )}
            >
              Otro color
            </span>
          </button>
          <input
            ref={inputRef}
            type="color"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            value={hexDe(actual)}
            onChange={(e) => {
              const elegido = e.target.value
              const final = asegurarContraste(elegido)
              setAviso(
                final !== elegido.toLowerCase()
                  ? 'Oscurecimos un poco el color para que el texto se lea bien.'
                  : '',
              )
              acciones.guardarColor(elegido).catch((e) => toast.error(mensajeError(e)))
            }}
          />
        </div>
        {aviso && personalizado && <p className="text-[14px] text-ink-2">{aviso}</p>}
      </div>

      {/* Vista previa */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary p-4">
        <span className="text-[14px] text-ink-2">Así se verá:</span>
        <span className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-[15px] font-semibold text-primary-foreground">
          Botón principal
        </span>
        <span className="inline-flex h-8 items-center rounded-lg bg-brand-soft px-3 text-[14px] font-medium text-brand-text">
          Menú activo
        </span>
        <span className="text-[15px] font-medium text-brand-text underline underline-offset-4">
          Enlace
        </span>
      </div>
    </div>
  )
}

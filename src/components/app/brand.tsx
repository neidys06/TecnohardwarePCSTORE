import logo from '@/assets/logo-tecnihardware.png'
import local208 from '@/assets/local-208.jpg'
import { MessageCircle } from 'lucide-react'

import { TIENDA } from '@/lib/seed'
import { cn } from '@/lib/utils'

export function Logo({
  size = 'md',
  subtitle,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  subtitle?: boolean
  className?: string
}) {
  const h = size === 'sm' ? 'h-[34px]' : size === 'lg' ? 'h-[68px]' : 'h-[44px]'
  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <img src={logo} alt="TecniHardware PC Store" className={cn(h, 'w-auto')} />
      {subtitle && (
        <span className="text-[14px] font-medium text-muted-foreground">Servicio técnico</span>
      )}
    </div>
  )
}

export function Slogan({ className }: { className?: string }) {
  return (
    <p className={cn('font-script font-semibold', className)}>
      ¡No es fe en la tecnología, es fe en la gente!
    </p>
  )
}

/** Trazas de circuito dibujadas en el color de la marca, inspiradas en la pieza gráfica de la tienda. */
function Circuit({ flip, height }: { flip?: boolean; height: number }) {
  const n = Math.max(6, Math.round(height / 34))
  const lines = Array.from({ length: n }, (_, i) => {
    const y = 18 + i * ((height - 36) / (n - 1))
    const run = 30 + ((i * 37) % 70)
    const dy = (i % 3 === 0 ? -1 : 1) * (10 + ((i * 13) % 18))
    const end = run + 26 + ((i * 23) % 40)
    return {
      d: `M0 ${y} H${run} L${run + 16} ${y + dy} H${end}`,
      cx: end + 4,
      cy: y + dy,
      white: i % 3 === 1,
    }
  })
  return (
    <svg
      aria-hidden
      viewBox={`0 0 160 ${height}`}
      preserveAspectRatio="xMinYMid meet"
      className={cn('h-full w-full', flip && '-scale-x-100')}
    >
      {lines.map((l, i) => (
        <g
          key={i}
          fill="none"
          stroke={l.white ? 'rgb(255 255 255 / .55)' : 'rgb(230 0 126 / .9)'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={l.d} />
          <circle cx={l.cx} cy={l.cy} r={4} />
        </g>
      ))}
    </svg>
  )
}

export function BrandPanel({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] bg-[#131217] text-white">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-[#e6007e]',
          compact ? 'h-[84px]' : 'h-[112px]',
        )}
      >
        <img
          src={logo}
          alt="TecniHardware PC Store"
          className={cn('w-auto', compact ? 'h-[52px]' : 'h-[68px]')}
        />
      </div>
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4',
          compact ? 'py-4' : 'py-6',
        )}
      >
        <div className={cn('min-h-0 opacity-90', compact ? 'h-[240px]' : 'h-full')}>
          <Circuit flip height={compact ? 240 : 420} />
        </div>
        <div className="flex h-full min-h-0 items-center justify-center">
          <img
            src={local208}
            alt="Fachada del local 208 de TecniHardware PC Store"
            className={cn(
              'w-auto rounded-[14px] object-contain shadow-[0_0_0_4px_rgb(255_255_255/.08)]',
              compact ? 'h-[240px]' : 'max-h-full',
            )}
          />
        </div>
        <div className={cn('min-h-0 opacity-90', compact ? 'h-[240px]' : 'h-full')}>
          <Circuit height={compact ? 240 : 420} />
        </div>
      </div>
      <div className={cn('flex shrink-0 flex-col gap-3', compact ? 'px-4 pb-4' : 'px-8 pb-7')}>
        <Slogan
          className={cn(
            'rounded-[14px] bg-white text-center text-[#131217]',
            compact ? 'px-4 py-3 text-[24px] leading-8' : 'px-6 py-4 text-[34px] leading-[42px]',
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px] font-medium text-white/75">
            Contacto directo · {TIENDA.local}
          </span>
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[#fdebf4] px-4 text-[17px] font-semibold text-[#131217] tnum">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#0e7a3d] text-white">
              <MessageCircle className="size-4" />
            </span>
            {TIENDA.whatsapp}
          </span>
        </div>
      </div>
    </div>
  )
}

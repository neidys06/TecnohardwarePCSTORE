import * as React from 'react'
import { Snowflake } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Modo navidad: copos de nieve, bastones de dulce y lazos que caen sobre la pantalla.
 * Es solo decorativo (no recibe clics ni lo leen los lectores de pantalla) y se puede
 * desactivar con el botón del copo; la elección se guarda en este navegador.
 * Si nadie lo ha tocado, se enciende solo del 20 de noviembre al 6 de enero.
 */
const CLAVE = 'th-navidad'
const EVENTO = 'th-navidad-cambio'

function temporada(hoy = new Date()) {
  const m = hoy.getMonth()
  const d = hoy.getDate()
  return (m === 10 && d >= 20) || m === 11 || (m === 0 && d <= 6)
}

function leer(): boolean {
  try {
    const v = localStorage.getItem(CLAVE)
    if (v === 'on') return true
    if (v === 'off') return false
  } catch {
    /* sin almacenamiento: se usa la temporada */
  }
  return temporada()
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENTO, cb)
    window.removeEventListener('storage', cb)
  }
}

export function useNavidad() {
  const activo = React.useSyncExternalStore(suscribir, leer, () => false)
  const cambiar = React.useCallback(() => {
    try {
      localStorage.setItem(CLAVE, leer() ? 'off' : 'on')
    } catch {
      /* sin almacenamiento: no se guarda la preferencia */
    }
    window.dispatchEvent(new Event(EVENTO))
  }, [])
  return { activo, cambiar }
}

function useMenosMovimiento() {
  const [reducir, setReducir] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  )
  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const f = () => setReducir(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return reducir
}

/** Botón para encender o apagar el modo navidad. */
export function BotonNavidad({ compacto = false }: { compacto?: boolean }) {
  const { activo, cambiar } = useNavidad()
  const texto = activo ? 'Desactivar modo navidad' : 'Activar modo navidad'
  return (
    <button
      type="button"
      onClick={cambiar}
      aria-pressed={activo}
      aria-label={texto}
      title={texto}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-[14px] font-medium transition',
        compacto ? 'size-11' : 'h-9 px-3',
        activo ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'text-ink-2 hover:bg-secondary',
      )}
    >
      <Snowflake className="size-[20px]" />
      {!compacto && <span>Navidad</span>}
    </button>
  )
}

function Copo({ tam }: { tam: number }) {
  return (
    <Snowflake
      width={tam}
      height={tam}
      strokeWidth={2.2}
      className="text-sky-300 drop-shadow-[0_0_1px_rgba(14,116,144,0.6)]"
    />
  )
}

function Baston({ tam }: { tam: number }) {
  const d = 'M12 42 V16 a8 8 0 0 1 16 0 v3'
  return (
    <svg width={tam} height={tam * 1.25} viewBox="0 0 40 50" fill="none">
      <path d={d} stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
      <path d={d} stroke="#dc2626" strokeWidth="7" strokeLinecap="round" strokeDasharray="5 6" />
      <path d={d} stroke="rgba(0,0,0,0.15)" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function Lazo({ tam }: { tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 48 48">
      <path d="M22 26 L14 44 L19 42 L21 46 Z" fill="#b91c1c" />
      <path d="M26 26 L34 44 L29 42 L27 46 Z" fill="#b91c1c" />
      <ellipse cx="13" cy="20" rx="11" ry="7" transform="rotate(-20 13 20)" fill="#ef4444" />
      <ellipse cx="35" cy="20" rx="11" ry="7" transform="rotate(20 35 20)" fill="#ef4444" />
      <ellipse cx="13" cy="20" rx="5" ry="3" transform="rotate(-20 13 20)" fill="#b91c1c" />
      <ellipse cx="35" cy="20" rx="5" ry="3" transform="rotate(20 35 20)" fill="#b91c1c" />
      <rect x="19" y="15" width="10" height="11" rx="3" fill="#dc2626" />
      <rect x="21.5" y="17" width="3" height="3" rx="1" fill="#fecaca" />
    </svg>
  )
}

type Pieza = {
  id: number
  tipo: 'copo' | 'baston' | 'lazo'
  x: number
  tam: number
  dur: number
  retraso: number
  giro: number
  vaiven: number
}

function crearPiezas(n: number): Pieza[] {
  // Siempre las mismas posiciones (semilla fija) para que no cambien en cada render.
  let s = 7
  const azar = () => (s = (s * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: n }, (_, id) => {
    const r = azar()
    const tipo = r < 0.7 ? 'copo' : r < 0.85 ? 'baston' : 'lazo'
    return {
      id,
      tipo,
      x: azar() * 100,
      tam: tipo === 'copo' ? 12 + azar() * 16 : 30 + azar() * 14,
      dur: 10 + azar() * 12,
      retraso: -azar() * 22,
      giro: (azar() < 0.5 ? -1 : 1) * (120 + azar() * 240),
      vaiven: 20 + azar() * 40,
    }
  })
}

/** Capa decorativa que cae sobre la pantalla cuando el modo navidad está activo. */
export function ModoNavidad() {
  const { activo } = useNavidad()
  const reducir = useMenosMovimiento()
  const piezas = React.useMemo(() => crearPiezas(32), [])
  if (!activo || reducir) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden print:hidden"
    >
      <style>{`
        @keyframes th-caer { from { transform: translateY(-12vh); } to { transform: translateY(112vh); } }
        @keyframes th-vaiven {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(var(--vaiven)) rotate(var(--giro)); }
        }
      `}</style>
      {piezas.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            animation: `th-caer ${p.dur}s linear ${p.retraso}s infinite`,
            opacity: p.tipo === 'copo' ? 0.8 : 0.95,
          }}
        >
          <div
            style={
              {
                '--vaiven': `${p.vaiven}px`,
                '--giro': `${p.giro / 4}deg`,
                animation: `th-vaiven ${p.dur / 3}s ease-in-out ${p.retraso}s infinite`,
              } as React.CSSProperties
            }
          >
            {p.tipo === 'copo' ? (
              <Copo tam={p.tam} />
            ) : p.tipo === 'baston' ? (
              <Baston tam={p.tam} />
            ) : (
              <Lazo tam={p.tam} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

import * as React from 'react'
import { Music, Snowflake } from 'lucide-react'

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

// ── Sonido: «Jingle Bells» (James Lord Pierpont, 1857, dominio público) sintetizado con
// Web Audio, sin archivos de audio. Empieza apagado; el navegador solo deja sonar después
// de un clic, así que si quedó encendido arranca con el primer clic en la página.
const CLAVE_SONIDO = 'th-navidad-sonido'
const N: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  C5: 523.25,
}
const MELODIA: [string, number][] = [
  ['E4', 1],
  ['E4', 1],
  ['E4', 2],
  ['E4', 1],
  ['E4', 1],
  ['E4', 2],
  ['E4', 1],
  ['G4', 1],
  ['C4', 1.5],
  ['D4', 0.5],
  ['E4', 4],
  ['F4', 1],
  ['F4', 1],
  ['F4', 1.5],
  ['F4', 0.5],
  ['F4', 1],
  ['E4', 1],
  ['E4', 1],
  ['E4', 0.5],
  ['E4', 0.5],
  ['E4', 1],
  ['D4', 1],
  ['D4', 1],
  ['E4', 1],
  ['D4', 2],
  ['G4', 2],
  ['E4', 1],
  ['E4', 1],
  ['E4', 2],
  ['E4', 1],
  ['E4', 1],
  ['E4', 2],
  ['E4', 1],
  ['G4', 1],
  ['C4', 1.5],
  ['D4', 0.5],
  ['E4', 4],
  ['F4', 1],
  ['F4', 1],
  ['F4', 1.5],
  ['F4', 0.5],
  ['F4', 1],
  ['E4', 1],
  ['E4', 1],
  ['E4', 0.5],
  ['E4', 0.5],
  ['G4', 1],
  ['G4', 1],
  ['F4', 1],
  ['D4', 1],
  ['C4', 4],
]
const PULSO = 0.24
let ctx: AudioContext | null = null
let temporizador: number | undefined

function campana(c: AudioContext, frec: number, t: number, dur: number) {
  const g = c.createGain()
  g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.3, dur * 1.6))
  for (const [mult, tipo] of [
    [1, 'triangle'],
    [2, 'sine'],
    [3, 'sine'],
  ] as const) {
    const o = c.createOscillator()
    o.type = tipo
    o.frequency.value = frec * mult
    const go = c.createGain()
    go.gain.value = mult === 1 ? 1 : 0.25 / mult
    o.connect(go).connect(g)
    o.start(t)
    o.stop(t + Math.max(0.3, dur * 1.6) + 0.05)
  }
}

function tocarFrase() {
  if (!ctx) return
  let t = ctx.currentTime + 0.05
  for (const [nota, pulsos] of MELODIA) {
    campana(ctx, N[nota], t, pulsos * PULSO)
    t += pulsos * PULSO
  }
  const total = MELODIA.reduce((a, [, p]) => a + p, 0) * PULSO
  temporizador = window.setTimeout(tocarFrase, (total + 3) * 1000)
}

function iniciarSonido() {
  if (ctx) return
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  ctx = new AC()
  void ctx.resume()
  tocarFrase()
}

function detenerSonido() {
  window.clearTimeout(temporizador)
  temporizador = undefined
  void ctx?.close()
  ctx = null
}

function leerSonido(): boolean {
  try {
    return localStorage.getItem(CLAVE_SONIDO) === 'on'
  } catch {
    return false
  }
}

function useSonidoNavidad(navidad: boolean) {
  const sonido = React.useSyncExternalStore(suscribir, leerSonido, () => false)
  React.useEffect(() => {
    if (!navidad || !sonido) {
      detenerSonido()
      return
    }
    if (ctx) return
    // El navegador exige un clic antes de reproducir sonido.
    const arrancar = () => iniciarSonido()
    window.addEventListener('pointerdown', arrancar, { once: true })
    return () => window.removeEventListener('pointerdown', arrancar)
  }, [navidad, sonido])
  const cambiar = React.useCallback(() => {
    const nuevo = !leerSonido()
    try {
      localStorage.setItem(CLAVE_SONIDO, nuevo ? 'on' : 'off')
    } catch {
      /* sin almacenamiento */
    }
    if (nuevo) iniciarSonido()
    else detenerSonido()
    window.dispatchEvent(new Event(EVENTO))
  }, [])
  return { sonido, cambiar }
}

/** Botón para encender o apagar el modo navidad (y, si está encendido, su música). */
export function BotonNavidad({ compacto = false }: { compacto?: boolean }) {
  const { activo, cambiar } = useNavidad()
  const musica = useSonidoNavidad(activo)
  const texto = activo ? 'Desactivar modo navidad' : 'Activar modo navidad'
  const textoMusica = musica.sonido ? 'Apagar la música de navidad' : 'Poner música de navidad'
  return (
    <>
      {activo && (
        <button
          type="button"
          onClick={musica.cambiar}
          aria-pressed={musica.sonido}
          aria-label={textoMusica}
          title={textoMusica}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg transition',
            compacto ? 'size-11' : 'size-9',
            musica.sonido
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'text-ink-2 hover:bg-secondary',
          )}
        >
          <Music className="size-[20px]" />
        </button>
      )}
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
    </>
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
  // Bastón de dulce navideño: forma de «J», blanco con rayas rojas en diagonal y un brillo.
  const id = React.useId().replace(/:/g, '')
  const d = 'M30 56 V20 a10 10 0 0 0 -20 0 v4'
  return (
    <svg width={tam * 0.72} height={tam} viewBox="0 0 40 62" fill="none">
      <defs>
        <pattern
          id={`rayas-${id}`}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(40)"
        >
          <rect width="9" height="9" fill="#ffffff" />
          <rect width="4" height="9" fill="#dc2626" />
          <rect x="5.2" width="1.2" height="9" fill="#16a34a" />
        </pattern>
      </defs>
      <path d={d} stroke="#7f1d1d" strokeWidth="10" strokeLinecap="round" opacity="0.35" />
      <path d={d} stroke={`url(#rayas-${id})`} strokeWidth="8" strokeLinecap="round" />
      <path
        d="M27.5 54 V21"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
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
      tam:
        tipo === 'copo'
          ? 12 + azar() * 16
          : tipo === 'baston'
            ? 42 + azar() * 16
            : 30 + azar() * 14,
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

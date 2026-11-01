/**
 * Colores del sistema (Acta 4): la administradora elige cualquier color de la paleta o uno
 * personalizado. Todos los colores de la paleta permiten texto blanco legible encima.
 */
export const PALETA = [
  { id: 'rosado', label: 'Rosado TecniHardware', hex: '#e6007e' },
  { id: 'fucsia', label: 'Fucsia', hex: '#c026d3' },
  { id: 'rojo', label: 'Rojo', hex: '#c8102e' },
  { id: 'vino', label: 'Vino', hex: '#9f1239' },
  { id: 'naranja', label: 'Naranja', hex: '#c2410c' },
  { id: 'mostaza', label: 'Mostaza', hex: '#a16207' },
  { id: 'cafe', label: 'Café', hex: '#92400e' },
  { id: 'verde', label: 'Verde', hex: '#15803d' },
  { id: 'esmeralda', label: 'Esmeralda', hex: '#047857' },
  { id: 'turquesa', label: 'Turquesa', hex: '#0f766e' },
  { id: 'azul', label: 'Azul', hex: '#1d4ed8' },
  { id: 'marino', label: 'Azul marino', hex: '#1e3a8a' },
  { id: 'morado', label: 'Morado', hex: '#7e22ce' },
  { id: 'violeta', label: 'Violeta', hex: '#6d28d9' },
  { id: 'gris', label: 'Gris', hex: '#4b5563' },
  { id: 'grafito', label: 'Grafito', hex: '#1f2937' },
] as const

/** Valor guardado: id de la paleta o un color personalizado #rrggbb. */
export type ColorElegido = string

export const colorDePaleta = (id: string) => PALETA.find((p) => p.id === id)

export function hexDe(c: ColorElegido | undefined): string {
  if (!c) return PALETA[0].hex
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase()
  return colorDePaleta(c)?.hex ?? PALETA[0].hex
}

// ---------- utilidades de color ----------
type RGB = [number, number, number]
const toRgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
const toHex = (c: RGB) =>
  '#' +
  c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** Contraste del color con el blanco (texto de botones y fondo de la página). */
export const contrasteConBlanco = (h: string) => 1.05 / (lum(toRgb(h)) + 0.05)
const mezclar = (a: RGB, b: RGB, t: number): RGB =>
  [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB
const NEGRO: RGB = [0, 0, 0]
const BLANCO: RGB = [255, 255, 255]

/** Oscurece el color lo justo para que el texto blanco encima y el color sobre blanco sean legibles (4,5:1). */
export function asegurarContraste(h: string) {
  let c = toRgb(h)
  for (let i = 0; i < 40 && contrasteConBlanco(toHex(c)) < 4.5; i++) c = mezclar(c, NEGRO, 0.06)
  return toHex(c)
}

/** Variables de diseño derivadas de un solo color. */
export function variablesDeColor(h: string): Record<string, string> {
  const base = asegurarContraste(h)
  const c = toRgb(base)
  return {
    '--primary': base,
    '--ring': base,
    '--primary-hover': toHex(mezclar(c, NEGRO, 0.16)),
    '--brand-text': toHex(mezclar(c, NEGRO, 0.1)),
    '--brand-soft': toHex(mezclar(c, BLANCO, 0.9)),
    '--brand-border': toHex(mezclar(c, BLANCO, 0.65)),
  }
}

export function aplicarColor(c: ColorElegido | undefined) {
  const vars = variablesDeColor(hexDe(c))
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v)
  try {
    localStorage.setItem('th-accent-vars', JSON.stringify(vars)) // lo lee index.html antes de pintar
  } catch {
    /* sin almacenamiento */
  }
}

import { MODO_API } from './api'

/**
 * Fecha de referencia: en el prototipo es fija para que la demo siempre muestre los mismos
 * semáforos; con la API es el día de hoy.
 */
export const HOY = MODO_API
  ? (() => {
      const d = new Date()
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    })()
  : new Date(2026, 9, 18)

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function parseDate(s: string) {
  const [d, m, y] = s.slice(0, 10).split('/').map(Number)
  return new Date(y, m - 1, d)
}
export function fmtDate(dt: Date) {
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}
export function fmtLong(s: string) {
  const d = parseDate(s)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
export function monthShort(d: Date) {
  return MESES[d.getMonth()]
}
export function addMonths(s: string, n: number) {
  const d = parseDate(s)
  d.setMonth(d.getMonth() + n)
  return fmtDate(d)
}
export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}
export function ago(s: string) {
  const d = daysBetween(parseDate(s), HOY)
  return d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`
}
export function nowStamp() {
  return `${fmtDate(HOY)} ${new Date().toTimeString().slice(0, 5)}`
}
export function money(n: number | null | undefined) {
  return n == null ? 'Por definir' : '$' + n.toLocaleString('es-CO').replace(/,/g, '.')
}
export function thousands(v: string) {
  const d = v.replace(/\D/g, '')
  return d ? Number(d).toLocaleString('es-CO').replace(/,/g, '.') : ''
}
export const digits = (s: string) => (s || '').replace(/\D/g, '')
export const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Avisos breves («Orden creada», «Precio guardado»). Almacén mínimo sin dependencias:
 * cualquier pantalla llama a `toast(...)` y el componente <Toaster /> los muestra.
 */
export type Aviso = { id: number; texto: string; tipo: 'info' | 'success' | 'error' }

type Listener = (avisos: Aviso[]) => void
const DURACION = 3000
const DURACION_ERROR = 6000
const MAX = 3

let avisos: Aviso[] = []
let siguiente = 1
const listeners = new Set<Listener>()
const emitir = () => listeners.forEach((l) => l(avisos))

export function cerrarAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id)
  emitir()
}

function mostrar(texto: string, tipo: Aviso['tipo']) {
  const id = siguiente++
  avisos = [...avisos, { id, texto, tipo }].slice(-MAX)
  emitir()
  window.setTimeout(() => cerrarAviso(id), tipo === 'error' ? DURACION_ERROR : DURACION)
  return id
}

export function suscribir(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const getAvisos = () => avisos

export const toast = Object.assign((texto: string) => mostrar(texto, 'info'), {
  success: (texto: string) => mostrar(texto, 'success'),
  error: (texto: string) => mostrar(texto, 'error'),
})

/**
 * Cliente HTTP de la API (backend/). Solo se usa cuando la aplicación se compila
 * en modo «api» (`npm run dev:api` / `npm run build:api`); el prototipo y la demo
 * siguen funcionando sin servidor, con los datos en el navegador.
 */
export const MODO_API = import.meta.env.VITE_API === '1'
const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  estado: number
  campos: Record<string, string>
  constructor(estado: number, mensaje: string, campos: Record<string, string> = {}) {
    super(mensaje)
    this.estado = estado
    this.campos = campos
  }
}

type Cuerpo = Record<string, unknown> | FormData | undefined

/**
 * Token CSRF que el servidor (Spring Security) deja en la cookie XSRF-TOKEN. Se devuelve
 * en la cabecera X-XSRF-TOKEN en cada petición que modifica datos: un sitio ajeno no
 * puede leer la cookie, así que no puede falsificar la petición.
 */
function tokenCsrf() {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : undefined
}

export async function api<T = unknown>(metodo: string, ruta: string, cuerpo?: Cuerpo): Promise<T> {
  const init: RequestInit = { method: metodo, credentials: 'include', headers: {} }
  const csrf = metodo === 'GET' ? undefined : tokenCsrf()
  if (csrf) (init.headers as Record<string, string>)['X-XSRF-TOKEN'] = csrf
  if (cuerpo instanceof FormData) init.body = cuerpo
  else if (cuerpo !== undefined) {
    init.body = JSON.stringify(cuerpo)
    ;(init.headers as Record<string, string>)['Content-Type'] = 'application/json'
  }
  let r: Response
  try {
    r = await fetch(BASE + ruta, init)
  } catch {
    throw new ApiError(
      0,
      'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
    )
  }
  if (r.status === 204) return undefined as T
  const datos = await r.json().catch(() => ({}))
  if (!r.ok)
    // El servidor responde { status, error, mensaje, campos } (ApiError del backend).
    throw new ApiError(
      r.status,
      datos.mensaje ?? datos.error ?? 'Ocurrió un error inesperado.',
      datos.campos ?? {},
    )
  return datos as T
}

/** data URL → Blob sin usar fetch (la política de seguridad del sitio no permite fetch a data:). */
export function dataUrlABlob(dataUrl: string) {
  const [meta, datos] = dataUrl.split(',')
  const tipo = meta.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
  const bin = atob(datos)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

/** Convierte las fotos que la interfaz tiene como data URL en archivos para enviarlas. */
export async function aArchivo(dataUrl: string, nombre: string) {
  const blob = dataUrlABlob(dataUrl)
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'application/pdf' ? 'pdf' : 'jpg'
  return new File([blob], nombre.includes('.') ? nombre : `${nombre}.${ext}`, { type: blob.type })
}

export async function formulario(campos: Record<string, string | undefined>, fotos: string[] = []) {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) if (v !== undefined) f.append(k, v)
  for (const [i, src] of fotos.entries()) f.append('fotos', await aArchivo(src, `foto-${i + 1}`))
  return f
}

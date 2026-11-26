/**
 * Uso sin conexión (Acta 6, solicitud de cambio 03).
 *
 * Cuando el local se queda sin wifi, la administradora puede seguir registrando clientes,
 * equipos, órdenes, diagnósticos, fotos, mantenimientos y entregas. Cada cambio:
 *  1. se aplica de inmediato en la pantalla (con un id temporal «tmp-…»), y
 *  2. se guarda en una cola en el navegador (IndexedDB) para enviarlo al servidor
 *     en el mismo orden apenas vuelva la conexión.
 *
 * Lo que depende del cliente o del servidor espera la conexión: la autorización, las
 * contraseñas, la configuración y la lista de precios. El usuario y la contraseña de un cliente
 * registrado sin conexión los genera el servidor al sincronizar; quedan en «Accesos por
 * enviar» para mandarlos por WhatsApp.
 */
import { api, ApiError, formulario } from './api'
import { fmtDate, HOY, money, nowStamp } from './dates'
import { ESTADOS } from './domain'
import { TIPOS_EQUIPO, type DB, type Orden } from './types'

export type Operacion =
  | { tipo: 'cliente'; tmp: string; nombre: string; tel: string; cedula: string }
  | { tipo: 'editar-cliente'; id: string; nombre: string; tel: string; cedula: string }
  | {
      tipo: 'equipo'
      tmp: string
      cid: string
      equipo: { tipo: string; nombre: string; serial: string; periodo: number | null }
    }
  | { tipo: 'periodo'; eid: string; periodo: number | null }
  | {
      tipo: 'orden'
      tmp: string
      eq: string
      falla: string
      accesorios: string
      recibio: string
      fotos: string[]
      por: string
    }
  | { tipo: 'diagnostico'; oid: string; diag: string; costo: number }
  | {
      tipo: 'evidencia'
      oid: string
      momento: 'ingreso' | 'proceso' | 'salida'
      fotos: string[]
      nota: string
    }
  | {
      tipo: 'mantenimiento'
      oid: string
      trabajo: string
      repuestos: [string, number][]
      responsable: string
      fotos: string[]
    }
  | { tipo: 'entrega'; oids: string[]; recibidoPor: string; entregadoPor: string }
  | { tipo: 'nota'; oid: string; texto: string }

export type Pendiente = Operacion & { n: number; creada: string; error?: string }

/** Usuario y contraseña de un cliente registrado sin conexión, para enviárselos al sincronizar. */
export type AccesoPendiente = { cid: string; nombre: string; usuario: string; pass: string }

type Guardado = { seq: number; cola: Pendiente[]; ids: Record<string, string> }

// ---------------------------------------------------------------------------------------
// Almacenamiento (IndexedDB; si no está disponible, la cola vive solo en memoria)
// ---------------------------------------------------------------------------------------
const BD = 'tecnihardware-sin-conexion'
let estado: Guardado = { seq: 0, cola: [], ids: {} }
let cargado: Promise<void> | null = null
const oyentes = new Set<() => void>()

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('datos')
    r.onsuccess = () => ok(r.result)
    r.onerror = () => mal(r.error)
  })
}
async function leer<T>(clave: string): Promise<T | undefined> {
  const db = await abrir()
  return new Promise((ok, mal) => {
    const r = db.transaction('datos').objectStore('datos').get(clave)
    r.onsuccess = () => ok(r.result as T | undefined)
    r.onerror = () => mal(r.error)
  })
}
async function escribir(clave: string, valor: unknown) {
  const db = await abrir()
  await new Promise<void>((ok, mal) => {
    const t = db.transaction('datos', 'readwrite')
    t.objectStore('datos').put(valor, clave)
    t.oncomplete = () => ok()
    t.onerror = () => mal(t.error)
  })
}

export function cargarCola() {
  cargado ??= leer<Guardado>('cola')
    .then((g) => {
      if (g) estado = g
    })
    .catch(() => {})
    .finally(avisar)
  return cargado
}
function guardar() {
  avisar()
  return escribir('cola', estado).catch(() => {
    /* sin IndexedDB (navegación privada): la cola queda en memoria */
  })
}
function avisar() {
  oyentes.forEach((f) => f())
}
export function suscribir(f: () => void) {
  oyentes.add(f)
  return () => void oyentes.delete(f)
}
export const pendientes = () => estado.cola
export const hayPendientes = () => estado.cola.length > 0

// Accesos por enviar (pocos datos: localStorage es suficiente)
const ACCESOS = 'th-accesos-pendientes'
export function accesosPendientes(): AccesoPendiente[] {
  try {
    return JSON.parse(localStorage.getItem(ACCESOS) ?? '[]') as AccesoPendiente[]
  } catch {
    return []
  }
}
function guardarAccesos(a: AccesoPendiente[]) {
  try {
    localStorage.setItem(ACCESOS, JSON.stringify(a))
  } catch {
    /* sin almacenamiento */
  }
  avisar()
}
export function accesoEnviado(cid: string) {
  guardarAccesos(accesosPendientes().filter((a) => a.cid !== cid))
}

// Última copia del estado del servidor, para abrir la aplicación sin conexión.
const COPIA = 'th-estado-sin-conexion'
export function guardarCopiaEstado(e: unknown) {
  try {
    localStorage.setItem(COPIA, JSON.stringify(e))
  } catch {
    /* sin espacio: se sigue sin copia */
  }
}
export function copiaEstado<T>(): T | null {
  try {
    const t = localStorage.getItem(COPIA)
    return t ? (JSON.parse(t) as T) : null
  } catch {
    return null
  }
}
export function borrarCopiaEstado() {
  try {
    localStorage.removeItem(COPIA)
    localStorage.removeItem(ACCESOS)
  } catch {
    /* nada que borrar */
  }
}

// ---------------------------------------------------------------------------------------
// Conexión
// ---------------------------------------------------------------------------------------
let fallaRed = false
/** Verdadero si el navegador dice que no hay red o la última petición no llegó al servidor. */
export const sinConexion = () =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) || fallaRed
export function marcarConexion(ok: boolean) {
  if (fallaRed === !ok) return
  fallaRed = !ok
  avisar()
}
export const esFallaDeRed = (e: unknown) => e instanceof ApiError && e.estado === 0

// ---------------------------------------------------------------------------------------
// Aplicar una operación sobre los datos de la pantalla (igual que lo haría el servidor)
// ---------------------------------------------------------------------------------------
const real = (id: string) => estado.ids[id] ?? traducidos[id] ?? id
/** Ids temporales ya sincronizados → id real (se conserva mientras la página siga abierta). */
const traducidos: Record<string, string> = {}
/** Id real de algo creado sin conexión, si ya se sincronizó; si no, el mismo id. */
export const traducir = (id: string) => real(id)

function anotar(o: Orden, nota: string, patch: Partial<Orden> = {}): Orden {
  const next = { ...o, ...patch }
  return { ...next, log: [...o.log, [nowStamp(), ESTADOS[next.estado].label, nota]] }
}

export function aplicar(d: DB, op: Operacion): DB {
  const ord = (id: string, f: (o: Orden) => Orden) => ({
    ...d,
    ordenes: d.ordenes.map((o) => (o.id === id || o.id === real(id) ? f(o) : o)),
  })
  switch (op.tipo) {
    case 'cliente':
      if (d.clientes.some((c) => c.id === op.tmp)) return d
      return {
        ...d,
        clientes: [
          ...d.clientes,
          {
            id: op.tmp,
            nombre: op.nombre,
            tel: op.tel,
            cedula: op.cedula,
            usuario: '(se genera al sincronizar)',
            desde: fmtDate(HOY),
          },
        ],
      }
    case 'editar-cliente':
      return {
        ...d,
        clientes: d.clientes.map((c) =>
          c.id === op.id || c.id === real(op.id)
            ? { ...c, nombre: op.nombre, tel: op.tel, cedula: op.cedula }
            : c,
        ),
      }
    case 'equipo':
      if (d.equipos.some((e) => e.id === op.tmp)) return d
      return {
        ...d,
        equipos: [...d.equipos, { id: op.tmp, cliente: real(op.cid), nota: '', ...op.equipo }],
      }
    case 'periodo':
      return {
        ...d,
        equipos: d.equipos.map((e) =>
          e.id === op.eid || e.id === real(op.eid) ? { ...e, periodo: op.periodo } : e,
        ),
      }
    case 'orden':
      if (d.ordenes.some((o) => o.id === op.tmp)) return d
      return {
        ...d,
        ordenes: [
          {
            id: op.tmp,
            eq: real(op.eq),
            ingreso: fmtDate(HOY),
            falla: op.falla + (op.accesorios ? ` Accesorios: ${op.accesorios}.` : ''),
            estado: 'diag',
            diag: '',
            costo: null,
            fotos: { ingreso: op.fotos, proceso: [], salida: [] },
            recibio: op.recibio,
            log: [
              [
                nowStamp(),
                ESTADOS.diag.label,
                `Orden creada sin conexión por ${op.por} · equipo recibido por ${op.recibio}`,
              ],
            ],
          },
          ...d.ordenes,
        ],
      }
    case 'diagnostico':
      return ord(op.oid, (o) =>
        anotar(o, `Diagnóstico registrado · costo ${money(op.costo)}`, {
          estado: 'pend',
          diag: op.diag,
          costo: op.costo,
        }),
      )
    case 'evidencia':
      return ord(op.oid, (o) =>
        op.momento === 'proceso'
          ? {
              ...o,
              fotos: {
                ...o.fotos,
                proceso: [
                  ...o.fotos.proceso,
                  ...op.fotos.map((src) => ({ src, nota: op.nota, fecha: nowStamp() })),
                ],
              },
            }
          : { ...o, fotos: { ...o.fotos, [op.momento]: [...o.fotos[op.momento], ...op.fotos] } },
      )
    case 'mantenimiento':
      return ord(op.oid, (o) =>
        anotar(o, `Mantenimiento registrado por ${op.responsable}`, {
          estado: 'fin',
          trabajo: op.trabajo,
          repuestos: op.repuestos,
          responsable: op.responsable,
          fotos: { ...o.fotos, salida: [...o.fotos.salida, ...op.fotos] },
        }),
      )
    case 'entrega': {
      let r = d
      for (const oid of op.oids)
        r = {
          ...r,
          ordenes: r.ordenes.map((o) =>
            o.id === oid || o.id === real(oid)
              ? anotar(o, `Entregado por ${op.entregadoPor} · recibido por ${op.recibidoPor}`, {
                  estado: 'ent',
                  entrega: fmtDate(HOY),
                  entrego: op.entregadoPor,
                })
              : o,
          ),
        }
      return r
    }
    case 'nota':
      return ord(op.oid, (o) => anotar(o, op.texto))
  }
}

/** Vuelve a aplicar la cola sobre el estado que llega del servidor (para no perder lo pendiente). */
export const aplicarCola = (d: DB) => estado.cola.reduce(aplicar, d)

/** Agrega una operación a la cola. Devuelve el id temporal si la operación crea algo. */
export async function encolar(op: Operacion) {
  await cargarCola()
  estado = {
    ...estado,
    seq: estado.seq + 1,
    cola: [...estado.cola, { ...op, n: estado.seq + 1, creada: nowStamp() }],
  }
  await guardar()
}
export function nuevoId(prefijo: 'c' | 'e' | 'OS') {
  return `tmp-${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}
export const esTemporal = (id: string) => id.startsWith('tmp-')

// ---------------------------------------------------------------------------------------
// Sincronización: envía la cola al servidor en orden
// ---------------------------------------------------------------------------------------
let sincronizando: Promise<number> | null = null
export const estaSincronizando = () => sincronizando != null

async function enviar(op: Operacion) {
  switch (op.tipo) {
    case 'cliente': {
      const r = await api<{
        cliente: { id: number; usuario: string }
        contrasenaTemporal: string
      }>('POST', '/clientes', {
        nombre: op.nombre,
        telefono: op.tel,
        cedula: op.cedula || undefined,
      })
      estado.ids[op.tmp] = String(r.cliente.id)
      guardarAccesos([
        ...accesosPendientes(),
        {
          cid: String(r.cliente.id),
          nombre: op.nombre,
          usuario: r.cliente.usuario,
          pass: r.contrasenaTemporal,
        },
      ])
      return
    }
    case 'editar-cliente':
      await api('PUT', `/clientes/${real(op.id)}`, {
        nombre: op.nombre,
        telefono: op.tel,
        cedula: op.cedula || undefined,
      })
      return
    case 'equipo': {
      const listado = (TIPOS_EQUIPO as readonly string[]).includes(op.equipo.tipo)
      const r = await api<{ id: number }>('POST', '/equipos', {
        idCliente: Number(real(op.cid)),
        tipo: listado ? op.equipo.tipo : 'Otros',
        tipoOtro: listado ? undefined : op.equipo.tipo,
        marcaModelo: op.equipo.nombre,
        serial: op.equipo.serial || undefined,
        periodo: op.equipo.periodo,
      })
      estado.ids[op.tmp] = String(r.id)
      return
    }
    case 'periodo':
      await api('PUT', `/equipos/${real(op.eid)}/periodo`, { meses: op.periodo })
      return
    case 'orden': {
      const f = await formulario(
        {
          idEquipo: real(op.eq),
          falla: op.falla,
          accesorios: op.accesorios || undefined,
          recibio: op.recibio,
        },
        op.fotos,
      )
      const r = await api<{ codigo: string }>('POST', '/ordenes', f)
      estado.ids[op.tmp] = r.codigo
      return
    }
    case 'diagnostico':
      await api('POST', `/ordenes/${real(op.oid)}/diagnostico`, {
        diagnostico: op.diag,
        costo: op.costo,
      })
      return
    case 'evidencia': {
      const codigo = { ingreso: 'INGRESO', proceso: 'PROCESO', salida: 'SALIDA' }[op.momento]
      const f = await formulario(
        { momento: codigo, nota: op.momento === 'proceso' ? op.nota : undefined },
        op.fotos,
      )
      await api('POST', `/ordenes/${real(op.oid)}/evidencias`, f)
      return
    }
    case 'mantenimiento': {
      const f = await formulario(
        {
          trabajo: op.trabajo,
          responsable: op.responsable,
          repuestos: JSON.stringify(
            op.repuestos.map(([nombre, cantidad]) => ({ nombre, cantidad })),
          ),
        },
        op.fotos,
      )
      await api('POST', `/ordenes/${real(op.oid)}/mantenimiento`, f)
      return
    }
    case 'entrega':
      if (op.oids.length > 1)
        await api('POST', '/ordenes/entrega-conjunta', {
          codigos: op.oids.map(real),
          recibidoPor: op.recibidoPor,
          entregadoPor: op.entregadoPor,
        })
      else
        await api('POST', `/ordenes/${real(op.oids[0])}/entrega`, {
          recibidoPor: op.recibidoPor,
          entregadoPor: op.entregadoPor,
        })
      return
    case 'nota':
      await api('POST', `/ordenes/${real(op.oid)}/notas`, { texto: op.texto })
      return
  }
}

/**
 * Envía la cola en orden. Se detiene si se vuelve a caer la conexión (y sigue después) o si el
 * servidor rechaza un cambio: ese queda marcado con el motivo para que la administradora lo
 * revise o lo descarte. Devuelve cuántas operaciones se enviaron.
 */
export function sincronizar(): Promise<number> {
  sincronizando ??= (async () => {
    await cargarCola()
    let enviadas = 0
    avisar()
    while (estado.cola.length) {
      const [op, ...resto] = estado.cola
      try {
        await enviar(op)
        marcarConexion(true)
        estado = { ...estado, cola: resto }
        enviadas++
        await guardar()
      } catch (e) {
        if (esFallaDeRed(e)) marcarConexion(false)
        else {
          estado = {
            ...estado,
            cola: [{ ...op, error: e instanceof Error ? e.message : 'Error' }, ...resto],
          }
          await guardar()
        }
        break
      }
    }
    if (!estado.cola.length) {
      Object.assign(traducidos, estado.ids)
      estado = { seq: estado.seq, cola: [], ids: {} }
      await guardar()
    }
    return enviadas
  })().finally(() => {
    sincronizando = null
    avisar()
  })
  return sincronizando
}

/** Descarta el primer cambio pendiente (el que el servidor rechazó) y los que dependen de él. */
export async function descartarPrimero() {
  await cargarCola()
  const [op, ...resto] = estado.cola
  if (!op) return
  const creado = 'tmp' in op ? op.tmp : null
  const depende = (x: Pendiente) => creado != null && JSON.stringify(x).includes(`"${creado}"`)
  estado = { ...estado, cola: resto.filter((x) => !depende(x)) }
  await guardar()
}

/** Texto corto de cada cambio pendiente, para mostrarlo en la lista. */
export function describir(op: Operacion) {
  switch (op.tipo) {
    case 'cliente':
      return `Registrar cliente ${op.nombre}`
    case 'editar-cliente':
      return `Editar cliente ${op.nombre}`
    case 'equipo':
      return `Registrar equipo ${op.equipo.nombre}`
    case 'periodo':
      return 'Cambiar periodo de mantenimiento'
    case 'orden':
      return 'Crear orden de servicio'
    case 'diagnostico':
      return `Diagnóstico · ${money(op.costo)}`
    case 'evidencia':
      return `${op.fotos.length} foto(s) de ${op.momento}`
    case 'mantenimiento':
      return 'Registrar mantenimiento'
    case 'entrega':
      return op.oids.length > 1 ? `Entregar ${op.oids.length} equipos` : 'Entregar equipo'
    case 'nota':
      return 'Anotación en el historial'
  }
}

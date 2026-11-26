import { addMonths, daysBetween, HOY, parseDate } from './dates'
import type { DB, Equipo, Estado, Orden } from './types'

export type Tone = 'neutral' | 'ink' | 'warning' | 'info' | 'success' | 'danger' | 'brand'

export const ESTADOS: Record<Estado, { label: string; tone: Tone; cliente: string }> = {
  diag: {
    label: 'En diagnóstico',
    tone: 'neutral',
    cliente: 'Estamos revisando tu equipo para saber qué tiene.',
  },
  pend: {
    label: 'Pendiente de autorización',
    tone: 'warning',
    cliente: 'Ya sabemos qué tiene. Te enviamos el costo por WhatsApp para que decidas.',
  },
  aut: {
    label: 'Autorizada',
    tone: 'info',
    cliente: 'Autorizaste la reparación. Estamos trabajando en tu equipo.',
  },
  espera: {
    label: 'En espera de autorización adicional',
    tone: 'warning',
    cliente: 'Encontramos algo más. Te escribimos por WhatsApp para que decidas.',
  },
  fin: {
    label: 'Finalizada',
    tone: 'success',
    cliente: 'Tu equipo está listo. Puedes pasar a recogerlo.',
  },
  ent: { label: 'Entregada', tone: 'ink', cliente: 'Ya recogiste tu equipo.' },
  cerr: {
    label: 'Cerrada · solo diagnóstico',
    tone: 'neutral',
    cliente: 'No autorizaste la reparación. Solo se cobró el diagnóstico.',
  },
}
export const ESTADOS_ORDEN: Estado[] = ['diag', 'pend', 'aut', 'espera', 'fin', 'ent', 'cerr']
const CERRADOS: Estado[] = ['ent', 'fin', 'cerr']

export const isOpen = (o: Orden) => !CERRADOS.includes(o.estado)
export const orderDate = (o: Orden) =>
  o.entrega || (o.log.length ? o.log[o.log.length - 1][0].slice(0, 10) : o.ingreso)
export const totalOrden = (o: Orden) =>
  o.estado === 'cerr'
    ? (o.cobro ?? 0)
    : (o.costo ?? 0) + (o.adicionales ?? []).reduce((s, a) => s + (a.ok ? a.costo : 0), 0)
/** La autorización adicional que espera respuesta del cliente, si hay una. */
/**
 * Usuario del portal generado a partir del nombre (Acta 5): inicial del nombre + primer
 * apellido, sin tildes ni espacios. Si ya existe, se numera (cmendoza2, cmendoza3…).
 * Es la misma regla que aplica el servidor.
 */
export function usuarioDesdeNombre(nombre: string, existentes: string[]) {
  const p = (nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  let base = !p.length
    ? 'cliente'
    : p.length === 1
      ? p[0]
      : p[0][0] + p[p.length >= 4 ? 2 : p.length - 1]
  base = base.slice(0, 16).padEnd(4, '0')
  let u = base
  for (let n = 2; existentes.includes(u); n++) u = `${base}${n}`
  return u
}

/** Nota del historial cuando se avisa por WhatsApp que el equipo está listo para recoger. */
export const AVISO_LISTO = 'Aviso de equipo listo enviado por WhatsApp'
/** Fecha del último aviso de «equipo listo», si ya se envió. */
export const avisoListo = (o: Orden) => o.log.findLast((l) => l[2] === AVISO_LISTO)?.[0]
export const adicionalPendiente = (o: Orden) => o.adicionales?.find((a) => a.ok == null)
/**
 * Lo que el cliente autorizó (Acta 6): el diagnóstico y los adicionales aprobados. Es el texto
 * con el que se llena «¿Qué se hizo?» al registrar el mantenimiento (misma regla del servidor).
 */
export function trabajoAutorizado(o: Orden) {
  let t = (o.diag ?? '').trim()
  for (const a of o.adicionales ?? []) {
    if (!a.ok || !a.desc.trim()) continue
    if (t && !t.endsWith('.')) t += '.'
    t += `${t ? ' ' : ''}Adicional: ${a.desc.trim()}`
  }
  return t
}
export const trabajoDe = (o: Orden) =>
  o.estado === 'cerr' ? 'Solo diagnóstico (no autorizado)' : o.trabajo || o.falla

/**
 * Cuenta única del cliente (Acta 6): sus órdenes que aún no se han entregado ni cerrado.
 * Lo que debe de todos sus equipos se suma en un solo total; las órdenes sin diagnóstico
 * todavía no tienen valor y se cuentan en `porDefinir`.
 */
export function cuentaCliente(db: DB, cid: string) {
  const eqs = new Set(db.equipos.filter((e) => e.cliente === cid).map((e) => e.id))
  const ordenes = db.ordenes.filter(
    (o) => eqs.has(o.eq) && o.estado !== 'ent' && o.estado !== 'cerr',
  )
  return {
    ordenes,
    total: ordenes.reduce((s, o) => s + (o.costo == null ? 0 : totalOrden(o)), 0),
    porDefinir: ordenes.filter((o) => o.costo == null).length,
    listas: ordenes.filter((o) => o.estado === 'fin'),
  }
}
/**
 * Recibo de entrega: se hace cuando el cliente recoge uno o varios equipos (cuenta única).
 * Las órdenes que se entregaron juntas quedan anotadas en el historial como
 * «entrega conjunta (OS-…, OS-…)»; con eso el recibo se puede volver a imprimir.
 * Formato provisional hasta recibir la plantilla de la empresa.
 */
export function reciboDe(db: DB, o: Orden) {
  if (o.estado !== 'ent') return null
  const nota = o.log.findLast((l) => /entregado por|entrega conjunta/i.test(l[2]))?.[2] ?? ''
  const conjunta = o.log
    .map((l) => /entrega conjunta \(([^)]+)\)/i.exec(l[2])?.[1])
    .findLast(Boolean)
  const codigos = conjunta ? conjunta.split(/\s*,\s*/) : [o.id]
  const ordenes = codigos
    .map((k) => db.ordenes.find((x) => x.id === k))
    .filter((x): x is Orden => !!x && x.estado === 'ent')
  if (!ordenes.some((x) => x.id === o.id)) ordenes.unshift(o)
  const recibidoPor =
    /recibido por (.+?)(?: · |$)/i.exec(
      o.log.findLast((l) => /recibido por/i.test(l[2]))?.[2] ?? nota,
    )?.[1] ?? ''
  const valor = (x: Orden) => x.cobro ?? totalOrden(x)
  return {
    numero: ordenes[0].id,
    fecha: o.entrega ?? '',
    cliente: clienteDeOrden(db, o),
    ordenes: ordenes.map((x) => ({ orden: x, equipo: equipoDe(db, x.eq), valor: valor(x) })),
    total: ordenes.reduce((s, x) => s + valor(x), 0),
    entregadoPor: o.entrego ?? '',
    recibidoPor,
  }
}
export const equipoDe = (db: DB, id: string) => db.equipos.find((e) => e.id === id)!
export const clienteDe = (db: DB, id: string) => db.clientes.find((c) => c.id === id)!
export const clienteDeOrden = (db: DB, o: Orden) => clienteDe(db, equipoDe(db, o.eq).cliente)

export function lastService(db: DB, eqId: string) {
  return (
    db.ordenes
      .filter((o) => o.eq === eqId && CERRADOS.includes(o.estado))
      .sort((a, b) => parseDate(orderDate(b)).getTime() - parseDate(orderDate(a)).getTime())[0] ??
    null
  )
}
export function lastForClient(db: DB, cid: string) {
  const eqs = db.equipos.filter((e) => e.cliente === cid).map((e) => e.id)
  return (
    db.ordenes
      .filter((o) => eqs.includes(o.eq) && CERRADOS.includes(o.estado))
      .sort((a, b) => parseDate(orderDate(b)).getTime() - parseDate(orderDate(a)).getTime())[0] ??
    null
  )
}
export const openOrder = (db: DB, eqId: string) =>
  db.ordenes.find((o) => o.eq === eqId && isOpen(o)) ?? null

export type Semaforo = {
  k: 'Vencido' | 'Próximo' | 'Vigente' | 'Sin periodo'
  tone: Tone
  next?: string
  days?: number
  texto: string
}
export function semaforo(db: DB, eq: Equipo): Semaforo {
  if (!eq.periodo) return { k: 'Sin periodo', tone: 'neutral', texto: 'Sin periodo configurado' }
  const last = lastService(db, eq.id)
  if (!last) return { k: 'Sin periodo', tone: 'neutral', texto: 'Sin servicio previo' }
  const next = addMonths(orderDate(last), eq.periodo)
  const d = daysBetween(HOY, parseDate(next))
  if (d < 0)
    return {
      k: 'Vencido',
      tone: 'danger',
      next,
      days: d,
      texto: `Venció hace ${-d} ${d === -1 ? 'día' : 'días'}`,
    }
  if (d <= db.umbral)
    return { k: 'Próximo', tone: 'warning', next, days: d, texto: `Faltan ${d} días` }
  return { k: 'Vigente', tone: 'success', next, days: d, texto: `Faltan ${d} días` }
}

/**
 * Fotografías que faltan para seguir con la orden. Desde el Acta 6 todas las fotos son
 * opcionales (ingreso, proceso y salida), así que no se exige ninguna; se conserva la función
 * para que las pantallas sigan mostrando el aviso si en el futuro se vuelve a pedir alguna.
 */
export function missingEvidence(_o: Orden): ('ingreso' | 'salida')[] {
  return []
}

export function fillTemplate(t: string, v: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`)
}

/**
 * Acciones de la aplicación (capa de datos del frontend).
 * Las pantallas no modifican los datos directamente: llaman a estas acciones.
 *  - Modo prototipo: los cambios se aplican en el navegador (como en la demo validada).
 *  - Modo API: cada acción llama al servidor (backend/) y luego recarga el estado,
 *    de modo que las reglas de negocio y los permisos se validan en el servidor.
 */
import { api, dataUrlABlob, formulario, MODO_API } from './api'
import {
  aplicar,
  borrarCopiaEstado,
  encolar,
  esFallaDeRed,
  esTemporal,
  hayPendientes,
  marcarConexion,
  nuevoId,
  sincronizar,
  sinConexion,
  traducir,
  type Operacion,
} from './sin-conexion'
import { fmtDate, HOY, money, nowStamp } from './dates'
import { ESTADOS, usuarioDesdeNombre } from './domain'
import { ADMIN } from './seed'
import { hexDe } from './temas'
import { TIPOS_EQUIPO, type DB, type ListaPdf, type Orden, type Rol } from './types'

export type DatosCliente = { nombre: string; tel: string; cedula: string }
export type DatosOrden = {
  eq: string
  falla: string
  accesorios: string
  /** Persona de la tienda que recibe el equipo (Acta 5). */
  recibio: string
  /** Fotos de ingreso: opcionales al crear la orden; se exigen antes del diagnóstico. */
  fotos: string[]
}
export type DatosEquipo = { tipo: string; nombre: string; serial: string; periodo: number | null }
export type Momento = 'ingreso' | 'proceso' | 'salida'

export interface Acciones {
  iniciarSesion(usuario: string, clave: string): Promise<Rol | 'primer-ingreso'>
  crearContrasena(nueva: string, confirmacion: string): Promise<Rol>
  cambiarContrasena(actual: string, nueva: string, confirmacion: string): Promise<void>
  /** Nombre que se muestra de la cuenta del Administrador (la comparten Gloria y Dichel). */
  cambiarNombre(nombre: string): Promise<void>
  cerrarSesion(): Promise<void>
  solicitarRestablecimiento(usuario: string): Promise<void>
  guardarCliente(id: string | undefined, d: DatosCliente): Promise<{ id: string; pass?: string }>
  restablecerContrasena(cid: string): Promise<string>
  crearEquipo(cid: string, d: DatosEquipo): Promise<void>
  guardarPeriodo(eid: string, periodo: number | null): Promise<void>
  crearOrden(d: DatosOrden): Promise<string>
  registrarDiagnostico(oid: string, diag: string, costo: number): Promise<void>
  responderAutorizacion(oid: string, autoriza: boolean): Promise<void>
  pedirAdicional(oid: string, desc: string, costo: number): Promise<void>
  responderAdicional(oid: string, autoriza: boolean): Promise<void>
  agregarEvidencia(oid: string, momento: Momento, fotos: string[], nota: string): Promise<void>
  registrarMantenimiento(
    oid: string,
    d: { trabajo: string; repuestos: [string, number][]; responsable: string; fotos: string[] },
  ): Promise<void>
  entregar(oid: string, recibidoPor: string, entregadoPor: string): Promise<void>
  /** Acta 6: entrega varios equipos del mismo cliente en un solo pago (cuenta única). */
  entregarVarias(oids: string[], recibidoPor: string, entregadoPor: string): Promise<void>
  anotar(oid: string, texto: string): Promise<void>
  registrarRecordatorio(eid: string): Promise<void>
  leerNotificaciones(id?: string): Promise<void>
  guardarPlantilla(t: string): Promise<void>
  guardarUmbral(n: number): Promise<void>
  guardarValorDiagnostico(n: number): Promise<void>
  guardarColor(c: string): Promise<void>
  subirListaPdf(l: ListaPdf): Promise<void>
  guardarFotoPerfil(clave: 'fotoAdmin' | 'fotoCliente', src: string): Promise<void>
}

export interface CtxAcciones {
  setDb: (fn: (d: DB) => DB) => void
  getDb: () => DB
  setRole: (r: Rol | null) => void
  /** Solo en modo API: vuelve a pedir el estado al servidor. */
  recargar: () => Promise<void>
  /** Nombre de quien inició sesión (para el historial de lo registrado sin conexión). */
  nombreUsuario?: () => string
  /** Solo en el prototipo: cambia el nombre de la sesión. */
  setNombre?: (nombre: string) => void
}

/** Cuentas del prototipo. En modo API la validación ocurre en el servidor. */
const CUENTAS: Record<string, { clave: string; destino: Rol | 'primer-ingreso' }> = {
  admin: { clave: 'Tecni2026', destino: 'admin' },
  cmendoza: { clave: 'Carlos2026', destino: 'cliente' },
  nuevo: { clave: 'Temporal1', destino: 'primer-ingreso' },
}

const CODIGO_BD = { ingreso: 'INGRESO', proceso: 'PROCESO', salida: 'SALIDA' } as const
const decision = (ok: boolean) => (ok ? 'AUTORIZA' : 'NO_AUTORIZA')

// ---------------------------------------------------------------------------
// Modo prototipo (datos en el navegador)
// ---------------------------------------------------------------------------
function local({ setDb, getDb, setRole, setNombre }: CtxAcciones): Acciones {
  const orden = (id: string, patch: Partial<Orden>, nota?: string) =>
    setDb((d) => ({
      ...d,
      ordenes: d.ordenes.map((o) => {
        if (o.id !== id) return o
        const next = { ...o, ...patch }
        return nota != null
          ? { ...next, log: [...o.log, [nowStamp(), ESTADOS[next.estado].label, nota]] }
          : next
      }),
    }))
  const responder = (o: Orden, ok: boolean) =>
    (o.adicionales ?? []).map((a) => (a.ok == null ? { ...a, ok } : a))
  const ord = (id: string) => getDb().ordenes.find((o) => o.id === id)!
  const ok = async () => {}

  return {
    async iniciarSesion(usuario, clave) {
      const c = CUENTAS[usuario.trim().toLowerCase()]
      if (!c || c.clave !== clave)
        throw new Error('Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.')
      if (c.destino !== 'primer-ingreso') setRole(c.destino)
      return c.destino
    },
    async crearContrasena() {
      setRole('cliente')
      return 'cliente'
    },
    cambiarContrasena: ok,
    async cambiarNombre(nombre) {
      setNombre?.(nombre)
    },
    async cerrarSesion() {
      setRole(null)
    },
    solicitarRestablecimiento: ok,
    async guardarCliente(id, c) {
      if (id) {
        setDb((d) => ({
          ...d,
          clientes: d.clientes.map((x) =>
            x.id === id ? { ...x, nombre: c.nombre, tel: c.tel, cedula: c.cedula } : x,
          ),
        }))
        return { id }
      }
      const db = getDb()
      const nid = `c${Math.max(...db.clientes.map((x) => Number(x.id.slice(1)))) + 1}`
      const usuario = usuarioDesdeNombre(c.nombre, ['admin', ...db.clientes.map((x) => x.usuario)])
      setDb((d) => ({
        ...d,
        clientes: [...d.clientes, { id: nid, ...c, usuario, desde: fmtDate(HOY) }],
      }))
      return { id: nid, pass: `Tecni${1000 + c.nombre.length * 41}` }
    },
    async restablecerContrasena(cid) {
      const c = getDb().clientes.find((x) => x.id === cid)!
      return `Th${4000 + c.nombre.length * 37}x`
    },
    async crearEquipo(cid, e) {
      const db = getDb()
      const id = `e${Math.max(...db.equipos.map((x) => Number(x.id.slice(1)))) + 1}`
      setDb((d) => ({ ...d, equipos: [...d.equipos, { id, cliente: cid, nota: '', ...e }] }))
    },
    async guardarPeriodo(eid, periodo) {
      setDb((d) => ({
        ...d,
        equipos: d.equipos.map((x) => (x.id === eid ? { ...x, periodo } : x)),
      }))
    },
    async crearOrden({ eq, falla, accesorios, recibio, fotos }) {
      const db = getDb()
      const max = Math.max(...db.ordenes.map((o) => Number(o.id.slice(3))))
      const n = `OS-${String(max + 1).padStart(4, '0')}`
      setDb((d) => ({
        ...d,
        ordenes: [
          {
            id: n,
            eq,
            ingreso: fmtDate(HOY),
            falla: falla + (accesorios ? ` Accesorios: ${accesorios}.` : ''),
            estado: 'diag',
            diag: '',
            costo: null,
            fotos: { ingreso: fotos, proceso: [], salida: [] },
            recibio,
            log: [
              [
                nowStamp(),
                'En diagnóstico',
                `Orden creada por ${ADMIN.nombre} · equipo recibido por ${recibio}`,
              ],
            ],
          },
          ...d.ordenes,
        ],
      }))
      return n
    },
    async registrarDiagnostico(oid, diag, costo) {
      orden(oid, { estado: 'pend', diag, costo }, `Diagnóstico registrado · costo ${money(costo)}`)
    },
    async responderAutorizacion(oid, autoriza) {
      if (autoriza) orden(oid, { estado: 'aut' }, 'El cliente autorizó')
      else
        orden(
          oid,
          { estado: 'cerr', cobro: getDb().valorDiagnostico, entrega: fmtDate(HOY) },
          'El cliente no autorizó · se cobra el diagnóstico general',
        )
    },
    async pedirAdicional(oid, desc, costo) {
      const o = ord(oid)
      orden(
        oid,
        { estado: 'espera', adicionales: [...(o.adicionales ?? []), { desc, costo }] },
        `Nueva falla · +${money(costo)}`,
      )
    },
    async responderAdicional(oid, autoriza) {
      const o = ord(oid)
      const pend = o.adicionales?.find((a) => a.ok == null)
      orden(
        oid,
        { estado: 'aut', adicionales: responder(o, autoriza) },
        autoriza ? `Adicional autorizado · +${money(pend?.costo)}` : 'Adicional no autorizado',
      )
    },
    async agregarEvidencia(oid, tipo, fotos, nota) {
      setDb((d) => ({
        ...d,
        ordenes: d.ordenes.map((x) => {
          if (x.id !== oid) return x
          if (tipo === 'proceso')
            return {
              ...x,
              fotos: {
                ...x.fotos,
                proceso: [
                  ...x.fotos.proceso,
                  ...fotos.map((src) => ({ src, nota, fecha: nowStamp() })),
                ],
              },
            }
          return { ...x, fotos: { ...x.fotos, [tipo]: [...x.fotos[tipo], ...fotos] } }
        }),
      }))
    },
    async registrarMantenimiento(oid, { trabajo, repuestos, responsable, fotos }) {
      setDb((d) => ({
        ...d,
        ordenes: d.ordenes.map((x) =>
          x.id === oid
            ? {
                ...x,
                estado: 'fin',
                trabajo,
                repuestos,
                responsable,
                fotos: { ...x.fotos, salida: [...x.fotos.salida, ...fotos] },
                log: [
                  ...x.log,
                  [nowStamp(), 'Finalizada', `Mantenimiento registrado por ${responsable}`],
                ],
              }
            : x,
        ),
      }))
    },
    async entregar(oid, r, quien) {
      orden(
        oid,
        { estado: 'ent', entrega: fmtDate(HOY), entrego: quien },
        `Entregado por ${quien} · recibido por ${r}`,
      )
    },
    async entregarVarias(oids, r, quien) {
      for (const oid of oids)
        orden(
          oid,
          { estado: 'ent', entrega: fmtDate(HOY), entrego: quien },
          `Entregado por ${quien} · recibido por ${r}${oids.length > 1 ? ` · entrega conjunta (${oids.join(', ')})` : ''}`,
        )
    },
    async anotar(oid, texto) {
      orden(oid, {}, texto)
    },
    registrarRecordatorio: ok,
    async leerNotificaciones(id) {
      setDb((d) => ({
        ...d,
        notifs: d.notifs.map((n) => (!id || n.id === id ? { ...n, leida: true } : n)),
      }))
    },
    async guardarPlantilla(plantilla) {
      setDb((d) => ({ ...d, plantilla }))
    },
    async guardarUmbral(umbral) {
      setDb((d) => ({ ...d, umbral }))
    },
    async guardarValorDiagnostico(valorDiagnostico) {
      setDb((d) => ({ ...d, valorDiagnostico }))
    },
    async guardarColor(color) {
      setDb((d) => ({ ...d, color }))
    },
    async subirListaPdf(listaPdf) {
      setDb((d) => ({ ...d, listaPdf }))
    },
    async guardarFotoPerfil(clave, src) {
      setDb((d) => ({ ...d, [clave]: src }))
    },
  }
}

// ---------------------------------------------------------------------------
// Modo API (servidor)
// ---------------------------------------------------------------------------
function remoto(ctx: CtxAcciones): Acciones {
  const { recargar, setDb, setRole } = ctx
  const post = async (ruta: string, cuerpo?: Record<string, unknown> | FormData) => {
    await api('POST', ruta, cuerpo)
    await recargar()
  }
  let colorPendiente: number | undefined

  return {
    async iniciarSesion(usuario, contrasena) {
      const r = await api<{ rol: string; debeCambiarContrasena: boolean }>('POST', '/auth/login', {
        usuario,
        contrasena,
      })
      if (r.debeCambiarContrasena) return 'primer-ingreso'
      await recargar()
      return r.rol === 'ADMINISTRADOR' ? 'admin' : 'cliente'
    },
    async crearContrasena(nueva, confirmacion) {
      await api('POST', '/auth/cambiar-contrasena', { nueva, confirmacion })
      const s = await api<{ rol: string }>('GET', '/auth/sesion')
      await recargar()
      return s.rol === 'ADMINISTRADOR' ? 'admin' : 'cliente'
    },
    async cambiarContrasena(actual, nueva, confirmacion) {
      await api('POST', '/auth/cambiar-contrasena', { actual, nueva, confirmacion })
    },
    async cambiarNombre(nombre) {
      await api('PUT', '/cuenta/nombre', { nombre })
      await recargar()
    },
    async cerrarSesion() {
      await api('POST', '/auth/logout').catch(() => {})
      setRole(null)
    },
    async solicitarRestablecimiento(usuario) {
      await api('POST', '/auth/solicitar-restablecimiento', { usuario })
    },
    async guardarCliente(id, c) {
      const datos = { nombre: c.nombre, telefono: c.tel, cedula: c.cedula || undefined }
      if (id) {
        await api('PUT', `/clientes/${id}`, datos)
        await recargar()
        return { id }
      }
      const r = await api<{ cliente: { id: number }; contrasenaTemporal: string }>(
        'POST',
        '/clientes',
        datos,
      )
      await recargar()
      return { id: String(r.cliente.id), pass: r.contrasenaTemporal }
    },
    async restablecerContrasena(cid) {
      const r = await api<{ contrasenaTemporal: string }>(
        'POST',
        `/clientes/${cid}/restablecer-contrasena`,
      )
      await recargar()
      return r.contrasenaTemporal
    },
    async crearEquipo(cid, e) {
      const listado = (TIPOS_EQUIPO as readonly string[]).includes(e.tipo)
      await post('/equipos', {
        idCliente: Number(cid),
        tipo: listado ? e.tipo : 'Otros',
        tipoOtro: listado ? undefined : e.tipo,
        marcaModelo: e.nombre,
        serial: e.serial || undefined,
        periodo: e.periodo,
      })
    },
    async guardarPeriodo(eid, meses) {
      await api('PUT', `/equipos/${eid}/periodo`, { meses })
      await recargar()
    },
    async crearOrden({ eq, falla, accesorios, recibio, fotos }) {
      const f = await formulario(
        { idEquipo: eq, falla, accesorios: accesorios || undefined, recibio },
        fotos,
      )
      const r = await api<{ codigo: string }>('POST', '/ordenes', f)
      await recargar()
      return r.codigo
    },
    registrarDiagnostico: (oid, diagnostico, costo) =>
      post(`/ordenes/${oid}/diagnostico`, { diagnostico, costo }),
    responderAutorizacion: (oid, ok) =>
      post(`/ordenes/${oid}/autorizacion`, { decision: decision(ok) }),
    pedirAdicional: (oid, descripcion, costo) =>
      post(`/ordenes/${oid}/adicionales`, { descripcion, costo }),
    responderAdicional: (oid, ok) =>
      post(`/ordenes/${oid}/adicionales/respuesta`, { decision: decision(ok) }),
    async agregarEvidencia(oid, momento, fotos, nota) {
      const f = await formulario(
        { momento: CODIGO_BD[momento], nota: momento === 'proceso' ? nota : undefined },
        fotos,
      )
      await post(`/ordenes/${oid}/evidencias`, f)
    },
    async registrarMantenimiento(oid, { trabajo, repuestos, responsable, fotos }) {
      const f = await formulario(
        {
          trabajo,
          responsable,
          repuestos: JSON.stringify(repuestos.map(([nombre, cantidad]) => ({ nombre, cantidad }))),
        },
        fotos,
      )
      await post(`/ordenes/${oid}/mantenimiento`, f)
    },
    entregar: (oid, recibidoPor, entregadoPor) =>
      post(`/ordenes/${oid}/entrega`, { recibidoPor, entregadoPor }),
    entregarVarias: (codigos, recibidoPor, entregadoPor) =>
      post('/ordenes/entrega-conjunta', { codigos, recibidoPor, entregadoPor }),
    anotar: (oid, texto) => post(`/ordenes/${oid}/notas`, { texto }),
    registrarRecordatorio: (eid) => post(`/equipos/${eid}/recordatorio`),
    leerNotificaciones: (id) => post('/notificaciones/leer', id ? { id: Number(id) } : {}),
    async guardarPlantilla(plantilla) {
      await api('PUT', '/configuracion', { plantilla })
      setDb((d) => ({ ...d, plantilla }))
    },
    async guardarUmbral(umbral) {
      await api('PUT', '/configuracion', { umbral })
      setDb((d) => ({ ...d, umbral }))
    },
    async guardarValorDiagnostico(valorDiagnostico) {
      await api('PUT', '/configuracion', { valorDiagnostico })
      setDb((d) => ({ ...d, valorDiagnostico }))
    },
    async guardarColor(color) {
      // Se ve al instante; al servidor se envía cuando la administradora deja de mover el selector.
      setDb((d) => ({ ...d, color }))
      window.clearTimeout(colorPendiente)
      await new Promise<void>((res, rej) => {
        colorPendiente = window.setTimeout(() => {
          api('PUT', '/configuracion', { color: hexDe(color) }).then(() => res(), rej)
        }, 400)
      })
    },
    async subirListaPdf(l) {
      const f = new FormData()
      f.append('mes', l.mes)
      f.append('archivo', new File([dataUrlABlob(l.src)], l.nombre, { type: 'application/pdf' }))
      await post('/lista-precios', f)
    },
    async guardarFotoPerfil(_clave, src) {
      const f = new FormData()
      const blob = dataUrlABlob(src)
      f.append('foto', new File([blob], 'perfil', { type: blob.type }))
      await api('PUT', '/cuenta/foto', f)
      await recargar()
    },
  }
}

// ---------------------------------------------------------------------------
// Modo API sin conexión (Acta 6): los cambios se guardan en una cola y se envían al volver
// la conexión. Ver lib/sin-conexion.ts.
// ---------------------------------------------------------------------------
const NECESITA_CONEXION =
  'Sin conexión: esta acción necesita internet. Los registros, órdenes, diagnósticos, fotos, mantenimientos y entregas sí se pueden hacer; se envían solos cuando vuelva la conexión.'

function conCola(r: Acciones, ctx: CtxAcciones, nombreUsuario: () => string): Acciones {
  const { setDb, recargar } = ctx
  /** Hay que usar la cola si no hay red, si ya hay cambios esperando (para no desordenarlos) o si algún id es temporal. */
  const usarCola = (...ids: (string | undefined)[]) =>
    sinConexion() || hayPendientes() || ids.some((i) => i && esTemporal(traducir(i)))
  /** Intenta en el servidor; si la red falla, guarda la operación en la cola. */
  async function hacer<T>(
    ids: (string | undefined)[],
    enLinea: () => Promise<T>,
    op: () => Operacion,
    resultado: T,
  ): Promise<T> {
    if (!usarCola(...ids)) {
      try {
        const v = await enLinea()
        marcarConexion(true)
        return v
      } catch (e) {
        if (!esFallaDeRed(e)) throw e
        marcarConexion(false)
      }
    }
    const o = op()
    await encolar(o)
    setDb((d) => aplicar(d, o))
    if (!sinConexion()) void sincronizar().then(() => recargar().catch(() => {}))
    return resultado
  }
  const soloEnLinea =
    <A extends unknown[], T>(f: (...a: A) => Promise<T>) =>
    async (...a: A) => {
      if (sinConexion()) throw new Error(NECESITA_CONEXION)
      return f(...a)
    }
  const t = (id: string) => traducir(id)

  return {
    ...r,
    cerrarSesion: async () => {
      borrarCopiaEstado()
      await r.cerrarSesion()
    },
    restablecerContrasena: soloEnLinea(r.restablecerContrasena),
    responderAutorizacion: soloEnLinea((oid: string, ok: boolean) =>
      r.responderAutorizacion(t(oid), ok),
    ),
    pedirAdicional: soloEnLinea((oid: string, d: string, c: number) =>
      r.pedirAdicional(t(oid), d, c),
    ),
    responderAdicional: soloEnLinea((oid: string, ok: boolean) => r.responderAdicional(t(oid), ok)),
    registrarRecordatorio: soloEnLinea((eid: string) => r.registrarRecordatorio(t(eid))),
    guardarPlantilla: soloEnLinea(r.guardarPlantilla),
    guardarUmbral: soloEnLinea(r.guardarUmbral),
    guardarValorDiagnostico: soloEnLinea(r.guardarValorDiagnostico),
    subirListaPdf: soloEnLinea(r.subirListaPdf),
    guardarFotoPerfil: soloEnLinea(r.guardarFotoPerfil),
    cambiarContrasena: soloEnLinea(r.cambiarContrasena),
    cambiarNombre: soloEnLinea(r.cambiarNombre),
    guardarCliente(id, c) {
      if (id)
        return hacer(
          [id],
          () => r.guardarCliente(t(id), c),
          () => ({ tipo: 'editar-cliente', id, nombre: c.nombre, tel: c.tel, cedula: c.cedula }),
          { id },
        )
      const tmp = nuevoId('c')
      return hacer(
        [],
        () => r.guardarCliente(undefined, c),
        () => ({ tipo: 'cliente', tmp, nombre: c.nombre, tel: c.tel, cedula: c.cedula }),
        { id: tmp },
      )
    },
    crearEquipo(cid, e) {
      const tmp = nuevoId('e')
      return hacer(
        [cid],
        () => r.crearEquipo(t(cid), e),
        () => ({ tipo: 'equipo', tmp, cid, equipo: e }),
        undefined,
      )
    },
    guardarPeriodo(eid, periodo) {
      return hacer(
        [eid],
        () => r.guardarPeriodo(t(eid), periodo),
        () => ({ tipo: 'periodo', eid, periodo }),
        undefined,
      )
    },
    crearOrden(d) {
      const tmp = nuevoId('OS')
      return hacer(
        [d.eq],
        () => r.crearOrden({ ...d, eq: t(d.eq) }),
        () => ({
          tipo: 'orden',
          tmp,
          eq: d.eq,
          falla: d.falla,
          accesorios: d.accesorios,
          recibio: d.recibio,
          fotos: d.fotos,
          por: nombreUsuario(),
        }),
        tmp,
      )
    },
    registrarDiagnostico(oid, diag, costo) {
      return hacer(
        [oid],
        () => r.registrarDiagnostico(t(oid), diag, costo),
        () => ({ tipo: 'diagnostico', oid, diag, costo }),
        undefined,
      )
    },
    agregarEvidencia(oid, momento, fotos, nota) {
      return hacer(
        [oid],
        () => r.agregarEvidencia(t(oid), momento, fotos, nota),
        () => ({ tipo: 'evidencia', oid, momento, fotos, nota }),
        undefined,
      )
    },
    registrarMantenimiento(oid, d) {
      return hacer(
        [oid],
        () => r.registrarMantenimiento(t(oid), d),
        () => ({ tipo: 'mantenimiento', oid, ...d }),
        undefined,
      )
    },
    entregar(oid, recibidoPor, entregadoPor) {
      return hacer(
        [oid],
        () => r.entregar(t(oid), recibidoPor, entregadoPor),
        () => ({ tipo: 'entrega', oids: [oid], recibidoPor, entregadoPor }),
        undefined,
      )
    },
    entregarVarias(oids, recibidoPor, entregadoPor) {
      return hacer(
        oids,
        () => r.entregarVarias(oids.map(t), recibidoPor, entregadoPor),
        () => ({ tipo: 'entrega', oids, recibidoPor, entregadoPor }),
        undefined,
      )
    },
    anotar(oid, texto) {
      return hacer(
        [oid],
        () => r.anotar(t(oid), texto),
        () => ({ tipo: 'nota', oid, texto }),
        undefined,
      )
    },
  }
}

export const crearAcciones = (ctx: CtxAcciones) =>
  MODO_API
    ? conCola(remoto(ctx), ctx, () => ctx.nombreUsuario?.() ?? 'la administradora')
    : local(ctx)

/** Mensaje para mostrar al usuario a partir de cualquier error. */
export const mensajeError = (e: unknown) =>
  e instanceof Error ? e.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.'

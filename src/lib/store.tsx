import * as React from 'react'

import { crearAcciones, type Acciones } from './acciones'
import { api, ApiError, MODO_API } from './api'
import { seedDB } from './seed'
import {
  aplicarCola,
  cargarCola,
  copiaEstado,
  esFallaDeRed,
  guardarCopiaEstado,
  hayPendientes,
  marcarConexion,
  sincronizar,
} from './sin-conexion'
import { aplicarColor, PALETA } from './temas'
import type { DB, Rol } from './types'

const DB_KEY = 'th-db-v6'
const ROLE_KEY = 'th-role'

export type DialogKind =
  | 'notificaciones'
  | 'cliente'
  | 'cliente-creado'
  | 'equipo'
  | 'periodo'
  | 'whatsapp'
  | 'restablecer'
  | 'recordatorio'
  | 'plantilla'
  | 'umbral'
  | 'vista-rapida'
  | 'no-autorizo'
  | 'adicional'
  | 'evidencia'
  | 'entregar'

export type DialogState = { kind: DialogKind; params: Record<string, string> } | null

/** Quién inició sesión. En el prototipo es fijo; en modo API lo dice el servidor. */
export type Sesion = { nombre: string; usuario: string; idCliente: string | null }

type AppState = {
  db: DB
  /** Solo para el modo prototipo y las pruebas; las pantallas usan `acciones`. */
  setDb: (fn: (d: DB) => DB) => void
  acciones: Acciones
  resetDb: () => void
  role: Rol | null
  sesion: Sesion
  /** Verdadero mientras se consulta la sesión al servidor (modo API). */
  cargando: boolean
  signOut: () => void
  dialog: DialogState
  openDialog: (kind: DialogKind, params?: Record<string, string>) => void
  closeDialog: () => void
  /** Modo API: vuelve a pedir el estado al servidor (p. ej. después de sincronizar). */
  recargar: () => Promise<void>
}

const AppContext = React.createContext<AppState | null>(null)

function load<T>(storage: () => Storage, key: string, fallback: () => T): T {
  try {
    const raw = storage().getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback()
  } catch {
    return fallback()
  }
}
function save(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value == null) storage().removeItem(key)
    else storage().setItem(key, JSON.stringify(value))
  } catch {
    /* sin almacenamiento: los datos viven solo en memoria */
  }
}

const DB_VACIA: DB = {
  clientes: [],
  equipos: [],
  ordenes: [],
  valorDiagnostico: 0,
  notifs: [],
  umbral: 30,
  plantilla: '',
  fotoAdmin: null,
  fotoCliente: null,
  listaPdf: null,
}

const SESION_PROTOTIPO: Sesion = {
  nombre: 'TECNIHARDWARE PC STORE',
  usuario: 'admin',
  idCliente: 'c1',
}

type Estado = DB & {
  sesion: { rol: Rol; nombre: string; usuario: string; idCliente: string | null }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDbState] = React.useState<DB>(() =>
    MODO_API ? DB_VACIA : load(() => localStorage, DB_KEY, seedDB),
  )
  const [role, setRole] = React.useState<Rol | null>(() =>
    MODO_API
      ? null
      : load(
          () => sessionStorage,
          ROLE_KEY,
          () => null,
        ),
  )
  const [sesion, setSesion] = React.useState<Sesion>(SESION_PROTOTIPO)
  const [cargando, setCargando] = React.useState(MODO_API)
  const [dialog, setDialog] = React.useState<DialogState>(null)
  const dbRef = React.useRef(db)
  const sesionRef = React.useRef(sesion)
  React.useEffect(() => {
    sesionRef.current = sesion
  }, [sesion])
  React.useEffect(() => {
    dbRef.current = db
  }, [db])

  React.useEffect(() => {
    if (!MODO_API) save(() => localStorage, DB_KEY, db)
  }, [db])
  React.useEffect(() => aplicarColor(db.color), [db.color])
  React.useEffect(() => {
    if (!MODO_API) save(() => sessionStorage, ROLE_KEY, role)
  }, [role])

  const aplicarEstado = React.useCallback((e: Estado, copia = true) => {
    const { sesion: s, ...datos } = e
    // Acta 6: la última copia del estado permite abrir el panel sin conexión.
    if (copia && s.rol === 'admin') guardarCopiaEstado(e)
    // El servidor guarda el color como #rrggbb; si es uno de la paleta se muestra con su nombre.
    const color = PALETA.find((p) => p.hex === datos.color)?.id ?? datos.color
    // Lo registrado sin conexión que aún no llega al servidor se vuelve a aplicar encima.
    setDbState(aplicarCola({ ...datos, color }))
    setSesion({ nombre: s.nombre, usuario: s.usuario, idCliente: s.idCliente })
    setRole(s.rol)
  }, [])
  const recargar = React.useCallback(
    () =>
      api<Estado>('GET', '/estado').then((e) => {
        marcarConexion(true)
        aplicarEstado(e)
      }),
    [aplicarEstado],
  )

  // Modo API: al abrir la aplicación se pregunta si ya hay una sesión activa (cookie).
  React.useEffect(() => {
    if (!MODO_API) return
    cargarCola()
      .then(() => api<{ debeCambiarContrasena: boolean } | null>('GET', '/auth/sesion'))
      .then((s) => (s && !s.debeCambiarContrasena ? recargar() : undefined))
      .then(() => {
        if (hayPendientes()) void sincronizar().then(() => recargar().catch(() => {}))
      })
      .catch((e) => {
        // Sin conexión: se abre con la última copia guardada y lo pendiente de la cola (Acta 6).
        const copia = esFallaDeRed(e) ? copiaEstado<Estado>() : null
        if (copia) {
          marcarConexion(false)
          aplicarEstado(copia, false)
        } else if (!(e instanceof ApiError) || e.estado !== 401) console.warn(e)
      })
      .finally(() => setCargando(false))
  }, [recargar, aplicarEstado])

  // Al volver la conexión se envía lo pendiente y se recarga el estado del servidor.
  React.useEffect(() => {
    if (!MODO_API) return
    const volvio = () => {
      marcarConexion(true)
      void sincronizar().then(() => recargar().catch(() => {}))
    }
    const cayo = () => marcarConexion(false)
    window.addEventListener('online', volvio)
    window.addEventListener('offline', cayo)
    return () => {
      window.removeEventListener('online', volvio)
      window.removeEventListener('offline', cayo)
    }
  }, [recargar])

  const setDb = React.useCallback((fn: (d: DB) => DB) => setDbState((d) => fn(d)), [])
  // getDb lee la referencia solo cuando una acción se ejecuta (desde un clic), nunca durante
  // el render; la regla no puede verlo porque la función se pasa a crearAcciones.
  /* eslint-disable react-hooks/refs */
  const acciones = React.useMemo(
    () =>
      crearAcciones({
        setDb,
        getDb: () => dbRef.current,
        setRole: (r) => {
          setRole(r)
          if (!r && MODO_API) setDbState(DB_VACIA)
        },
        recargar,
        nombreUsuario: () => sesionRef.current.nombre,
      }),
    [setDb, recargar],
  )
  /* eslint-enable react-hooks/refs */

  const value = React.useMemo<AppState>(
    () => ({
      db,
      setDb,
      acciones,
      resetDb: () => setDbState(seedDB()),
      role,
      sesion,
      cargando,
      signOut: () => void acciones.cerrarSesion(),
      dialog,
      openDialog: (kind, params = {}) => setDialog({ kind, params }),
      closeDialog: () => setDialog(null),
      recargar: () => (MODO_API ? recargar() : Promise.resolve()),
    }),
    [db, setDb, acciones, role, sesion, cargando, dialog, recargar],
  )

  return <AppContext value={value}>{children}</AppContext>
}

export function useApp() {
  const ctx = React.useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}

/** Id del cliente que inició sesión en el portal. */
export const useClienteActual = () => useApp().sesion.idCliente ?? ''

export type Estado = 'diag' | 'pend' | 'aut' | 'espera' | 'fin' | 'ent' | 'cerr'
/** Categorías del registro de equipos (Acta 4). «Otro» permite escribir un tipo no listado. */
export const TIPOS_EQUIPO = [
  'Portátil',
  'PC de escritorio',
  'Todo en uno',
  'Impresora',
  'Dron',
  'Parlante',
  'Cargador',
  'Videobeam',
  'Televisor',
] as const
/** Uno de TIPOS_EQUIPO o el tipo escrito por la administradora al elegir «Otro». */
export type TipoEquipo = string
export type Rol = 'admin' | 'cliente'

export interface Cliente {
  id: string
  nombre: string
  cedula: string
  tel: string
  usuario: string
  desde: string
}

export interface Equipo {
  id: string
  cliente: string
  tipo: TipoEquipo
  nombre: string
  serial: string
  nota: string
  /** Meses entre mantenimientos preventivos; null = sin periodo. */
  periodo: number | null
}

/** Una foto puede ser real (data URL) o un marcador de ejemplo (null). */
export type Foto = string | null

export interface FotoProceso {
  src: Foto
  nota: string
  fecha: string
}

export interface Adicional {
  desc: string
  costo: number
  ok?: boolean
}

export interface Orden {
  id: string
  eq: string
  ingreso: string
  falla: string
  estado: Estado
  diag: string
  costo: number | null
  /** RF-06: una o varias autorizaciones adicionales; `ok` vacío = pendiente de respuesta. */
  adicionales?: Adicional[]
  trabajo?: string
  repuestos?: [string, number][]
  responsable?: string
  fotos: { ingreso: Foto[]; proceso: FotoProceso[]; salida: Foto[] }
  entrega?: string
  cobro?: number
  log: [fecha: string, estado: string, nota: string][]
  /** Persona de la tienda que recibió el equipo al ingresar (Acta 5). */
  recibio?: string
  /** Persona de la tienda que entregó el equipo al cliente (Acta 5). */
  entrego?: string
}

export interface Notificacion {
  id: string
  titulo: string
  detalle: string
  to: string
  leida?: boolean
}

export interface ListaPdf {
  /** Mes al que corresponde la lista, por ejemplo «Octubre 2026». */
  mes: string
  nombre: string
  /** Archivo como data URL (en producción sería la dirección del archivo en el servidor). */
  src: string
  tamano: number
  fecha: string
}

export interface DB {
  clientes: Cliente[]
  equipos: Equipo[]
  ordenes: Orden[]
  /** Valor del diagnóstico general: se cobra cuando el cliente no autoriza (RF-06). */
  valorDiagnostico: number
  notifs: Notificacion[]
  umbral: number
  plantilla: string
  fotoAdmin: string | null
  fotoCliente: string | null
  /** Color del sistema; se aplica al panel y al portal de los clientes. */
  /** Color del sistema: id de la paleta o #rrggbb (ver lib/temas). */
  color?: string
  /** Lista de precios del mes en PDF que el cliente ve en su portal (RF-13 y RF-14). */
  listaPdf?: ListaPdf | null
  /** Personal de la tienda que recibe y entrega los equipos (Acta 5). */
  personal?: string[]
}

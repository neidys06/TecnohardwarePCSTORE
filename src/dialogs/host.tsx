import { useApp } from '@/lib/store'

import {
  ClienteCreadoDialog,
  ClienteDialog,
  EquipoDialog,
  PeriodoDialog,
  RestablecerDialog,
  WhatsAppDialog,
} from './clientes'
import { PlantillaDialog, RecordatorioDialog, UmbralDialog } from './mantenimiento'
import {
  AdicionalDialog,
  EntregarDialog,
  EvidenciaDialog,
  NoAutorizoDialog,
  NotificacionesDialog,
  VistaRapidaDialog,
} from './ordenes'

/** Un solo punto donde se montan los diálogos; cualquier pantalla los abre con `openDialog(tipo, params)`. */
export function DialogHost() {
  const { dialog } = useApp()
  if (!dialog) return null
  const p = dialog.params
  const key = `${dialog.kind}:${JSON.stringify(p)}`
  switch (dialog.kind) {
    case 'notificaciones':
      return <NotificacionesDialog key={key} />
    case 'cliente':
      return <ClienteDialog key={key} id={p.id} />
    case 'cliente-creado':
      return <ClienteCreadoDialog key={key} id={p.id} pass={p.pass} />
    case 'equipo':
      return <EquipoDialog key={key} cid={p.cid} />
    case 'periodo':
      return <PeriodoDialog key={key} eid={p.eid} />
    case 'whatsapp':
      return <WhatsAppDialog key={key} cid={p.cid} oid={p.oid} />
    case 'restablecer':
      return <RestablecerDialog key={key} cid={p.cid} />
    case 'recordatorio':
      return <RecordatorioDialog key={key} eid={p.eid} />
    case 'plantilla':
      return <PlantillaDialog key={key} volver={p.volver} />
    case 'umbral':
      return <UmbralDialog key={key} />
    case 'vista-rapida':
      return <VistaRapidaDialog key={key} id={p.id} />
    case 'no-autorizo':
      return <NoAutorizoDialog key={key} id={p.id} />
    case 'adicional':
      return <AdicionalDialog key={key} id={p.id} />
    case 'evidencia':
      return <EvidenciaDialog key={key} id={p.id} tipo={p.tipo} />
    case 'entregar':
      return <EntregarDialog key={key} id={p.id} />
  }
}

import { useParams } from 'react-router'
import { History } from 'lucide-react'

import { OrdenRow } from '@/components/app/domain-ui'
import { Empty, PageHeader, Section, ToneBadge } from '@/components/app/ui-kit'
import { Card } from '@/components/ui/card'
import { parseDate } from '@/lib/dates'
import { clienteDe, lastService, orderDate, semaforo, trabajoDe } from '@/lib/domain'
import { useApp, useClienteActual } from '@/lib/store'
import NotFound from '@/pages/not-found'

export default function EquipoHistorialPage({ portal }: { portal?: boolean }) {
  const { id = '' } = useParams()
  const { db } = useApp()
  const yo = useClienteActual()
  const e = db.equipos.find((x) => x.id === id)
  if (!e || (portal && e.cliente !== yo)) return <NotFound inline />
  const c = clienteDe(db, e.cliente)
  const s = semaforo(db, e)
  const os = db.ordenes
    .filter((o) => o.eq === id)
    .sort((a, b) => parseDate(b.ingreso).getTime() - parseDate(a.ingreso).getTime())
  const l = lastService(db, id)
  const back = portal
    ? { to: '/portal/equipos', label: 'Mis equipos' }
    : { to: `/admin/clientes/${c.id}`, label: c.nombre }

  return (
    <>
      <PageHeader
        back={back}
        title={e.nombre}
        description={`${e.tipo}${e.serial ? ` · Serial ${e.serial}` : ''}${portal ? '' : ` · ${c.nombre}`}`}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <p className="text-[14px] text-muted-foreground">Mantenimiento preventivo</p>
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge tone={s.tone}>{s.k}</ToneBadge>
            <span className="text-[14px] text-ink-2">{s.texto}</span>
          </div>
          <p className="font-medium tnum">
            {s.next ? `Próximo: ${s.next}` : 'Sin fecha calculada'}
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-[14px] text-muted-foreground">Última intervención</p>
          <p className="font-semibold tnum">{l ? orderDate(l) : '—'}</p>
          <p className="text-[14px] text-ink-2">{l ? trabajoDe(l) : 'Sin intervenciones'}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-[14px] text-muted-foreground">Órdenes registradas</p>
          <p className="text-[28px] leading-9 font-semibold tnum">{os.length}</p>
        </Card>
      </div>
      <Section title="Historial de servicios">
        {os.length ? (
          <ol className="flex flex-col gap-2">
            {os.map((o) => (
              <li key={o.id}>
                <OrdenRow o={o} portal={portal} />
              </li>
            ))}
          </ol>
        ) : (
          <Empty icon={History} title="Sin servicios">
            Este equipo aún no tiene órdenes de servicio.
          </Empty>
        )}
      </Section>
    </>
  )
}

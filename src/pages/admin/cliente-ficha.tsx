import * as React from 'react'
import { useParams } from 'react-router'
import { History, KeyRound, MessageCircle, Pencil, Plus } from 'lucide-react'

import { EquipoCard, OrdenRow } from '@/components/app/domain-ui'
import { Chip, Empty, KV, PageHeader, Section } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fmtLong, money, parseDate } from '@/lib/dates'
import { equipoDe, lastService, orderDate, trabajoDe } from '@/lib/domain'
import { useApp } from '@/lib/store'
import NotFound from '@/pages/not-found'

export default function ClienteFichaPage() {
  const { id = '' } = useParams()
  const { db, openDialog } = useApp()
  const [f, setF] = React.useState('todos')
  const c = db.clientes.find((x) => x.id === id)
  if (!c) return <NotFound inline />
  const eqs = db.equipos.filter((e) => e.cliente === id)
  const os = db.ordenes
    .filter((o) => eqs.some((e) => e.id === o.eq) && (f === 'todos' || o.eq === f))
    .sort((a, b) => parseDate(b.ingreso).getTime() - parseDate(a.ingreso).getTime())
  const l = f !== 'todos' ? lastService(db, f) : null

  return (
    <>
      <PageHeader
        back={{ to: '/admin/clientes', label: 'Clientes' }}
        title={c.nombre}
        description={`Cliente desde ${fmtLong(c.desde)}. Sus equipos, el estado de mantenimiento y todas las veces que ha traído un equipo.`}
        actions={
          <>
            <Button
              variant="whatsapp"
              disabled={!c.tel}
              onClick={() => openDialog('whatsapp', { cid: c.id })}
            >
              <MessageCircle />
              WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => openDialog('cliente', { id: c.id })}>
              <Pencil />
              Editar datos
            </Button>
            <Button variant="secondary" onClick={() => openDialog('restablecer', { cid: c.id })}>
              <KeyRound />
              Restablecer contraseña
            </Button>
          </>
        }
      />
      <Card>
        <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <KV k="Cédula" v={c.cedula || 'Sin cédula'} mono />
          <KV k="Celular (WhatsApp)" v={c.tel || 'Sin teléfono'} mono />
          <KV k="Usuario del portal" v={c.usuario} />
          <KV k="Equipos registrados" v={String(eqs.length)} mono />
        </dl>
      </Card>
      <Section
        title="Equipos"
        description="El color indica el mantenimiento preventivo; siempre va con su texto."
        action={
          <Button variant="secondary" onClick={() => openDialog('equipo', { cid: c.id })}>
            <Plus />
            Registrar equipo
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eqs.map((e) => (
            <EquipoCard key={e.id} e={e} />
          ))}
        </div>
      </Section>
      <Section
        title="Historial de intervenciones"
        description="De la más reciente a la más antigua. Filtra por equipo para responder rápido cuándo se atendió."
      >
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Chip on={f === 'todos'} onClick={() => setF('todos')}>
            Todos los equipos
          </Chip>
          {eqs.map((e) => (
            <Chip key={e.id} on={f === e.id} onClick={() => setF(e.id)}>
              {e.nombre}
            </Chip>
          ))}
        </div>
        {l && (
          <div className="rounded-xl bg-foreground p-5 text-background">
            <p className="text-[14px] opacity-75">Última intervención · {equipoDe(db, f).nombre}</p>
            <p className="mt-1 text-[22px] leading-8 font-semibold tnum">
              {orderDate(l)} · {trabajoDe(l)}
            </p>
            <p className="mt-1 text-[14px] opacity-75">
              {l.id} · {money(l.cobro ?? l.costo)}
            </p>
          </div>
        )}
        {os.length ? (
          <ol className="flex flex-col gap-2">
            {os.map((o) => (
              <li key={o.id}>
                <OrdenRow o={o} />
              </li>
            ))}
          </ol>
        ) : (
          <Empty icon={History} title="Sin intervenciones">
            Este equipo todavía no tiene órdenes de servicio.
          </Empty>
        )}
      </Section>
    </>
  )
}

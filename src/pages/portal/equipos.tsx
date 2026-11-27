import { Link } from 'react-router'
import { Eye, History, MessageCircle } from 'lucide-react'

import {
  EquipoIcon,
  Notice,
  PageHeader,
  Section,
  StateBadge,
  ToneBadge,
} from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { money } from '@/lib/dates'
import {
  nombreEquipo,
  cuentaCliente,
  ESTADOS,
  equipoDe,
  lastService,
  openOrder,
  orderDate,
  semaforo,
  totalOrden,
  trabajoDe,
} from '@/lib/domain'
import { TIENDA } from '@/lib/seed'
import { useApp, useClienteActual } from '@/lib/store'
import type { Orden } from '@/lib/types'

export default function PortalEquiposPage() {
  const { db } = useApp()
  const yo = useClienteActual()
  const me = db.clientes.find((c) => c.id === yo)!
  const eqs = db.equipos.filter((e) => e.cliente === yo)
  const abiertas = eqs.map((e) => openOrder(db, e.id)).filter((o): o is Orden => !!o)
  // RF-10: al iniciar sesión el cliente ve el aviso de los mantenimientos vencidos o próximos.
  const avisos = eqs
    .map((e) => ({ e, s: semaforo(db, e) }))
    .filter(({ s }) => s.k === 'Vencido' || s.k === 'Próximo')
  const waLink = `https://wa.me/57${TIENDA.whatsapp.replace(/\D/g, '')}`
  // Acta 6: lo que el cliente debe de todos sus equipos sin entregar, en una sola cuenta.
  const cuenta = cuentaCliente(db, yo)

  return (
    <>
      <PageHeader
        title={`Hola, ${me.nombre.split(' ')[0]}`}
        description={`Tienes ${eqs.length} equipos registrados en TecniHardware${abiertas.length ? ` y ${abiertas.length} ${abiertas.length === 1 ? 'orden' : 'órdenes'} en curso.` : '.'}`}
      />
      {avisos.map(({ e, s }) => (
        <Notice
          key={e.id}
          tone={s.k === 'Vencido' ? 'danger' : 'warning'}
          title={`${s.k === 'Vencido' ? 'Mantenimiento vencido' : 'Mantenimiento próximo'}: ${e.nombre}`}
          action={
            <Button variant="whatsapp" size="sm" asChild>
              <a href={waLink} target="_blank" rel="noreferrer">
                <MessageCircle />
                Agendar
              </a>
            </Button>
          }
        >
          {s.k === 'Vencido'
            ? `Venció el ${s.next}.`
            : `Le corresponde el ${s.next} (${s.texto.toLowerCase()}).`}{' '}
          Escríbenos por WhatsApp al {TIENDA.whatsapp} para agendarlo.
        </Notice>
      ))}
      {cuenta.ordenes.length > 1 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold">Tu cuenta</h2>
          <ul className="flex flex-col gap-2">
            {cuenta.ordenes.map((o) => (
              <li key={o.id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {nombreEquipo(equipoDe(db, o.eq))}{' '}
                  <span className="text-muted-foreground">· {ESTADOS[o.estado].label}</span>
                </span>
                <span className="shrink-0 tnum">
                  {o.costo == null ? 'Por definir' : money(totalOrden(o))}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="text-ink-2">Total a pagar</span>
            <span className="text-xl font-semibold tnum">{money(cuenta.total)}</span>
          </div>
          <p className="text-[14px] text-muted-foreground">
            Puedes pagar todo junto cuando recojas tus equipos.
          </p>
        </Card>
      )}
      {abiertas.length > 0 && (
        <Section title={abiertas.length === 1 ? 'Orden en curso' : 'Órdenes en curso'}>
          {abiertas.map((o) => {
            const e = equipoDe(db, o.eq)
            return (
              <Card key={o.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] text-muted-foreground tnum">
                      {o.id} · Ingresó el {o.ingreso}
                    </p>
                    <p className="text-[18px] font-semibold">{e.nombre}</p>
                  </div>
                  <StateBadge estado={o.estado} />
                </div>
                <p className="text-ink-2">{ESTADOS[o.estado].cliente}</p>
                <div className="flex max-md:[&>*]:w-full">
                  <Button variant="secondary" asChild>
                    <Link to={`/portal/ordenes/${o.id}`}>
                      <Eye />
                      Ver detalle de la orden
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </Section>
      )}
      <Section title="Mis equipos">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eqs.map((e) => {
            const s = semaforo(db, e)
            const l = lastService(db, e.id)
            return (
              <Card key={e.id} className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-ink-2">
                    <EquipoIcon tipo={e.tipo} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] text-muted-foreground">{e.tipo}</p>
                    <p className="font-semibold">{e.nombre}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone={s.tone}>{s.k}</ToneBadge>
                    {e.periodo && <span className="text-[14px] text-ink-2">{s.texto}</span>}
                  </div>
                  <p className="text-[15px] tnum">
                    {s.next
                      ? `Próximo mantenimiento: ${s.next}`
                      : 'La tienda aún no configuró el periodo de mantenimiento.'}
                  </p>
                </div>
                <p className="text-[14px] text-ink-2">
                  Último servicio:{' '}
                  <span className="font-medium text-foreground tnum">{l ? orderDate(l) : '—'}</span>
                  {l && ` · ${trabajoDe(l)}`}
                </p>
                <div className="mt-auto">
                  <Button variant="ghost" className="w-full" asChild>
                    <Link to={`/portal/equipos/${e.id}`}>
                      <History />
                      Ver historial y fotos
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </Section>
    </>
  )
}

import { Link } from 'react-router'
import { CalendarDays, ChevronRight, History, Plus } from 'lucide-react'

import { filasMant, MantTabla } from '@/components/app/mant-tabla'
import { EquipoIcon, StateBadge, ToneBadge, UserAvatar } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { monthShort, money, parseDate } from '@/lib/dates'
import {
  ESTADOS,
  equipoDe,
  isOpen,
  lastService,
  openOrder,
  orderDate,
  semaforo,
  trabajoDe,
} from '@/lib/domain'
import { useApp } from '@/lib/store'
import type { Cliente, Equipo, Orden } from '@/lib/types'

/**
 * Respuesta directa al buscar un cliente: sus equipos en el mismo cuadro de «Próximos
 * mantenimientos» (Acta 4), con último servicio, próximo y estado.
 */
export function QuickAnswer({ c }: { c: Cliente }) {
  const { db } = useApp()
  const eqs = db.equipos.filter((e) => e.cliente === c.id)
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <UserAvatar name={c.nombre} size={44} />
        <div className="min-w-[180px] flex-1">
          <Link
            to={`/admin/clientes/${c.id}`}
            className="text-[17px] font-semibold text-brand-text hover:underline"
          >
            {c.nombre}
          </Link>
          <p className="text-[14px] text-muted-foreground tnum">
            {c.cedula ? `CC ${c.cedula}` : 'Sin cédula'} · {c.tel || 'Sin teléfono'}
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link to={`/admin/clientes/${c.id}`}>
            <History />
            Ver ficha e historial
          </Link>
        </Button>
      </div>
      {eqs.length ? (
        <MantTabla rows={filasMant(db, eqs)} cliente={false} />
      ) : (
        <p className="text-[15px] text-ink-2">Este cliente todavía no tiene equipos registrados.</p>
      )}
    </Card>
  )
}

export function EquipoCard({ e }: { e: Equipo }) {
  const { db, openDialog } = useApp()
  const s = semaforo(db, e)
  const l = lastService(db, e.id)
  const op = openOrder(db, e.id)
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-ink-2">
          <EquipoIcon tipo={e.tipo} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] text-muted-foreground">
            {e.tipo}
            {e.serial && ` · Serial ${e.serial}`}
          </p>
          <Link
            to={`/admin/equipos/${e.id}`}
            className="font-semibold text-brand-text hover:underline"
          >
            {e.nombre}
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge tone={s.tone}>{s.k}</ToneBadge>
          {e.periodo && <span className="text-[14px] text-ink-2">{s.texto}</span>}
        </div>
        {e.periodo ? (
          <>
            <p className="text-[15px]">
              Próximo mantenimiento: <span className="font-semibold tnum">{s.next ?? '—'}</span>
            </p>
            <p className="text-[14px] text-muted-foreground">Cada {e.periodo} meses</p>
          </>
        ) : (
          <p className="text-[15px] text-ink-2">Configura el periodo para recibir alertas.</p>
        )}
      </div>
      <div>
        <p className="text-[14px] text-muted-foreground">Última intervención</p>
        {l ? (
          <p className="mt-0.5 font-medium tnum">
            {orderDate(l)} · <span className="font-normal text-ink-2">{trabajoDe(l)}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-ink-2">Sin intervenciones registradas</p>
        )}
      </div>
      {op && (
        <Link
          to={`/admin/ordenes/${op.id}`}
          className="flex items-center justify-between gap-2 rounded-lg bg-brand-soft px-3.5 py-2.5 text-brand-text"
        >
          <span className="text-[14px] font-medium">
            Orden en curso {op.id} · {ESTADOS[op.estado].label}
          </span>
          <ChevronRight className="size-[18px]" />
        </Link>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link to={`/admin/equipos/${e.id}`}>
            <History />
            Historial
          </Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openDialog('periodo', { eid: e.id })}>
          <CalendarDays />
          Periodo
        </Button>
        {!op && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin/ordenes/nueva?equipo=${e.id}`}>
              <Plus />
              Nueva orden
            </Link>
          </Button>
        )}
      </div>
    </Card>
  )
}

export function OrdenRow({ o, portal }: { o: Orden; portal?: boolean }) {
  const { db } = useApp()
  const e = equipoDe(db, o.eq)
  const d = parseDate(orderDate(o))
  const closed = !isOpen(o)
  return (
    <Link
      to={portal ? `/portal/ordenes/${o.id}` : `/admin/ordenes/${o.id}`}
      className="flex w-full items-center gap-4 rounded-xl border bg-card p-3.5 transition hover:border-input sm:p-4"
    >
      <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-secondary py-1.5">
        <span className="text-[18px] leading-6 font-semibold tnum">
          {String(d.getDate()).padStart(2, '0')}
        </span>
        <span className="text-[13px] text-ink-2">
          {monthShort(d)} {String(d.getFullYear()).slice(2)}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{closed ? trabajoDe(o) : o.falla}</span>
        <span className="block text-[14px] text-muted-foreground">
          {e.nombre} · {o.id}
          {closed && ` · ${money(o.cobro ?? o.costo)}`}
        </span>
      </span>
      <span className="hidden sm:block">
        <StateBadge estado={o.estado} />
      </span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}

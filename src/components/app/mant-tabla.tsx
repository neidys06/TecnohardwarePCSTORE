import { Link } from 'react-router'
import { CalendarDays, Send } from 'lucide-react'

import { EquipoIcon, StateBadge, ToneBadge } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  clienteDe,
  lastService,
  openOrder,
  orderDate,
  semaforo,
  trabajoDe,
  type Semaforo,
} from '@/lib/domain'
import { useApp } from '@/lib/store'
import type { DB, Equipo } from '@/lib/types'
import { cn } from '@/lib/utils'

const ORDEN: Record<Semaforo['k'], number> = {
  Vencido: 0,
  Próximo: 1,
  Vigente: 2,
  'Sin periodo': 3,
}

export type FilaMant = ReturnType<typeof filasMant>[number]

/** Filas ordenadas por urgencia: vencidos primero, luego los más próximos. */
export function filasMant(db: DB, equipos: Equipo[]) {
  return equipos
    .map((e) => ({
      e,
      c: clienteDe(db, e.cliente),
      s: semaforo(db, e),
      l: lastService(db, e.id),
      op: openOrder(db, e.id),
    }))
    .sort((a, b) => ORDEN[a.s.k] - ORDEN[b.s.k] || (a.s.days ?? 9999) - (b.s.days ?? 9999))
}

function Acciones({ r, full }: { r: FilaMant; full?: boolean }) {
  const { openDialog } = useApp()
  return (
    <>
      {r.e.periodo ? (
        <Button
          variant="whatsapp"
          size="sm"
          className={cn(full && 'flex-1')}
          disabled={!r.c.tel || !r.s.next}
          onClick={() => openDialog('recordatorio', { eid: r.e.id })}
        >
          <Send />
          Recordatorio
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className={cn(full && 'flex-1')}
          onClick={() => openDialog('periodo', { eid: r.e.id })}
        >
          <CalendarDays />
          Configurar
        </Button>
      )}
      <Button variant="secondary" size="sm" className={cn(full && 'flex-1')} asChild>
        <Link to={`/admin/equipos/${r.e.id}`}>Historial</Link>
      </Button>
    </>
  )
}

/**
 * Cuadro de mantenimientos (RF-15). Se usa en «Próximos mantenimientos» con todos los clientes y,
 * al buscar un cliente, con solo sus equipos (Acta 4).
 */
export function MantTabla({ rows, cliente = true }: { rows: FilaMant[]; cliente?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <Card key={r.e.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {cliente && (
                  <Link
                    to={`/admin/clientes/${r.c.id}`}
                    className="block font-semibold text-brand-text hover:underline"
                  >
                    {r.c.nombre}
                  </Link>
                )}
                <Link
                  to={`/admin/equipos/${r.e.id}`}
                  className={cn(
                    'block hover:underline',
                    cliente ? 'text-[14px] text-ink-2' : 'font-semibold text-brand-text',
                  )}
                >
                  {r.e.nombre}
                </Link>
                <p className="text-[14px] text-muted-foreground">{r.e.tipo}</p>
              </div>
              <ToneBadge tone={r.s.tone}>{r.s.k}</ToneBadge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
              <div>
                <dt className="text-muted-foreground">Último servicio</dt>
                <dd className="font-medium tnum">{r.l ? orderDate(r.l) : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Próximo</dt>
                <dd className="font-medium tnum">{r.s.next ?? '—'}</dd>
              </div>
            </dl>
            <p className="text-[14px] text-ink-2">{r.s.texto}</p>
            {r.op && (
              <Link to={`/admin/ordenes/${r.op.id}`} className="self-start">
                <StateBadge estado={r.op.estado} />
              </Link>
            )}
            <div className="flex gap-2">
              <Acciones r={r} full />
            </div>
          </Card>
        ))}
      </div>
      <div className="hidden md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              {cliente && <TableHead>Cliente</TableHead>}
              <TableHead>Equipo</TableHead>
              <TableHead>Último servicio</TableHead>
              <TableHead>Próximo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.e.id} className={cn(r.s.k === 'Vencido' && 'bg-danger-soft/40')}>
                {cliente && (
                  <TableCell className="font-medium">
                    <Link
                      to={`/admin/clientes/${r.c.id}`}
                      className="text-brand-text hover:underline"
                    >
                      {r.c.nombre}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  <span className="flex items-center gap-2">
                    {!cliente && (
                      <EquipoIcon tipo={r.e.tipo} className="size-[18px] shrink-0 text-ink-2" />
                    )}
                    <Link
                      to={`/admin/equipos/${r.e.id}`}
                      className="font-medium text-brand-text hover:underline"
                    >
                      {r.e.nombre}
                    </Link>
                  </span>
                  <span className="text-[14px] text-muted-foreground">
                    {r.e.tipo} · {r.e.periodo ? `Cada ${r.e.periodo} meses` : 'Sin periodo'}
                  </span>
                  {r.op && (
                    <Link to={`/admin/ordenes/${r.op.id}`} className="mt-1 block w-fit">
                      <StateBadge estado={r.op.estado} />
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  <span className="block tnum">{r.l ? orderDate(r.l) : '—'}</span>
                  {r.l && !cliente && (
                    <span className="block max-w-[260px] text-[14px] text-muted-foreground">
                      {trabajoDe(r.l)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="tnum">{r.s.next ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <ToneBadge tone={r.s.tone}>{r.s.k}</ToneBadge>
                    <span className="text-[14px] text-ink-2">{r.s.texto}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Acciones r={r} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

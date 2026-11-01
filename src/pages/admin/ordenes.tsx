import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ChevronRight, ClipboardList, Columns3, List, Plus, Search } from 'lucide-react'

import { OrdenRow } from '@/components/app/domain-ui'
import { OrderCard } from '@/components/app/order-ui'
import { Chip, Empty, PageHeader, Segmented, StateBadge, ToneBadge } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { digits, money, norm, parseDate } from '@/lib/dates'
import {
  clienteDeOrden,
  equipoDe,
  ESTADOS,
  ESTADOS_ORDEN,
  missingEvidence,
  totalOrden,
} from '@/lib/domain'
import { useApp } from '@/lib/store'
import type { Estado, Orden } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLS = [
  { k: 'diag', label: 'En diagnóstico', estados: ['diag'] },
  { k: 'pend', label: 'Por autorizar', estados: ['pend'] },
  { k: 'rep', label: 'En reparación', estados: ['aut', 'espera'] },
  { k: 'fin', label: 'Listas para entregar', estados: ['fin'] },
] as const
type ColK = (typeof COLS)[number]['k']
type Vista = 'tablero' | 'lista'

const enTablero = (o: Orden) => o.estado !== 'ent' && o.estado !== 'cerr'
const byIngreso = (a: Orden, b: Orden) =>
  parseDate(a.ingreso).getTime() - parseDate(b.ingreso).getTime()

export default function OrdenesPage() {
  const { db } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const vista: Vista = params.get('vista') === 'lista' ? 'lista' : 'tablero'
  const estadoParam = params.get('estado')
  const est: Estado | 'todos' =
    estadoParam && estadoParam in ESTADOS ? (estadoParam as Estado) : 'todos'
  const [soloFaltan, setSoloFaltan] = React.useState(false)
  const [tab, setTab] = React.useState<ColK>('diag')
  const [q, setQ] = React.useState('')

  const setParam = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v == null) n.delete(k)
        else n.set(k, v)
        return n
      },
      { replace: true },
    )

  const activas = db.ordenes.filter(enTablero)
  const board = activas.filter((o) => !soloFaltan || missingEvidence(o).length)
  const colOf = (k: ColK) =>
    board
      .filter((o) => (COLS.find((c) => c.k === k)!.estados as readonly Estado[]).includes(o.estado))
      .sort(byIngreso)
  const cnt = (s: Estado) => db.ordenes.filter((o) => o.estado === s).length
  const match = (o: Orden) => {
    if (!q) return true
    const e = equipoDe(db, o.eq)
    const c = clienteDeOrden(db, o)
    return (
      norm(`${o.id} ${c.nombre} ${e.nombre} ${c.cedula}`).includes(norm(q)) ||
      (!!digits(q) && digits(c.cedula).includes(digits(q)))
    )
  }
  const lista = db.ordenes
    .filter(
      (o) =>
        (est === 'todos' || o.estado === est) &&
        (!soloFaltan || missingEvidence(o).length) &&
        match(o),
    )
    .sort((a, b) => byIngreso(b, a))
  const nFaltan = (vista === 'lista' ? db.ordenes : activas).filter(
    (o) => missingEvidence(o).length,
  ).length

  const filtroFaltan = (
    <Chip on={soloFaltan} tone="danger" onClick={() => setSoloFaltan((v) => !v)}>
      Faltan evidencias <span className="tnum opacity-70">{nFaltan}</span>
    </Chip>
  )
  const selector = (
    <Segmented
      label="Vista"
      value={vista}
      onChange={(v) => setParam('vista', v === 'lista' ? 'lista' : null)}
      items={[
        { value: 'tablero', label: 'Tablero', icon: Columns3, count: activas.length },
        { value: 'lista', label: 'Todas las órdenes', icon: List, count: db.ordenes.length },
      ]}
    />
  )

  return (
    <>
      <PageHeader
        title="Órdenes de servicio"
        description={
          vista === 'tablero'
            ? 'El tablero muestra solo las órdenes en curso; avanzan de izquierda a derecha. Las entregadas quedan en «Todas las órdenes».'
            : 'Todas las órdenes, incluidas las entregadas y las cerradas. Filtra por estado o busca una en particular.'
        }
        actions={
          <>
            <div className="hidden md:block">{selector}</div>
            <Button asChild>
              <Link to="/admin/ordenes/nueva">
                <Plus />
                Nueva orden
              </Link>
            </Button>
          </>
        }
      />
      <div className="md:hidden">{selector}</div>

      {vista === 'lista' ? (
        <>
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
            <div className="relative">
              <label htmlFor="or-q" className="sr-only">
                Buscar orden
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="or-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
                placeholder="Buscar por número de orden, cliente, cédula o equipo"
                className="h-12 w-full rounded-lg border border-input bg-card pr-3 pl-11 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/20"
              />
            </div>
            <div>
              <p id="or-estado" className="mb-2 text-[14px] font-medium text-ink-2">
                Estado
              </p>
              <div
                role="group"
                aria-labelledby="or-estado"
                className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
              >
                <Chip on={est === 'todos'} onClick={() => setParam('estado', null)}>
                  Todos <span className="tnum opacity-70">{db.ordenes.length}</span>
                </Chip>
                {ESTADOS_ORDEN.map((s) => (
                  <Chip
                    key={s}
                    on={est === s}
                    tone={ESTADOS[s].tone}
                    onClick={() => setParam('estado', s)}
                  >
                    {ESTADOS[s].label} <span className="tnum opacity-70">{cnt(s)}</span>
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filtroFaltan}
              <span className="text-[14px] text-muted-foreground tnum" aria-live="polite">
                {lista.length} {lista.length === 1 ? 'orden' : 'órdenes'}
              </span>
              {(est !== 'todos' || soloFaltan || q) && (
                <Button
                  variant="plain"
                  size="sm"
                  onClick={() => {
                    setParam('estado', null)
                    setSoloFaltan(false)
                    setQ('')
                  }}
                >
                  Quitar filtros
                </Button>
              )}
            </div>
          </div>
          {lista.length === 0 ? (
            <Empty icon={ClipboardList} title="Ninguna orden con estos filtros">
              Cambia el estado o quita los filtros.
            </Empty>
          ) : (
            <>
              <div className="flex flex-col gap-2 md:hidden">
                {lista.map((o) => (
                  <OrdenRow key={o.id} o={o} />
                ))}
              </div>
              <div className="hidden md:block">
                <Table className="min-w-[820px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Orden</TableHead>
                      <TableHead>Cliente y equipo</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Evidencias</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((o) => {
                      const e = equipoDe(db, o.eq)
                      const m = missingEvidence(o)
                      return (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer hover:bg-surface-2"
                          onClick={() => navigate(`/admin/ordenes/${o.id}`)}
                        >
                          <TableCell>
                            <Link
                              to={`/admin/ordenes/${o.id}`}
                              className="font-semibold text-brand-text tnum hover:underline"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              {o.id}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{clienteDeOrden(db, o).nombre}</p>
                            <p className="text-[14px] text-muted-foreground">{e.nombre}</p>
                          </TableCell>
                          <TableCell className="tnum">{o.ingreso}</TableCell>
                          <TableCell>
                            <StateBadge estado={o.estado} />
                          </TableCell>
                          <TableCell>
                            {m.length ? (
                              <ToneBadge tone="danger">Falta {m.join(' y ')}</ToneBadge>
                            ) : (
                              <ToneBadge tone="success">Completas</ToneBadge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tnum">
                            {o.costo == null && o.estado !== 'cerr'
                              ? 'Por definir'
                              : money(totalOrden(o))}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Móvil: una columna a la vez */}
          <div className="flex flex-col gap-3 md:hidden">
            <Segmented
              label="Estado"
              value={tab}
              onChange={setTab}
              items={COLS.map((c) => ({ value: c.k, label: c.label, count: colOf(c.k).length }))}
            />
            <div>{filtroFaltan}</div>
            {colOf(tab).length ? (
              colOf(tab).map((o) => <OrderCard key={o.id} o={o} />)
            ) : (
              <Empty icon={ClipboardList} title="Sin órdenes en este estado" />
            )}
          </div>
          {/* Tablet y escritorio: tablero */}
          <div className="hidden flex-col gap-4 md:flex">
            <div className="flex flex-wrap items-center gap-2">
              {filtroFaltan}
              <span className="text-[14px] text-muted-foreground tnum">
                {board.length} órdenes en curso
              </span>
            </div>
            <div className="-mx-6 no-scrollbar flex gap-4 overflow-x-auto px-6 pb-2 lg:mx-0 lg:px-0 xl:overflow-visible">
              {COLS.map((col) => {
                const items = colOf(col.k)
                return (
                  <section
                    key={col.k}
                    aria-label={col.label}
                    className={cn(
                      'flex w-[264px] shrink-0 flex-col gap-3 rounded-xl bg-secondary p-3 xl:w-auto xl:min-w-0 xl:flex-1',
                    )}
                  >
                    <header className="flex items-center justify-between px-1 pt-1">
                      <h2 className="text-[15px] font-semibold">{col.label}</h2>
                      <span className="rounded-md bg-card px-2 text-[14px] font-semibold text-ink-2 tnum">
                        {items.length}
                      </span>
                    </header>
                    {items.length ? (
                      items.map((o) => <OrderCard key={o.id} o={o} />)
                    ) : (
                      <p className="rounded-lg border border-dashed border-input p-4 text-center text-[14px] text-muted-foreground">
                        Sin órdenes
                      </p>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setParam('vista', 'lista')}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left hover:bg-surface-2"
          >
            <span>
              <span className="block font-semibold">Órdenes entregadas y cerradas</span>
              <span className="block text-[14px] text-ink-2 tnum">
                {cnt('ent') + cnt('cerr')} órdenes · consúltalas en «Todas las órdenes»
              </span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </>
      )}
    </>
  )
}

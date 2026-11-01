import * as React from 'react'
import { CalendarDays, MessageSquareText, Search, SlidersHorizontal } from 'lucide-react'

import { filasMant, MantTabla } from '@/components/app/mant-tabla'
import { Chip, Empty, Notice, PageHeader } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { digits, norm } from '@/lib/dates'
import type { Semaforo, Tone } from '@/lib/domain'
import { useApp } from '@/lib/store'

type Filtro = 'Todos' | Semaforo['k']
const FILTROS: [Filtro, Tone | undefined][] = [
  ['Todos', undefined],
  ['Vencido', 'danger'],
  ['Próximo', 'warning'],
  ['Vigente', 'success'],
  ['Sin periodo', 'neutral'],
]

export default function MantenimientosPage() {
  const { db, openDialog } = useApp()
  const [f, setF] = React.useState<Filtro>('Todos')
  const [q, setQ] = React.useState('')
  const rows = filasMant(db, db.equipos).filter(
    (r) =>
      !q ||
      norm(r.c.nombre).includes(norm(q)) ||
      (!!digits(q) &&
        (digits(r.c.cedula).includes(digits(q)) || digits(r.c.tel).includes(digits(q)))),
  )
  const count = (k: Filtro) =>
    k === 'Todos' ? rows.length : rows.filter((r) => r.s.k === k).length
  const list = rows.filter((r) => f === 'Todos' || r.s.k === f)

  return (
    <>
      <PageHeader
        title="Próximos mantenimientos"
        description="Equipos ordenados por urgencia según su periodo de mantenimiento preventivo."
        actions={
          <>
            <Button variant="secondary" onClick={() => openDialog('plantilla')}>
              <MessageSquareText />
              Mensaje de recordatorio
            </Button>
            <Button variant="secondary" onClick={() => openDialog('umbral')}>
              <SlidersHorizontal />
              Aviso con {db.umbral} días
            </Button>
          </>
        }
      />
      <div className="relative max-w-[480px]">
        <label htmlFor="mt-q" className="sr-only">
          Buscar cliente
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="mt-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Buscar cliente por nombre, cédula o teléfono"
          className="h-12 w-full rounded-lg border border-input bg-card pr-3 pl-11 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/20"
        />
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map(([k, t]) => (
          <Chip key={k} on={f === k} tone={t} onClick={() => setF(k)}>
            {k} <span className="tnum opacity-70">{count(k)}</span>
          </Chip>
        ))}
      </div>
      {f === 'Próximo' && (
        <Notice title={`«Próximo» significa que faltan ${db.umbral} días o menos.`}>
          Puedes cambiar este aviso con el botón «Aviso con {db.umbral} días».
        </Notice>
      )}
      {list.length === 0 ? (
        <Empty icon={CalendarDays} title="Nada para mostrar">
          {q
            ? 'Ningún equipo coincide con la búsqueda y el filtro elegidos.'
            : `No hay equipos con estado «${f}».`}
        </Empty>
      ) : (
        <MantTabla rows={list} />
      )}
    </>
  )
}

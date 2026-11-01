import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight, IdCard, MessageCircle, Phone, Plus, Search, UserRound } from 'lucide-react'

import { QuickAnswer } from '@/components/app/domain-ui'
import { Empty, PageHeader, Segmented, UserAvatar } from '@/components/app/ui-kit'
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
import { digits, norm } from '@/lib/dates'
import { lastForClient, orderDate, semaforo } from '@/lib/domain'
import { useApp } from '@/lib/store'

type Modo = 'nombre' | 'cedula' | 'telefono'
const esCedula = (q: string) => /^\d[\d.\s]*$/.test(q)

export default function ClientesPage() {
  const { db, openDialog } = useApp()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [modo, setModo] = React.useState<Modo>(esCedula(q) ? 'cedula' : 'nombre')
  // Un número escrito en modo «nombre» (p. ej. desde la búsqueda global) se busca como cédula.
  const modoEf: Modo = modo === 'nombre' && esCedula(q) ? 'cedula' : modo

  const setQ = (v: string) => setParams(v ? { q: v } : {}, { replace: true })
  const list = db.clientes.filter((c) =>
    !q
      ? true
      : modoEf === 'nombre'
        ? norm(c.nombre).includes(norm(q))
        : digits(q).length > 0 &&
          ((modoEf === 'cedula' && digits(c.cedula).includes(digits(q))) ||
            ((modoEf === 'telefono' || modo === 'nombre') && digits(c.tel).includes(digits(q)))),
  )
  const nEq = (cid: string) => db.equipos.filter((e) => e.cliente === cid).length
  const venc = db.equipos.filter((e) => semaforo(db, e).k === 'Vencido').length

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Busca por nombre, cédula o teléfono para ver los equipos del cliente y cuándo fue su última intervención."
        actions={
          <Button onClick={() => openDialog('cliente')}>
            <Plus />
            Registrar cliente
          </Button>
        }
      />
      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Segmented
            label="Buscar por"
            value={modoEf}
            onChange={(v) => {
              setModo(v)
              setQ('')
            }}
            items={[
              { value: 'nombre', label: 'Por nombre', icon: UserRound },
              { value: 'cedula', label: 'Por cédula', icon: IdCard },
              { value: 'telefono', label: 'Por teléfono', icon: Phone },
            ]}
          />
          <div className="relative min-w-0 flex-1">
            <label htmlFor="cl-q" className="sr-only">
              Buscar cliente
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="cl-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              inputMode={modoEf === 'nombre' ? 'text' : 'numeric'}
              autoComplete="off"
              placeholder={
                modoEf === 'nombre'
                  ? 'Escribe el nombre, por ejemplo Carlos'
                  : modoEf === 'cedula'
                    ? 'Escribe la cédula, por ejemplo 1090456781'
                    : 'Escribe el celular, por ejemplo 310 555 0142'
              }
              className="h-12 w-full rounded-lg border border-input bg-card pr-24 pl-11 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute top-1/2 right-2 h-9 -translate-y-1/2 rounded-md px-3 text-[14px] font-medium text-ink-2 hover:bg-secondary"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
        <p className="text-[14px] text-muted-foreground tnum" aria-live="polite">
          {q
            ? list.length === 1
              ? '1 cliente encontrado'
              : `${list.length} clientes encontrados`
            : `${db.clientes.length} clientes · ${db.equipos.length} equipos · ${venc} mantenimientos vencidos`}
        </p>
      </Card>

      {q &&
        list.length > 0 &&
        list.length <= 3 &&
        list.map((c) => <QuickAnswer key={c.id} c={c} />)}

      {list.length === 0 ? (
        <Empty
          title="No encontramos clientes"
          action={
            <Button variant="secondary" onClick={() => openDialog('cliente')}>
              <Plus />
              Registrar cliente
            </Button>
          }
        >
          Revisa que{' '}
          {modoEf === 'nombre'
            ? 'el nombre'
            : modoEf === 'cedula'
              ? 'la cédula'
              : 'el teléfono'}{' '}
          esté bien escrito o cambia el tipo de búsqueda.
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {list.map((c) => {
              const l = lastForClient(db, c.id)
              return (
                <Link
                  key={c.id}
                  to={`/admin/clientes/${c.id}`}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={c.nombre} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.nombre}</p>
                      <p className="text-[14px] text-muted-foreground tnum">
                        {c.cedula ? `CC ${c.cedula}` : 'Sin cédula'} · {nEq(c.id)} equipo
                        {nEq(c.id) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                  {l && (
                    <p className="text-[14px] text-ink-2">
                      Última intervención:{' '}
                      <span className="font-medium text-foreground tnum">{orderDate(l)}</span>
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
          <div className="hidden md:block">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Equipos</TableHead>
                  <TableHead>Última intervención</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => {
                  const l = lastForClient(db, c.id)
                  return (
                    <TableRow key={c.id} className="hover:bg-surface-2">
                      <TableCell>
                        <Link
                          to={`/admin/clientes/${c.id}`}
                          className="group flex items-center gap-3"
                          title="Abrir la ficha del cliente"
                        >
                          <UserAvatar name={c.nombre} size={36} />
                          <div>
                            <p className="font-medium text-brand-text group-hover:underline">
                              {c.nombre}
                            </p>
                            <p className="text-[14px] text-muted-foreground">
                              Usuario: {c.usuario}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="tnum">
                        {c.cedula || <span className="text-muted-foreground">Sin cédula</span>}
                      </TableCell>
                      <TableCell className="tnum">
                        {c.tel || <span className="text-muted-foreground">Sin teléfono</span>}
                      </TableCell>
                      <TableCell className="tnum">{nEq(c.id)}</TableCell>
                      <TableCell className="tnum">
                        {l ? orderDate(l) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant={c.tel ? 'whatsapp' : 'quiet'}
                            size="sm"
                            disabled={!c.tel}
                            className="hidden lg:inline-flex"
                            onClick={() => openDialog('whatsapp', { cid: c.id })}
                          >
                            <MessageCircle />
                            WhatsApp
                          </Button>
                          <Button variant="secondary" size="sm" asChild>
                            <Link to={`/admin/clientes/${c.id}`}>Ver ficha</Link>
                          </Button>
                        </div>
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
  )
}

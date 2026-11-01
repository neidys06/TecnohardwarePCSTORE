import type * as React from 'react'
import { Check, ImageOff, Camera, X } from 'lucide-react'

import { KV, StateBadge, Thumb } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ago, money } from '@/lib/dates'
import {
  clienteDeOrden,
  equipoDe,
  isOpen,
  missingEvidence,
  orderDate,
  totalOrden,
} from '@/lib/domain'
import { useApp } from '@/lib/store'
import type { Foto, Orden } from '@/lib/types'
import { cn } from '@/lib/utils'

export function OrderCard({ o }: { o: Orden }) {
  const { db, openDialog } = useApp()
  const e = equipoDe(db, o.eq)
  const c = clienteDeOrden(db, o)
  const miss = missingEvidence(o)
  return (
    <button
      type="button"
      onClick={() => openDialog('vista-rapida', { id: o.id })}
      className="flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left transition hover:border-input hover:shadow-[0_1px_3px_rgb(0_0_0/0.06)]"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-semibold whitespace-nowrap text-brand-text tnum">
          {o.id}
        </span>
        <span className="text-right text-[14px] text-muted-foreground">
          {o.estado === 'fin' ? `Lista ${ago(orderDate(o))}` : ago(o.ingreso)}
        </span>
      </span>
      <span className="leading-6 font-semibold">{c.nombre}</span>
      <span className="text-[14px] leading-5 text-ink-2">{e.nombre}</span>
      {o.costo != null && (
        <span className="text-[14px] text-ink-2 tnum">
          {o.estado === 'pend' ? 'Por autorizar: ' : 'Valor: '}
          <span className="font-medium text-foreground">{money(totalOrden(o))}</span>
        </span>
      )}
      {(o.estado === 'espera' || o.fotos.proceso.length > 0 || miss.length > 0) && (
        <span className="flex flex-wrap gap-1.5 pt-1">
          {o.estado === 'espera' && (
            <span className="rounded-md bg-warning-soft px-2.5 py-1 text-[14px] leading-5 font-medium text-warning">
              Espera adicional
            </span>
          )}
          {o.fotos.proceso.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-[14px] leading-5 text-ink-2 tnum">
              <Camera className="size-3.5" />
              {o.fotos.proceso.length} del proceso
            </span>
          )}
          {miss.length > 0 && (
            <span className="inline-flex items-start gap-1.5 rounded-md bg-danger-soft px-2.5 py-1 text-[14px] leading-5 font-medium text-destructive">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive" />
              Faltan fotos de {miss.join(' y ')}
            </span>
          )}
        </span>
      )}
    </button>
  )
}

const PASOS = ['Diagnóstico', 'Autorización', 'Reparación', 'Finalizada', 'Entregada']
const IDX = { diag: 0, pend: 1, aut: 2, espera: 2, fin: 3, ent: 4, cerr: 1 } as const

export function Stepper({ o }: { o: Orden }) {
  const idx = IDX[o.estado]
  const cerr = o.estado === 'cerr'
  return (
    <ol
      className="no-scrollbar flex items-center gap-2 overflow-x-auto rounded-xl border bg-card p-3 sm:p-4"
      aria-label="Avance de la orden"
    >
      {PASOS.map((s, i) => {
        const done = i < idx || (o.estado === 'ent' && i === 4)
        const cur = i === idx && !done
        return (
          <li
            key={s}
            className="flex shrink-0 items-center gap-2"
            aria-current={cur ? 'step' : undefined}
          >
            <span
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-full text-[14px] font-semibold',
                done
                  ? 'bg-success text-white'
                  : cur
                    ? cerr
                      ? 'bg-muted-foreground text-white'
                      : 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : cerr && cur ? (
                <X className="size-4" strokeWidth={2.5} />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                'text-[14px]',
                cur ? 'font-semibold' : done ? 'text-ink-2' : 'text-muted-foreground',
              )}
            >
              {cerr && i === 1 ? 'No autorizada' : s}
            </span>
            {i < PASOS.length - 1 && (
              <span className={cn('mx-1 h-px w-6 sm:w-10', done ? 'bg-success' : 'bg-input')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Bloque({
  title,
  req,
  fotos,
  onAdd,
  closed,
}: {
  title: string
  req: boolean
  fotos: Foto[]
  onAdd: () => void
  closed: boolean
}) {
  const n = fotos.length
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center justify-between gap-2 text-[14px]">
        <span className="font-medium">
          {title}{' '}
          <span className="font-normal text-muted-foreground">
            · {req ? 'obligatoria' : 'opcional'}
          </span>
        </span>
        <span
          className={cn(
            'tnum',
            n ? 'text-ink-2' : req ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {n ? `${n} foto${n > 1 ? 's' : ''}` : req ? 'Falta' : 'Sin fotos'}
        </span>
      </p>
      {n ? (
        <div className="grid grid-cols-3 gap-2">
          {fotos.slice(0, 3).map((src, i) => (
            <Thumb key={i} src={src} label={`${title} ${i + 1}`} />
          ))}
        </div>
      ) : (
        <button
          type="button"
          disabled={closed}
          onClick={onAdd}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-dashed p-3 text-left text-[14px] disabled:cursor-default',
            req
              ? 'border-destructive/50 bg-danger-soft/50 text-destructive'
              : 'border-input text-ink-2',
          )}
        >
          {req ? <ImageOff className="size-[18px]" /> : <Camera className="size-[18px]" />}
          {req
            ? `Aún no hay fotos de ${title.toLowerCase()}`
            : 'Agrega fotos de lo que se va haciendo'}
        </button>
      )}
    </div>
  )
}

/** Ingreso y salida son obligatorias; las fotos durante el servicio son opcionales y llevan una nota. */
export function EvidencePanel({ o, portal }: { o: Orden; portal?: boolean }) {
  const { openDialog } = useApp()
  const closed = portal || o.estado === 'ent' || o.estado === 'cerr'
  const add = (tipo: string) => openDialog('evidencia', { id: o.id, tipo })
  const showSalida = o.estado === 'fin' || o.estado === 'ent' || o.fotos.salida.length > 0
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Evidencia fotográfica</h2>
        {!closed && (
          <Button variant="secondary" size="sm" onClick={() => add('proceso')}>
            <Camera />
            Adjuntar
          </Button>
        )}
      </div>
      <Bloque
        title="Ingreso"
        req
        fotos={o.fotos.ingreso}
        onAdd={() => add('ingreso')}
        closed={closed}
      />
      <div className="flex flex-col gap-2">
        <p className="flex items-center justify-between gap-2 text-[14px]">
          <span className="font-medium">
            Durante el servicio{' '}
            <span className="font-normal text-muted-foreground">· opcional</span>
          </span>
          {o.fotos.proceso.length > 0 && (
            <span className="text-muted-foreground tnum">
              {o.fotos.proceso.length} registro{o.fotos.proceso.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
        {o.fotos.proceso.length ? (
          <ol className="flex flex-col gap-2">
            {o.fotos.proceso.map((x, i) => (
              <li key={i} className="flex gap-3 rounded-lg border p-2.5">
                <div className="w-16 shrink-0">
                  <Thumb src={x.src} label={`Paso ${i + 1}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] leading-5">{x.nota}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground tnum">{x.fecha}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <button
            type="button"
            disabled={closed}
            onClick={() => add('proceso')}
            className="flex items-center gap-2 rounded-lg border border-dashed border-input p-3 text-left text-[14px] text-ink-2 disabled:cursor-default"
          >
            <Camera className="size-[18px]" />
            {closed
              ? 'No se registraron fotos del proceso'
              : 'Agrega fotos de lo que se va haciendo'}
          </button>
        )}
      </div>
      {showSalida ? (
        <Bloque
          title="Salida"
          req
          fotos={o.fotos.salida}
          onAdd={() => add('salida')}
          closed={closed}
        />
      ) : (
        <p className="text-[14px] text-muted-foreground">
          Las fotos de salida son obligatorias al registrar el mantenimiento.
        </p>
      )}
      {!portal && (
        <p className="text-[14px] text-muted-foreground">El cliente ve estas fotos en su portal.</p>
      )}
    </Card>
  )
}

export function WorkSummary({ o }: { o: Orden }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-secondary p-4">
      <div>
        <p className="text-[14px] text-muted-foreground">Trabajo realizado</p>
        <p className="mt-1">{o.trabajo || '—'}</p>
      </div>
      <div>
        <p className="text-[14px] text-muted-foreground">Repuestos utilizados</p>
        {o.repuestos?.length ? (
          <ul className="mt-1 flex flex-col gap-1">
            {o.repuestos.map(([n, q], i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{n}</span>
                <span className="text-ink-2 tnum">{q} und</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-ink-2">Sin repuestos</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
        <span className="text-xl font-semibold tnum">{money(totalOrden(o))}</span>
      </div>
    </div>
  )
}

export function OrderSummaryCard({ o, children }: { o: Orden; children?: React.ReactNode }) {
  const { db } = useApp()
  const e = equipoDe(db, o.eq)
  const c = clienteDeOrden(db, o)
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Resumen</h2>
        <StateBadge estado={o.estado} />
      </div>
      <dl className="grid gap-3">
        <KV k="Equipo" v={e.nombre + (e.serial ? ` · ${e.serial}` : '')} />
        <KV k="Cliente" v={c.nombre + (c.tel ? ` · ${c.tel}` : '')} />
        <KV k="Falla reportada" v={o.falla} />
        {o.recibio && <KV k="Recibido por" v={o.recibio} />}
        <KV
          k="Valor"
          v={o.costo == null && o.estado !== 'cerr' ? 'Por definir' : money(totalOrden(o))}
          mono
        />
        {!isOpen(o) && o.entrega && (
          <KV k={o.estado === 'cerr' ? 'Cerrada' : 'Entregada'} v={o.entrega} mono />
        )}
        {o.entrego && <KV k="Entregado por" v={o.entrego} />}
      </dl>
      {children}
    </Card>
  )
}

export function LogCard({ o }: { o: Orden }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold">Historial de estados</h2>
      <ol className="flex flex-col gap-3">
        {[...o.log].reverse().map((l, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={cn(
                'mt-1.5 size-2.5 shrink-0 rounded-full',
                i === 0 ? 'bg-primary' : 'bg-input',
              )}
            />
            <div className="min-w-0">
              <p className="text-[15px] font-medium">{l[1]}</p>
              <p className="text-[14px] text-muted-foreground tnum">
                {l[0]}
                {l[2] && ` · ${l[2]}`}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

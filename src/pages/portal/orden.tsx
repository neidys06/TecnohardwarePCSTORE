import { useParams } from 'react-router'

import { KV, PageHeader, StateBadge, Thumb } from '@/components/app/ui-kit'
import { Card } from '@/components/ui/card'
import { money } from '@/lib/dates'
import { ESTADOS, equipoDe, totalOrden } from '@/lib/domain'
import { TIENDA } from '@/lib/seed'
import { useApp, useClienteActual } from '@/lib/store'
import type { Foto } from '@/lib/types'
import NotFound from '@/pages/not-found'

function Fotos({ title, label, fotos }: { title: string; label: string; fotos: Foto[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">{title}</p>
      {fotos.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((src, i) => (
            <Thumb key={i} src={src} label={`${label} ${i + 1}`} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-secondary p-3 text-[14px] text-ink-2">
          La tienda aún no ha subido estas fotos.
        </p>
      )}
    </div>
  )
}

export default function PortalOrdenPage() {
  const { id = '' } = useParams()
  const { db } = useApp()
  const yo = useClienteActual()
  const o = db.ordenes.find((x) => x.id === id)
  const e = o && equipoDe(db, o.eq)
  if (!o || !e || e.cliente !== yo) return <NotFound inline />
  const back = { to: `/portal/equipos/${e.id}`, label: e.nombre }

  return (
    <>
      <PageHeader
        back={back}
        title={`Orden ${o.id}`}
        description={`${e.nombre} · Ingresó el ${o.ingreso}`}
      />
      <Card className="flex flex-col gap-3">
        <div>
          <StateBadge estado={o.estado} />
        </div>
        <p className="text-[17px]">{ESTADOS[o.estado].cliente}</p>
      </Card>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-5">
          <dl className="grid gap-4">
            <KV k="Falla reportada" v={o.falla} />
            <KV k="Diagnóstico" v={o.diag || 'En revisión'} />
            {o.trabajo && <KV k="Trabajo realizado" v={o.trabajo} />}
          </dl>
          {!!o.repuestos?.length && (
            <div>
              <p className="text-[14px] text-muted-foreground">Repuestos utilizados</p>
              <ul className="mt-1 flex flex-col gap-1">
                {o.repuestos.map(([n, q], i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{n}</span>
                    <span className="text-ink-2 tnum">{q} und</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Fotos title="Al recibir tu equipo" label="Ingreso" fotos={o.fotos.ingreso} />
          {o.fotos.proceso.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-medium">Durante la reparación</p>
              <ol className="flex flex-col gap-2">
                {o.fotos.proceso.map((x, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border p-2.5">
                    <div className="w-20 shrink-0">
                      <Thumb src={x.src} label={`Paso ${i + 1}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px]">{x.nota}</p>
                      <p className="mt-1 text-[14px] text-muted-foreground tnum">{x.fecha}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(o.estado === 'fin' || o.estado === 'ent') && (
            <Fotos title="Al entregar tu equipo" label="Salida" fotos={o.fotos.salida} />
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <p className="text-[14px] text-muted-foreground">
            {o.estado === 'cerr'
              ? 'Cobrado por diagnóstico'
              : o.estado === 'pend'
                ? 'Costo por autorizar'
                : 'Valor del servicio'}
          </p>
          <p className="text-[28px] leading-9 font-semibold tnum">
            {o.costo == null && o.estado !== 'cerr' ? 'Por definir' : money(totalOrden(o))}
          </p>
          {o.entrega && (
            <p className="text-[14px] text-ink-2 tnum">
              {o.estado === 'cerr' ? 'Cerrada' : 'Entregada'} el {o.entrega}
            </p>
          )}
          <p className="border-t pt-3 text-[14px] text-ink-2">
            ¿Dudas? Escríbenos al WhatsApp {TIENDA.whatsapp}.
          </p>
        </Card>
      </div>
    </>
  )
}

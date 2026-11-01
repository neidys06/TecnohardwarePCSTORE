import * as React from 'react'
import { Link, useParams } from 'react-router'
import {
  Camera,
  Check,
  ChevronRight,
  MessageCircle,
  PackageCheck,
  TriangleAlert,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from '@/lib/toast'

import {
  EvidencePanel,
  LogCard,
  OrderSummaryCard,
  Stepper,
  WorkSummary,
} from '@/components/app/order-ui'
import { Field, Notice, PageHeader, StateBadge, ToneBadge } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { digits, money, thousands } from '@/lib/dates'
import {
  adicionalPendiente,
  avisoListo,
  clienteDeOrden,
  equipoDe,
  missingEvidence,
  totalOrden,
} from '@/lib/domain'
import { useApp } from '@/lib/store'
import type { Orden } from '@/lib/types'
import { useEnvio } from '@/lib/use-envio'
import { cn } from '@/lib/utils'
import NotFound from '@/pages/not-found'

const actions = 'flex flex-wrap gap-2 max-md:flex-col max-md:[&>*]:w-full'

function Titulo({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <p className="mt-1 text-ink-2">{children}</p>}
    </div>
  )
}

function Diagnostico({ o }: { o: Orden }) {
  const { db, acciones, openDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const [diag, setDiag] = React.useState(o.diag)
  const [costo, setCosto] = React.useState(o.costo ? thousands(String(o.costo)) : '')
  const [err, setErr] = React.useState<{ d?: string; c?: string }>({})
  const faltaIngreso = missingEvidence(o).includes('ingreso')

  const save = () => {
    const er: typeof err = {}
    if (diag.trim().length < 10) er.d = 'Describe lo encontrado (mínimo 10 caracteres).'
    const n = Number(digits(costo))
    if (!n) er.c = 'Escribe el costo estimado en pesos.'
    if (faltaIngreso)
      er.c = `${er.c ? `${er.c} ` : ''}Antes de pedir la autorización adjunta las fotos de ingreso.`
    setErr(er)
    if (Object.keys(er).length) return
    enviar(async () => {
      await acciones.registrarDiagnostico(o.id, diag.trim(), n)
      toast.success('Diagnóstico guardado. La orden quedó «Pendiente de autorización».')
    })
  }

  return (
    <Card className="flex flex-col gap-4">
      <Titulo title="Registrar diagnóstico">
        Escribe lo encontrado y el costo estimado. Al guardar, la orden pasa a «Pendiente de
        autorización».
      </Titulo>
      {faltaIngreso && (
        <Notice
          tone="warning"
          title="Faltan las fotos de ingreso"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openDialog('evidencia', { id: o.id, tipo: 'ingreso' })}
            >
              <Camera />
              Adjuntar fotos
            </Button>
          }
        >
          Si no las tomaste al recibir el equipo, agrégalas ahora. Son necesarias para registrar el
          diagnóstico y pedir la autorización.
        </Notice>
      )}
      <Field id="od-d" label="Diagnóstico" required error={err.d}>
        <Textarea
          id="od-d"
          rows={4}
          value={diag}
          onChange={(e) => setDiag(e.target.value)}
          placeholder="Ej.: ventilador obstruido y pasta térmica seca."
          aria-invalid={!!err.d}
          aria-describedby={err.d ? 'od-d-error' : undefined}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="od-c" label="Costo estimado de la reparación" required error={err.c}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2">
              $
            </span>
            <Input
              id="od-c"
              inputMode="numeric"
              className="pl-8 tnum"
              value={costo}
              onChange={(e) => setCosto(thousands(e.target.value))}
              aria-invalid={!!err.c}
              aria-describedby={err.c ? 'od-c-error' : undefined}
            />
          </div>
        </Field>
        <Field
          id="od-g"
          label="Diagnóstico general"
          help="Se cobra solo si el cliente no autoriza."
        >
          <Input id="od-g" readOnly value={money(db.valorDiagnostico)} className="tnum" />
        </Field>
      </div>
      <div className="flex max-md:flex-col md:justify-end">
        <Button onClick={save} disabled={enviando}>
          <Check />
          Guardar y pedir autorización
        </Button>
      </div>
    </Card>
  )
}

function Accion({
  icon: Icon,
  title,
  desc,
  onClick,
  to,
  primary,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  onClick?: () => void
  to?: string
  primary?: boolean
}) {
  const cls = cn(
    'flex items-center gap-4 rounded-xl border p-4 text-left transition',
    primary ? 'border-primary/40 bg-brand-soft/60 hover:bg-brand-soft' : 'hover:bg-surface-2',
  )
  const body = (
    <>
      <span
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-lg',
          primary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-ink-2',
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-[14px] text-ink-2">{desc}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </>
  )
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}

function Principal({ o }: { o: Orden }) {
  const { db, acciones, openDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const c = clienteDeOrden(db, o)
  const total = totalOrden(o)
  const wa = (
    <Button
      variant="whatsapp"
      disabled={!c.tel}
      onClick={() => openDialog('whatsapp', { cid: c.id, oid: o.id })}
    >
      <MessageCircle />
      Enviar por WhatsApp
    </Button>
  )

  switch (o.estado) {
    case 'diag':
      return <Diagnostico o={o} />
    case 'pend':
      return (
        <Card className="flex flex-col gap-4">
          <Titulo title="Esperando la respuesta del cliente">
            Envía el diagnóstico por WhatsApp y registra aquí lo que decida el cliente.
          </Titulo>
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-[14px] text-muted-foreground">Diagnóstico</p>
            <p className="mt-1">{o.diag}</p>
            <p className="mt-3 text-[14px] text-muted-foreground">Costo estimado</p>
            <p className="text-[24px] font-semibold tnum">{money(o.costo)}</p>
          </div>
          <div className={actions}>
            {wa}
            <Button
              disabled={enviando}
              onClick={() =>
                enviar(async () => {
                  await acciones.responderAutorizacion(o.id, true)
                  toast.success('Orden autorizada')
                })
              }
            >
              <Check />
              El cliente autorizó
            </Button>
            <Button variant="secondary" onClick={() => openDialog('no-autorizo', { id: o.id })}>
              <X />
              No autorizó
            </Button>
          </div>
        </Card>
      )
    case 'aut':
      return (
        <Card className="flex flex-col gap-4">
          <Titulo title="¿Qué sigue?">
            El cliente autorizó {money(total)}. Elige la siguiente acción.
          </Titulo>
          {(o.adicionales ?? []).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-medium text-ink-2">Autorizaciones adicionales</p>
              <ul className="flex flex-col gap-2">
                {o.adicionales!.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <span className="min-w-0 text-[15px]">{a.desc}</span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold tnum">+{money(a.costo)}</span>
                      <ToneBadge tone={a.ok ? 'success' : 'neutral'}>
                        {a.ok ? 'Autorizado' : 'No autorizado'}
                      </ToneBadge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Accion
              icon={Wrench}
              primary
              title="Registrar mantenimiento realizado"
              desc="Qué se hizo, repuestos y fotos de salida."
              to={`/admin/ordenes/${o.id}/mantenimiento`}
            />
            <Accion
              icon={Camera}
              title="Adjuntar evidencia del proceso"
              desc="Fotos de lo que se va haciendo durante la reparación, con una nota."
              onClick={() => openDialog('evidencia', { id: o.id, tipo: 'proceso' })}
            />
          </div>
          {/* Ocurre muy rara vez (Acta 4): queda como opción discreta, no como acción principal. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-[14px] text-ink-2">
            <TriangleAlert className="size-4 shrink-0 text-muted-foreground" />
            <span>¿Apareció una falla nueva que el cliente no ha autorizado?</span>
            <button
              type="button"
              onClick={() => openDialog('adicional', { id: o.id })}
              className="font-medium text-brand-text underline-offset-4 hover:underline"
            >
              Pedir autorización adicional
            </button>
          </div>
        </Card>
      )
    case 'espera': {
      const pend = adicionalPendiente(o)
      return (
        <Card className="flex flex-col gap-4">
          <Titulo title="Esperando autorización adicional">
            El monto ya autorizado ({money(total)}) se conserva. El adicional se registra por
            separado.
          </Titulo>
          <div className="rounded-lg bg-warning-soft p-4">
            <p className="text-[14px] font-medium text-warning">Nueva falla</p>
            <p className="mt-1">{pend?.desc}</p>
            <p className="mt-2 text-[24px] font-semibold tnum">+{money(pend?.costo)}</p>
          </div>
          <div className={actions}>
            {wa}
            <Button
              disabled={enviando}
              onClick={() =>
                enviar(async () => {
                  await acciones.responderAdicional(o.id, true)
                  toast.success('Adicional autorizado')
                })
              }
            >
              <Check />
              Autorizó el adicional
            </Button>
            <Button
              variant="secondary"
              disabled={enviando}
              onClick={() =>
                enviar(async () => {
                  await acciones.responderAdicional(o.id, false)
                  toast('Se continúa con lo autorizado')
                })
              }
            >
              <X />
              No autorizó
            </Button>
          </div>
        </Card>
      )
    }
    case 'fin': {
      const falta = missingEvidence(o).length > 0
      const avisado = avisoListo(o)
      return (
        <Card className="flex flex-col gap-4">
          <Titulo title="Listo para entregar">
            El mantenimiento quedó registrado y ya aparece en el historial del cliente.
          </Titulo>
          <WorkSummary o={o} />
          {falta && (
            <Notice
              tone="warning"
              title="Faltan las fotos de salida (obligatorias)"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDialog('evidencia', { id: o.id, tipo: 'salida' })}
                >
                  <Camera />
                  Adjuntar
                </Button>
              }
            >
              Sin ellas no se puede marcar como entregada.
            </Notice>
          )}
          {avisado ? (
            <p className="text-[14px] text-muted-foreground tnum">
              Ya se le avisó al cliente por WhatsApp ({avisado}).
            </p>
          ) : c.tel ? null : (
            <Notice tone="warning" title="El cliente no tiene celular registrado">
              Agrégalo en «Editar cliente» para avisarle por WhatsApp que su equipo está listo.
            </Notice>
          )}
          <div className="flex gap-2 max-md:flex-col md:justify-end">
            <Button
              variant={avisado ? 'secondary' : 'whatsapp'}
              disabled={!c.tel}
              onClick={() => openDialog('whatsapp', { cid: c.id, oid: o.id })}
            >
              <MessageCircle />
              {avisado ? 'Avisar de nuevo' : 'Avisar al cliente que está listo'}
            </Button>
            <Button disabled={falta} onClick={() => openDialog('entregar', { id: o.id })}>
              <PackageCheck />
              Marcar como entregada
            </Button>
          </div>
        </Card>
      )
    }
    default:
      return (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">
              {o.estado === 'cerr' ? 'Cerrada solo con diagnóstico' : 'Orden entregada'}
            </h2>
            <StateBadge estado={o.estado} />
          </div>
          {o.estado === 'cerr' ? (
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-[14px] text-muted-foreground">Diagnóstico</p>
              <p className="mt-1">{o.diag}</p>
              <p className="mt-3 text-[14px] text-muted-foreground">
                Cobrado (diagnóstico general)
              </p>
              <p className="text-[24px] font-semibold tnum">{money(o.cobro)}</p>
            </div>
          ) : (
            <WorkSummary o={o} />
          )}
          {o.entrega && (
            <p className="text-[14px] text-muted-foreground tnum">
              Fecha de {o.estado === 'cerr' ? 'cierre' : 'entrega'}: {o.entrega}
            </p>
          )}
        </Card>
      )
  }
}

export default function OrdenDetallePage() {
  const { id = '' } = useParams()
  const { db, openDialog } = useApp()
  const o = db.ordenes.find((x) => x.id === id)
  if (!o) return <NotFound inline />
  const e = equipoDe(db, o.eq)
  const c = clienteDeOrden(db, o)
  return (
    <>
      <PageHeader
        back={{ to: '/admin/ordenes', label: 'Órdenes' }}
        title={`Orden ${o.id}`}
        description={`${e.nombre} · ${c.nombre} · Ingresó el ${o.ingreso}`}
        actions={
          <Button
            variant="whatsapp"
            className="max-md:hidden"
            disabled={!c.tel}
            onClick={() => openDialog('whatsapp', { cid: c.id, oid: o.id })}
          >
            <MessageCircle />
            WhatsApp
          </Button>
        }
      />
      <Stepper o={o} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* key: al cambiar de estado se reinicia el formulario */}
        <Principal key={o.estado} o={o} />
        <div className="flex flex-col gap-5">
          <OrderSummaryCard o={o}>
            <Button variant="secondary" asChild>
              <Link to={`/admin/clientes/${c.id}`}>
                <UserRound />
                Ver ficha del cliente
              </Link>
            </Button>
          </OrderSummaryCard>
          <EvidencePanel o={o} />
          <LogCard o={o} />
        </div>
      </div>
    </>
  )
}

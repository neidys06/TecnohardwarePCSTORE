import * as React from 'react'
import { useNavigate } from 'react-router'
import { Check, KeyRound, MessageCircle, Plus } from 'lucide-react'
import { toast } from '@/lib/toast'

import { EquipoIcon, Field, KV, Notice } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { digits, money } from '@/lib/dates'
import { adicionalPendiente, AVISO_LISTO, clienteDe, equipoDe, totalOrden } from '@/lib/domain'
import { TIENDA } from '@/lib/seed'
import { useApp } from '@/lib/store'
import { useEnvio } from '@/lib/use-envio'
import { enlaceWhatsApp } from '@/lib/whatsapp'
import { TIPOS_EQUIPO } from '@/lib/types'
import { cn } from '@/lib/utils'

import { CancelButton, CopyBox, Modal } from './modal'

const fmtTel = (t: string) => digits(t).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
const fmtCed = (c: string) =>
  digits(c) ? Number(digits(c)).toLocaleString('es-CO').replace(/,/g, '.') : ''

export function ClienteDialog({ id }: { id?: string }) {
  const { db, acciones, closeDialog, openDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const c = id ? db.clientes.find((x) => x.id === id) : undefined
  const [n, setN] = React.useState(c?.nombre ?? '')
  const [t, setT] = React.useState(c?.tel ?? '')
  const [ce, setCe] = React.useState(c?.cedula ?? '')
  const [err, setErr] = React.useState<{ n?: string; t?: string; c?: string }>({})

  const save = () => {
    const er: typeof err = {}
    if (n.trim().split(/\s+/).length < 2) er.n = 'Escribe nombre y apellido.'
    if (!t) er.t = 'El celular es obligatorio para contactarlo por WhatsApp.'
    else if (digits(t).length !== 10) er.t = 'El celular debe tener 10 dígitos.'
    if (ce && db.clientes.some((x) => x.id !== id && digits(x.cedula) === digits(ce)))
      er.c = 'Ya existe un cliente con esa cédula.'
    setErr(er)
    if (Object.keys(er).length) return
    const datos = { nombre: n.trim(), tel: fmtTel(t), cedula: fmtCed(ce) }
    enviar(
      async () => {
        const r = await acciones.guardarCliente(c?.id, datos)
        if (c) {
          closeDialog()
          toast.success('Datos del cliente actualizados')
        } else openDialog('cliente-creado', { id: r.id, pass: r.pass ?? '' })
      },
      (campos) =>
        setErr({
          n: campos.nombre,
          t: campos.telefono,
          c: campos.cedula,
        }),
    )
  }
  const inv = (k: keyof typeof err, fid: string) => ({
    'aria-invalid': !!err[k],
    'aria-describedby': err[k] ? `${fid}-error` : undefined,
  })

  return (
    <Modal
      title={c ? 'Editar cliente' : 'Registrar cliente'}
      description="Los campos con * son obligatorios."
      footer={
        <>
          <CancelButton />
          <Button onClick={save} disabled={enviando}>
            <Check />
            {c ? 'Guardar cambios' : 'Registrar cliente'}
          </Button>
        </>
      }
    >
      <Field id="cf-n" label="Nombre completo" required error={err.n}>
        <Input
          id="cf-n"
          autoFocus
          autoComplete="off"
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="Ej.: Paula Herrera"
          {...inv('n', 'cf-n')}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="cf-t"
          label="Celular (WhatsApp)"
          required
          error={err.t}
          help={c ? 'Solo la administradora puede cambiar este número.' : undefined}
        >
          <Input
            id="cf-t"
            inputMode="tel"
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="301 555 0185"
            {...inv('t', 'cf-t')}
          />
        </Field>
        <Field id="cf-c" label="Cédula (opcional)" error={err.c}>
          <Input
            id="cf-c"
            inputMode="numeric"
            value={ce}
            onChange={(e) => setCe(e.target.value)}
            placeholder="1090456781"
            {...inv('c', 'cf-c')}
          />
        </Field>
      </div>
      {c && (
        <Field
          id="cf-u"
          label="Usuario del portal"
          help="El usuario no se cambia después de crearlo."
        >
          <Input id="cf-u" readOnly value={c.usuario} />
        </Field>
      )}
      {!c && (
        <Notice title="Acceso al portal">
          Al registrar, el sistema genera el usuario (a partir del nombre) y una contraseña
          temporal, y te deja enviárselos al cliente por WhatsApp. Al entrar por primera vez, el
          cliente debe cambiar la contraseña.
        </Notice>
      )}
    </Modal>
  )
}

export function ClienteCreadoDialog({ id, pass }: { id: string; pass: string }) {
  const { db, closeDialog } = useApp()
  const navigate = useNavigate()
  const c = clienteDe(db, id)
  return (
    <Modal
      title="Cliente registrado"
      size="sm"
      footer={
        <Button
          onClick={() => {
            closeDialog()
            navigate(`/admin/clientes/${id}`)
          }}
        >
          Ver ficha del cliente
        </Button>
      }
    >
      <Notice tone="success" title={`${c.nombre} ya tiene acceso al portal`}>
        Envíale estos datos por WhatsApp. Al entrar, el sistema le pedirá crear su propia
        contraseña.
      </Notice>
      <dl className="grid grid-cols-2 gap-4 rounded-lg bg-secondary p-4">
        <KV k="Usuario" v={c.usuario} />
        <KV k="Contraseña temporal" v={pass} mono />
      </dl>
      <EnviarAcceso cid={id} pass={pass} nuevo />
    </Modal>
  )
}

const OTRO = 'Otros'
const PERIODOS = [
  ['3', 'Cada 3 meses'],
  ['6', 'Cada 6 meses'],
  ['12', 'Cada 12 meses'],
  ['0', 'Sin periodo'],
] as const

export function EquipoDialog({ cid }: { cid: string }) {
  const { db, acciones, closeDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const [tipo, setTipo] = React.useState<string>('Portátil')
  const [otro, setOtro] = React.useState('')
  const [n, setN] = React.useState('')
  const [s, setS] = React.useState('')
  const [per, setPer] = React.useState('6')
  const [err, setErr] = React.useState<{ n?: string; o?: string }>({})
  const save = () => {
    const er: typeof err = {}
    if (tipo === OTRO && otro.trim().length < 3) er.o = 'Escribe qué tipo de equipo es.'
    if (n.trim().length < 3) er.n = 'Escribe la marca y el modelo.'
    setErr(er)
    if (Object.keys(er).length) return
    // Un tipo escrito que coincide con una categoría existente se guarda con su nombre oficial.
    const escrito = otro.trim()
    const final =
      tipo === OTRO
        ? (TIPOS_EQUIPO.find((t) => t.toLowerCase() === escrito.toLowerCase()) ??
          escrito.charAt(0).toUpperCase() + escrito.slice(1))
        : tipo
    enviar(async () => {
      await acciones.crearEquipo(cid, {
        tipo: final,
        nombre: n.trim(),
        serial: s.trim(),
        periodo: per === '0' ? null : Number(per),
      })
      closeDialog()
      toast.success('Equipo registrado')
    })
  }
  return (
    <Modal
      size="lg"
      title="Registrar equipo"
      description={clienteDe(db, cid).nombre}
      footer={
        <>
          <CancelButton />
          <Button onClick={save} disabled={enviando}>
            <Check />
            Registrar equipo
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Tipo de equipo</legend>
        <div
          role="radiogroup"
          aria-label="Tipo de equipo"
          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          {[...TIPOS_EQUIPO, OTRO].map((t) => {
            const on = tipo === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTipo(t)}
                className={cn(
                  'flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 text-center text-[13px] font-medium transition',
                  on
                    ? 'border-primary bg-brand-soft/60 text-brand-text'
                    : 'border-input text-ink-2 hover:bg-surface-2',
                )}
              >
                {t === OTRO ? (
                  <Plus className="size-5" />
                ) : (
                  <EquipoIcon tipo={t} className="size-5" />
                )}
                {t}
              </button>
            )
          })}
        </div>
      </fieldset>
      {tipo === OTRO && (
        <Field id="ef-o" label="Escribe el tipo de equipo" required error={err.o}>
          <Input
            id="ef-o"
            autoFocus
            value={otro}
            onChange={(e) => setOtro(e.target.value)}
            placeholder="Ej.: Consola de videojuegos"
            aria-invalid={!!err.o}
            aria-describedby={err.o ? 'ef-o-error' : undefined}
          />
        </Field>
      )}
      <Field id="ef-n" label="Marca y modelo" required error={err.n}>
        <Input
          id="ef-n"
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="Ej.: Lenovo IdeaPad 3 15ITL6"
          aria-invalid={!!err.n}
          aria-describedby={err.n ? 'ef-n-error' : undefined}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ef-p" label="Mantenimiento preventivo">
          <Select value={per} onValueChange={setPer}>
            <SelectTrigger id="ef-p">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="ef-s" label="Serial (opcional)">
          <Input id="ef-s" value={s} onChange={(e) => setS(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

export function PeriodoDialog({ eid }: { eid: string }) {
  const { db, acciones, closeDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const e = equipoDe(db, eid)
  const [per, setPer] = React.useState(String(e.periodo ?? 0))
  const save = () =>
    enviar(async () => {
      await acciones.guardarPeriodo(eid, per === '0' ? null : Number(per))
      closeDialog()
      toast.success('Periodo guardado')
    })
  return (
    <Modal
      title="Periodo de mantenimiento"
      description={e.nombre}
      size="sm"
      footer={
        <>
          <CancelButton />
          <Button onClick={save} disabled={enviando}>
            <Check />
            Guardar periodo
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Cada cuánto debe volver</legend>
        {PERIODOS.map(([v, l]) => (
          <label
            key={v}
            className={cn(
              'flex h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 transition',
              per === v ? 'border-primary bg-brand-soft/60' : 'border-input hover:bg-surface-2',
            )}
          >
            <input
              type="radio"
              name="per"
              value={v}
              checked={per === v}
              onChange={() => setPer(v)}
              className="size-4 accent-primary"
            />
            {v === '0' ? 'Sin periodo (no enviar alertas)' : l}
          </label>
        ))}
      </fieldset>
      <p className="text-[14px] text-muted-foreground">
        La fecha del próximo mantenimiento se calcula desde el último servicio entregado.
      </p>
    </Modal>
  )
}

export function WhatsAppDialog({ cid, oid }: { cid: string; oid?: string }) {
  const { db, closeDialog, acciones } = useApp()
  const { enviar } = useEnvio()
  const c = clienteDe(db, cid)
  const o = oid ? db.ordenes.find((x) => x.id === oid) : undefined
  const nombre = c.nombre.split(' ')[0]
  const pend = o && adicionalPendiente(o)
  const listo = o?.estado === 'fin'
  const txt = o
    ? listo
      ? `Hola ${nombre}, te escribimos de TecniHardware PC Store. ¡Tu ${equipoDe(db, o.eq).nombre} ya está listo para recoger! (orden ${o.id}). Trabajo realizado: ${o.trabajo || 'mantenimiento'} Valor a pagar: ${money(totalOrden(o))}. Te esperamos en el ${TIENDA.local} del CC Gran Bulevar.`
      : o.estado === 'espera' && pend
        ? `Hola ${nombre}, te escribimos de TecniHardware PC Store. En tu ${equipoDe(db, o.eq).nombre} (orden ${o.id}) encontramos algo más: ${pend.desc} El costo adicional es ${money(pend.costo)}. ¿Nos autorizas a hacerlo?`
        : `Hola ${nombre}, te escribimos de TecniHardware PC Store. Ya revisamos tu ${equipoDe(db, o.eq).nombre} (orden ${o.id}). Diagnóstico: ${o.diag || 'en revisión'} Costo: ${money(o.costo)}. ¿Nos autorizas la reparación?`
    : `Hola ${nombre}, te escribimos de TecniHardware PC Store.`
  const [mensaje, setMensaje] = React.useState(txt)
  const registrar = () =>
    enviar(async () => {
      if (o) await acciones.anotar(o.id, listo ? AVISO_LISTO : 'Mensaje enviado por WhatsApp')
      closeDialog()
      toast.success(
        listo
          ? 'Aviso registrado en la orden'
          : o
            ? 'Contacto registrado en la orden'
            : 'Contacto registrado',
      )
    })
  return (
    <Modal
      title={listo ? 'Avisar que el equipo está listo' : 'Contactar por WhatsApp'}
      description={`${c.nombre} · ${c.tel || 'sin teléfono'}`}
      footer={
        <>
          <CancelButton>Cerrar</CancelButton>
          {c.tel ? (
            <Button variant="whatsapp" asChild>
              <a
                href={enlaceWhatsApp(c.tel, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registrar}
              >
                <MessageCircle />
                Abrir WhatsApp
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      {c.tel ? (
        <Notice title="Se abrirá WhatsApp con este mensaje">
          Revisa el texto, pulsa «Abrir WhatsApp» y luego «Enviar» en WhatsApp. El contacto queda
          registrado{o ? ' en el historial de la orden' : ''}.
        </Notice>
      ) : (
        <Notice tone="warning" title="El cliente no tiene teléfono registrado">
          Agrega su celular en «Editar cliente» para poder escribirle.
        </Notice>
      )}
      <CopyBox text={txt} onChange={setMensaje} />
    </Modal>
  )
}

export function RestablecerDialog({ cid }: { cid: string }) {
  const { db, acciones, closeDialog } = useApp()
  const { enviando, enviar } = useEnvio()
  const c = clienteDe(db, cid)
  const [pass, setPass] = React.useState<string | null>(null)
  const generar = () =>
    enviar(async () => {
      setPass(await acciones.restablecerContrasena(cid))
      toast.success(`Contraseña temporal generada para ${c.nombre.split(' ')[0]}`)
    })
  return (
    <Modal
      title="Restablecer contraseña"
      description={`${c.nombre} · usuario ${c.usuario}`}
      size="sm"
      footer={
        pass ? (
          <Button onClick={closeDialog}>
            <Check />
            Listo
          </Button>
        ) : (
          <>
            <CancelButton />
            <Button onClick={generar} disabled={enviando}>
              <KeyRound />
              Generar contraseña temporal
            </Button>
          </>
        )
      }
    >
      <p className="text-ink-2">
        Se crea una contraseña temporal que el cliente debe cambiar al entrar. Envíasela por
        WhatsApp al {c.tel || 'número registrado'}.
      </p>
      {pass && (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-lg bg-secondary p-4">
            <KV k="Usuario" v={c.usuario} />
            <KV k="Contraseña temporal" v={pass} mono />
          </dl>
          <EnviarAcceso cid={cid} pass={pass} />
        </>
      )}
    </Modal>
  )
}

/** Mensaje de WhatsApp con el usuario y la contraseña temporal del portal (Acta 5). */
export function mensajeAcceso(nombre: string, usuario: string, pass: string, nuevo: boolean) {
  const url = window.location.origin
  const primer = nombre.split(' ')[0]
  return nuevo
    ? `Hola ${primer}, te damos la bienvenida a TecniHardware PC Store. Puedes consultar el estado de tus equipos en ${url} · Usuario: ${usuario} · Contraseña temporal: ${pass}. Al entrar, el sistema te pedirá crear tu propia contraseña.`
    : `Hola ${primer}, te escribimos de TecniHardware PC Store. Tu nueva contraseña temporal es ${pass} (usuario: ${usuario}). Entra en ${url} y crea tu propia contraseña.`
}

function EnviarAcceso({
  cid,
  pass,
  nuevo = false,
}: {
  cid: string
  pass: string
  nuevo?: boolean
}) {
  const { db } = useApp()
  const c = clienteDe(db, cid)
  if (!c.tel)
    return (
      <Notice tone="warning" title="El cliente no tiene celular registrado">
        Entrégale los datos en persona o agrega su celular en «Editar cliente».
      </Notice>
    )
  return (
    <Button variant="whatsapp" asChild>
      <a
        href={enlaceWhatsApp(c.tel, mensajeAcceso(c.nombre, c.usuario, pass, nuevo))}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle />
        Enviar usuario y contraseña por WhatsApp
      </a>
    </Button>
  )
}

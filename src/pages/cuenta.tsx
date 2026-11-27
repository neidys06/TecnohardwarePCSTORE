import * as React from 'react'
import { Check, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from '@/lib/toast'

import { ColorPicker } from '@/components/app/color-picker'
import { Field, PageHeader, UserAvatar } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { mensajeError } from '@/lib/acciones'
import { TIENDA } from '@/lib/seed'
import { useApp, useClienteActual } from '@/lib/store'

export default function CuentaPage({ portal }: { portal?: boolean }) {
  const { db, acciones, sesion, signOut } = useApp()
  const navigate = useNavigate()
  const yo = useClienteActual()
  const me = portal ? (db.clientes.find((c) => c.id === yo) ?? sesion) : sesion
  const [pw, setPw] = React.useState({ a: '', b: '', c: '' })
  const [err, setErr] = React.useState<Partial<Record<'a' | 'b' | 'c', string>>>({})
  // Reunión 8: la cuenta del Administrador la usan Gloria y Dichel; el nombre se puede editar.
  const [nombre, setNombre] = React.useState(sesion.nombre)
  const [errNombre, setErrNombre] = React.useState('')
  const guardarNombre = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nombre.trim().replace(/\s+/g, ' ')
    if (n.length < 3) return setErrNombre('Escribe al menos 3 caracteres.')
    setErrNombre('')
    acciones
      .cambiarNombre(n)
      .then(() => toast.success('Nombre actualizado'))
      .catch((er) => setErrNombre(mensajeError(er)))
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const er: typeof err = {}
    if (!pw.a) er.a = 'Escribe tu contraseña actual.'
    if (pw.b.length < 8 || !/\d/.test(pw.b)) er.b = 'Debe tener al menos 8 caracteres y un número.'
    if (pw.b !== pw.c) er.c = 'Las contraseñas no coinciden.'
    setErr(er)
    if (Object.keys(er).length) return
    acciones
      .cambiarContrasena(pw.a, pw.b, pw.c)
      .then(() => {
        setPw({ a: '', b: '', c: '' })
        toast.success('Contraseña actualizada')
      })
      .catch((e) => setErr({ a: mensajeError(e) }))
  }
  const input = (k: 'a' | 'b' | 'c', auto: string) => (
    <Input
      id={`cu-${k}`}
      type="password"
      autoComplete={auto}
      value={pw[k]}
      aria-invalid={!!err[k]}
      aria-describedby={err[k] ? `cu-${k}-error` : undefined}
      onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))}
    />
  )

  return (
    <>
      <PageHeader
        back={portal ? undefined : { to: '/admin/mas', label: 'Más', mobileOnly: true }}
        title="Mi cuenta"
        description={
          portal
            ? 'Aquí puedes cambiar tu contraseña.'
            : 'El nombre de la cuenta, la contraseña de acceso y el color del sistema.'
        }
      />
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center gap-4 text-center">
          <UserAvatar name={me.nombre} size={96} />
          <div>
            <p className="text-[18px] font-semibold">{me.nombre}</p>
            <p className="text-muted-foreground">
              {portal ? 'Cliente' : 'Administradora'} · Usuario {me.usuario}
            </p>
          </div>
          {!portal && (
            <form
              className="flex w-full flex-col gap-3 text-left"
              onSubmit={guardarNombre}
              noValidate
            >
              <Field
                id="cu-n"
                label="Nombre que se muestra"
                error={errNombre}
                help="La cuenta la usan Gloria y Dichel, por eso conviene un nombre de la tienda."
              >
                <Input
                  id="cu-n"
                  value={nombre}
                  maxLength={120}
                  aria-invalid={!!errNombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="secondary" disabled={nombre.trim() === sesion.nombre}>
                <Check />
                Guardar nombre
              </Button>
            </form>
          )}
          {portal && (
            <div className="w-full rounded-lg bg-secondary p-3.5 text-left text-[14px] text-ink-2">
              <p className="font-medium text-foreground">¿Cambiaste de celular?</p>
              <p className="mt-1">
                Avísale a la tienda por WhatsApp al {TIENDA.whatsapp}. Solo la administradora puede
                actualizar tu número.
              </p>
            </div>
          )}
        </Card>
        <Card>
          <form className="flex flex-col gap-4" onSubmit={save} noValidate>
            <h2 className="text-xl font-semibold">Cambiar contraseña</h2>
            <Field id="cu-a" label="Contraseña actual" error={err.a}>
              {input('a', 'current-password')}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="cu-b"
                label="Nueva contraseña"
                error={err.b}
                help="Mínimo 8 caracteres y un número."
              >
                {input('b', 'new-password')}
              </Field>
              <Field id="cu-c" label="Confirma la nueva contraseña" error={err.c}>
                {input('c', 'new-password')}
              </Field>
            </div>
            <div className="flex md:justify-end max-md:[&>*]:w-full">
              <Button type="submit">
                <Check />
                Guardar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </div>
      {!portal && (
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Color del sistema</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              Elige el color que quieras para botones y menús. Se aplica a tu panel y al portal de
              los clientes; el logo conserva sus colores.
            </p>
          </div>
          <ColorPicker />
        </Card>
      )}
      {portal && (
        <Button
          variant="secondary"
          className="md:hidden"
          onClick={() => {
            signOut()
            navigate('/login')
          }}
        >
          <LogOut />
          Cerrar sesión
        </Button>
      )}
    </>
  )
}

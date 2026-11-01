import * as React from 'react'
import { Link, Navigate, useNavigate } from 'react-router'

import { Field, Notice } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mensajeError } from '@/lib/acciones'
import { MODO_API } from '@/lib/api'
import { useApp } from '@/lib/store'

const DEMOS = [
  ['Administradora', 'admin', 'Tecni2026'],
  ['Cliente', 'cmendoza', 'Carlos2026'],
  ['Primer ingreso', 'nuevo', 'Temporal1'],
  ['Datos incorrectos', 'admin', 'clave-mala'],
] as const

export default function LoginPage() {
  const { role, acciones, cargando } = useApp()
  const navigate = useNavigate()
  const [u, setU] = React.useState('')
  const [p, setP] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)

  if (cargando) return null
  if (role)
    return <Navigate to={role === 'admin' ? '/admin/clientes' : '/portal/equipos'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!u || !p) return setErr('Escribe tu usuario y tu contraseña.')
    setEnviando(true)
    try {
      const destino = await acciones.iniciarSesion(u.trim(), p)
      if (destino === 'primer-ingreso')
        return navigate('/primer-ingreso', { state: { temporal: true } })
      navigate(destino === 'admin' ? '/admin/clientes' : '/portal/equipos')
    } catch (e) {
      setErr(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div>
        <h1 className="text-[28px] leading-9 font-semibold">Inicia sesión</h1>
        <p className="mt-2 text-ink-2">
          Entra con el usuario que te entregó la tienda. El sistema reconoce si eres la
          administradora o un cliente.
        </p>
      </div>
      {err && (
        <Notice tone="danger" title="No pudimos iniciar sesión">
          {err}
        </Notice>
      )}
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field id="lg-u" label="Usuario">
          <Input
            id="lg-u"
            autoComplete="username"
            autoCapitalize="none"
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="Ej.: cmendoza"
          />
        </Field>
        <Field id="lg-p" label="Contraseña">
          <div className="relative">
            <Input
              id="lg-p"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              className="pr-24"
            />
            <button
              type="button"
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-md px-3 text-[14px] font-medium text-brand-text hover:bg-brand-soft"
            >
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Button>
        <Link
          to="/recuperar"
          className="self-start text-[15px] font-medium text-brand-text underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
      {!MODO_API && (
        <div className="rounded-xl border bg-surface-2 p-4">
          <p className="text-[14px] font-medium text-ink-2">Usuarios de prueba del prototipo</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DEMOS.map(([label, a, b]) => (
              <Button
                key={label}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setU(a)
                  setP(b)
                  setErr('')
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-[14px] text-muted-foreground">
            Cada botón llena el formulario; luego pulsa Ingresar.
          </p>
        </div>
      )}
    </>
  )
}

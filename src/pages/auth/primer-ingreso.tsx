import * as React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { CircleCheck, CircleDashed } from 'lucide-react'
import { toast } from '@/lib/toast'
import { mensajeError } from '@/lib/acciones'

import { Field } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function PrimerIngresoPage() {
  const { acciones } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [a, setA] = React.useState('')
  const [b, setB] = React.useState('')
  const [err, setErr] = React.useState<{ a?: string; b?: string }>({})

  // Solo se llega aquí después de entrar con una contraseña temporal.
  if (!(location.state as { temporal?: boolean } | null)?.temporal)
    return <Navigate to="/login" replace />

  const reglas: [boolean, string][] = [
    [a.length >= 8, 'Al menos 8 caracteres'],
    [/\d/.test(a), 'Al menos un número'],
    [!!a && a === b, 'Las dos contraseñas coinciden'],
  ]
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: typeof err = {}
    if (a.length < 8 || !/\d/.test(a))
      er.a = 'La contraseña debe tener al menos 8 caracteres y un número.'
    if (a !== b) er.b = 'Las contraseñas no coinciden.'
    setErr(er)
    if (Object.keys(er).length) return
    let rol
    try {
      rol = await acciones.crearContrasena(a, b)
    } catch (e) {
      return setErr({ a: mensajeError(e) })
    }
    toast.success('Contraseña creada. Ya puedes usar el sistema.')
    navigate(rol === 'admin' ? '/admin/clientes' : '/portal/equipos', { replace: true })
  }

  return (
    <>
      <div>
        <h1 className="text-[28px] leading-9 font-semibold">Crea tu nueva contraseña</h1>
        <p className="mt-2 text-ink-2">
          Entraste con una contraseña temporal. Crea una propia para seguir.
        </p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field id="pi-a" label="Nueva contraseña" error={err.a}>
          <Input
            id="pi-a"
            type="password"
            autoComplete="new-password"
            value={a}
            onChange={(e) => setA(e.target.value)}
            aria-invalid={!!err.a}
            aria-describedby="pi-reglas"
          />
        </Field>
        <Field id="pi-b" label="Confirma la contraseña" error={err.b}>
          <Input
            id="pi-b"
            type="password"
            autoComplete="new-password"
            value={b}
            onChange={(e) => setB(e.target.value)}
            aria-invalid={!!err.b}
          />
        </Field>
        <ul id="pi-reglas" className="flex flex-col gap-1.5">
          {reglas.map(([ok, l]) => (
            <li
              key={l}
              className={cn(
                'flex items-center gap-2 text-[14px]',
                ok ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {ok ? <CircleCheck className="size-4" /> : <CircleDashed className="size-4" />}
              {l}
              <span className="sr-only">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
            </li>
          ))}
        </ul>
        <Button type="submit" size="lg" className="w-full">
          Guardar y entrar
        </Button>
      </form>
    </>
  )
}

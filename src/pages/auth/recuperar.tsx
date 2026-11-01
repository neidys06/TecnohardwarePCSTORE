import * as React from 'react'
import { Link } from 'react-router'
import { Check } from 'lucide-react'

import { Field } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { digits } from '@/lib/dates'
import { useApp } from '@/lib/store'

export default function RecuperarPage() {
  const { acciones } = useApp()
  const [u, setU] = React.useState('')
  const [t, setT] = React.useState('')
  const [err, setErr] = React.useState<{ u?: string; t?: string }>({})
  const [sent, setSent] = React.useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: typeof err = {}
    if (!u) er.u = 'Escribe tu usuario.'
    if (digits(t).length !== 10) er.t = 'Escribe los 10 dígitos de tu celular registrado.'
    setErr(er)
    if (Object.keys(er).length) return
    // La respuesta es la misma exista o no el usuario, para no revelar quién está registrado.
    acciones.solicitarRestablecimiento(u.trim()).catch(() => {})
    setSent(true)
  }

  if (sent)
    return (
      <>
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-6" />
        </div>
        <div role="status">
          <h1 className="text-[28px] leading-9 font-semibold">Solicitud enviada</h1>
          <p className="mt-2 text-ink-2">
            La tienda recibió tu solicitud. Cuando la administradora la revise, te enviará una
            contraseña temporal por WhatsApp al celular terminado en {digits(t).slice(-4)}. Al
            entrar con ella, el sistema te pedirá crear una nueva.
          </p>
        </div>
        <Button size="lg" className="w-full" asChild>
          <Link to="/login">Volver a iniciar sesión</Link>
        </Button>
      </>
    )

  return (
    <>
      <div>
        <h1 className="text-[28px] leading-9 font-semibold">Recuperar contraseña</h1>
        <p className="mt-2 text-ink-2">
          Por seguridad, la contraseña la restablece la tienda. Escribe tus datos y te enviaremos
          una contraseña temporal.
        </p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field id="rc-u" label="Usuario" error={err.u}>
          <Input
            id="rc-u"
            autoComplete="username"
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="Ej.: cmendoza"
            aria-invalid={!!err.u}
            aria-describedby={err.u ? 'rc-u-error' : undefined}
          />
        </Field>
        <Field
          id="rc-t"
          label="Celular registrado"
          error={err.t}
          help="Debe ser el mismo número que tiene la tienda."
        >
          <Input
            id="rc-t"
            inputMode="tel"
            autoComplete="tel"
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="310 555 0142"
            aria-invalid={!!err.t}
            aria-describedby={err.t ? 'rc-t-error' : undefined}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Enviar solicitud
        </Button>
        <Button variant="secondary" size="lg" className="w-full" asChild>
          <Link to="/login">Cancelar</Link>
        </Button>
      </form>
    </>
  )
}

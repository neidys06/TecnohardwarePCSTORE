import { Link } from 'react-router'
import { Compass } from 'lucide-react'

import { Logo } from '@/components/app/brand'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'

export default function NotFound({ inline }: { inline?: boolean }) {
  const { role } = useApp()
  const home =
    role === 'admin' ? '/admin/clientes' : role === 'cliente' ? '/portal/equipos' : '/login'
  const body = (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-text">
        <Compass className="size-7" />
      </span>
      <p className="text-[14px] font-semibold tracking-wide text-brand-text tnum">ERROR 404</p>
      <h1 className="text-[26px] leading-8 font-semibold">Esta página no existe</h1>
      <p className="max-w-[46ch] text-ink-2">
        Puede que el enlace esté mal escrito o que el registro se haya eliminado. Vuelve al inicio
        para seguir trabajando.
      </p>
      <Button asChild>
        <Link to={home}>Volver al inicio</Link>
      </Button>
    </div>
  )
  if (inline) return <div className="py-16">{body}</div>
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-background px-5">
      <Logo />
      {body}
    </div>
  )
}

import { Link } from 'react-router'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function AccesoDenegadoPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-danger-soft text-destructive">
        <Lock className="size-[26px]" />
      </span>
      <h1 className="text-[26px] leading-8 font-semibold">No tienes acceso a esta página</h1>
      <p className="max-w-md text-ink-2">
        Esta sección es solo para la administradora. Desde tu portal puedes ver tus equipos, órdenes
        y precios.
      </p>
      <Button size="lg" asChild>
        <Link to="/portal/equipos">Ir a mis equipos</Link>
      </Button>
    </div>
  )
}

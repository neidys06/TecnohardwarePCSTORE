import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { CircleUserRound, Laptop, LogOut, Tag } from 'lucide-react'

import { Logo } from '@/components/app/brand'
import { UserAvatar } from '@/components/app/ui-kit'
import { TabBar } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { useApp, useClienteActual } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/portal/equipos', label: 'Mis equipos', short: 'Equipos', icon: Laptop },
  { to: '/portal/precios', label: 'Lista de precios', short: 'Precios', icon: Tag },
  { to: '/portal/cuenta', label: 'Mi cuenta', short: 'Cuenta', icon: CircleUserRound },
]

export function PortalLayout() {
  const { db, signOut } = useApp()
  const navigate = useNavigate()
  const yo = useClienteActual()
  const me = db.clientes.find((c) => c.id === yo)
  const salir = () => {
    signOut()
    navigate('/login')
  }
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 hidden border-b bg-card md:block">
        <div className="mx-auto flex h-[72px] w-full max-w-[1120px] items-center gap-2 px-6 lg:px-8">
          <Link to="/portal/equipos" aria-label="Inicio" className="mr-4">
            <Logo size="sm" />
          </Link>
          <nav
            aria-label="Portal"
            className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 shrink-0 items-center rounded-lg px-3 text-[15px] font-medium',
                    isActive ? 'bg-brand-soft text-brand-text' : 'text-ink-2 hover:bg-secondary',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <UserAvatar name={me?.nombre ?? ''} photo={db.fotoCliente} size={36} />
            <span className="hidden text-[15px] font-medium lg:inline">{me?.nombre ?? ''}</span>
            <Button variant="secondary" size="sm" onClick={salir}>
              <LogOut />
              Salir
            </Button>
          </div>
        </div>
      </header>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-card px-2 md:hidden">
        <Link to="/portal/equipos" aria-label="Inicio" className="pr-1 pl-2">
          <Logo size="sm" />
        </Link>
        <div className="flex-1" />
        <Link to="/portal/cuenta" aria-label="Mi cuenta" className="pr-1">
          <UserAvatar name={me?.nombre ?? ''} photo={db.fotoCliente} size={36} />
        </Link>
        <Button variant="plain" size="sm" onClick={salir}>
          <LogOut />
          Salir
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 pt-4 pb-28 md:gap-6 md:px-6 md:pt-7 md:pb-12 lg:px-8 lg:pt-10">
        <Outlet />
      </main>
      <TabBar items={NAV.map((n) => ({ to: n.to, label: n.short, icon: n.icon }))} />
    </div>
  )
}

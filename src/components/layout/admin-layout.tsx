import * as React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Bell,
  CalendarClock,
  CircleUserRound,
  ClipboardList,
  LogOut,
  Menu,
  Search,
  Tag,
  Users,
} from 'lucide-react'

import { Logo } from '@/components/app/brand'
import { UserAvatar } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { isOpen, semaforo } from '@/lib/domain'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin/clientes', label: 'Clientes', short: 'Clientes', icon: Users },
  {
    to: '/admin/ordenes',
    label: 'Órdenes',
    short: 'Órdenes',
    icon: ClipboardList,
    count: 'ordenes' as const,
  },
  {
    to: '/admin/mantenimientos',
    label: 'Mantenimientos',
    short: 'Próximos',
    icon: CalendarClock,
    count: 'vencidos' as const,
  },
  { to: '/admin/precios', label: 'Lista de precios', short: 'Precios', icon: Tag },
]

function useCounts() {
  const { db } = useApp()
  return React.useMemo(
    () => ({
      ordenes: db.ordenes.filter(isOpen).length,
      vencidos: db.equipos.filter((e) => semaforo(db, e).k === 'Vencido').length,
      notifs: db.notifs.filter((n) => !n.leida).length,
    }),
    [db],
  )
}

export function AdminLayout() {
  const { db, openDialog, signOut, sesion } = useApp()
  const counts = useCounts()
  const navigate = useNavigate()
  const [q, setQ] = React.useState('')
  const logout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Escritorio: menú lateral */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 pt-6 pb-4 lg:flex">
        <Link to="/admin/clientes" className="px-2 pb-6" aria-label="Inicio">
          <Logo subtitle />
        </Link>
        <p className="px-3 pb-2 text-[14px] font-medium text-muted-foreground">Gestión</p>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition',
                  isActive
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <n.icon className="size-5" />
              <span className="flex-1">{n.label}</span>
              {n.count && counts[n.count] > 0 && (
                <span
                  className={cn(
                    'rounded-md px-1.5 text-[13px] font-semibold tnum',
                    n.count === 'vencidos'
                      ? 'bg-danger-soft text-destructive'
                      : 'bg-secondary text-ink-2',
                  )}
                >
                  {counts[n.count]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <NavLink
            to="/admin/cuenta"
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium',
                isActive
                  ? 'bg-brand-soft text-brand-text'
                  : 'text-sidebar-foreground hover:bg-secondary',
              )
            }
          >
            <CircleUserRound className="size-5" />
            Mi cuenta
          </NavLink>
          <div className="mt-2 flex items-center gap-3 rounded-xl border bg-surface-2 p-3">
            <UserAvatar name={sesion.nombre} photo={db.fotoAdmin} size={36} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{sesion.nombre}</p>
              <p className="text-[14px] text-muted-foreground">Administradora</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-sidebar-foreground hover:bg-secondary"
          >
            <LogOut className="size-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Escritorio: barra superior */}
        <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b bg-card/95 px-8 backdrop-blur-none lg:flex">
          <form
            role="search"
            className="relative w-full max-w-[440px]"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/admin/clientes?q=${encodeURIComponent(q)}`)
            }}
          >
            <label htmlFor="busqueda-global" className="sr-only">
              Buscar cliente por nombre, cédula o teléfono
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              id="busqueda-global"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente por nombre, cédula o teléfono"
              className="h-10 w-full rounded-lg border border-transparent bg-secondary pr-3 pl-10 text-[15px] outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-card"
            />
          </form>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => openDialog('notificaciones')}>
            <Bell />
            Notificaciones
            {counts.notifs > 0 && (
              <span className="ml-1 rounded-md bg-primary px-1.5 text-[13px] text-primary-foreground tnum">
                {counts.notifs}
              </span>
            )}
          </Button>
        </header>

        {/* Tablet: navegación superior */}
        <header className="sticky top-0 z-30 hidden h-[72px] items-center gap-2 border-b bg-card px-6 md:flex lg:hidden">
          <Link to="/admin/clientes" aria-label="Inicio" className="mr-3">
            <Logo size="sm" />
          </Link>
          <nav
            aria-label="Principal"
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
                {n.short === 'Próximos' ? 'Mantenimientos' : n.short}
              </NavLink>
            ))}
          </nav>
          <NotifIcon count={counts.notifs} onClick={() => openDialog('notificaciones')} />
          <Link to="/admin/cuenta" aria-label="Mi cuenta" className="ml-1">
            <UserAvatar name={sesion.nombre} photo={db.fotoAdmin} />
          </Link>
        </header>

        {/* Móvil: barra superior */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-card px-2 md:hidden">
          <Link to="/admin/clientes" aria-label="Inicio" className="pr-1 pl-2">
            <Logo size="sm" />
          </Link>
          <div className="flex-1" />
          <NotifIcon count={counts.notifs} onClick={() => openDialog('notificaciones')} />
        </header>

        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-4 pt-4 pb-28 md:gap-6 md:px-6 md:pt-6 md:pb-12 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <TabBar
        items={[
          ...NAV.slice(0, 3).map((n) => ({ to: n.to, label: n.short, icon: n.icon })),
          { to: '/admin/mas', label: 'Más', icon: Menu, also: ['/admin/precios', '/admin/cuenta'] },
        ]}
      />
    </div>
  )
}

function NotifIcon({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Notificaciones${count ? `, ${count} sin leer` : ''}`}
      onClick={onClick}
      className="relative inline-flex size-11 items-center justify-center rounded-lg text-ink-2 hover:bg-secondary"
    >
      <Bell className="size-[22px]" />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[12px] leading-[18px] font-semibold text-primary-foreground tnum">
          {count}
        </span>
      )}
    </button>
  )
}

export function TabBar({
  items,
}: {
  items: {
    to: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    also?: string[]
  }[]
}) {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map((it) => {
        const on = pathname.startsWith(it.to) || it.also?.some((p) => pathname.startsWith(p))
        return (
          <Link
            key={it.to}
            to={it.to}
            aria-current={on ? 'page' : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-1"
          >
            <span
              className={cn(
                'inline-flex h-8 w-14 items-center justify-center rounded-full',
                on ? 'bg-brand-soft text-brand-text' : 'text-ink-2',
              )}
            >
              <it.icon className="size-[22px]" />
            </span>
            <span className={cn('text-[13px] font-medium', on ? 'text-brand-text' : 'text-ink-2')}>
              {it.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

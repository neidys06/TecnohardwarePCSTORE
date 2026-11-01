import { Navigate, Outlet } from 'react-router'

import { useApp } from '@/lib/store'
import type { Rol } from '@/lib/types'

/** Protege las rutas por rol: sin sesión vuelve al inicio; un cliente que intenta entrar al panel ve el aviso de acceso. */
export function RequireRole({ role }: { role: Rol }) {
  const { role: current, cargando } = useApp()
  if (cargando) return null
  if (!current) return <Navigate to="/login" replace />
  if (current !== role)
    return (
      <Navigate
        to={current === 'cliente' ? '/portal/acceso-denegado' : '/admin/clientes'}
        replace
      />
    )
  return <Outlet />
}

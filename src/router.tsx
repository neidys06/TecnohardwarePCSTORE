import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  type RouteObject,
} from 'react-router'

import { AdminLayout } from '@/components/layout/admin-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { PortalLayout } from '@/components/layout/portal-layout'
import { RequireRole } from '@/components/layout/require-role'
import { DialogHost } from '@/dialogs/host'
import ClienteFichaPage from '@/pages/admin/cliente-ficha'
import ClientesPage from '@/pages/admin/clientes'
import MantenimientosPage from '@/pages/admin/mantenimientos'
import MasPage from '@/pages/admin/mas'
import NuevaOrdenPage from '@/pages/admin/nueva-orden'
import OrdenDetallePage from '@/pages/admin/orden-detalle'
import OrdenesPage from '@/pages/admin/ordenes'
import PreciosPage from '@/pages/admin/precios'
import RegistrarMantenimientoPage from '@/pages/admin/registrar-mantenimiento'
import LoginPage from '@/pages/auth/login'
import PrimerIngresoPage from '@/pages/auth/primer-ingreso'
import RecuperarPage from '@/pages/auth/recuperar'
import CuentaPage from '@/pages/cuenta'
import EquipoHistorialPage from '@/pages/equipo-historial'
import NotFound from '@/pages/not-found'
import AccesoDenegadoPage from '@/pages/portal/acceso-denegado'
import PortalEquiposPage from '@/pages/portal/equipos'
import PortalOrdenPage from '@/pages/portal/orden'
import PortalPreciosPage from '@/pages/portal/precios'

function Root() {
  return (
    <>
      <Outlet />
      <DialogHost />
      <ScrollRestoration />
    </>
  )
}

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'recuperar', element: <RecuperarPage /> },
          { path: 'primer-ingreso', element: <PrimerIngresoPage /> },
        ],
      },
      {
        path: 'admin',
        element: <RequireRole role="admin" />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="clientes" replace /> },
              { path: 'clientes', element: <ClientesPage /> },
              { path: 'clientes/:id', element: <ClienteFichaPage /> },
              { path: 'equipos/:id', element: <EquipoHistorialPage /> },
              { path: 'ordenes', element: <OrdenesPage /> },
              { path: 'ordenes/nueva', element: <NuevaOrdenPage /> },
              { path: 'ordenes/:id', element: <OrdenDetallePage /> },
              { path: 'ordenes/:id/mantenimiento', element: <RegistrarMantenimientoPage /> },
              { path: 'mantenimientos', element: <MantenimientosPage /> },
              { path: 'precios', element: <PreciosPage /> },
              { path: 'cuenta', element: <CuentaPage /> },
              { path: 'mas', element: <MasPage /> },
              { path: '*', element: <NotFound inline /> },
            ],
          },
        ],
      },
      {
        path: 'portal',
        element: <RequireRole role="cliente" />,
        children: [
          {
            element: <PortalLayout />,
            children: [
              { index: true, element: <Navigate to="equipos" replace /> },
              { path: 'equipos', element: <PortalEquiposPage /> },
              { path: 'equipos/:id', element: <EquipoHistorialPage portal /> },
              { path: 'ordenes/:id', element: <PortalOrdenPage /> },
              { path: 'precios', element: <PortalPreciosPage /> },
              { path: 'cuenta', element: <CuentaPage portal /> },
              { path: 'acceso-denegado', element: <AccesoDenegadoPage /> },
              { path: '*', element: <NotFound inline /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]

/**
 * En producción se usa el historial del navegador. La demo autocontenida (un solo HTML) usa un
 * enrutador en memoria porque se abre desde una URL fija y no puede reescribir rutas del servidor.
 */
export const router =
  import.meta.env.VITE_ROUTER === 'memory'
    ? createMemoryRouter(routes, { initialEntries: ['/login'] })
    : createBrowserRouter(routes)

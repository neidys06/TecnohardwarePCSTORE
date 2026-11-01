import { Link, useNavigate } from 'react-router'
import { Bell, ChevronRight, CircleUserRound, LogOut, Tag } from 'lucide-react'

import { ColorPicker } from '@/components/app/color-picker'
import { PageHeader } from '@/components/app/ui-kit'
import { useApp } from '@/lib/store'

const row =
  'flex h-14 w-full items-center gap-3 border-b px-4 text-left last:border-0 hover:bg-surface-2'

export default function MasPage() {
  const { openDialog, signOut, db } = useApp()
  const navigate = useNavigate()
  const sinLeer = db.notifs.filter((n) => !n.leida).length
  return (
    <>
      <PageHeader title="Más opciones" />
      <nav aria-label="Más opciones" className="overflow-hidden rounded-xl border bg-card">
        <Link to="/admin/precios" className={row}>
          <Tag className="size-5 text-ink-2" />
          <span className="flex-1 font-medium">Lista de precios</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/admin/cuenta" className={row}>
          <CircleUserRound className="size-5 text-ink-2" />
          <span className="flex-1 font-medium">Mi cuenta</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <button type="button" className={row} onClick={() => openDialog('notificaciones')}>
          <Bell className="size-5 text-ink-2" />
          <span className="flex-1 font-medium">Notificaciones</span>
          {sinLeer > 0 && (
            <span className="rounded-md bg-primary px-1.5 text-[13px] text-primary-foreground tnum">
              {sinLeer}
            </span>
          )}
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>
        <button
          type="button"
          className={row}
          onClick={() => {
            signOut()
            navigate('/login')
          }}
        >
          <LogOut className="size-5 text-ink-2" />
          <span className="flex-1 font-medium">Cerrar sesión</span>
        </button>
      </nav>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="font-medium">Color del sistema</p>
          <p className="text-[14px] text-muted-foreground">
            Elige el color que quieras para botones y menús. Se aplica a tu panel y al portal de los
            clientes.
          </p>
        </div>
        <ColorPicker />
      </div>
    </>
  )
}

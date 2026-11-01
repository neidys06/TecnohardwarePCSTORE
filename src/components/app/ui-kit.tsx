import * as React from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  ImageIcon,
  Info,
  Search,
  TriangleAlert,
  X,
  Laptop,
  Monitor,
  Printer,
  Drone,
  Speaker,
  PlugZap,
  Projector,
  Tv,
  Package,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ESTADOS, type Tone } from '@/lib/domain'
import type { Estado, TipoEquipo } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string
  description?: React.ReactNode
  back?: { to: string; label: string; mobileOnly?: boolean }
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className={cn(
              'mb-2 inline-flex',
              back.mobileOnly && 'md:hidden',
              'h-9 items-center gap-1.5 rounded-md pr-2 text-[14px] font-medium text-ink-2 hover:text-foreground',
            )}
          >
            <ArrowLeft className="size-4" />
            {back.label}
          </Link>
        )}
        <h1 className="text-[24px] leading-8 font-semibold md:text-[28px] md:leading-9">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-base text-ink-2">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 xl:shrink-0 xl:justify-end max-md:[&>*]:flex-1">
          {actions}
        </div>
      )}
    </header>
  )
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-[14px] text-ink-2">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function KV({ k, v, mono }: { k: string; v?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[14px] text-muted-foreground">{k}</dt>
      <dd className={cn('mt-0.5 font-medium break-words', mono && 'tnum')}>{v || '—'}</dd>
    </div>
  )
}

const NOTICE = {
  info: { icon: Info, cls: 'bg-info-soft text-info' },
  success: { icon: CircleCheck, cls: 'bg-success-soft text-success' },
  warning: { icon: TriangleAlert, cls: 'bg-warning-soft text-warning' },
  danger: { icon: CircleX, cls: 'bg-danger-soft text-destructive' },
}
export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: keyof typeof NOTICE
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  const { icon: Icon, cls } = NOTICE[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-start', cls)}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          {children && <div className="mt-0.5 text-[14px] text-ink-2">{children}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function Empty({
  icon: Icon = Search,
  title,
  children,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input bg-card px-6 py-10 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-ink-2">
        <Icon className="size-[22px]" />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-md text-[14px] text-ink-2">{children}</p>}
      {action}
    </div>
  )
}

export function StateBadge({ estado }: { estado: Estado }) {
  return <Badge tone={ESTADOS[estado].tone}>{ESTADOS[estado].label}</Badge>
}

export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>
}

export function Field({
  id,
  label,
  required,
  help,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  help?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-brand-text"> *</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-[14px] text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p className="text-[14px] text-muted-foreground">{help}</p>
      ) : null}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T
  onChange: (v: T) => void
  items: {
    value: T
    label: string
    icon?: React.ComponentType<{ className?: string }>
    count?: number
  }[]
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-[10px] bg-secondary p-1"
    >
      {items.map(({ value: v, label: l, icon: Icon, count }) => {
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-[14px] font-medium transition',
              on
                ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]'
                : 'text-ink-2 hover:text-foreground',
            )}
          >
            {Icon && <Icon className="size-[18px]" />}
            {l}
            {count != null && (
              <span
                className={cn(
                  'rounded-md px-1.5 text-[13px] tnum',
                  on ? 'bg-secondary' : 'text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const CHIP_DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  ink: 'bg-foreground',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  danger: 'bg-destructive',
  brand: 'bg-primary',
}
export function Chip({
  on,
  onClick,
  tone,
  children,
}: {
  on: boolean
  onClick: () => void
  tone?: Tone
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition',
        on
          ? 'border-foreground bg-foreground text-background'
          : 'border-input bg-card hover:bg-surface-2',
      )}
    >
      {tone && <span className={cn('size-2 rounded-full', CHIP_DOT[tone])} />}
      {children}
    </button>
  )
}

export function Thumb({
  src,
  label,
  onRemove,
}: {
  src: string | null
  label: string
  onRemove?: () => void
}) {
  return (
    <figure className="relative overflow-hidden rounded-lg border bg-secondary">
      <div className="aspect-[4/3] w-full">
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="size-[22px]" />
            <span className="text-[13px]">{label}</span>
          </div>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          aria-label="Quitar foto"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </figure>
  )
}

export function UserAvatar({
  name,
  photo,
  size = 40,
}: {
  name: string
  photo?: string | null
  size?: number
}) {
  const ini = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  if (photo)
    return (
      <img
        src={photo}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-text"
      style={{ width: size, height: size, fontSize: size >= 56 ? 20 : 14 }}
    >
      {ini}
    </span>
  )
}

const EQUIPO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Portátil: Laptop,
  'PC de escritorio': Monitor,
  'Todo en uno': Monitor,
  Impresora: Printer,
  Dron: Drone,
  Parlante: Speaker,
  Cargador: PlugZap,
  Videobeam: Projector,
  Televisor: Tv,
}

export function EquipoIcon({ tipo, className }: { tipo: TipoEquipo; className?: string }) {
  const Icon = EQUIPO_ICON[tipo] ?? Package
  return <Icon className={className} />
}

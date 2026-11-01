import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[14px] leading-tight font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-secondary text-ink-2',
        ink: 'bg-secondary text-foreground',
        warning: 'bg-warning-soft text-warning',
        info: 'bg-info-soft text-info',
        success: 'bg-success-soft text-success',
        danger: 'bg-danger-soft text-destructive',
        brand: 'bg-brand-soft text-brand-text',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

const dotTone = {
  neutral: 'bg-muted-foreground',
  ink: 'bg-foreground',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  danger: 'bg-destructive',
  brand: 'bg-primary',
} as const

function Badge({
  className,
  tone,
  dot = true,
  children,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className={cn('size-2 shrink-0 rounded-full', dotTone[tone ?? 'neutral'])}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  )
}

export { Badge, badgeVariants }

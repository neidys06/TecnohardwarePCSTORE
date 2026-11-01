import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-[15px] font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-input bg-card text-foreground hover:bg-surface-2',
        ghost: 'text-brand-text hover:bg-brand-soft',
        quiet: 'bg-secondary text-secondary-foreground hover:bg-border',
        plain: 'text-ink-2 hover:bg-secondary hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        whatsapp: 'bg-whatsapp text-white hover:opacity-90',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-10 px-3 text-[14px]',
        lg: 'h-12 px-5',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

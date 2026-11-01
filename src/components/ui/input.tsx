import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 text-base text-foreground transition outline-none placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15',
        'read-only:bg-secondary read-only:text-ink-2 disabled:cursor-not-allowed disabled:opacity-60',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

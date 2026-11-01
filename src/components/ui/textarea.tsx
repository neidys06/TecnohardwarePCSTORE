import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full rounded-lg border border-input bg-card px-3.5 py-3 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15',
        'read-only:bg-secondary',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

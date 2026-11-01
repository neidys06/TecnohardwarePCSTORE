import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}
function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}
function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-[rgb(19_18_23/0.5)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

/** En pantallas pequeñas el diálogo se abre como hoja inferior; desde `sm` es un modal centrado. */
function DialogContent({
  className,
  children,
  size = 'md',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-popover text-popover-foreground shadow-float outline-none',
          'inset-x-0 bottom-0 rounded-t-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4',
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-[0.98]',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          size === 'sm'
            ? 'sm:max-w-[440px]'
            : size === 'lg'
              ? 'sm:max-w-[720px]'
              : 'sm:max-w-[560px]',
          className,
        )}
        {...props}
      >
        <div aria-hidden className="flex justify-center pt-2 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-input" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-6', className)}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <DialogPrimitive.Close asChild>
        <Button variant="quiet" size="sm">
          <X />
          Cerrar
        </Button>
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('flex flex-col gap-4 overflow-y-auto px-5 pb-5 sm:px-6', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-3 border-t bg-popover px-5 py-4 sm:flex-row sm:justify-end sm:px-6 [&>*]:w-full sm:[&>*]:w-auto',
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-xl leading-7 font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('mt-1 text-[14px] text-ink-2', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

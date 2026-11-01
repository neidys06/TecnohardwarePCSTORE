import * as React from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { thousands } from '@/lib/dates'
import { useApp } from '@/lib/store'

/** Envoltura común: todos los diálogos se cierran con Esc, con el botón «Cerrar» o tocando fuera. */
export function Modal({
  title,
  description,
  size,
  footer,
  children,
}: {
  title: string
  description?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
  children?: React.ReactNode
}) {
  const { closeDialog } = useApp()
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

export function CancelButton({ children = 'Cancelar' }: { children?: React.ReactNode }) {
  const { closeDialog } = useApp()
  return (
    <Button variant="secondary" onClick={closeDialog}>
      {children}
    </Button>
  )
}

/** Mensaje editable antes de enviarlo, con copia al portapapeles y opción de volver al texto original. */
export function CopyBox({
  text,
  id = 'cb-t',
  onChange,
}: {
  text: string
  id?: string
  /** Avisa el texto actual (editado o no) para enviarlo, p. ej. por WhatsApp. */
  onChange?: (texto: string) => void
}) {
  const [v, setVInterno] = React.useState(text)
  const setV = (t: string) => {
    setVInterno(t)
    onChange?.(t)
  }
  const [ok, setOk] = React.useState(false)
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const copy = () => {
    const done = () => {
      setOk(true)
      window.setTimeout(() => setOk(false), 1600)
    }
    if (navigator.clipboard)
      navigator.clipboard.writeText(v).then(done, () => ref.current?.select())
    else ref.current?.select()
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-medium">
        Mensaje{' '}
        <span className="font-normal text-muted-foreground">
          · puedes editarlo antes de enviarlo
        </span>
      </label>
      <Textarea id={id} ref={ref} rows={6} value={v} onChange={(e) => setV(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          {ok ? <Check /> : <Copy />}
          {ok ? 'Copiado' : 'Copiar mensaje'}
        </Button>
        {v !== text && (
          <Button variant="plain" size="sm" onClick={() => setV(text)}>
            <RotateCcw />
            Volver al texto original
          </Button>
        )}
        <span className="ml-auto text-[14px] text-muted-foreground tnum" aria-live="polite">
          {v.length} caracteres
        </span>
      </div>
    </div>
  )
}

export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2">
        $
      </span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-8 tnum"
        value={value}
        onChange={(e) => onChange(thousands(e.target.value))}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
      />
    </div>
  )
}

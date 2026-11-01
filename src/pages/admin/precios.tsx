import * as React from 'react'
import { Check } from 'lucide-react'

import { ListaPdfAdmin } from '@/components/app/lista-pdf'
import { Field, PageHeader } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { digits, money, thousands } from '@/lib/dates'
import { useApp } from '@/lib/store'
import { toast } from '@/lib/toast'
import { MoneyInput } from '@/dialogs/modal'
import { useEnvio } from '@/lib/use-envio'

/** Valor que se cobra cuando el cliente no autoriza la reparación (RF-06). */
function ValorDiagnostico() {
  const { db, acciones } = useApp()
  const { enviando, enviar } = useEnvio()
  const [v, setV] = React.useState(thousands(String(db.valorDiagnostico)))
  const [err, setErr] = React.useState('')
  const save = () => {
    const n = Number(digits(v))
    if (!n || n < 1000) return setErr('Escribe un valor en pesos mayor a $1.000.')
    setErr('')
    enviar(async () => {
      await acciones.guardarValorDiagnostico(n)
      toast.success(`Diagnóstico general: ${money(n)}`)
    })
  }
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-semibold">Valor del diagnóstico general</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          Es lo que se cobra cuando el cliente no autoriza la reparación.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-[240px]">
          <Field id="vd" label="Valor" error={err}>
            <MoneyInput id="vd" value={v} onChange={setV} invalid={!!err} />
          </Field>
        </div>
        <Button
          variant="secondary"
          onClick={save}
          disabled={enviando || Number(digits(v)) === db.valorDiagnostico}
        >
          <Check />
          Guardar
        </Button>
      </div>
    </Card>
  )
}

export default function PreciosPage() {
  return (
    <>
      <PageHeader
        back={{ to: '/admin/mas', label: 'Más', mobileOnly: true }}
        title="Lista de precios"
        description="Cada mes sube el PDF con tu lista de precios. Es lo que los clientes ven en su portal."
      />
      <ListaPdfAdmin />
      <ValorDiagnostico />
    </>
  )
}

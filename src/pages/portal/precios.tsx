import { ListaPdfPortal } from '@/components/app/lista-pdf'
import { PageHeader } from '@/components/app/ui-kit'

export default function PortalPreciosPage() {
  return (
    <>
      <PageHeader
        title="Lista de precios"
        description="Precios vigentes de la tienda. El valor final de una reparación se confirma con el diagnóstico."
      />
      <ListaPdfPortal />
    </>
  )
}

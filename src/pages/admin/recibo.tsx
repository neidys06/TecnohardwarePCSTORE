import * as React from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ArrowLeft, MessageCircle, Printer, Share2 } from 'lucide-react'

import { Logo } from '@/components/app/brand'
import { Notice } from '@/components/app/ui-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { money } from '@/lib/dates'
import { reciboDe, trabajoDe } from '@/lib/domain'
import { descargar, nombreArchivoRecibo, reciboPdf, type Recibo } from '@/lib/recibo-pdf'
import { TIENDA } from '@/lib/seed'
import { sinConexion, traducir } from '@/lib/sin-conexion'
import { useApp } from '@/lib/store'
import { toast } from '@/lib/toast'
import { enlaceWhatsApp } from '@/lib/whatsapp'
import NotFound from '@/pages/not-found'

export const RECIBO_ENVIADO = 'Recibo de entrega enviado por WhatsApp (PDF)'

/**
 * Envío del recibo en PDF por WhatsApp. Un enlace de WhatsApp solo lleva texto, así que el PDF
 * se descarga y se adjunta en el chat que se abre; donde el navegador permite compartir archivos
 * (celular, Chrome o Edge en Windows) se puede compartir el PDF directo a WhatsApp.
 */
function EnviarRecibo({ r, onCerrar }: { r: Recibo; onCerrar: () => void }) {
  const { acciones } = useApp()
  const nombre = r.cliente.nombre.split(' ')[0]
  const equipos =
    r.ordenes.length > 1
      ? `tus ${r.ordenes.length} equipos (${r.ordenes.map((x) => x.equipo.nombre).join(', ')})`
      : `tu ${r.ordenes[0].equipo.nombre}`
  const [mensaje, setMensaje] = React.useState(
    `Hola ${nombre}, te escribimos de TecniHardware PC Store. Te enviamos el recibo de entrega de ${equipos}, ` +
      `con el total pagado de ${money(r.total)}. ¡Gracias por confiar en nosotros!`,
  )
  const [pdf, setPdf] = React.useState<File | null>(null)
  React.useEffect(() => {
    let vivo = true
    reciboPdf(r).then((f) => vivo && setPdf(f))
    return () => {
      vivo = false
    }
  }, [r])
  const puedeCompartir =
    !!pdf && typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdf] })
  const registrar = () => {
    for (const { orden } of r.ordenes) acciones.anotar(orden.id, RECIBO_ENVIADO).catch(() => {})
  }
  const descargarYAbrir = () => {
    if (!pdf) return
    descargar(pdf)
    window.open(enlaceWhatsApp(r.cliente.tel, mensaje), '_blank', 'noopener')
    registrar()
    toast.success(`Se descargó ${pdf.name}: adjúntalo en el chat de WhatsApp que se abrió`)
  }
  const compartir = async () => {
    if (!pdf) return
    try {
      await navigator.share({ files: [pdf], text: mensaje })
      registrar()
      toast.success('Recibo compartido')
    } catch {
      /* el usuario cerró el menú de compartir */
    }
  }
  return (
    <Card className="mx-auto mb-4 flex max-w-[760px] flex-col gap-3 print:hidden">
      <h2 className="text-lg font-semibold">Enviar el recibo en PDF por WhatsApp</h2>
      {!r.cliente.tel ? (
        <Notice tone="warning" title="El cliente no tiene celular registrado">
          Agrégalo en «Editar cliente» para poder enviarle el recibo.
        </Notice>
      ) : sinConexion() ? (
        <Notice tone="warning" title="Sin conexión">
          Puedes descargar el PDF ahora; para enviarlo por WhatsApp hace falta internet.
        </Notice>
      ) : null}
      <label className="text-[14px] font-medium text-ink-2" htmlFor="rc-msg">
        Mensaje (puedes editarlo)
      </label>
      <Textarea id="rc-msg" rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      <ol className="list-decimal pl-5 text-[14px] text-muted-foreground">
        <li>Se descarga el archivo {nombreArchivoRecibo(r)} en la carpeta de descargas.</li>
        <li>Se abre el chat de WhatsApp del cliente con el mensaje escrito.</li>
        <li>Arrastra el PDF al chat (o usa el clip para adjuntarlo) y envía.</li>
      </ol>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
        {puedeCompartir && r.cliente.tel && (
          <Button variant="secondary" onClick={compartir}>
            <Share2 />
            Compartir PDF
          </Button>
        )}
        <Button
          variant="whatsapp"
          disabled={!pdf || !r.cliente.tel || sinConexion()}
          onClick={descargarYAbrir}
        >
          <MessageCircle />
          {pdf ? 'Descargar PDF y abrir WhatsApp' : 'Preparando el PDF…'}
        </Button>
      </div>
    </Card>
  )
}

/**
 * Recibo de entrega (propuesta del equipo tras el Acta 6): uno por entrega, con todos los
 * equipos que el cliente recoge y paga juntos. Formato provisional: se ajusta a la plantilla
 * que use la empresa cuando la entregue.
 */
export default function ReciboPage() {
  const { id = '' } = useParams()
  const { db } = useApp()
  const [enviar, setEnviar] = React.useState(false)
  const o = db.ordenes.find((x) => x.id === id)
  const r = React.useMemo(() => (o ? reciboDe(db, o) : null), [db, o])
  if (!o && traducir(id) !== id) return <Navigate to={`/admin/recibo/${traducir(id)}`} replace />
  if (!o || !r) return <NotFound />
  return (
    <div className="min-h-dvh bg-secondary py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[760px] items-center justify-between gap-2 px-4 print:hidden">
        <Button variant="secondary" asChild>
          <Link to={`/admin/ordenes/${o.id}`}>
            <ArrowLeft />
            Volver a la orden
          </Link>
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="whatsapp" onClick={() => setEnviar(true)}>
            <MessageCircle />
            Enviar PDF por WhatsApp
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Imprimir recibo
          </Button>
        </div>
      </div>
      {enviar && <EnviarRecibo r={r} onCerrar={() => setEnviar(false)} />}
      <article className="mx-auto flex max-w-[760px] flex-col gap-6 bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-1">
            <Logo size="md" />
            <p className="text-[14px] text-muted-foreground">
              {TIENDA.local} · CC Gran Bulevar · WhatsApp {TIENDA.whatsapp}
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold">Recibo de entrega</h1>
            <p className="text-[15px] tnum">N.º {r.numero}</p>
            <p className="text-[15px] tnum">Fecha: {r.fecha}</p>
          </div>
        </header>
        <dl className="grid grid-cols-[2fr_1fr_1fr] gap-x-10 gap-y-2 text-[15px]">
          <div>
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{r.cliente.nombre}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cédula</dt>
            <dd className="tnum">{r.cliente.cedula || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Celular</dt>
            <dd className="tnum">{r.cliente.tel || '—'}</dd>
          </div>
        </dl>
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Orden</th>
              <th className="py-2 pr-3 font-medium">Equipo</th>
              <th className="py-2 pr-3 font-medium">Trabajo realizado</th>
              <th className="py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {r.ordenes.map(({ orden, equipo, valor }) => (
              <tr key={orden.id} className="border-b align-top">
                <td className="py-2 pr-3 whitespace-nowrap tnum">{orden.id}</td>
                <td className="py-2 pr-3">
                  {equipo.nombre}
                  {equipo.serial && (
                    <span className="block text-[13px] text-muted-foreground">
                      Serial {equipo.serial}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">{trabajoDe(orden)}</td>
                <td className="py-2 text-right tnum">{money(valor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 pr-3 text-right font-medium">
                {r.ordenes.length > 1
                  ? `Total pagado (${r.ordenes.length} equipos)`
                  : 'Total pagado'}
              </td>
              <td className="pt-3 text-right text-lg font-semibold tnum">{money(r.total)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="grid grid-cols-2 gap-8 pt-10 text-[15px]">
          <div className="border-t pt-2">
            <p className="font-medium">{r.entregadoPor || '—'}</p>
            <p className="text-muted-foreground">Entregado por (TecniHardware PC Store)</p>
          </div>
          <div className="border-t pt-2">
            <p className="font-medium">{r.recibidoPor || '—'}</p>
            <p className="text-muted-foreground">Recibido por (quien recoge)</p>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground">
          El historial de cada equipo, con sus fotos y el estado del servicio, se puede consultar en
          el portal del cliente.
        </p>
      </article>
    </div>
  )
}

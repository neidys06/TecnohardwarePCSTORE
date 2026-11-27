import logo from '@/assets/logo-tecnihardware.png'
import { money } from '@/lib/dates'
import { nombreEquipo, reciboDe, trabajoDe } from '@/lib/domain'
import { TIENDA } from '@/lib/seed'

export type Recibo = NonNullable<ReturnType<typeof reciboDe>>

export const nombreArchivoRecibo = (r: Recibo) => `Recibo-${r.numero}.pdf`

async function imagen(url: string) {
  const blob = await (await fetch(url)).blob()
  const data = await new Promise<string>((ok, mal) => {
    const fr = new FileReader()
    fr.onload = () => ok(String(fr.result))
    fr.onerror = mal
    fr.readAsDataURL(blob)
  })
  const img = new Image()
  img.src = data
  await img.decode()
  return { data, w: img.naturalWidth, h: img.naturalHeight }
}

/**
 * Recibo de entrega en PDF (tamaño carta), con el mismo contenido de la pantalla, para enviarlo
 * por WhatsApp. Se genera en el navegador; jsPDF se carga solo cuando se necesita.
 */
export async function reciboPdf(r: Recibo): Promise<File> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const X = 18
  const W = 216 - 2 * X
  const gris: [number, number, number] = [110, 110, 120]
  const linea = 4.6
  let y = 18

  try {
    const l = await imagen(logo)
    const h = 14
    doc.addImage(l.data, 'PNG', X, y, (l.w / l.h) * h, h)
  } catch {
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(16)
      .text('TecniHardware PC Store', X, y + 9)
  }
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(0)
  doc.text('Recibo de entrega', X + W, y + 5, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text(`N.º ${r.numero}`, X + W, y + 11, { align: 'right' })
  doc.text(`Fecha: ${r.fecha}`, X + W, y + 16, { align: 'right' })
  y += 21
  doc.setTextColor(...gris).setFontSize(9)
  doc.text(`${TIENDA.local} - CC Gran Bulevar - WhatsApp ${TIENDA.whatsapp}`, X, y)
  y += 4
  doc.setDrawColor(220).line(X, y, X + W, y)
  y += 8

  // Cliente, cédula y celular en tres columnas separadas
  const kv = (k: string, v: string, x: number) => {
    doc
      .setTextColor(...gris)
      .setFontSize(9)
      .text(k, x, y)
    doc
      .setTextColor(0)
      .setFontSize(11)
      .text(v, x, y + 5)
  }
  kv('Cliente', r.cliente.nombre, X)
  kv('Cédula', r.cliente.cedula || '-', X + 95)
  kv('Celular', r.cliente.tel || '-', X + 140)
  y += 14

  const col = [X, X + 22, X + 72, X + W]
  doc.setTextColor(...gris).setFontSize(9)
  doc.text('Orden', col[0], y)
  doc.text('Equipo', col[1], y)
  doc.text('Trabajo realizado', col[2], y)
  doc.text('Valor', col[3], y, { align: 'right' })
  y += 2.5
  doc.line(X, y, X + W, y)
  y += 5
  doc.setFontSize(10).setTextColor(0)
  for (const { orden, equipo, valor } of r.ordenes) {
    const eq = doc.splitTextToSize(nombreEquipo(equipo), 46) as string[]
    const tr = doc.splitTextToSize(trabajoDe(orden), col[3] - col[2] - 28) as string[]
    const filas = Math.max(eq.length + (equipo.serial ? 1 : 0), tr.length)
    if (y + filas * linea > 235) {
      doc.addPage()
      y = 20
    }
    doc.text(orden.id, col[0], y)
    doc.text(eq, col[1], y)
    if (equipo.serial) {
      doc.setTextColor(...gris).setFontSize(8)
      doc.text(`Serial ${equipo.serial}`, col[1], y + eq.length * linea)
      doc.setTextColor(0).setFontSize(10)
    }
    doc.text(tr, col[2], y)
    doc.text(money(valor), col[3], y, { align: 'right' })
    y += filas * linea + 2
    doc.line(X, y - 2, X + W, y - 2)
    y += 3
  }
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text(
    r.ordenes.length > 1 ? `Total pagado (${r.ordenes.length} equipos)` : 'Total pagado',
    col[3] - 32,
    y + 2,
    {
      align: 'right',
    },
  )
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(13)
    .text(money(r.total), col[3], y + 2, { align: 'right' })
  if (y + 46 > 270) {
    doc.addPage()
    y = 20
  }
  y += 26

  const firma = (nombre: string, rol: string, x: number) => {
    doc.line(x, y, x + W / 2 - 8, y)
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(10)
      .setTextColor(0)
      .text(nombre || '-', x, y + 5)
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(9)
      .setTextColor(...gris)
      .text(rol, x, y + 10)
  }
  firma(r.entregadoPor, 'Entregado por', X)
  firma(r.recibidoPor, 'Recibido por', X + W / 2 + 8)
  y += 20
  doc
    .setFontSize(8)
    .text(
      'El historial de cada equipo, con sus fotos y el estado del servicio, se puede consultar en el portal del cliente.',
      X,
      y,
    )
  return new File([doc.output('blob')], nombreArchivoRecibo(r), { type: 'application/pdf' })
}

/** Descarga un archivo en el equipo (carpeta de descargas del navegador). */
export function descargar(f: File) {
  const url = URL.createObjectURL(f)
  const a = document.createElement('a')
  a.href = url
  a.download = f.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

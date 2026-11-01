/**
 * Enlace de WhatsApp (RF-10, RF-11): abre la conversación con el número del cliente y el
 * mensaje ya escrito. Un celular colombiano de 10 dígitos se completa con el indicativo 57.
 */
export function enlaceWhatsApp(telefono: string, mensaje?: string) {
  const d = telefono.replace(/\D/g, '')
  const numero = d.length === 10 ? `57${d}` : d
  return `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}

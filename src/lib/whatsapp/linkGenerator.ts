/**
 * Genera el enlace directo a WhatsApp para realizar un pedido.
 * 
 * @param item - El detalle del pedido (producto + extras).
 * @returns La URL de WhatsApp con el mensaje pre-cargado.
 */
export function generateWhatsAppLink(item: string, extras: string[] = [], total: number = 0): string {
  const phone = "525610885062";
  const extrasText = extras.length > 0 ? extras.join(', ') : 'Ninguno';
  const message = `Hola, quiero pedir:\n\n* ${item}\n* Extras: ${extrasText}\n\nTotal: $${total}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

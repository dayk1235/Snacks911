interface PaymentMessageParams {
  name: string;
  total: number;
  url: string;
  expiresIn: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
}

export function buildPaymentMessage(params: PaymentMessageParams): string {
  const itemsList = params.items
    .map(
      (item) =>
        `${item.quantity}x ${item.productName} — $${(item.price * item.quantity).toFixed(2)}`
    )
    .join('\n');

  return [
    `💳 *${params.name}*, aquí está tu enlace de pago:`,
    '',
    `🛒 *Tu pedido:*`,
    itemsList,
    '',
    `💰 *Total: $${params.total.toFixed(2)} MXN*`,
    '',
    `🔗 Paga aquí: ${params.url}`,
    '',
    `⏰ Este enlace expira en ${params.expiresIn}`,
    '',
    'Si tienes dudas, responde a este mensaje.',
  ].join('\n');
}

export function buildPaymentConfirmedMessage(
  name: string,
  total: number,
  orderId: string
): string {
  return [
    `✅ *¡Pago confirmado, ${name}!*`,
    '',
    `Recibimos tu pago de *$${total.toFixed(2)} MXN*.`,
    `Tu pedido #${orderId.slice(0, 8)} ya está en preparación.`,
    '',
    '🔥 *Snacks 911* · Te avisaremos cuando esté listo.',
  ].join('\n');
}

export function buildPaymentExpiredMessage(
  name: string,
  total: number
): string {
  return [
    `⏰ *${name}*, tu enlace de pago expiró.`,
    '',
    `El pago de *$${total.toFixed(2)} MXN* ya no está disponible.`,
    '',
    'Si aún quieres tu pedido, puedes hacer uno nuevo.',
  ].join('\n');
}

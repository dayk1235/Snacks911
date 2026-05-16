export function buildWaLink(productName?: string, price?: string): string {
  const WA = process.env.NEXT_PUBLIC_WA_NUMBER || '5215500000000';
  const base = `https://wa.me/${WA}?text=`;

  const message = productName
    ? `Hola! 👋 Quiero pedir:\n\n🍗 *${productName}*${price ? ` — $${price}` : ''}\n📍 Mi dirección: \n\n¿Cuánto tarda el envío?`
    : `Hola! 👋 Quiero hacer un pedido en Snacks 911 🚨`;

  // encodeURIComponent previene bugs con acentos, emojis y saltos de línea
  return base + encodeURIComponent(message);
}

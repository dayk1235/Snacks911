/**
 * formatter.ts
 * Utilidades para formatear mensajes de WhatsApp optimizados para conversión.
 * Reglas:
 * - Emojis solo en productos
 * - Evitar textos largos
 * - Máximo 300 caracteres
 * - Optimizado para lectura rápida
 */

export interface ProductFormat {
  name: string;
  price: number;
  category?: string;
  [key: string]: any;
}

/**
 * Asigna un emoji representativo a la categoría del producto.
 */
export function getProductEmoji(category: string = ''): string {
  const cat = category.toLowerCase();
  if (cat.includes('papas')) return '🍟';
  if (cat.includes('banderilla')) return '🌭';
  if (cat.includes('combo')) return '🔥';
  if (cat.includes('postre') || cat.includes('brownie')) return '🍫';
  if (cat.includes('bebida') || cat.includes('refresco')) return '🥤';
  return '🍗'; // Default
}

/**
 * Construye un mensaje de WhatsApp garantizando las reglas de negocio.
 */
export function formatWhatsAppMessage(
  header: string,
  products: ProductFormat[],
  footer: string = '¿Cuál te gustaría ordenar?'
): string {
  // 1. Limpiar redundancias y remover emojis del header/footer (solo en productos)
  const stripEmojis = (text: string) =>
    text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

  const cleanHeader = stripEmojis(header);
  const cleanFooter = stripEmojis(footer);

  // 2. Formato estricto de productos: 🍗 Nombre - $precio (máximo 5)
  const productLines = products.slice(0, 5).map(p => {
    const emoji = getProductEmoji(p.category);
    return `${emoji} ${p.name} - $${p.price}`;
  });

  // 3. Ensamblar estructura limpia
  let message = '';
  if (cleanHeader) {
    message += `${cleanHeader}\n\n`;
  }
  message += productLines.join('\n');
  if (cleanFooter) {
    message += `\n\n${cleanFooter}`;
  }

  // 4. Eliminar saltos de línea excesivos
  message = message.replace(/\n{3,}/g, '\n\n').trim();

  // 5. Hard limit: Máximo 300 caracteres
  const LIMIT = 300;
  if (message.length > LIMIT) {
    // Intentar cortar en el último espacio disponible antes del límite para no romper palabras
    const truncated = message.substring(0, LIMIT - 3);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    return truncated + '...';
  }

  return message;
}

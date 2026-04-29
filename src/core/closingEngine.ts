/**
 * core/closingEngine.ts — High-conversion closing messages.
 * 
 * Provides a single, actionable closing message based on user intent and cart status.
 */

import { IntentType } from './intentDetector';

/**
 * Generates a focused closing message to drive the user towards completing the order.
 * 
 * @param intent - The detected user intent
 * @param cartTotal - Current total value of the cart
 * @returns A single actionable string
 */
export function getClosingMessage(intent: IntentType, cartTotal: number): string {
  if (cartTotal === 0) {
    return '¿Qué se te antoja hoy? Elige algo del menú para empezar.';
  }

  switch (intent) {
    case 'ready_to_order':
      return `¡Excelente! Tu pedido de $${cartTotal} está listo. Dale clic al botón para confirmar en WhatsApp y mandarlo a cocina.`;
    
    case 'hungry_strong':
      return `Con ese hambre, lo mejor es cerrar ya tu pedido de $${cartTotal}. ¿Lo confirmamos?`;
    
    case 'hungry_light':
      return `Una botana ideal por $${cartTotal}. ¿Confirmamos tu pedido?`;
    
    case 'pricing':
      return `El total es de $${cartTotal}. Es un gran precio, ¿quieres que lo preparemos ya?`;
    
    case 'undecided':
      return `Esa es mi recomendación favorita. Tu carrito va en $${cartTotal}, ¿te lo mando?`;
    
    case 'complaint':
      return `Lamento el inconveniente. Vamos a darle prioridad a tu pedido de $${cartTotal} si lo confirmas ahora mismo.`;
    
    case 'other':
    default:
      return `Tu carrito de $${cartTotal} te espera. ¿Listo para pedir ahora?`;
  }
}

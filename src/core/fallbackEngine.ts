/**
 * core/fallbackEngine.ts — Static safety responses.
 * 
 * Used when LLM or external services are unavailable or timeout.
 * Provides deterministic, hardcoded responses based on intent.
 */

import { IntentType } from './intentDetector';

/**
 * Returns a static fallback response based on the detected intent.
 * 
 * @param intent - The detected user intent
 * @returns A hardcoded response string
 */
export function getFallbackResponse(intent: IntentType): string {
  switch (intent) {
    case 'ready_to_order':
      return '¡Excelente! Estoy listo para procesar tu pedido. ¿Qué te gustaría ordenar hoy?';
    
    case 'hungry_strong':
      return '¡Veo que tienes mucha hambre! Te recomiendo el Combo Mixto 911, es nuestra opción más grande y completa.';
    
    case 'hungry_light':
      return 'Si buscas algo ligero, nuestras Papas Loaded o una Banderilla Coreana son ideales para calmar el antojo.';
    
    case 'pricing':
      return 'Puedes consultar todos nuestros precios y promociones directamente en la sección de menú de aquí arriba.';
    
    case 'undecided':
      return 'No te preocupes, hay mucho de donde elegir. Si es tu primera vez, los Boneless Power nunca fallan.';
    
    case 'complaint':
      return 'Lamento mucho el inconveniente. Por favor, permite que un agente humano te atienda de inmediato para resolverlo.';
    
    case 'other':
    default:
      return '¿Cómo puedo ayudarte con tu pedido? Si tienes dudas sobre el menú o ingredientes, dime y te apoyo.';
  }
}

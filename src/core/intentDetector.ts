/**
 * core/intentDetector.ts — Deterministic intent detection for Snacks 911.
 * 
 * Rules-based classification to avoid LLM latency and costs for common patterns.
 */

export type IntentType = 
  | 'hungry_strong' 
  | 'hungry_light' 
  | 'undecided' 
  | 'pricing' 
  | 'ready_to_order' 
  | 'complaint' 
  | 'other';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
}

/**
 * Detects user intent based on keyword matching and string analysis.
 * 
 * @param message - User's input message
 * @returns Detected intent and confidence level (0-100)
 */
export function detectIntent(message: string): IntentResult {
  const msg = message.toLowerCase().trim();

  if (!msg) {
    return { intent: 'other', confidence: 0 };
  }

  // 1. ready_to_order (High priority)
  if (
    msg.includes('pedir') || 
    msg.includes('ordenar') || 
    msg.includes('comprar') || 
    msg.includes('quiero este') ||
    msg.includes('listo') ||
    msg.includes('pago')
  ) {
    return { intent: 'ready_to_order', confidence: 90 };
  }

  // 2. pricing
  if (
    msg.includes('precio') || 
    msg.includes('cuanto') || 
    msg.includes('cuesta') || 
    msg.includes('valor') ||
    msg.includes('total') ||
    msg.includes('$')
  ) {
    return { intent: 'pricing', confidence: 85 };
  }

  // 3. complaint
  if (
    msg.includes('tarda') || 
    msg.includes('mal') || 
    msg.includes('falla') || 
    msg.includes('no llega') ||
    msg.includes('queja') ||
    msg.includes('problema')
  ) {
    return { intent: 'complaint', confidence: 80 };
  }

  // 4. hungry_strong
  if (
    msg.includes('mucha hambre') || 
    msg.includes('atascada') || 
    msg.includes('llenar') || 
    msg.includes('grande') ||
    msg.includes('todo') ||
    msg.includes('bestia') ||
    msg.includes('hambre fuerte')
  ) {
    return { intent: 'hungry_strong', confidence: 85 };
  }

  // 5. hungry_light
  if (
    msg.includes('poco') || 
    msg.includes('leve') || 
    msg.includes('botana') || 
    msg.includes('ligero') ||
    msg.includes('antojo') ||
    msg.includes('chico') ||
    msg.includes('algo leve')
  ) {
    return { intent: 'hungry_light', confidence: 80 };
  }

  // 6. undecided
  if (
    msg.includes('recomiendas') || 
    msg.includes('que hay') || 
    msg.includes('no se') || 
    msg.includes('ayuda') ||
    msg.includes('sugerencia') ||
    msg.includes('que pido') ||
    msg.includes('que me das')
  ) {
    return { intent: 'undecided', confidence: 85 };
  }

  // Fallback
  return { intent: 'other', confidence: 20 };
}

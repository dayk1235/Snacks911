/**
 * core/ai/opportunityScorer.ts
 * 
 * Calculates the probability of closing a sale and detects frustration 
 * using a hybrid approach of fast heuristics and intent mapping.
 */

export interface ScoringResult {
  score: number; // 0-100
  state: 'NORMAL' | 'HIGH_INTENT' | 'PRICE_DOUBT' | 'FRUSTRATION';
  reason: string;
}

const FRUSTRATION_KEYWORDS = ['humano', 'persona', 'ayuda', 'no entiendo', 'mal', 'pesimo', 'asesor', 'agente'];
const PRICE_DOUBT_KEYWORDS = ['caro', 'descuento', 'promocion', 'rebaja', 'carísimo', 'menos'];
const HIGH_INTENT_KEYWORDS = ['quiero', 'agregar', 'papas', 'boneless', 'combo', 'pagar', 'listo', 'envio'];

export function analyzeOpportunity(
  message: string, 
  intent: string | undefined, 
  cartTotal: number
): ScoringResult {
  const lowerMsg = message.toLowerCase();
  let score = 0;
  let state: ScoringResult['state'] = 'NORMAL';
  let reason = 'Conversación regular.';

  // 1. Detect Frustration (Overrides everything)
  const isFrustrated = FRUSTRATION_KEYWORDS.some(k => lowerMsg.includes(k));
  if (isFrustrated) {
    return {
      score: 10, // Very low chance of automated close, needs human
      state: 'FRUSTRATION',
      reason: 'El cliente solicitó ayuda humana o mostró frustración.'
    };
  }

  // 2. Detect Price Doubt
  const hasPriceDoubt = PRICE_DOUBT_KEYWORDS.some(k => lowerMsg.includes(k));
  if (hasPriceDoubt && cartTotal > 0) {
    return {
      score: 60, // Interested but blocked by price
      state: 'PRICE_DOUBT',
      reason: 'El cliente tiene productos en el carrito pero duda sobre el precio.'
    };
  }

  // 3. Calculate Opportunity Score based on Cart & Intent
  if (cartTotal > 0) {
    score += 50; // Base score for having items
    
    if (cartTotal > 300) {
      score += 20; // High value order
      reason = 'Pedido de alto valor en proceso.';
    } else {
      reason = 'Cliente armando carrito.';
    }
  }

  if (intent === 'CONFIRM_ORDER') {
    score += 30;
    state = 'HIGH_INTENT';
    reason = 'Cliente listo para confirmar.';
  } else if (HIGH_INTENT_KEYWORDS.some(k => lowerMsg.includes(k))) {
    score += 15;
    if (score >= 70) state = 'HIGH_INTENT';
  }

  // Cap score at 100
  score = Math.min(score, 100);

  if (score >= 80) {
    state = 'HIGH_INTENT';
  }

  return { score, state, reason };
}

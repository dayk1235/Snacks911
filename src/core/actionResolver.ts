import { UnifiedIntent } from './intentDetector';

export interface ActionDecision {
  action: string;
  secondaryActions?: string[];
  requiresConfirmation: boolean;
  reason?: string;
  safeToExecute: boolean;
  entities?: UnifiedIntent['entities'];
}

/**
 * Action Resolver Layer
 * Converts NLU UnifiedIntent into deterministic business actions.
 */
export function resolveAction(unifiedIntent: UnifiedIntent): ActionDecision {
  const primaryIntent = unifiedIntent.primaryIntent || unifiedIntent.intent;
  const intents = unifiedIntent.intents || [primaryIntent];
  
  // 1. Mapping table
  const actionMap: Record<string, string> = {
    'order': 'add_to_cart',
    'browse_menu': 'show_menu',
    'reject_item': 'remove_from_cart',
    'fallback': 'suggest',
    'unknown': 'clarify',
    'saludo': 'greet',
    'confirmar': 'checkout',
    'cancelar': 'clear_cart',
    'view_cart': 'view_cart',
    'otro': 'talk'
  };

  // 2. Intent Priority (Actionable > Informational)
  const priority = ['cancelar', 'view_cart', 'reject_item', 'order', 'confirmar', 'browse_menu', 'saludo', 'fallback', 'unknown'];
  
  // Sort intents by priority
  const sortedIntents = [...intents].sort((a, b) => {
    const pA = priority.indexOf(a);
    const pB = priority.indexOf(b);
    return (pA === -1 ? 99 : pA) - (pB === -1 ? 99 : pB);
  });

  const bestIntent = sortedIntents[0] || 'unknown';
  const action = actionMap[bestIntent] || 'talk';

  // 3. Confidence Logic
  let requiresConfirmation = false;
  let reason = '';

  const transactionalActions = ['add_to_cart', 'remove_from_cart', 'clear_cart', 'checkout'];

  if (transactionalActions.includes(action)) {
    if (unifiedIntent.confidence < 0.7) {
      requiresConfirmation = true;
      reason = `Low intent confidence (${unifiedIntent.confidence.toFixed(2)})`;
    }

    // Entity confidence check
    if (unifiedIntent.entities) {
      const prodConf = unifiedIntent.entities.product?.confidence || 1.0;
      const qtyConf = unifiedIntent.entities.quantity?.confidence || 1.0;
      
      if (prodConf < 0.7 || qtyConf < 0.7) {
        requiresConfirmation = true;
        reason = reason ? `${reason} + Low entity confidence` : 'Low entity confidence';
      }
    }
  }

  // 4. Negation Override (Already handled by sortedIntents priority, but double check)
  if (intents.includes('reject_item') && action !== 'remove_from_cart') {
    // This should not happen if priority is correct, but for safety:
    return {
      action: 'remove_from_cart',
      requiresConfirmation: false,
      safeToExecute: true,
      reason: 'Negation priority override',
      entities: unifiedIntent.entities
    };
  }

  // 5. Safety Rules
  // Never execute add_to_cart or remove_from_cart without entities unless confirmed
  const isTransactional = ['add_to_cart', 'remove_from_cart'].includes(action);
  const hasEntities = !!(unifiedIntent.entities?.product?.value);
  
  if (isTransactional && !hasEntities) {
    requiresConfirmation = false;
    reason = `Transactional action ${action} missing product entity`;
  }

  const safeToExecute = !requiresConfirmation && (!isTransactional || hasEntities);

  return {
    action,
    secondaryActions: sortedIntents.slice(1).map(i => actionMap[i]).filter(Boolean),
    requiresConfirmation,
    reason,
    safeToExecute,
    entities: unifiedIntent.entities
  };
}

/**
 * Example Usage & Test Cases
 * 
 * Case 1: "ver combos y pedir alitas"
 * Input: { intents: ["browse_menu", "order"], confidence: 0.92 }
 * Output: { action: "add_to_cart", secondaryActions: ["show_menu"], safeToExecute: true }
 * 
 * Case 2: "no quiero alitas"
 * Input: { intents: ["reject_item"], confidence: 0.9 }
 * Output: { action: "remove_from_cart", safeToExecute: true }
 * 
 * Case 3: "papas" (low confidence)
 * Input: { intent: "order", confidence: 0.55 }
 * Output: { action: "add_to_cart", requiresConfirmation: true, safeToExecute: false }
 */

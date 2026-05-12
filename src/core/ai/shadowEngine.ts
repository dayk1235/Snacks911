import { eventBus } from '../eventBus';
import { analyzeOpportunity } from './opportunityScorer';
import { getContext } from '../context';

/**
 * core/ai/shadowEngine.ts
 * 
 * The silent observer. Listens to system events and triggers proactive alerts
 * when sales opportunities or user frustrations are detected.
 */

let initialized = false;

export function initShadowEngine() {
  if (initialized) return;
  initialized = true;

  console.log('[ShadowEngine] Initialized and listening for events.');

  // Listen to bot responses to evaluate the state of the conversation
  eventBus.on('BOT_RESPONSE', async (payload) => {
    try {
      // 1. Reconstruct current context to get cart total
      // Since context is memory-based per user, we can fetch it
      const ctx = await getContext(payload.userId);
      const cartTotal = ctx?.cart?.total || 0;

      // 2. We analyze the LAST USER MESSAGE. 
      // Wait, we only have the bot response here. 
      // We should probably analyze when USER_MESSAGE arrives, 
      // but BOT_RESPONSE has the `intentDetected`.
      // Let's rely on context.lastUserMessage if available.
      const lastMessage = ctx?.lastUserMessage || '';

      // 3. Score the opportunity
      const analysis = analyzeOpportunity(lastMessage, payload.intentDetected, cartTotal);

      // 4. Emit High-Level Alerts
      if (analysis.state === 'FRUSTRATION') {
        eventBus.emit('FRUSTRATION_DETECTED', {
          tenantId: payload.tenantId,
          userId: payload.userId,
          reason: analysis.reason,
          timestamp: Date.now()
        });
      } else if (analysis.state === 'PRICE_DOUBT') {
        eventBus.emit('OPPORTUNITY_DETECTED', {
          tenantId: payload.tenantId,
          userId: payload.userId,
          score: analysis.score,
          reason: analysis.reason,
          recommendedAction: 'SUGGEST_DISCOUNT',
          timestamp: Date.now()
        });
      } else if (analysis.state === 'HIGH_INTENT' && analysis.score >= 80 && cartTotal > 300) {
        // Only alert for high value carts that are hot
        eventBus.emit('OPPORTUNITY_DETECTED', {
          tenantId: payload.tenantId,
          userId: payload.userId,
          score: analysis.score,
          reason: analysis.reason,
          recommendedAction: 'INTERVENE_OR_MONITOR',
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error('[ShadowEngine] Error analyzing opportunity:', e);
    }
  });

  // Listen to Cart Updates to catch abandonments or high value peaks
  eventBus.on('CART_UPDATED', (payload) => {
    if (payload.total > 500) {
      // High value cart alert!
      eventBus.emit('OPPORTUNITY_DETECTED', {
        tenantId: payload.tenantId,
        userId: payload.userId,
        score: 75,
        reason: 'El cliente ha superado los $500 en el carrito.',
        recommendedAction: 'MONITOR',
        timestamp: Date.now()
      });
    }
  });
}

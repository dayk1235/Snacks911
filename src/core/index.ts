/**
 * core/index.ts — Public API for the CORE layer.
 *
 * UI components should ONLY import from here.
 * Never import from src/lib/ directly for business logic.
 *
 * This layer is pure TypeScript — no React, no DOM, no side effects.
 */

// Types
export type {
  Intent,
  Stage,
  UpsellStep,
  DeliveryStep,
  ConversationState,
  QuickAction,
  ChatMessage,
  CoreProduct,
  ProductRefs,
  PromptContext,
  ResponseOutput,
  CartItem,
  CartState,
  OrderItem,
  OrderSummary,
  UserPrefs,
} from './types';

// Intent detection
export { detectIntent, getStage } from './intents';

// Response engine (GOD MODE sales pipeline)
export {
  handleMessage,
  buildDeliveryPrompt,
  buildOrderConfirmation,
  INITIAL_STATE,
} from './responseEngine';

// Cart engine
export {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  recalculate as calculateCartTotals,
  serializeCart,
  deserializeCart,
  hasItems,
  getItemQuantity,
  hasCategory,
  getSuggestedUpsell,
  buildWhatsAppUrl as buildCartWhatsAppUrl,
  createEmptyCart,
} from './cartEngine';

// Recommendation engine
export {
  getTopCombos,
  getBestsellers,
  getFavorites,
  getCrossSell,
  suggestUpgrade,
  suggestExtras,
  getPriceAnchor,
  getMicroReward,
  generateOrderSummary,
  buildOrderWhatsAppUrl,
} from './recommendationEngine';

// Antojo (desire-trigger phrases)
export {
  getAntojoPhrase,
  getFOMOPhrase,
  getSocialProofPhrase,
  getPriceAnchorPhrase,
  getNextStrategy,
  applyLoopStrategy,
} from './antojo';

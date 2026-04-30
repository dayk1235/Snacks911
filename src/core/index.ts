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

// Intent detection (Unified Agent)
export { detectIntent } from './intentDetector';

// Response engine (GOD MODE & Modular Integration)
export {
  handleMessage,
  handleMessageModular,
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

// Offer Agent (Unified Recommendation & Upsell)
export {
  getTopCombos,
  getBestsellers,
  getCrossSell,
  getEntryRecommendation,
  getBestUpsell,
} from './offerAgent';

// Antojo (desire-trigger phrases)
export {
  getAntojoPhrase,
  getFOMOPhrase,
  getSocialProofPhrase,
  getPriceAnchorPhrase,
  getNextStrategy,
  applyLoopStrategy,
} from './antojo';

// Orchestration
export { runAgents } from './agentOrchestrator';

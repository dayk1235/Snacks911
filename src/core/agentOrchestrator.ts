/**
 * core/agentOrchestrator.ts — Central orchestration for the Sales OS.
 * 
 * Sequentially executes all specialized agents to produce a final response context.
 */

import { detectIntent } from './intentDetector';
import { getEntryRecommendation, getBestUpsell } from './offerAgent';
import { shouldHandoff } from './humanHandoff';
import { getCustomerProfileFromDB } from '@/lib/db.server';
import { dbGetProducts } from "@/lib/db.server";
import { filterProducts, isProductSafe } from '@/core/allergyFilter';
import { Intent } from './types';
import type { Product } from '@/data/products';

export interface ConversationContext {
  messageHistory: string[];
  cartItems: any[];
  cartTotal: number;
  failedAttempts: number;
  customerPhone?: string;
}

export interface AgentResponse {
  intent: Intent;
  recommendation: any;
  upsell: any;
  closingMessage: string;
  handoffRequired: boolean;
}

/**
 * Executes the full agent pipeline sequentially.
 */
export async function runAgents(context: ConversationContext): Promise<AgentResponse> {
  const lastMessage = context.messageHistory[context.messageHistory.length - 1] || '';
  
  // 1. Memory Agent
  const profile = context.customerPhone ? (await getCustomerProfileFromDB(context.customerPhone)) ?? undefined : undefined;
  
  // 2. NLU Agent
  const { intent } = detectIntent(lastMessage);
  
  // 3. Safety Agent - Get products and filter by allergies
  const allProducts = await dbGetProducts() as unknown as Product[];
  const allRestrictions = Array.from(new Set([
    ...(profile?.restrictions || []),
    ...(detectIntent(lastMessage).allergies || [])
  ]));
  const safeProducts = allRestrictions.length > 0
    ? allProducts.filter(p => isProductSafe(p, allRestrictions))
    : allProducts;
  
  // 4. Offer Agent - Entry Recommendation (pass safeProducts)
  const recommendation = await getEntryRecommendation(intent, profile, safeProducts);
  
  // 5. Offer Agent - Upsell Expansion (pass safeProducts)
  const upsell = await getBestUpsell(context.cartItems, profile, safeProducts);

  // 6. Closing Agent (Internal)
  const closingMessage = generateClosingMessage(intent, context.cartTotal);

  // 7. Human Handoff Check
  const handoffRequired = shouldHandoff(context.messageHistory, context.failedAttempts, context.cartTotal);

  return {
    intent,
    recommendation,
    upsell,
    closingMessage,
    handoffRequired
  };
}

function generateClosingMessage(intent: Intent, cartTotal: number): string {
  if (cartTotal === 0) return '¿Qué se te antoja hoy? 🔥';

  switch (intent) {
    case 'pedido':
    case 'ready_to_order':
      return `¡Excelente! Tu pedido de $${cartTotal} está listo. Dale clic al botón para confirmar en WhatsApp. ✅`;
    case 'hambre':
    case 'hungry_strong':
      return `Con ese hambre, cerramos ya tu pedido de $${cartTotal}. ¿Va? 🔥`;
    case 'precio':
    case 'pricing':
      return `El total es de $${cartTotal}. ¿Lo preparamos ya? 💰`;
    default:
      return `Tu pedido de $${cartTotal} te espera. ¿Listo? 🤘`;
  }
}

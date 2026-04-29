/**
 * core/agentOrchestrator.ts — Central orchestration for the Sales OS.
 * 
 * Sequentially executes all specialized agents to produce a final response context.
 */

import { detectIntent } from './intentDetector';
import { getRecommendation } from './recommendationEngine';
import { getBestUpsell } from './upsellEngine';
import { getClosingMessage } from './closingEngine';
import { shouldHandoff } from './humanHandoff';
import { getProfile } from './customerProfileStore';
import { IntentType } from './intentDetector';

export interface ConversationContext {
  messageHistory: string[];
  cartItems: any[];
  cartTotal: number;
  failedAttempts: number;
  customerPhone?: string;
}

export interface AgentResponse {
  intent: IntentType;
  recommendation: any;
  upsell: any;
  closingMessage: string;
  handoffRequired: boolean;
}

/**
 * Executes the full agent pipeline sequentially.
 * 
 * @param context - The current state of the conversation and cart
 * @returns Combined response from all agents
 */
export async function runAgents(context: ConversationContext): Promise<AgentResponse> {
  const lastMessage = context.messageHistory[context.messageHistory.length - 1] || '';
  
  // 1. Get Profile (Memory)
  const profile = context.customerPhone ? await getProfile(context.customerPhone) : undefined;

  // 2. Intent Detection
  const { intent } = detectIntent(lastMessage);

  // 3. Human Handoff Check
  const handoffRequired = shouldHandoff(context.messageHistory, context.failedAttempts, context.cartTotal);

  // 4. Recommendation Logic
  const recommendation = await getRecommendation(intent, profile);

  // 5. Upsell Engine
  const upsell = await getBestUpsell(context.cartItems, profile);

  // 6. Closing Message
  const closingMessage = getClosingMessage(intent, context.cartTotal);

  return {
    intent,
    recommendation,
    upsell,
    closingMessage,
    handoffRequired
  };
}

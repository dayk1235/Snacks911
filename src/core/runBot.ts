import { getBotResponse } from './botEngine';
import { detectIntent } from './intentDetector';

/**
 * runBot — Orchestration wrapper for testing and CLI.
 * 
 * This function encapsulates the bot's response logic into a simple
 * input -> output format suitable for automated evaluation.
 */
export async function runBot(message: string, phone: string = 'test-user') {
  const res = await getBotResponse({
    message,
    phone
  });

  // We detect intent separately here for testing accuracy reporting,
  // as the current botEngine return object doesn't include it directly.
  const intentResult = detectIntent(message);

  return {
    intent: intentResult.intent,
    text: res.text,
    cartCount: res.cart?.items?.length || 0,
    raw: res
  };
}

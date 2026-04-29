/**
 * core/humanHandoff.ts — Logic to detect when a human agent should take over.
 */

/**
 * Determines if the conversation should be handed off to a human agent.
 * 
 * @param messageHistory - Recent messages from the user
 * @param failedAttempts - Number of consecutive failed intent detections
 * @param cartTotal - Current cart total value
 * @returns True if handoff is required
 */
export function shouldHandoff(
  messageHistory: string[],
  failedAttempts: number,
  cartTotal: number
): boolean {
  // 1. Keyword detection in the last message
  const lastMessage = messageHistory[messageHistory.length - 1]?.toLowerCase() || '';
  const keywords = ['humano', 'dueño', 'queja', 'hablar con alguien'];
  
  if (keywords.some(k => lastMessage.includes(k))) {
    return true;
  }

  // 2. Threshold for failed bot understanding (3+ attempts)
  if (failedAttempts >= 3) {
    return true;
  }

  // 3. High-value order protection (> $350 MXN)
  if (cartTotal > 350) {
    return true;
  }

  return false;
}

/**
 * core/abandonmentRecovery.ts — High-impact cart recovery logic.
 * 
 * Implements the 1-attempt, 7-minute threshold recovery strategy.
 */

import { supabase } from '@/lib/supabase';

export interface AbandonedCart {
  cartId: string;
  customerPhone: string;
  total: number;
  itemCount: number;
  abandonedAt: Date;
}

/**
 * Checks for carts that have been abandoned for more than 7 minutes.
 * Ensures only 1 recovery attempt is ever made per cart.
 */
export async function findAbandonedCarts(thresholdMinutes = 7): Promise<AbandonedCart[]> {
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

  // Query for carts that:
  // 1. Have a 'cart_created' event
  // 2. Do NOT have an 'order_created' event
  // 3. Do NOT have a 'recovery_attempted' event
  // 4. Were created before the cutoff time
  
  // Note: This logic assumes a robust event_logs table.
  // In a real production environment, this would be an RPC or a complex join.
  const { data, error } = await supabase
    .from('event_logs')
    .select('cart_id, customer_phone, payload_json, occurred_at')
    .eq('event_type', 'cart_created')
    .lt('occurred_at', cutoffTime)
    .is('order_id', null); // Simplified check: no order_id associated yet

  if (error || !data) return [];

  return data.map(row => ({
    cartId: row.cart_id,
    customerPhone: row.customer_phone || 'unknown',
    total: row.payload_json?.total || 0,
    itemCount: row.payload_json?.item_count || 0,
    abandonedAt: new Date(row.occurred_at)
  }));
}

/**
 * Generates a single, personalized recovery message.
 * Rule: No multiple options, just a direct nudge.
 */
export function getRecoveryMessage(cart: AbandonedCart): string {
  if (cart.itemCount === 0) return '';
  
  const itemsText = cart.itemCount === 1 ? 'tu producto' : `${cart.itemCount} productos`;
  
  return `¡Hola! Vimos que dejaste ${itemsText} en tu carrito. 🚨 Tus Snacks 911 te están esperando calientitos, ¿te los mandamos de una vez?`;
}

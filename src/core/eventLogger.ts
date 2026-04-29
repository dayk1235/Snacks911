/**
 * core/eventLogger.ts — Sales Event Logging System.
 *
 * Implements the contract defined in ROADMAP 2.1.
 */

import { supabase } from '@/lib/supabase';

export type EventType = 
  | 'cart_created'
  | 'cart_abandoned'
  | 'upsell_suggested'
  | 'upsell_accepted'
  | 'order_created';

export interface SalesEvent {
  tenant_id?: string;
  event_type: EventType;
  actor?: string;
  channel?: string;
  order_id?: string;
  cart_id?: string;
  customer_phone?: string;
  session_id?: string;
  idempotency_key?: string;
  payload_json?: any;
}

/**
 * Logs a sales event to Supabase.
 */
export async function logEvent(event: SalesEvent): Promise<void> {
  // Use the established supabase client from lib
  const { error } = await supabase.from('event_logs').insert({
    tenant_id: event.tenant_id || 'main',
    event_type: event.event_type,
    actor: event.actor || 'customer',
    channel: event.channel || 'web',
    order_id: event.order_id,
    cart_id: event.cart_id,
    customer_phone: event.customer_phone,
    session_id: event.session_id,
    idempotency_key: event.idempotency_key,
    payload_json: event.payload_json || {}
  });

  if (error) {
    console.error(`EventLogger: Error logging ${event.event_type}:`, error.message);
  } else {
    console.log(`EventLogger: Logged ${event.event_type}`);
  }
}

/**
 * core/eventLogger.ts — Sales Event Logging System.
 */

import { supabase } from '@/lib/supabase';

export type EventType = 
  | 'session_start'
  | 'cart_created'
  | 'order_created'
  | 'checkout_completed'
  | 'upsell_presented'
  | 'upsell_accepted'
  | 'upsell_suggested'
  | 'cart_abandoned'
  | 'shadow_engine_log';

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
  const { error } = await supabase.from('event_logs').insert({
    tenant_id: event.tenant_id || 'main',
    event_type: event.event_type,
    actor: event.actor || 'customer',
    channel: event.channel || 'web',
    order_id: event.order_id || undefined,
    cart_id: event.cart_id || undefined,
    customer_phone: event.customer_phone || undefined,
    session_id: event.session_id || undefined,
    idempotency_key: event.idempotency_key || undefined,
    payload_json: event.payload_json || {}
  });

  if (error) {
    console.error(`EventLogger: Error logging ${event.event_type}:`, error.message);
  } else {
    console.log(`EventLogger: Logged ${event.event_type}`);
  }
}

/**
 * lib/reviews/reviewScheduler.ts
 *
 * Scans for delivered orders that haven't received a review request.
 * Recommended to run every 10-15 minutes via an API route or cron job.
 */

import { getSupabaseAdmin } from '@/lib/db.server';
import { sendText } from '@/lib/whatsapp/metaClient';
import { buildReviewRequestMessage } from './reviewEngine';

/**
 * Finds orders:
 *   - delivered_at < NOW() - 40 minutes
 *   - review_sent = false
 *   - status = 'delivered' (or confirmed if that's how delivered is handled)
 */
export async function runReviewScheduler(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const threshold = new Date(Date.now() - 40 * 60 * 1000).toISOString();

  // Find candidate orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_phone, customer_name, delivered_at')
    .eq('review_sent', false)
    .not('delivered_at', 'is', null)
    .lte('delivered_at', threshold)
    .limit(10); // Batch size

  if (error) {
    console.error('[reviewScheduler] Error fetching orders:', error.message);
    return 0;
  }

  if (!orders || orders.length === 0) {
    return 0;
  }

  let sentCount = 0;

  for (const order of orders) {
    try {
      const phone = order.customer_phone;
      if (!phone) continue;

      const message = buildReviewRequestMessage(order.customer_name || '');
      
      await sendText(phone, message);

      // Set conversation state to AWAITING_REVIEW
      const { updateContext } = await import('@/core/context');
      updateContext(phone, { 
        flowState: 'AWAITING_REVIEW' as any,
        lastReviewOrderId: order.id 
      });

      // Mark as sent in DB
      await supabase
        .from('orders')
        .update({ review_sent: true })
        .eq('id', order.id);

      sentCount++;
      console.log(`[reviewScheduler] Review request sent for order ${order.id}`);

    } catch (err) {
      console.error(`[reviewScheduler] Failed to send review for order ${order.id}:`, err);
    }
  }

  return sentCount;
}

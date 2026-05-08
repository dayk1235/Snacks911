import { getSupabaseAdmin } from "@/lib/db.server";
import { sendText } from "@/lib/whatsapp/metaClient";
import { buildPaymentExpiredMessage } from "./paymentMessages";

const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let checkTimer: ReturnType<typeof setTimeout> | null = null;
let isChecking = false;

async function checkAndExpirePayments(): Promise<void> {
  if (isChecking) return;
  isChecking = true;

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, total, payment_url_expires_at')
      .eq('status', 'awaiting_payment')
      .eq('payment_status', 'pending')
      .lt('payment_url_expires_at', now)
      .is('paid_at', null);

    if (error) {
      console.error('[paymentChecker] Query error:', error);
      return;
    }

    if (!expiredOrders || expiredOrders.length === 0) return;

    console.log(`[paymentChecker] Found ${expiredOrders.length} expired payment(s)`);

    for (const order of expiredOrders) {
      try {
        await supabase
          .from('orders')
          .update({
            status: 'payment_expired',
            payment_status: 'expired',
          })
          .eq('id', order.id);

        const phone = order.customer_phone;
        if (phone) {
          const msg = buildPaymentExpiredMessage(
            order.customer_name || 'Cliente',
            Number(order.total)
          );
          await sendText(phone, msg);
        }

        console.log(`[paymentChecker] Order ${order.id} marked as payment_expired`);
      } catch (orderErr) {
        console.error(`[paymentChecker] Error processing order ${order.id}:`, orderErr);
      }
    }
  } catch (err) {
    console.error('[paymentChecker] Unexpected error:', err);
  } finally {
    isChecking = false;
  }
}

export function startPaymentChecker(intervalMs: number = DEFAULT_CHECK_INTERVAL_MS): () => void {
  if (checkTimer) {
    console.warn('[paymentChecker] Already running, skipping duplicate start');
    return stopPaymentChecker;
  }

  console.log(`[paymentChecker] Starting payment expiry checker every ${intervalMs / 1000}s`);

  const scheduleNext = () => {
    checkTimer = setTimeout(async () => {
      await checkAndExpirePayments();
      scheduleNext();
    }, intervalMs);
  };

  scheduleNext();
  checkAndExpirePayments();

  return stopPaymentChecker;
}

export function stopPaymentChecker(): void {
  if (checkTimer) {
    clearTimeout(checkTimer);
    checkTimer = null;
    console.log('[paymentChecker] Stopped');
  }
}

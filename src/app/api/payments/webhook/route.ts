import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';
import {
  handleWebhook,
  extractOrderId,
  mapConektaEventToPaymentStatus,
} from '@/lib/payments/conekta';
import { sendText } from '@/lib/whatsapp/metaClient';
import {
  buildPaymentConfirmedMessage,
  buildPaymentExpiredMessage,
} from '@/lib/payments/paymentMessages';
import { scheduleTipRequest } from '@/lib/tips/tipModule';
import { addPoints as addLoyaltyPoints } from '@/lib/loyalty/loyaltyEngine';
import { activateReferrerCredit } from '@/lib/referrals/referralEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let payload = '';
  try {
    payload = await req.text();
  } catch {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  const signature = req.headers.get('conekta-signature') || '';

  const { valid, event } = handleWebhook(payload, signature);

  if (!valid || !event) {
    console.warn('[payments/webhook] Invalid signature or unparseable payload');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const eventType = event.type;
  console.log('[payments/webhook] Event received:', eventType);

  const conektaOrderId = event.data?.object?.id;
  const paymentStatus = event.data?.object?.payment_status || '';

  if (!conektaOrderId) {
    console.warn('[payments/webhook] No conekta order ID in event');
    return NextResponse.json({ status: 'ignored' });
  }

  const supabase = getSupabaseAdmin();

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('conekta_order_id', conektaOrderId)
    .single();

  if (fetchErr || !order) {
    const localOrderId = extractOrderId(event);
    if (!localOrderId) {
      console.warn('[payments/webhook] No matching order for conekta order:', conektaOrderId);
      return NextResponse.json({ status: 'ignored' });
    }

    const { data: localOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', localOrderId)
      .single();

    if (!localOrder) {
      console.warn('[payments/webhook] No local order found for id:', localOrderId);
      return NextResponse.json({ status: 'ignored' });
    }

    await updateOrderStatus(
      supabase,
      localOrder,
      eventType,
      paymentStatus
    );

    return NextResponse.json({ status: 'ignored' });
  }

  await updateOrderStatus(supabase, order, eventType, paymentStatus);

  return NextResponse.json({ status: 'ok' });
}

async function updateOrderStatus(
  supabase: any,
  order: any,
  eventType: string,
  paymentStatus: string
) {
  const mappedStatus = mapConektaEventToPaymentStatus(eventType, paymentStatus);

  const updateData: Record<string, any> = {
    payment_status: mappedStatus,
  };

  if (mappedStatus === 'paid') {
    updateData.paid_at = new Date().toISOString();
    updateData.status = order.status === 'pending' ? 'confirmed' : order.status;
  }

  if (mappedStatus === 'cancelled') {
    updateData.status = 'cancelled';
  }

  const { error: updateErr } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', order.id);

  if (updateErr) {
    console.error('[payments/webhook] DB update error:', updateErr);
    return;
  }

  console.log(
    `[payments/webhook] Order ${order.id} updated: payment=${mappedStatus} event=${eventType}`
  );

  const phone = order.customer_phone;
  if (!phone) return;

  try {
    if (mappedStatus === 'paid') {
      const msg = buildPaymentConfirmedMessage(
        order.customer_name || 'Cliente',
        Number(order.total),
        order.id
      );
      await sendText(phone, msg);
      console.log('[payments/webhook] WhatsApp confirmation sent to:', phone);

      // Award loyalty points (non-blocking, idempotent via DB unique index)
      const customerId = order.customer_id || order.customer_phone || order.id;
      addLoyaltyPoints(customerId, Number(order.total), order.id)
        .then(result => {
          if (result.pointsEarned > 0 && result.message && phone) {
            // Small delay so the tip message doesn't collide
            setTimeout(() => sendText(phone, result.message).catch(() => {}), 3000);
          }
        })
        .catch(err => console.error('[payments/webhook] addLoyaltyPoints error:', err));

      // Schedule tip request 10 s after payment confirmation (non-blocking, idempotent)
      scheduleTipRequest(
        order.id,
        order.customer_id || order.id,
        phone,
        Number(order.total),
        order.customer_name || undefined,
      );

      // Activate referrer credit if this was a referred first order
      activateReferrerCredit(phone, order.id).catch(err => 
        console.error('[payments/webhook] activateReferrerCredit error:', err)
      );
    } else if (mappedStatus === 'expired') {
      const msg = buildPaymentExpiredMessage(
        order.customer_name || 'Cliente',
        Number(order.total)
      );
      await sendText(phone, msg);
    }
  } catch (err) {
    console.error('[payments/webhook] WhatsApp send error:', err);
  }
}

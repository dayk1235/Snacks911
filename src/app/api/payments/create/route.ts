import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';
import { createPaymentLink } from '@/lib/payments/conekta';
import type { PaymentLink } from '@/lib/payments/conekta';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const { orderId } = body as { orderId?: string };

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Order already paid' },
        { status: 409 }
      );
    }

    const items = (order.order_items || []).map((i: any) => ({
      productName: i.product_name,
      quantity: i.quantity,
      price: i.price,
    }));

    let paymentLink: PaymentLink;
    try {
      paymentLink = await createPaymentLink({
        orderId: order.id,
        customerName: order.customer_name || 'Cliente',
        customerPhone: order.customer_phone || '',
        total: Number(order.total),
        items,
      });
    } catch (err: any) {
      console.error('[payments/create] Conekta error:', err.message);
      return NextResponse.json(
        { success: false, error: 'Payment provider error' },
        { status: 502 }
      );
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        conekta_order_id: paymentLink.conektaOrderId,
        payment_url: paymentLink.url,
        payment_url_expires_at: paymentLink.expiresAt,
        payment_status: 'pending',
      })
      .eq('id', orderId);

    if (updateErr) {
      console.error('[payments/create] DB update error:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Failed to save payment link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: paymentLink.url,
      expiresAt: paymentLink.expiresAt,
      conektaOrderId: paymentLink.conektaOrderId,
    });
  } catch (err: any) {
    console.error('[payments/create] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

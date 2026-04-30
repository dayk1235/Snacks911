import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';

// Force dynamic behavior to prevent unwanted caching of GET requests
export const dynamic = 'force-dynamic';

/**
 * GET: Fetch the most recent orders (last 50)
 * Path: /api/orders-list
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[API GET orders-list] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const mappedData = (data || []).map((row: any) => ({
      id: row.id,
      status: row.status,
      channel: row.channel,
      total: row.total,
      createdAt: row.created_at,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      notes: row.notes,
      handledBy: row.handled_by,
      whatsappConfirmed: row.whatsapp_confirmed,
      items: (row.order_items || []).map((i: any) => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        price: i.price
      }))
    }));

    return NextResponse.json({ success: true, data: mappedData });
  } catch (err: any) {
    console.error('[API GET orders-list] Critical error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

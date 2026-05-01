import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';
import { validateOrderItems } from '@/core/validationService';


// Force dynamic behavior to prevent unwanted caching of GET requests
// This ensures that GET /api/orders always returns the latest data from Supabase
export const dynamic = 'force-dynamic';

/**
 * GET: Fetch the most recent orders (last 50)
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
      console.error('[API GET] Supabase error:', error);
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
    console.error('[API GET] Critical error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new order with its items
 */
export async function POST(req: Request) {
  if (!supabaseAdmin) {
    console.error('[API POST] supabaseAdmin is not initialized');
    return NextResponse.json(
      { success: false, error: 'Database configuration error' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    console.log('[API POST] Order request received:', body);

    // 0. Validate items before anything else
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 });
    }

    let validItems;
    try {
      validItems = await validateOrderItems(body.items);
    } catch (ve: any) {
      return NextResponse.json({ success: false, error: ve.message }, { status: 400 });
    }

    // Recalculate total with authoritative prices
    const total = validItems.reduce((sum: number, i: any) => sum + i.quantity * i.price, 0);
    
    // 1. Insert the main order record
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: body.customerName || '',
        customer_phone: body.customerPhone || '',
        total: total,
        channel: body.channel || 'WEB',
        status: 'pending'
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('[API POST] Order insert error:', orderError);
      return NextResponse.json(
        { success: false, error: orderError.message },
        { status: 500 }
      );
    }

    const orderId = orderData.id;

    // 2. Insert items into order_items
    console.log('[API POST] Inserting items for order:', orderId);
    const itemsToInsert = validItems.map((item: any) => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('[API POST] Order items insert error:', itemsError);
      // We log the error but don't fail the whole request
    }

    return NextResponse.json({ success: true, orderId });
  } catch (err: any) {
    console.error('[API POST] Critical error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Bad Request' },
      { status: 400 }
    );
  }
}

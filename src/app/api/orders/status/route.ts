import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';

const VALID_STATUSES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
]);

const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['preparing', 'cancelled']),
  preparing: new Set(['ready', 'cancelled']),
  ready: new Set(['delivered', 'cancelled']),
  delivered: new Set([]),
  cancelled: new Set([]),
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    const id = String(body.id).trim();
    const status = body.status;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    if (!isUuid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid order id format' }, { status: 400 });
    }
    if (!status || typeof status !== 'string' || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: 'invalid status' }, { status: 400 });
    }
    
    console.log('[API]', id, status);
    
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id,status')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('[API STATUS] not found select result:', { id, existingOrder: null });
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      if (fetchError.code === '22P02') {
        return NextResponse.json({ success: false, error: 'Invalid order id format' }, { status: 400 });
      }
      console.error('[API Status Update] fetch current status error:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }
    
    const currentStatus = String(existingOrder.status || '');
    
    // Idempotency check: If already in target status, return success
    if (currentStatus === status) {
      return NextResponse.json({ success: true, message: 'Status already up to date' });
    }

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedNext || !allowedNext.has(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: ${currentStatus} -> ${status}` },
        { status: 400 }
      );
    }
    
    const updatePayload: Record<string, any> = { status };
    if (status === 'delivered') {
      updatePayload.delivered_at = new Date().toISOString();
    }

    let { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .eq('status', currentStatus)
      .select('*')
      .single();
    
    // Fallback: If delivered_at column is missing, retry without it
    if (error && (error.code === 'PGRST204' || error.message?.includes('delivered_at'))) {
      console.warn('[API Status Update] delivered_at column missing, retrying without it. Please run migration 20260508_reviews.sql');
      const fallbackRes = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .eq('status', currentStatus)
        .select('*')
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Conflict: order status changed by another process' },
          { status: 409 }
        );
      }
      if (error.code === '22P02') {
        return NextResponse.json({ success: false, error: 'Invalid order id format' }, { status: 400 });
      }
      console.error('[API Status Update] error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[API Status Update] exception:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

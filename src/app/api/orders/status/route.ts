import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';

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
  if (!supabaseAdmin) {
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

    const { data: existingOrder, error: fetchError } = await supabaseAdmin
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
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedNext || !allowedNext.has(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: ${currentStatus} -> ${status}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id)
      .eq('status', currentStatus)
      .select('*')
      .single();

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

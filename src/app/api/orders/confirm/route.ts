import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    console.error('[API] supabaseAdmin is not initialized');
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { id, whatsappConfirmed } = body as { id?: string; whatsappConfirmed?: boolean };

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ whatsapp_confirmed: whatsappConfirmed ?? false })
      .eq('id', id);

    if (error) {
      console.error('[API] update whatsapp_confirmed error', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] update whatsapp_confirmed exception', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

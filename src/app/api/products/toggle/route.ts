import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseServer';
import { requireApiRole } from '@/lib/server/apiAuth';

export async function POST(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Admin is not configured.' }, { status: 500 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Call RPC to toggle (or implement here)
    const { error } = await supabase.rpc('toggle_product_available', { p_id: id });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error toggling product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

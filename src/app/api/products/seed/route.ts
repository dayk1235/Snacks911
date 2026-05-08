import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';
import { MENU } from '@/data/menu';
import { requireApiRole } from '@/lib/server/apiAuth';

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ['admin']);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Admin is not configured.' }, { status: 500 });
  }
  
  try {
    // 1. Delete all existing products
    await supabase.from('products').delete().neq('id', '');

    // 2. Insert MENU
    const { error } = await supabase.from('products').insert(MENU);

    if (error) throw error;

    return NextResponse.json({ success: true, count: MENU.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al sembrar productos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

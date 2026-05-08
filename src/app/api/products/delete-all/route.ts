import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';
import { requireApiRole } from '@/lib/server/apiAuth';

export async function POST(req: Request) {
  const auth = await requireApiRole(req, ['admin']);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Admin is not configured.' }, { status: 500 });
  }

  try {
    const { error } = await supabase.from('products').delete().neq('id', '');
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error deleting all products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

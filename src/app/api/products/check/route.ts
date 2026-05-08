import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';
import { requireApiRole } from '@/lib/server/apiAuth';

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'No db' }, { status: 500 });
  }
  const { data, error } = await supabase.from('products').select('*').limit(1);
  return NextResponse.json({ data, error });
}

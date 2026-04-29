import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';
import { requireApiRole } from '@/lib/server/apiAuth';

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'No db' }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin.from('products').select('*').limit(1);
  return NextResponse.json({ data, error });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'No db' }, { status: 500 });
  }
  const { data, error } = await supabaseAdmin.from('products').select('*').limit(1);
  return NextResponse.json({ data, error });
}

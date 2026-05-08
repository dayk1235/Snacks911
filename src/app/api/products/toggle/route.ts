import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db.server';
import { authGuard } from '@/middleware/authGuard';

export async function POST(req: Request) {
  const auth = await authGuard(req, ['admin', 'gerente']);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase Admin is not configured.' }, { status: 500 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Call centralized toggle function (handles cache invalidation)
    const { dbToggleProduct } = await import('@/lib/db.server');
    await dbToggleProduct(id);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error toggling product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

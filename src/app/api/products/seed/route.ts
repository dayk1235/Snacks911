import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';
import { products } from '@/data/products';
import { requireApiRole } from '@/lib/server/apiAuth';

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ['admin']);
  if (!auth.ok) return auth.response;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase Admin is not configured.' }, { status: 500 });
  }

  try {
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      image: p.image,
      spicy: p.spicy || 0,
      popular: p.popular || false,
      badge: p.badge || null,
      badges: p.badges ? p.badges : null,
      original_price: p.originalPrice || null,
      is_available: true
    }));

    const { error } = await supabaseAdmin
      .from('products')
      .upsert(formattedProducts, { onConflict: 'id' });

    if (error) throw error;

    return NextResponse.json({ success: true, count: formattedProducts.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al sembrar productos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

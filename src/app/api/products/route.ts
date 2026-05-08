import { NextResponse } from 'next/server';
import { dbGetProducts, dbInsertProducts, dbDeleteAllProducts } from '@/lib/db.server';
import { getSupabaseAdmin, supabaseAnon } from '@/lib/db.server';
import { requireApiRole } from '@/lib/server/apiAuth';

function getDb() { return getSupabaseAdmin() || supabaseAnon; }

// GET: Fetch products
export async function GET() {
  try {
    const products = await dbGetProducts();
    return NextResponse.json(products, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create products (bulk)
export async function POST(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const products = Array.isArray(body) ? body : [body];

    // Validation
    for (const p of products) {
      if (!p.name || typeof p.price !== 'number') {
        return NextResponse.json({ error: 'Cada producto debe tener name y price (number)' }, { status: 400 });
      }
    }

    await dbInsertProducts(products);
    return NextResponse.json({ success: true, count: products.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update product
export async function PUT(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const body = await req.json();
  const { id } = body;
  const { productToRow } = await import('@/lib/db');
  const row = await productToRow(body);
  
  // Ensure we don't try to update the ID
  delete row.id;
  row.updated_at = new Date().toISOString();

  const { error } = await db.from('products').update(row).eq('id', id);
  if (error) {
    console.error('[API Products PUT] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: Delete products (all or single)
export async function DELETE(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const db = getDb();
      if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });
      const { error } = await db.from('products').delete().eq('id', id);
      if (error) throw error;
    } else {
      await dbDeleteAllProducts();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

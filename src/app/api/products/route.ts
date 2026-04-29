import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';
import { requireApiRole } from '@/lib/server/apiAuth';

function getDb() { return supabaseAdmin || supabaseAnon; }

// GET: Fetch products
export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get('all') === 'true';

  let query = db.from('products').select('*').order('category').order('price', { ascending: false });
  
  if (!showAll) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST: Create product
export async function POST(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const body = await req.json();
  const { error } = await db.from('products').insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PUT: Update product
export async function PUT(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const body = await req.json();
  const { id, ...updates } = body;
  updates.updated_at = new Date().toISOString();

  const { error } = await db.from('products').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE: Delete product
export async function DELETE(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'gerente']);
  if (!auth.ok) return auth.response;

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const { error } = await db.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

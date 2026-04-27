import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

function getDb() { return supabaseAdmin || supabaseAnon; }

function parseCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function getSession(req: Request) {
  const adminToken = parseCookie(req, ADMIN_SESSION_COOKIE);
  const empToken   = parseCookie(req, EMPLOYEE_SESSION_COOKIE);
  return (await verifySessionToken(adminToken)) || (await verifySessionToken(empToken));
}

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
  const session = await getSession(req);
  if (!session || !session.role || !['admin', 'gerente'].includes(session.role as string)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const body = await req.json();
  const { error } = await db.from('products').insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PUT: Update product
export async function PUT(req: Request) {
  const session = await getSession(req);
  if (!session || !session.role || !['admin', 'gerente'].includes(session.role as string)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

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
  const session = await getSession(req);
  if (!session || !session.role || !['admin', 'gerente'].includes(session.role as string)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const { error } = await db.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

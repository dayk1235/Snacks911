/**
 * GET  /api/cash  — session activa + movimientos + total ventas hoy
 * POST /api/cash  — action: open | close | movement
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

const db = () => supabaseAdmin || supabaseAnon;

function parseCookie(req: Request, name: string) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

async function requireStaff(req: Request) {
  const s = (await verifySessionToken(parseCookie(req, ADMIN_SESSION_COOKIE)))
         || (await verifySessionToken(parseCookie(req, EMPLOYEE_SESSION_COOKIE)));
  return s;
}

export async function GET(req: Request) {
  if (!await requireStaff(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const client = db();
  if (!client) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  // Active session
  const { data: session } = await client
    .from('cash_sessions')
    .select('*')
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Movements for current session
  let movements: any[] = [];
  if (session) {
    const { data } = await client
      .from('cash_movements')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });
    movements = data || [];
  }

  // Daily sales total from POS orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: ordersData } = await client
    .from('orders')
    .select('total, payment_method')
    .eq('channel', 'POS')
    .neq('status', 'CANCELLED')
    .gte('created_at', today.toISOString());

  const dailySales = (ordersData || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
  const salesByMethod = (ordersData || []).reduce((acc: any, o: any) => {
    acc[o.payment_method] = (acc[o.payment_method] || 0) + (o.total || 0);
    return acc;
  }, {});

  return NextResponse.json({ session, movements, dailySales, salesByMethod });
}

export async function POST(req: Request) {
  if (!await requireStaff(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const client = db();
  if (!client) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: 'action requerida' }, { status: 400 });

  // ── OPEN ──────────────────────────────────────────────────────────────────
  if (body.action === 'open') {
    // Close any stale open session first
    await client.from('cash_sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('status', 'open');

    const { data, error } = await client
      .from('cash_sessions')
      .insert({ opening_amount: body.opening_amount || 0, opened_by: body.opened_by || '' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session: data });
  }

  // ── CLOSE ─────────────────────────────────────────────────────────────────
  if (body.action === 'close') {
    if (!body.session_id) return NextResponse.json({ error: 'session_id requerido' }, { status: 400 });

    // Calculate expected = opening + IN movements - OUT movements + cash sales
    const { data: session } = await client.from('cash_sessions').select('*').eq('id', body.session_id).single();
    const { data: movements } = await client.from('cash_movements').select('*').eq('session_id', body.session_id);
    const movementsNet = (movements || []).reduce((s: number, m: any) => s + (m.type === 'IN' ? m.amount : -m.amount), 0);

    // Cash sales today
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: cashOrders } = await client.from('orders').select('total').eq('channel', 'POS').eq('payment_method', 'CASH').neq('status', 'CANCELLED').gte('created_at', today.toISOString());
    const cashSales = (cashOrders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);

    const expected = (session?.opening_amount || 0) + movementsNet + cashSales;

    const { data, error } = await client
      .from('cash_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString(), closing_amount: body.closing_amount, expected_amount: expected, notes: body.notes || '' })
      .eq('id', body.session_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session: data, expected, diff: (body.closing_amount || 0) - expected });
  }

  // ── MOVEMENT ──────────────────────────────────────────────────────────────
  if (body.action === 'movement') {
    if (!body.session_id || !body.type || !body.amount) {
      return NextResponse.json({ error: 'session_id, type, amount requeridos' }, { status: 400 });
    }
    const { data, error } = await client
      .from('cash_movements')
      .insert({ session_id: body.session_id, type: body.type, amount: body.amount, concept: body.concept || '' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ movement: data });
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 });
}

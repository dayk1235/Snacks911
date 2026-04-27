/**
 * GET  /api/pos/orders  — Órdenes de hoy (channel=POS)
 * POST /api/pos/orders  — Crear nueva orden POS
 * PATCH /api/pos/orders — Actualizar estado de orden
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

const getDb = () => supabaseAdmin || supabaseAnon;

function parseCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function requireStaff(req: Request) {
  const adminToken = parseCookie(req, ADMIN_SESSION_COOKIE);
  const empToken   = parseCookie(req, EMPLOYEE_SESSION_COOKIE);
  const session    = (await verifySessionToken(adminToken)) || (await verifySessionToken(empToken));
  if (!session) return null;
  return session;
}

// ── GET — Órdenes de hoy ────────────────────────────────────────────────────
export async function GET(req: Request) {
  const session = await requireStaff(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orders, error } = await db
    .from('orders')
    .select(`
      id, status, channel, customer_name, customer_phone,
      delivery_type, payment_method, total, created_at,
      order_items (
        id, qty, unit_price, selected_modifiers_json,
        products ( name, category )
      )
    `)
    .eq('channel', 'POS')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: orders || [] });
}

// ── POST — Crear orden POS ─────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await requireStaff(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const {
    items,           // [{product_id, qty, unit_price, selected_modifiers_json}]
    payment_method,  // CASH | CARD | TRANSFER
    delivery_type,   // PICKUP | DELIVERY
    customer_name,
    notes,
  } = body;

  if (!items || !items.length) {
    return NextResponse.json({ error: 'La orden no tiene productos' }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const total = items.reduce(
    (sum: number, i: { qty: number; unit_price: number }) => sum + i.qty * i.unit_price, 0
  );

  // Create order
  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      channel: 'POS',
      status: 'DRAFT',
      payment_method: payment_method || 'CASH',
      delivery_type: delivery_type || 'PICKUP',
      customer_name: customer_name || null,
      total,
    })
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message || 'Error creando orden' }, { status: 500 });
  }

  // Insert order items
  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    qty: item.qty,
    unit_price: item.unit_price,
    selected_modifiers_json: item.selected_modifiers_json || [],
  }));

  const { error: itemsErr } = await db.from('order_items').insert(orderItems);
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Auto-confirm the order
  await db.from('orders').update({ status: 'CONFIRMED' }).eq('id', order.id);

  return NextResponse.json({ order: { ...order, status: 'CONFIRMED', total } });
}

// ── PATCH — Actualizar estado ──────────────────────────────────────────────
export async function PATCH(req: Request) {
  const session = await requireStaff(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: 'Se requiere id y status' }, { status: 400 });
  }

  const validStatuses = ['DRAFT', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const { data, error } = await db
    .from('orders')
    .update({ status: body.status })
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

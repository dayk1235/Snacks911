/**
 * GET  /api/pos/orders  — Órdenes de hoy (channel=POS)
 * POST /api/pos/orders  — Crear nueva orden POS
 * PATCH /api/pos/orders — Actualizar estado de orden
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';
import { validateOrderItems } from '@/core/validationService';


const getDb = () => supabaseAdmin || supabaseAnon;

function isUuid(v: any) {
  if (typeof v !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

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
  try {
    const session = await requireStaff(req);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    console.log('[API/Orders/GET] Init. Client:', db === supabaseAdmin ? 'ADMIN' : 'ANON');
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orders, error } = await db
    .from('orders')
    .select('*')
    ;

  if (error) {
    console.log('[API/POS/ORDERS] Supabase Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch items separately to avoid join 500s
  const orderIds = (orders || []).map(o => o.id);
  const { data: allItems, error: itemsErr } = await db
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  if (itemsErr) {
    console.log('[API/POS/ORDERS] Items Error:', itemsErr);
  }

  // Map items back to orders
  const ordersWithItems = (orders || []).map(order => ({
    ...order,
    order_items: (allItems || []).filter(item => item.order_id === order.id)
  }));

    console.log('[API/Orders/GET] Success:', ordersWithItems?.length, 'orders');
    return NextResponse.json({ orders: ordersWithItems });
  } catch (error: any) {
    console.error('[API/Orders/GET] Global Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ── POST — Crear orden POS ─────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await requireStaff(req);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });


  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const {
    items,           // [{product_id, product_name, qty, unit_price, selected_modifiers_json}]
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

  let validItems;
  try {
    validItems = await validateOrderItems(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error validando productos' }, { status: 400 });
  }

  const total = validItems.reduce(
    (sum: number, i: { qty: number; unit_price: number }) => sum + i.qty * i.unit_price, 0
  );

  // 1. Create order with status 'pending' (lowercase) for better panel visibility
  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      channel: 'POS',
      status: 'pending',
      payment_method: payment_method || 'CASH',
      delivery_type: delivery_type || 'PICKUP',
      customer_name: customer_name || 'Cliente POS',
      total,
      notes: notes || '',
    })
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message || 'Error creando orden' }, { status: 500 });
  }

  // 2. Insert order items with proper product_id UUID handling and product_name
  const orderItems = validItems.map((item: any) => ({
    order_id: order.id,
    product_id: isUuid(item.product_id) ? item.product_id : '0',
    product_name: item.product_name || 'Producto',
    qty: item.qty,
    unit_price: item.unit_price,
    selected_modifiers_json: item.selected_modifiers_json || [],
  }));

  const { error: itemsErr } = await db.from('order_items').insert(orderItems);
  
  if (itemsErr) {
    // Cleanup if items failed to ensure we don't have empty orders
    await db.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

    console.log('[API/Orders/POST] Success:', order.id);
    return NextResponse.json({ order: { ...order, status: 'pending', total } });
  } catch (error: any) {
    console.error('[API/Orders/POST] Global Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ── PATCH — Actualizar estado ──────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await requireStaff(req);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });


  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: 'Se requiere id y status' }, { status: 400 });
  }

  // Map incoming POS statuses to standard statuses if needed
  let dbStatus = body.status;
  if (dbStatus === 'CONFIRMED') dbStatus = 'pending';
  if (dbStatus === 'PREPARING') dbStatus = 'preparing';
  if (dbStatus === 'DELIVERED') dbStatus = 'delivered';
  if (dbStatus === 'CANCELLED') dbStatus = 'cancelled'; // Note: Kitchen filters out 'cancelled' usually

  const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled', 'DRAFT', 'CONFIRMED'];
  if (!validStatuses.includes(dbStatus)) {
    return NextResponse.json({ error: `Status inválido: ${dbStatus}` }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const { data, error } = await db
    .from('orders')
    .update({ status: dbStatus })
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
      console.error('[API/Orders/PATCH] DB Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API/Orders/PATCH] Success:', data);
    return NextResponse.json({ success: true, order: data });
  } catch (error: any) {
    console.error('[API/Orders/PATCH] Global Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

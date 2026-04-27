/**
 * GET  /api/store/status  — público, el cliente lo lee
 * POST /api/store/status  — protegido, solo admin/gerente lo cambia
 */

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

// ── GET — Estado de la tienda (público) ──────────────────────────────────────
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ is_open: true, closed_message: '' });

  try {
    const { data } = await db
      .from('store_settings')
      .select('key, value')
      .in('key', ['is_open', 'closed_message']);

    const settings: Record<string, string> = {};
    (data || []).forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({
      is_open: settings['is_open'] !== 'false',
      closed_message: settings['closed_message'] || '¡Estamos cerrados por hoy! Vuelve pronto 🔥',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ is_open: true, closed_message: '' });
  }
}

// ── POST — Cambiar estado (admin/gerente) ─────────────────────────────────────
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session || !session.role || !['admin', 'gerente'].includes(session.role as string)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    is_open?: boolean;
    closed_message?: string;
  } | null;

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Sin conexión' }, { status: 503 });

  const updates: Array<{ key: string; value: string; updated_at: string }> = [];
  const now = new Date().toISOString();

  if (body?.is_open !== undefined) {
    updates.push({ key: 'is_open', value: String(body.is_open), updated_at: now });
  }
  if (body?.closed_message !== undefined) {
    updates.push({ key: 'closed_message', value: body.closed_message, updated_at: now });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error } = await db.from('store_settings').upsert(updates, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  console.log(`[StoreStatus] Changed by ${session.uid} (${session.role}):`, updates);
  return NextResponse.json({ ok: true });
}

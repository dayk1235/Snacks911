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

// ── GET — Leer todas las configuraciones (público) ──────────────────────────
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db connection' }, { status: 500 });

  try {
    const { data } = await db.from('store_settings').select('key, value');

    const settings: Record<string, string> = {};
    (data || []).forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({
      is_open: settings['is_open'] !== 'false',
      closed_message: settings['closed_message'] || '¡Estamos cerrados por hoy! Vuelve pronto 🔥',
      promo_banner_active: settings['promo_banner_active'] === 'true',
      promo_banner_text: settings['promo_banner_text'] || '',
      hero_title: settings['hero_title'] || '',
      hero_subtitle: settings['hero_subtitle'] || ''
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST — Actualizar configuraciones (admin/gerente) ───────────────────────
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session || !session.role || !['admin', 'gerente'].includes(session.role as string)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    is_open?: boolean;
    closed_message?: string;
    promo_banner_active?: boolean;
    promo_banner_text?: string;
    hero_title?: string;
    hero_subtitle?: string;
  } | null;

  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'No db' }, { status: 500 });

  const upserts = [];

  if (body.is_open !== undefined) {
    upserts.push({ key: 'is_open', value: body.is_open ? 'true' : 'false' });
  }
  if (body.closed_message !== undefined) {
    upserts.push({ key: 'closed_message', value: body.closed_message });
  }
  if (body.promo_banner_active !== undefined) {
    upserts.push({ key: 'promo_banner_active', value: body.promo_banner_active ? 'true' : 'false' });
  }
  if (body.promo_banner_text !== undefined) {
    upserts.push({ key: 'promo_banner_text', value: body.promo_banner_text });
  }
  if (body.hero_title !== undefined) {
    upserts.push({ key: 'hero_title', value: body.hero_title });
  }
  if (body.hero_subtitle !== undefined) {
    upserts.push({ key: 'hero_subtitle', value: body.hero_subtitle });
  }

  if (upserts.length > 0) {
    const { error } = await db.from('store_settings').upsert(upserts, { onConflict: 'key' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Fetch updated settings to return
  return GET();
}

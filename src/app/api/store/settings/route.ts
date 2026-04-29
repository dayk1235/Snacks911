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
    const { data } = await db.from('business_settings').select('*').limit(1).single();

    return NextResponse.json({
      is_open: data?.accepting_orders ?? true,
      closed_message: data?.closed_message || '¡Estamos cerrados por hoy! Vuelve pronto 🔥',
      promo_banner_active: data?.promo_banner_active === true,
      promo_banner_text: data?.promo_banner_text || '',
      hero_title: data?.hero_title || '',
      hero_subtitle: data?.hero_subtitle || '',
      whatsapp_number: data?.whatsapp_number || '',
      prep_time: data?.prep_time || 25
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

  const updates: Record<string, any> = {};
  
  if (body.is_open !== undefined) updates.accepting_orders = body.is_open;
  if (body.closed_message !== undefined) updates.closed_message = body.closed_message;
  if (body.promo_banner_active !== undefined) updates.promo_banner_active = body.promo_banner_active;
  if (body.promo_banner_text !== undefined) updates.promo_banner_text = body.promo_banner_text;
  if (body.hero_title !== undefined) updates.hero_title = body.hero_title;
  if (body.hero_subtitle !== undefined) updates.hero_subtitle = body.hero_subtitle;

  if (Object.keys(updates).length > 0) {
    const { error } = await db.from('business_settings').update(updates).eq('id', 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Fetch updated settings to return
  return GET();
}

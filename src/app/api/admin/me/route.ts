import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';

function getDb() { return supabaseAdmin || supabaseAnon; }

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const empToken   = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value;
  const session    = await verifySessionToken(adminToken) || await verifySessionToken(empToken);

  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Allow admin AND gerente in /admin panel
  if (session.role !== 'admin' && session.role !== 'gerente') {
    return NextResponse.json({ ok: false, error: 'Sin acceso al panel' }, { status: 403 });
  }

  // Fetch name from DB
  let name = '';
  try {
    const db = getDb();
    if (db) {
      const { data } = await db
        .from('employees')
        .select('name')
        .eq('id', session.uid)
        .maybeSingle();
      name = data?.name || '';
    }
  } catch {}

  return NextResponse.json({ ok: true, user: session.uid, role: session.role, name });
}

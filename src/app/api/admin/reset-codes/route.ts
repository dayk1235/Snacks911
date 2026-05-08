/**
 * GET /api/admin/reset-codes
 * Devuelve todos los códigos de reset (para que el admin los vea y se los dé al empleado).
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin, supabaseAnon } from '@/lib/db.server';
import { verifySessionToken, ADMIN_SESSION_COOKIE } from '@/lib/server/adminSession';

function getDb() { return getSupabaseAdmin() || supabaseAnon; }

import { authGuard } from '@/middleware/authGuard';

export async function GET(req: Request) {
  const auth = await authGuard(req, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Sin conexión' }, { status: 503 });

  // Verificar si la tabla existe antes de consultar
  try {
    const { data, error } = await db
      .from('password_resets')
      .select('employee_id, token, expires_at, used, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Si la tabla no existe, devolver array vacío sin romper
      if (error.code === '42P01') {
        return NextResponse.json({ codes: [], tableExists: false });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes: data || [], tableExists: true });
  } catch {
    return NextResponse.json({ codes: [], tableExists: false });
  }
}

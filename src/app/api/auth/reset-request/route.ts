/**
 * POST /api/auth/reset-request
 * Solicita reset de contraseña. Genera token y lo guarda en Supabase.
 * En producción mandaría email; por ahora el admin ve el token en el dashboard.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';

function getDb() { return supabaseAdmin || supabaseAnon; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { employeeId?: string } | null;
  const employeeId = body?.employeeId?.trim() || '';

  if (!employeeId) {
    return NextResponse.json({ error: 'Numero de empleado requerido' }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Sin conexión a base de datos' }, { status: 503 });

  // Verificar que el empleado existe y está activo
  const { data: emp } = await db
    .from('employees')
    .select('id, employee_id, name, role')
    .eq('employee_id', employeeId)
    .eq('active', true)
    .maybeSingle();

  // Responder igual si existe o no (seguridad)
  if (!emp) {
    return NextResponse.json({
      ok: true,
      message: 'Si el número de empleado existe, se generó un código de reset.',
    });
  }

  // Generar token seguro (6 dígitos numéricos para facilidad)
  const token = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // Guardar token en tabla password_resets
  await db.from('password_resets').upsert({
    employee_id: employeeId,
    token,
    expires_at: expiresAt,
    used: false,
  }, { onConflict: 'employee_id' });

  console.log(`[Reset] Token generado para "${employeeId}": ${token} (expira ${expiresAt})`);

  // En producción: enviar por WhatsApp o email
  // Por ahora: el admin puede verlo en /admin/staff
  return NextResponse.json({
    ok: true,
    message: 'Código generado. Pide a tu administrador el código de 6 dígitos.',
    // Solo en desarrollo mostramos el token directamente
    ...(process.env.NODE_ENV !== 'production' ? { devToken: token } : {}),
  });
}

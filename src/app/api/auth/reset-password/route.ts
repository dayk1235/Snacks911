/**
 * POST /api/auth/reset-password
 * Verifica token y actualiza contraseña con nuevo hash PBKDF2.
 */

import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/server/employeeStore';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';

function getDb() { return supabaseAdmin || supabaseAnon; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    employeeId?: string;
    token?: string;
    newPassword?: string;
  } | null;

  const employeeId  = body?.employeeId?.trim() || '';
  const token       = body?.token?.trim() || '';
  const newPassword = body?.newPassword || '';

  if (!employeeId || !token || !newPassword) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Sin conexión' }, { status: 503 });

  // Buscar token válido y no usado
  const { data: resetRow } = await db
    .from('password_resets')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('token', token)
    .eq('used', false)
    .maybeSingle();

  if (!resetRow) {
    return NextResponse.json({ error: 'Código inválido o ya fue usado' }, { status: 400 });
  }

  // Verificar expiración
  if (new Date(resetRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'El código expiró. Solicita uno nuevo.' }, { status: 400 });
  }

  // Generar nuevo hash
  const { hash, salt } = hashPassword(newPassword);

  // Actualizar contraseña
  const { error: updateErr } = await db
    .from('employees')
    .update({ password_hash: hash, password_salt: salt })
    .eq('employee_id', employeeId);

  if (updateErr) {
    console.error('[Reset] Error actualizando contraseña:', updateErr.message);
    return NextResponse.json({ error: 'No se pudo actualizar la contraseña' }, { status: 500 });
  }

  // Marcar token como usado
  await db
    .from('password_resets')
    .update({ used: true })
    .eq('employee_id', employeeId);

  console.log(`[Reset] Contraseña actualizada para "${employeeId}"`);

  return NextResponse.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
}

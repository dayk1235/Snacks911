/**
 * POST /api/auth/login
 *
 * Employee authentication via employeeId + password.
 * Replaces email-based Supabase Auth with custom employee store.
 */

import { NextResponse } from 'next/server';
import {
  getEmployeeByLoginId,
  verifyPassword,
  updateLastLogin,
  initDefaultAdmin,
} from '@/lib/server/employeeStore';
import { createSessionToken } from '@/lib/server/adminSession';

export async function POST(request: Request) {
  // ── Step 1: Ensure default admin exists ──
  try {
    await initDefaultAdmin();
  } catch (err) {
    console.error('[Auth API] Failed to init default admin:', err);
    // Continue anyway — admin might already exist or Supabase might be temporarily unavailable
  }

  // ── Step 2: Parse request ──
  const body = await request.json().catch(() => null) as { employeeId?: string; password?: string } | null;
  const employeeId = body?.employeeId?.trim() || '';
  const password = body?.password || '';

  if (!employeeId || !password) {
    return NextResponse.json(
      { ok: false, error: 'Numero de empleado y contraseña requeridos' },
      { status: 400 }
    );
  }

  if (employeeId.length < 3 || employeeId.length > 50) {
    return NextResponse.json(
      { ok: false, error: 'Numero de empleado invalido' },
      { status: 400 }
    );
  }

  // ── Step 3: Look up employee ──
  const employee = await getEmployeeByLoginId(employeeId);

  if (!employee) {
    console.log(`[Auth API] Login attempt for unknown employee: "${employeeId}"`);
    return NextResponse.json(
      { ok: false, error: 'Credenciales invalidas' },
      { status: 401 }
    );
  }

  // ── Step 4: Verify password ──
  if (!verifyPassword(password, employee.passwordHash, employee.passwordSalt)) {
    console.log(`[Auth API] Wrong password for employee: "${employeeId}"`);
    return NextResponse.json(
      { ok: false, error: 'Credenciales invalidas' },
      { status: 401 }
    );
  }

  // ── Step 5: Create session ──
  const token = await createSessionToken(employee.id, employee.role);
  const cookieName = employee.role === 'admin'
    ? 'snacks911_admin_session'
    : 'snacks911_employee_session';

  // ── Step 6: Update last login ──
  await updateLastLogin(employee.employeeId);

  console.log(`[Auth API] Login successful: ${employee.employeeId} (${employee.role})`);

  return NextResponse.json({
    ok: true,
    user: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
    },
  }, {
    headers: {
      'Set-Cookie': `${cookieName}=${token}; HttpOnly; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}; Path=/; Max-Age=${60 * 60 * 12}`,
    },
  });
}

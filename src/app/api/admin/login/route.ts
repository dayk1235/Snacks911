/**
 * POST /api/admin/login
 *
 * Legacy admin login — redirects to /api/auth/login for employeeId auth.
 * Kept for backward compatibility with legacy admin panel.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  // Redirect all legacy admin login attempts to the new auth system
  return NextResponse.json(
    { ok: false, error: 'Usa el sistema de login con numero de empleado', redirect: '/login' },
    { status: 410 }
  );
}

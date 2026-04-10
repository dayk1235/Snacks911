import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createSessionToken, getAdminCredentials } from '@/lib/server/adminSession';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { user?: string; pass?: string } | null;
  const user = body?.user?.trim() || '';
  const pass = body?.pass || '';

  const credentials = getAdminCredentials();
  if (user !== credentials.username || pass !== credentials.password) {
    return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });
  }

  // Legacy admin login — creates admin session
  const token = await createSessionToken(user, 'admin');
  const response = NextResponse.json({ ok: true, user: { role: 'admin' } });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminCredentials } from '@/lib/server/adminSession';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { user?: string; pass?: string } | null;
  const user = body?.user?.trim() || '';
  const pass = body?.pass || '';

  const credentials = getAdminCredentials();
  if (user !== credentials.username || pass !== credentials.password) {
    return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await createAdminSessionToken(user);
  const response = NextResponse.json({ ok: true });

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

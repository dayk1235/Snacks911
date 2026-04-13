import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 0,
  value: '',
};

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Clear both admin and employee sessions
  response.cookies.set({ ...cookieBase, name: ADMIN_SESSION_COOKIE });
  response.cookies.set({ ...cookieBase, name: EMPLOYEE_SESSION_COOKIE });

  return response;
}

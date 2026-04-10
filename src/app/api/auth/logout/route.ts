import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: '', maxAge: 0, path: '/' });
  response.cookies.set({ name: EMPLOYEE_SESSION_COOKIE, value: '', maxAge: 0, path: '/' });

  return response;
}

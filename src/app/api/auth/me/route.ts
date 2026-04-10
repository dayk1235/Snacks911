import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value;

  const session = await verifySessionToken(adminToken) || await verifySessionToken(empToken);
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: { id: session.uid, role: session.role },
  });
}

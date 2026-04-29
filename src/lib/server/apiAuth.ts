import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  EMPLOYEE_SESSION_COOKIE,
  verifySessionToken,
} from '@/lib/server/adminSession';

type SessionPayload = {
  uid?: string;
  role?: string;
  exp?: number;
};

function parseCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function getApiSession(req: Request): Promise<SessionPayload | null> {
  const adminToken = parseCookie(req, ADMIN_SESSION_COOKIE);
  const employeeToken = parseCookie(req, EMPLOYEE_SESSION_COOKIE);
  return (await verifySessionToken(adminToken)) || (await verifySessionToken(employeeToken));
}

export async function requireApiRole(req: Request, allowedRoles: string[]) {
  const session = await getApiSession(req);
  const role = session?.role;

  if (!role || !allowedRoles.includes(role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    session,
  };
}

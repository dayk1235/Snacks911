import { verifySessionToken } from '@/lib/server/adminSession';

/**
 * authGuard() — Centralized Role-Based Access Control (RBAC).
 * 
 * Checks for a valid session token in:
 * 1. Authorization: Bearer <token> header
 * 2. snacks911_admin_session / snacks911_employee_session cookies
 * 
 * @param req - The incoming Next.js Request
 * @param roles - Optional array of allowed roles (e.g. ['admin', 'gerente'])
 * @returns Object with { ok, user?, status? }
 */
export async function authGuard(req: Request, roles: string[] = []) {
  const url = new URL(req.url).pathname;
  
  // 1. Extract token from Authorization Header
  let token = req.headers.get("authorization")?.replace("Bearer ", "");
  
  // 2. Fallback to Cookie (for Dashboard browser requests)
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const adminMatch = cookieHeader.match(/(?:^|;\s*)snacks911_admin_session=([^;]*)/);
    const employeeMatch = cookieHeader.match(/(?:^|;\s*)snacks911_employee_session=([^;]*)/);
    const foundToken = adminMatch ? adminMatch[1] : (employeeMatch ? employeeMatch[1] : undefined);
    if (foundToken) token = decodeURIComponent(foundToken);
  }

  if (!token) {
    console.warn("[AUTH BLOCK] No session found for route:", url);
    return { ok: false, status: 401 };
  }

  // 3. Verify Session
  const session = await verifySessionToken(token);

  if (!session) {
    console.warn("[AUTH BLOCK] Invalid or expired session for route:", url);
    return { ok: false, status: 401 };
  }

  // 4. Role-Based Access Control (RBAC)
  if (roles.length > 0) {
    const userRole = session.role || 'user';
    if (!roles.includes(userRole)) {
      console.warn(`[AUTH BLOCK] Forbidden. Role "${userRole}" lacks permissions for ${url}. Required: ${roles.join(',')}`);
      return { ok: false, status: 403 };
    }
  }

  return { ok: true, user: session };
}

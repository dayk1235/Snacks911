import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isOrdersRoute = pathname.startsWith('/orders');
  const isLoginRoute = pathname === '/login';

  // Public routes
  if (!isAdminRoute && !isOrdersRoute) {
    return NextResponse.next();
  }

  // Verify session
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(adminToken) || await verifySessionToken(empToken);

  // Not authenticated → redirect to login
  if (!session) {
    if (isLoginRoute) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // On login page but already authenticated → redirect to their dashboard
  if (isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === 'admin' ? '/admin' : '/orders';
    return NextResponse.redirect(url);
  }

  // Role-based access: /admin requires admin role
  if (isAdminRoute && session.role !== 'admin') {
    // Employee trying to access admin → redirect to orders
    const url = request.nextUrl.clone();
    url.pathname = '/orders';
    return NextResponse.redirect(url);
  }

  // Employee accessing /orders → OK
  // Admin accessing /admin → OK (also handled above)
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/orders/:path*', '/login'],
};

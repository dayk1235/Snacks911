import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PRODUCTION SECURE MIDDLEWARE (MODERN SSR)
 * Multi-tenant SaaS with JWT validation and Tenant Injection
 */

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
const PROTECTED_PATHS = ['/admin', '/orders', '/api/protected'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const { pathname } = req.nextUrl;

  // 1. ADMIN API PROTECTION (Secret Key)
  if (pathname.startsWith('/api/admin')) {
    const authHeader = req.headers.get('authorization');
    if (!ADMIN_SECRET_KEY || authHeader !== `Bearer ${ADMIN_SECRET_KEY}`) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized Admin Access' }), { 
        status: 401, 
        headers: { 'content-type': 'application/json' } 
      });
    }
    return res;
  }

  // 2. INITIALIZE SUPABASE SSR CLIENT
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // 3. TENANT RESOLUTION & SPOOF PROTECTION
  let tenantId: string | null = null;

  if (session?.user) {
    tenantId = (session.user.app_metadata?.tenant_id as string) || 
               (session.user.user_metadata?.tenant_id as string);
  } else {
    const host = req.headers.get('host') || '';
    const subdomain = host.split('.')[0];
    if (subdomain && !['localhost', 'www', 'myapp', 'snacks911'].includes(subdomain)) {
      tenantId = subdomain; 
    } else {
      // Default flagship tenant for root domain
      tenantId = 'snacks911';
    }
  }

  // 4. PATH-BASED AUTHENTICATION
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  // Custom check for employee session if Supabase session is missing
  const adminCookie = req.cookies.get('snacks911_admin_session')?.value;
  const employeeCookie = req.cookies.get('snacks911_employee_session')?.value;
  const hasCustomSession = !!(adminCookie || employeeCookie);

  if (isProtectedPath && !session && !hasCustomSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  // 5. TENANT-BASED RATE LIMITING & HEADER INJECTION
  if (tenantId) {
    const { rateLimit } = await import('@/lib/rateLimit');
    // Limit: 60 requests per minute per tenant
    const allowed = rateLimit(`tenant-${tenantId}`, 60, 60000);
    if (!allowed) {
      return new NextResponse('Too Many Requests (Tenant Limit)', { status: 429 });
    }
    
    res.headers.set('x-tenant-id', tenantId);
    req.headers.set('x-tenant-id', tenantId);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

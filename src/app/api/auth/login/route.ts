import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken } from '@/lib/server/adminSession';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim() || '';
  const password = body?.password || '';

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  // Authenticate via Supabase Auth
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });
  }

  // Look up profile for role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    // No profile = unauthorized
    return NextResponse.json({ ok: false, error: 'No tienes acceso asignado' }, { status: 403 });
  }

  // Create session token with role
  const token = await createSessionToken(profile.id, profile.role);
  const cookieName = profile.role === 'admin'
    ? 'snacks911_admin_session'
    : 'snacks911_employee_session';

  const response = NextResponse.json({
    ok: true,
    user: { id: profile.id, email: profile.email, name: profile.name, role: profile.role },
  });

  response.cookies.set({
    name: cookieName,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}

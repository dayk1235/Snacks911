'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminStore } from '@/lib/adminStore';

// ─── Inactivity timeout (30 minutes) ───────────────────────────────────────
const INACTIVITY_MS = 30 * 60 * 1000;

const NAV = [
  { href: '/admin',          icon: '📊', label: 'Dashboard',     roles: ['admin', 'gerente'] },
  { href: '/admin/products', icon: '🍗', label: 'Productos',     roles: ['admin', 'gerente'] },
  { href: '/admin/menu',     icon: '📄', label: 'Importar Menú', roles: ['admin', 'gerente'] },
  { href: '/admin/orders',   icon: '📦', label: 'Pedidos',       roles: ['admin', 'gerente', 'staff'] },
  { href: '/admin/staff',    icon: '👥', label: 'Personal',      roles: ['admin'] },
  { href: '/admin/sales',    icon: '💰', label: 'Ventas',        roles: ['admin', 'gerente'] },
  { href: '/admin/settings', icon: '⚙️',  label: 'Configuración', roles: ['admin'] },
];

const LS_SIDEBAR_KEY = 'snacks911_sidebar_collapsed';

// ─── Inactivity warning modal ───────────────────────────────────────────────
function InactivityWarning({ secondsLeft, onStay, onLeave }: {
  secondsLeft: number;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: '#111', borderRadius: '20px',
        border: '1px solid rgba(255,69,0,0.25)',
        padding: '2rem 2.5rem', maxWidth: '380px', width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,69,0,0.06)',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
        <h2 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
          ¿Sigues ahí?
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
          Tu sesión se cerrará por inactividad en
        </p>
        <div style={{
          fontSize: '2.5rem', fontWeight: 900, color: '#FF4500',
          fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.05em',
          margin: '0.25rem 0 1.5rem',
        }}>
          {secondsLeft}s
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onLeave}
            style={{
              flex: 1, padding: '0.75rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#888',
              fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Cerrar sesión
          </button>
          <button
            onClick={onStay}
            style={{
              flex: 1, padding: '0.75rem',
              background: 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '10px', color: '#fff',
              fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700,
              boxShadow: '0 0 20px rgba(255,69,0,0.3)',
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────────────
function Sidebar({ pendingCount, userRole, userName }: { pendingCount: number; userRole: string; userName: string }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Filter nav items based on role
  const visibleNav = NAV.filter(item => item.roles.includes(userRole));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_SIDEBAR_KEY);
      if (saved !== null) setCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(LS_SIDEBAR_KEY, String(next));
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    router.push('/admin/login');
    router.refresh();
  };

  const width = collapsed ? '68px' : '240px';

  return (
    <aside style={{
      width,
      minWidth: width,
      minHeight: '100vh',
      background: '#0a0a0a',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(255,69,0,0.12)',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
      transition: 'width 0.25s ease, min-width 0.25s ease',
    }}>
      {/* Logo + Collapse button */}
      <div style={{
        padding: collapsed ? '1.25rem 0.75rem 1rem' : '1.25rem 1rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '0.5rem',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚨</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.35rem', letterSpacing: '0.05em', color: '#fff', lineHeight: 1, whiteSpace: 'nowrap' }}>
                SNACKS <span style={{ color: '#FF4500' }}>911</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Panel Admin
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <span style={{ fontSize: '1.5rem' }}>🚨</span>
        )}

        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            width: '28px', height: '28px',
            cursor: 'pointer',
            color: '#555',
            fontSize: '0.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.18s, color 0.18s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.12)';
            (e.currentTarget as HTMLElement).style.color = '#FF4500';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLElement).style.color = '#555';
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {visibleNav.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : '0.65rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '0.7rem' : '0.62rem 0.9rem',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 500,
                color: active ? '#fff' : '#666',
                background: active ? 'rgba(255,69,0,0.14)' : 'transparent',
                borderLeft: !collapsed && active ? '2.5px solid #FF4500' : !collapsed ? '2.5px solid transparent' : 'none',
                transition: 'all 0.18s ease',
                position: 'relative',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{icon}</span>
              {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
              {!collapsed && label === 'Pedidos' && pendingCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#FF4500', color: '#fff',
                  borderRadius: '50px', fontSize: '0.68rem',
                  fontWeight: 800, padding: '0.1rem 0.45rem',
                  minWidth: '20px', textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
              {collapsed && label === 'Pedidos' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: '#FF4500', color: '#fff',
                  borderRadius: '50%', fontSize: '0.55rem',
                  fontWeight: 900, width: '14px', height: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{
        padding: collapsed ? '0.75rem 0.5rem' : '1rem 0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: userRole === 'gerente'
                ? 'linear-gradient(135deg, #6BCB77, #4CAF50)'
                : 'linear-gradient(135deg, #FF4500, #FFB800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 700, flexShrink: 0,
            }}>
              {userRole === 'gerente' ? '🏪' : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                {userName || (userRole === 'gerente' ? 'Gerente' : 'Admin')}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#444', textTransform: 'capitalize' }}>
                {userRole} · Snacks 911
              </div>
            </div>
          </div>
        )}
        <button
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
            // Use window.location for hard redirect to avoid Next.js client state
            window.location.href = '/admin/login';
          }}
          title="Cerrar sesión"
          style={{
            width: '100%', padding: collapsed ? '0.6rem' : '0.5rem',
            borderRadius: '8px',
            background: 'rgba(255,69,0,0.08)',
            border: '1px solid rgba(255,69,0,0.15)',
            color: '#FF4500', fontSize: collapsed ? '1rem' : '0.8rem',
            fontWeight: 600, cursor: 'pointer', textAlign: 'center',
            transition: 'background 0.18s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          {collapsed ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Cerrar sesión
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [pendingCount, setPending] = useState(0);
  const [authState, setAuthState]  = useState<'loading' | 'ok' | 'denied'>('loading');
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]    = useState(30);
  const [userRole, setUserRole]      = useState('admin');
  const [userName, setUserName]      = useState('');

  const inactivityTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLogin = pathname === '/admin/login';

  // ── Perform logout ──────────────────────────────────────────────────────
  const doLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/admin/login';
  }, []);

  // ── Reset inactivity timer ──────────────────────────────────────────────
  const resetInactivity = useCallback(() => {
    if (isLogin || authState !== 'ok') return;

    // Clear existing timers
    if (inactivityTimer.current)  clearTimeout(inactivityTimer.current);
    if (warningTimer.current)     clearInterval(warningTimer.current);

    setShowWarning(false);
    setCountdown(30);

    // Start warning 30 seconds before logout
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true);
      let secs = 30;
      setCountdown(secs);

      warningTimer.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(warningTimer.current!);
          doLogout();
        }
      }, 1000);
    }, INACTIVITY_MS - 30_000);
  }, [isLogin, authState, doLogout]);

  // ── Bind activity events ────────────────────────────────────────────────
  useEffect(() => {
    if (isLogin || authState !== 'ok') return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => resetInactivity();

    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    resetInactivity(); // kick off

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current)    clearInterval(warningTimer.current);
    };
  }, [isLogin, authState, resetInactivity]);

  // ── Verify session on mount (client-side double-check) ──────────────────
  useEffect(() => {
    if (isLogin) {
      setAuthState('ok'); // login page doesn't need auth check
      return;
    }

    fetch('/api/admin/me')
      .then(res => {
        if (res.ok) {
          res.json().then(data => {
            if (data?.role) setUserRole(data.role);
            if (data?.name) setUserName(data.name);
          }).catch(() => {});
          setAuthState('ok');
        } else {
          setAuthState('denied');
          window.location.href = '/admin/login';
        }
      })
      .catch(() => {
        setAuthState('denied');
        window.location.href = '/admin/login';
      });
  }, [isLogin]);

  // ── Poll pending orders for sidebar badge ───────────────────────────────
  useEffect(() => {
    if (isLogin || authState !== 'ok') return;
    const refresh = async () => {
      const orders = await AdminStore.getOrders();
      const count = orders.filter(o => o.status === 'pending').length;
      setPending(count);
    };
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [isLogin, authState]);

  // ── Login page: render children directly ────────────────────────────────
  if (isLogin) {
    return <div data-admin="true" style={{ display: 'contents' }}>{children}</div>;
  }

  // ── Loading while verifying session ─────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#080808',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{
          width: '44px', height: '44px',
          border: '3px solid rgba(255,69,0,0.15)',
          borderTop: '3px solid #FF4500',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#444', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Verificando sesión…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Access denied (shouldn't render, redirect happens in useEffect) ─────
  if (authState === 'denied') return null;

  // ── Authenticated: render panel ──────────────────────────────────────────
  return (
    <div data-admin="true" style={{ display: 'flex', minHeight: '100vh', background: '#080808' }}>
      {showWarning && (
        <InactivityWarning
          secondsLeft={countdown}
          onStay={() => {
            if (warningTimer.current) clearInterval(warningTimer.current);
            setShowWarning(false);
            resetInactivity();
          }}
          onLeave={doLogout}
        />
      )}
      <Sidebar pendingCount={pendingCount} userRole={userRole} userName={userName} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh', transition: 'margin-left 0.25s ease' }}>
        {children}
      </main>
    </div>
  );
}

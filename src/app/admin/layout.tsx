'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdminStore } from '@/lib/adminStore';

const NAV = [
  { href: '/admin',          icon: '📊', label: 'Dashboard'    },
  { href: '/admin/products', icon: '🍗', label: 'Productos'    },
  { href: '/admin/orders',   icon: '📦', label: 'Pedidos'      },
  { href: '/admin/sales',    icon: '💰', label: 'Ventas'       },
  { href: '/admin/settings', icon: '⚙️',  label: 'Configuración'},
];

const LS_SIDEBAR_KEY = 'snacks911_sidebar_collapsed';

function Sidebar({ pendingCount }: { pendingCount: number }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Load preference from localStorage
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

  const handleLogout = () => {
    AdminStore.logout();
    router.push('/admin/login');
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
        {NAV.map(({ href, icon, label }) => {
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
              background: 'linear-gradient(135deg, #FF4500, #FFB800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 700, flexShrink: 0,
            }}>
              A
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Admin</div>
              <div style={{ fontSize: '0.68rem', color: '#444' }}>Snacks 911</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
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
          {collapsed ? '🚪' : '🚪 Cerrar sesión'}
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking]     = useState(true);
  const [authed, setAuthed]         = useState(false);
  const [pendingCount, setPending]  = useState(0);

  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    const ok = AdminStore.isAuthed();
    if (!ok && !isLogin) {
      router.replace('/admin/login');
    } else {
      setAuthed(true);
    }
    setChecking(false);
  }, [isLogin, router]);

  // Poll pending orders for sidebar badge
  useEffect(() => {
    if (!authed || isLogin) return;
    const refresh = () => {
      const count = AdminStore.getOrders().filter(o => o.status === 'pending').length;
      setPending(count);
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [authed, isLogin]);

  // Loading splash
  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,69,0,0.2)', borderTop: '3px solid #FF4500', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (isLogin) return <>{children}</>;
  if (!authed)  return null;

  return (
    <div data-admin="true" style={{ display: 'flex', minHeight: '100vh', background: '#080808' }}>
      <Sidebar pendingCount={pendingCount} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh', transition: 'margin-left 0.25s ease' }}>
        {children}
      </main>
    </div>
  );
}

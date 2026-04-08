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

function Sidebar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = () => {
    AdminStore.logout();
    router.push('/admin/login');
  };

  return (
    <aside style={{
      width: '240px', minHeight: '100vh', background: '#0a0a0a', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,69,0,0.12)',
      position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.6rem' }}>🚨</span>
          <div>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', letterSpacing: '0.05em', color: '#fff', lineHeight: 1 }}>
              SNACKS <span style={{ color: '#FF4500' }}>911</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Panel Admin
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.62rem 0.9rem',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 500,
                color: active ? '#fff' : '#666',
                background: active ? 'rgba(255,69,0,0.14)' : 'transparent',
                borderLeft: active ? '2.5px solid #FF4500' : '2.5px solid transparent',
                transition: 'all 0.18s ease',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{icon}</span>
              <span>{label}</span>
              {label === 'Pedidos' && pendingCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#FF4500',
                  color: '#fff',
                  borderRadius: '50px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                  minWidth: '20px',
                  textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF4500, #FFB800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
            A
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Admin</div>
            <div style={{ fontSize: '0.68rem', color: '#444' }}>Snacks 911</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '0.5rem', borderRadius: '8px',
            background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.15)',
            color: '#FF4500', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', textAlign: 'center',
            transition: 'background 0.18s',
          }}
        >
          🚪 Cerrar sesión
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080808' }}>
      <Sidebar pendingCount={pendingCount} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}

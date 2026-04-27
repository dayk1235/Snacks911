'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setReady(true);
    // CSS entrance animation via class
    requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'translateY(0)';
      }
    });
  }, []);

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(255,69,0,0.2)',
          borderTop: '3px solid #FF4500',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password: pass }),
      });

      const data = await response.json();

      if (response.ok) {
        // CSS exit: scale up + fade + redirect
        if (cardRef.current) {
          cardRef.current.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          cardRef.current.style.transform = 'scale(1.03)';
          cardRef.current.style.opacity = '0';
        }
        setTimeout(() => router.push(data.user.role === 'admin' ? '/admin' : '/orders'), 360);
      } else {
        setError(data.error || 'Credenciales invalidas');
        // CSS shake via class toggle
        if (formRef.current) {
          formRef.current.classList.remove('shake');
          void formRef.current.offsetWidth; // reflow
          formRef.current.classList.add('shake');
        }
      }
    } catch {
      setError('No se pudo iniciar sesion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff',
    fontSize: '0.95rem', outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div ref={cardRef} style={{ width: '100%', maxWidth: '400px', position: 'relative', opacity: 0, transform: 'translateY(32px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem' }}>
            <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2.2rem', letterSpacing: '0.06em', color: '#fff' }}>
            SNACKS <span style={{ color: '#FF4500' }}>911</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.25rem' }}>
            Acceso de Equipo
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#111', borderRadius: '20px',
          border: '1px solid rgba(255,69,0,0.12)',
          padding: '2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(255,69,0,0.04)',
        }}>
          <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            Iniciar sesion
          </h1>

          <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Numero de empleado
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="admin001"
                style={inputStyle}
                required
                autoComplete="username"
                minLength={3}
                maxLength={50}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Tu contraseña"
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: '0.5rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: '#555', cursor: 'pointer', padding: '0.3rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,69,0,0.12)',
                border: '1px solid rgba(255,69,0,0.3)',
                borderRadius: '8px', padding: '0.6rem 0.9rem',
                color: '#FF7040', fontSize: '0.83rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                padding: '0.9rem',
                background: loading ? 'rgba(255,69,0,0.5)' : 'linear-gradient(135deg, #FF4500, #FF6500)',
                border: 'none', borderRadius: '12px',
                color: '#fff', fontWeight: 800,
                fontSize: '1rem', cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 0 20px rgba(255,69,0,0.25)',
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? '...' : 'Entrar →'}
            </button>

            {/* ── Forgot password ── */}
            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <a
                href="/reset-password"
                style={{
                  color: '#444', fontSize: '0.8rem',
                  textDecoration: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6040'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444'; }}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .shake{animation:shake .4s ease}
      `}</style>
    </div>
  );
}

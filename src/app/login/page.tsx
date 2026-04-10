'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setReady(true);
    gsap.from(cardRef.current, { opacity: 0, y: 40, duration: 0.6, ease: 'power3.out' });
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,69,0,0.2)', borderTop: '3px solid #FF4500', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await response.json();

      if (response.ok) {
        gsap.to(cardRef.current, {
          scale: 1.03, opacity: 0, duration: 0.35, ease: 'power2.in',
          onComplete: () => {
            // Redirect based on role
            router.push(data.user.role === 'admin' ? '/admin' : '/orders');
          },
        });
      } else {
        setError(data.error || 'Credenciales inválidas');
        gsap.fromTo(formRef.current, { x: -10 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
        gsap.fromTo(formRef.current, { x: 10  }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)', delay: 0.05 });
      }
    } catch {
      setError('No se pudo iniciar sesión. Intenta de nuevo.');
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
      <div ref={cardRef} style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚨</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2.2rem', letterSpacing: '0.06em', color: '#fff' }}>
            SNACKS <span style={{ color: '#FF4500' }}>911</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.25rem' }}>
            Panel de Equipo
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
            Iniciar sesión
          </h1>

          <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={inputStyle}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(255,69,0,0.12)', border: '1px solid rgba(255,69,0,0.3)', borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#FF7040', fontSize: '0.83rem' }}>
                ⚠️ {error}
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
          </form>
        </div>
      </div>
    </div>
  );
}

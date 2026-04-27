'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'request' | 'verify';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.8rem 1rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff',
  fontSize: '0.95rem', outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const [step, setStep]               = useState<Step>('request');
  const [employeeId, setEmployeeId]   = useState('');
  const [token, setToken]             = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [devToken, setDevToken]       = useState(''); // solo en dev

  useEffect(() => {
    setReady(true);
    requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'translateY(0)';
      }
    });
  }, []);

  // ── Step 1: Solicitar código ──────────────────────────────────────────────
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();

      if (data.devToken) setDevToken(data.devToken); // solo desarrollo
      setSuccess('¡Código enviado! Pide el código de 6 dígitos a tu administrador.');
      setTimeout(() => setStep('verify'), 1200);
    } catch {
      setError('No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verificar código y cambiar contraseña ─────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (newPass !== confirmPass) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, token, newPassword: newPass }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Error'); return; }

      setSuccess('✅ Contraseña actualizada. Redirigiendo...');
      if (cardRef.current) {
        cardRef.current.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        cardRef.current.style.opacity = '0';
        cardRef.current.style.transform = 'translateY(-20px)';
      }
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div
        ref={cardRef}
        style={{
          width: '100%', maxWidth: '420px',
          opacity: 0, transform: 'translateY(28px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔑</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', letterSpacing: '0.06em', color: '#fff' }}>
            SNACKS <span style={{ color: '#FF4500' }}>911</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
            Restablecer Contraseña
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#111', borderRadius: '20px',
          border: '1px solid rgba(255,69,0,0.12)', padding: '2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Steps indicator */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
            {(['request', 'verify'] as Step[]).map((s, i) => (
              <div key={s} style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: step === s || (s === 'request' && step === 'verify')
                  ? '#FF4500' : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s ease',
              }} />
            ))}
          </div>

          {step === 'request' ? (
            <>
              <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Solicitar código
              </h1>
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.83rem', color: '#555' }}>
                Ingresa tu número de empleado y te daremos un código de 6 dígitos.
              </p>

              <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Número de empleado
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder="admin001"
                    style={inputStyle}
                    required minLength={3} maxLength={50}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                </div>

                {error && <ErrorBox msg={error} />}
                {success && <SuccessBox msg={success} />}

                {/* Dev token helper */}
                {devToken && (
                  <div style={{
                    background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)',
                    borderRadius: '8px', padding: '0.6rem 0.9rem',
                    color: '#FFD700', fontSize: '0.83rem', display: 'flex', gap: '0.5rem', alignItems: 'center',
                  }}>
                    <span>🔐 Código DEV:</span>
                    <strong style={{ letterSpacing: '0.15em', fontSize: '1rem' }}>{devToken}</strong>
                  </div>
                )}

                <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                  {loading ? 'Enviando...' : 'Solicitar código →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Nueva contraseña
              </h1>
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.83rem', color: '#555' }}>
                Ingresa el código de 6 dígitos y tu nueva contraseña.
              </p>

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Código */}
                <div>
                  <label style={labelStyle}>Código de 6 dígitos</label>
                  <input
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    style={{ ...inputStyle, letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center' }}
                    required maxLength={6} inputMode="numeric"
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                </div>

                {/* Nueva contraseña */}
                <div>
                  <label style={labelStyle}>Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ ...inputStyle, paddingRight: '3rem' }}
                      required minLength={6}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    />
                    <EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />
                  </div>
                </div>

                {/* Confirmar */}
                <div>
                  <label style={labelStyle}>Confirmar contraseña</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repite tu contraseña"
                    style={{
                      ...inputStyle,
                      borderColor: confirmPass && confirmPass !== newPass
                        ? 'rgba(255,69,0,0.5)' : 'rgba(255,255,255,0.1)',
                    }}
                    required minLength={6}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = confirmPass && confirmPass !== newPass
                        ? 'rgba(255,69,0,0.5)' : 'rgba(255,255,255,0.1)';
                    }}
                  />
                  {confirmPass && confirmPass !== newPass && (
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#FF6040' }}>Las contraseñas no coinciden</p>
                  )}
                </div>

                {error && <ErrorBox msg={error} />}
                {success && <SuccessBox msg={success} />}

                <button type="submit" disabled={loading || (!!confirmPass && confirmPass !== newPass)} style={primaryBtn(loading)}>
                  {loading ? 'Guardando...' : 'Cambiar contraseña ✓'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('request'); setError(''); setSuccess(''); setDevToken(''); }}
                  style={{
                    background: 'none', border: 'none', color: '#555',
                    fontSize: '0.82rem', cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  ← Solicitar otro código
                </button>
              </form>
            </>
          )}

          {/* Back to login */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/login" style={{ color: '#444', fontSize: '0.8rem', textDecoration: 'none' }}>
              ← Volver al inicio de sesión
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', color: '#666',
  marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
};

function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    marginTop: '0.25rem', padding: '0.9rem',
    background: loading ? 'rgba(255,69,0,0.5)' : 'linear-gradient(135deg, #FF4500, #FF6500)',
    border: 'none', borderRadius: '12px',
    color: '#fff', fontWeight: 800, fontSize: '1rem',
    cursor: loading ? 'wait' : 'pointer',
    boxShadow: '0 0 20px rgba(255,69,0,0.25)',
    transition: 'opacity 0.2s',
  };
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.3)',
      borderRadius: '8px', padding: '0.6rem 0.9rem',
      color: '#FF7040', fontSize: '0.83rem',
    }}>{msg}</div>
  );
}

function SuccessBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
      borderRadius: '8px', padding: '0.6rem 0.9rem',
      color: '#4ade80', fontSize: '0.83rem',
    }}>{msg}</div>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" tabIndex={-1} onClick={onToggle} style={{
      position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '0.3rem',
      display: 'flex', alignItems: 'center',
    }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}

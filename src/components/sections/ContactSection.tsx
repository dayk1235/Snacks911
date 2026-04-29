'use client';

import { memo, useEffect, useState } from 'react';

const hours = [
  { day: 'Lun – Mié', time: '1:00 pm – 10:00 pm', open: true },
  { day: 'Jueves',    time: '1:00 pm – 11:00 pm', open: true },
  { day: 'Vie – Sáb', time: '12:00 pm – 12:00 am', open: true },
  { day: 'Domingo',  time: 'Cerrado', open: false },
];

const socialLinks = [
  {
    name: 'Instagram', href: 'https://instagram.com/snacks911',
    color: '#E1306C', bg: 'rgba(225,48,108,0.1)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    name: 'Facebook', href: 'https://facebook.com/snacks911',
    color: '#1877F2', bg: 'rgba(24,119,242,0.1)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: 'TikTok', href: 'https://tiktok.com/@snacks911',
    color: '#ee1d52', bg: 'rgba(238,29,82,0.1)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
];

function ContactSectionComponent() {
  const [whatsappNumber, setWhatsappNumber] = useState('525584507458');
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Compute open/closed only on client — avoids SSR/client mismatch
    const now     = new Date();
    const hour    = now.getHours();
    const weekday = now.getDay(); // 0=Sun, 1=Mon…
    setIsOpen(weekday !== 0 && hour >= 12 && hour < 24);

    try {
      const raw = localStorage.getItem('snacks911_admin_settings');
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings?.whatsappNumber) setWhatsappNumber(settings.whatsappNumber);
    } catch { /* ignore */ }
  }, []);

  return (
    <section
      id="contact"
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(4rem, 8vh, 6rem) 1.5rem',
        scrollMarginTop: '70px', position: 'relative', overflow: 'hidden',
        background: '#080808',
      }}
    >
      {/* ── Dramatic background ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(255,69,0,0.07) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '250px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center bottom, rgba(255,69,0,0.09) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      {/* Grid lines overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vh, 4rem)' }}>
          <span style={{
            fontSize: '0.7rem', color: '#FF4500', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            display: 'block', marginBottom: '0.75rem',
          }}>
            📡 Encuéntranos
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 400, color: '#fff', letterSpacing: '0.04em',
            margin: '0 0 0.9rem', lineHeight: 0.95,
          }}>
            HABLEMOS<br />
            <span style={{ color: '#FF4500' }}>DIRECTO</span>
          </h2>
          <p style={{
            color: '#444', fontSize: '0.95rem', maxWidth: '380px',
            margin: '0 auto', lineHeight: 1.7,
          }}>
            Sin rodeos — pide, pregunta o salúdanos cuando gustes.
          </p>
        </div>

        {/* ── Main CTA — WhatsApp hero button ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(2.5rem, 4vh, 3.5rem)' }}>
          <a
            href={`https://wa.me/${(whatsappNumber || '525584507458').replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '1rem',
              padding: 'clamp(0.9rem, 2vh, 1.2rem) clamp(1.5rem, 4vw, 3rem)',
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              borderRadius: '20px', textDecoration: 'none',
              animation: 'waPulse 2.8s ease-in-out infinite',
              transition: 'transform 0.2s ease',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <div>
              <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', letterSpacing: '0.06em', lineHeight: 1 }}>
                PEDIR POR WHATSAPP
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 500, marginTop: '3px' }}>
                Respuesta en minutos · Tap para abrir
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>

        {/* ── 3 info cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.25rem',
        }}>

          {/* Horarios */}
          <div style={{
            padding: 'clamp(1.5rem, 3vh, 2.25rem)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
              }}>⏰</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Horarios</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>¿Cuándo puedes pedir?</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {hours.map(h => (
                <div key={h.day} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '10px',
                  background: h.open ? 'rgba(255,255,255,0.02)' : 'transparent',
                  border: h.open ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: '0.82rem', color: h.open ? '#aaa' : '#333', fontWeight: 500 }}>{h.day}</span>
                  <span style={{
                    fontSize: '0.82rem', fontWeight: 700,
                    color: h.open ? '#fff' : '#2a2a2a',
                  }}>{h.time}</span>
                </div>
              ))}
            </div>
            <div
              suppressHydrationWarning
              style={{
                marginTop: '1rem', padding: '0.6rem 0.85rem',
                background: mounted ? (isOpen ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.04)') : 'rgba(255,255,255,0.04)',
                border: mounted ? `1px solid ${isOpen ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}` : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              <span
                suppressHydrationWarning
                style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: mounted ? (isOpen ? '#22c55e' : '#555') : '#555', display: 'inline-block' }}
              />
              <span suppressHydrationWarning style={{ fontSize: '0.78rem', color: mounted ? (isOpen ? '#22c55e' : '#555') : '#555', fontWeight: 600 }}>
                {mounted ? (isOpen ? 'Abierto ahora · Acepta pedidos' : 'Cerrado en este momento') : 'Disponible'}
              </span>
            </div>
          </div>

          {/* Redes sociales */}
          <div style={{
            padding: 'clamp(1.5rem, 3vh, 2.25rem)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
              }}>🌐</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Síguenos</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>Contenido y promos cada día</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {socialLinks.map(s => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = s.bg;
                    el.style.borderColor = s.color + '44';
                    el.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(255,255,255,0.03)';
                    el.style.borderColor = 'rgba(255,255,255,0.07)';
                    el.style.transform = 'translateX(0)';
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px', textDecoration: 'none',
                    color: s.color, transition: 'all 0.2s ease',
                  }}
                >
                  {s.icon}
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ccc' }}>@snacks911</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#444', fontWeight: 600 }}>{s.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Ubicación + Entrega */}
          <div style={{
            padding: 'clamp(1.5rem, 3vh, 2.25rem)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
              }}>🚀</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Entrega</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>Rápido y sin excusas</div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { val: '~30min', label: 'Tiempo promedio' },
                { val: '$0',     label: 'Envío local' },
                { val: '4.9★',   label: 'Calificación' },
                { val: '24/7',   label: 'WhatsApp activo' },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#FF4500', letterSpacing: '0.04em', lineHeight: 1 }}>{stat.val}</div>
                  <div style={{ fontSize: '0.65rem', color: '#444', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
              <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>📍</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ccc' }}>Tu Ciudad, México</div>
                <div style={{ fontSize: '0.75rem', color: '#444', marginTop: '2px' }}>Entrega a domicilio · Zona local</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

const ContactSection = memo(ContactSectionComponent);
export default ContactSection;

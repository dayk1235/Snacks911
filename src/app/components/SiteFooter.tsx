export default function SiteFooter() {
  return (
    <footer id="footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#050505' }}>
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, #FF4500 35%, #FFB800 50%, #FF4500 65%, transparent 100%)', opacity: 0.3 }} />
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🚨</span>
          <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.1rem', letterSpacing: '0.05em', color: '#fff' }}>
            SNACKS <span style={{ color: '#FF4500' }}>911</span>
          </span>
        </div>
        <p style={{ color: '#2a2a2a', fontSize: '0.78rem', margin: 0 }}>
          © {new Date().getFullYear()} Snacks 911 — Hecho con fuego
        </p>
      </div>
    </footer>
  );
}

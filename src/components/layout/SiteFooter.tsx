import { buildWaLink } from '@/utils/whatsapp';

const links = [
  { label: 'Menú',          href: '#menu' },
  { label: 'Salsas',        href: '#salsas' },
  { label: 'Zona',          href: '#zona' },
  { label: '¿Cómo funciona?', href: '#como-funciona' },
];

export default function SiteFooter() {
  return (
    <footer style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '48px 24px 32px' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          {/* Logo + tagline */}
          <div className="text-center md:text-left">
            <div className="font-black text-2xl text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>
              SNACKS <span style={{ color: 'var(--color-primary)' }}>911 🚨</span>
            </div>
            <p className="m-0 mt-1 text-sm" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
              Urgencia de Antojo 🚨
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap justify-center md:justify-end gap-4">
            {links.map(({ label, href }) => (
              <a key={href} href={href} className="text-sm font-bold no-underline transition-colors hover:text-white"
                style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
                {label}
              </a>
            ))}
          </div>

          {/* WhatsApp CTA */}
          <a href={buildWaLink()} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all"
            style={{ background: '#25D366', fontFamily: 'var(--font-body)' }}>
            📲 Pedir por WhatsApp
          </a>
        </div>

        {/* Redes sociales — slots listos para activar */}
        {/* 
        <div className="flex gap-4 justify-center">
          <a href="https://instagram.com/snacks911" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://tiktok.com/@snacks911" target="_blank" rel="noopener noreferrer">TikTok</a>
        </div>
        */}

        {/* Bottom */}
        <div className="border-t pt-5 text-center text-[0.78rem]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
          © {new Date().getFullYear()} Snacks 911 · Hecho con 🔥 en Iztapalapa
        </div>
      </div>
    </footer>
  );
}

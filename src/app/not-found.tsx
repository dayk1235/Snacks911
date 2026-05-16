import { buildWaLink } from '@/utils/whatsapp';

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <h1
        className="m-0"
        style={{ fontFamily: 'var(--font-display)', fontSize: '6rem', color: 'var(--color-primary)' }}
      >
        404 🚨
      </h1>
      <p
        className="mt-4 text-[1.1rem]"
        style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
      >
        Esta página no existe... pero tu antojo sí.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <a
          href="/"
          className="px-6 py-3 rounded-full font-bold hover:opacity-90 active:scale-95 transition-all"
          style={{ background: 'var(--color-primary)', color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}
        >
          Volver al menú
        </a>
        <a
          href={buildWaLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-full font-bold hover:opacity-90 active:scale-95 transition-all"
          style={{ background: '#25D366', color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}
        >
          📲 Pedir igual
        </a>
      </div>
    </main>
  );
}

'use client';

const testimonios = [
  { nombre: 'Fer G.', colonia: 'Col. Ejército', stars: 5, texto: 'Las salsas no son de broma. El habanero 911 es nivel otra cosa 🔥' },
  { nombre: 'Diana R.', colonia: 'Iztapalapa', stars: 5, texto: 'Pedí a las 8 PM y llegó en 28 minutos. El combo mixto está brutal.' },
  { nombre: 'Carlos M.', colonia: 'Constitucionalista', stars: 5, texto: 'Ya pedí 3 veces esta semana. Los boneless con chipotle son mi perdición.' },
];

export default function TestimoniosSection() {
  return (
    <section style={{ background: 'var(--color-surface)', padding: '80px 24px' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="m-0 uppercase" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'var(--color-text)' }}>
            LO QUE DICEN LOS QUE YA PROBARON
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonios.map((t) => (
            <div key={t.nombre} className="flex flex-col gap-4 p-6 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <div className="flex gap-1 text-lg" style={{ color: 'var(--color-accent)' }}>
                {'★'.repeat(t.stars)}
              </div>
              <p className="m-0 text-[0.95rem] leading-relaxed text-white italic" style={{ fontFamily: 'var(--font-body)' }}>
                &ldquo;{t.texto}&rdquo;
              </p>
              <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="font-black text-white text-sm" style={{ fontFamily: 'var(--font-display)' }}>{t.nombre}</div>
                <div className="text-[0.75rem]" style={{ color: 'var(--color-muted)' }}>{t.colonia}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

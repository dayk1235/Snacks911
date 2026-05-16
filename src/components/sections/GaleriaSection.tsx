'use client';

const galleryImages = [
  { src: '/images/alitas.webp',   alt: 'Alitas crujientes con salsa BBQ' },
  { src: '/images/boneless.webp', alt: 'Boneless jugosos con salsa buffalo' },
  { src: '/images/papas.webp',    alt: 'Papas loaded con queso y jalapeños' },
  { src: '/images/combo.webp',    alt: 'Combo mixto 911' },
  { src: '/images/alitas.webp',   alt: 'Alitas doradas con salsa habanero' },
  { src: '/images/boneless.webp', alt: 'Boneless con chipotle cremoso' },
];

export default function GaleriaSection() {
  return (
    <section id="galeria" style={{ background: 'var(--color-bg)', padding: '80px 24px' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2
            className="m-0 uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              color: 'var(--color-text)',
            }}
          >
            ASÍ SE VEN CUANDO LLEGAN 👀
          </h2>
          <p className="mt-2 text-base" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
            Sin filtros. Solo sabor.
          </p>
        </div>

        {/* Masonry-style columns */}
        <div className="columns-2 md:columns-3 gap-3">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className="break-inside-avoid mb-3 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-auto block object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

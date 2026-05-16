'use client';

const salsas = [
  { nombre: 'BBQ Ahumada',      picante: 1, desc: 'Dulce con toque de humo. Para empezar suave.' },
  { nombre: 'Buffalo Clásica',  picante: 2, desc: 'El estándar. El que siempre funciona.' },
  { nombre: 'Chipotle Cremosa', picante: 2, desc: 'Suave, ahumada, para todos los paladares.' },
  { nombre: 'Mango Enchilado',  picante: 3, desc: 'Dulce, tropical y con golpe al final.' },
  { nombre: 'Verde Taquera',    picante: 3, desc: 'La salsa de la calle de toda la vida.' },
  { nombre: 'Habanero 911',     picante: 5, desc: 'Para los que de verdad aguantan. No bromeamos.' },
];

export default function SalsasSection() {
  return (
    <section id="salsas" style={{ background: 'var(--color-surface)', padding: '80px 24px' }}>
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
            EL SECRETO ESTÁ EN LA SALSA 🔥
          </h2>
          <p className="mt-2 text-base" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
            Hechas a mano, sin conservadores, en casa.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {salsas.map((s) => (
            <div
              key={s.nombre}
              className="flex flex-col gap-3 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              {/* Badge */}
              <span
                className="self-start text-black text-[0.62rem] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: 'var(--color-accent)' }}
              >
                100% Artesanal
              </span>

              {/* Name */}
              <h3
                className="m-0 text-[1rem] font-black text-white uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {s.nombre}
              </h3>

              {/* Picante */}
              <div className="flex gap-0.5 text-base">
                {Array.from({ length: s.picante }).map((_, i) => (
                  <span key={i}>🌶️</span>
                ))}
                {Array.from({ length: 5 - s.picante }).map((_, i) => (
                  <span key={i} className="opacity-20">🌶️</span>
                ))}
              </div>

              {/* Desc */}
              <p
                className="m-0 text-[0.82rem] leading-relaxed"
                style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

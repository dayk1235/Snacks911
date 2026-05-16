'use client';

const pasos = [
  {
    icon: '📋',
    titulo: 'Elige tu pedido',
    desc: 'Revisa el menú y elige lo que se te antoje',
  },
  {
    icon: '📲',
    titulo: 'Mándanos un WhatsApp',
    desc: 'Sin apps, sin comisiones, directo con nosotros',
  },
  {
    icon: '🛵',
    titulo: 'Recíbelo en casa',
    desc: 'Fresquito y a tiempo. 25-35 minutos promedio',
  },
];

export default function ComoFuncionaSection() {
  return (
    <section id="como-funciona" style={{ background: 'var(--color-surface)', padding: '80px 24px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="m-0 uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              color: 'var(--color-text)',
            }}
          >
            ¿CÓMO FUNCIONA?
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0">
          {pasos.map((paso, i) => (
            <div key={paso.titulo} className="flex md:flex-col items-center md:items-center gap-5 md:gap-3 flex-1">
              {/* Step circle */}
              <div
                className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                <span className="text-2xl md:text-3xl">{paso.icon}</span>
                <span
                  className="text-[0.65rem] font-black"
                  style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
                >
                  PASO {i + 1}
                </span>
              </div>

              {/* Text */}
              <div className="text-left md:text-center flex-1 md:flex-none">
                <h3
                  className="m-0 text-white font-black text-[1.05rem] uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {paso.titulo}
                </h3>
                <p
                  className="m-0 mt-1 text-[0.85rem]"
                  style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {paso.desc}
                </p>
              </div>

              {/* Arrow — only between steps, only on desktop */}
              {i < pasos.length - 1 && (
                <span
                  className="hidden md:block text-2xl mx-4 flex-shrink-0"
                  style={{ color: 'var(--color-border)' }}
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

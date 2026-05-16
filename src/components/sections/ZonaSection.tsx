'use client';

const info = [
  { icon: '⏰', titulo: 'Horario',         valor: 'Lun – Dom · 2:00 PM – 11:00 PM' },
  { icon: '📍', titulo: 'Zona',            valor: 'Ejército Constitucionalista, Iztapalapa CP 09220' },
  { icon: '🛵', titulo: 'Costo de envío',  valor: '$25 · Pedido mínimo $100' },
  { icon: '⏱',  titulo: 'Tiempo estimado', valor: '25 a 35 minutos' },
];

export default function ZonaSection() {
  return (
    <section id="zona" style={{ background: 'var(--color-bg)', padding: '140px 24px' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="m-0 uppercase" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 4rem)', color: 'var(--color-text)' }}>
            ZONA DE ENTREGA 📍
          </h2>
          <p className="mt-2 text-base" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
            Llevamos el sabor directo a tu puerta.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {info.map((item) => (
            <div key={item.titulo} className="flex flex-col gap-2 p-4">
              <span className="text-3xl">{item.icon}</span>
              <h3 className="m-0 text-[0.75rem] font-black uppercase tracking-widest" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
                {item.titulo}
              </h3>
              <p className="m-0 text-[0.9rem] font-bold text-white leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                {item.valor}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { buildWaLink } from '@/utils/whatsapp';

// ─── Data ─────────────────────────────────────────────────────────────────────

type Tab = 'combos' | 'alitas' | 'boneless' | 'complementos';

interface MenuItem {
  name: string;
  price: number;
  desc: string;
  badge?: string;
  image?: string;
}

const menuData: Record<Tab, MenuItem[]> = {
  combos: [
    {
      name: 'Combo Mixto 911',
      price: 159,
      badge: '⭐ El Más Pedido',
      desc: 'El que siempre se acaba primero. Boneless 150g + 6 alitas + papas + bebida.',
      image: '/images/combo.webp',
    },
    {
      name: 'Boneless Power 911',
      price: 149,
      badge: '💪 El Favorito',
      desc: '250g de boneless reales. Papas, bebida y salsa a elegir. Para el antojo en serio.',
      image: '/images/boneless.webp',
    },
    {
      name: 'Combo Callejero 911',
      price: 99,
      desc: 'Banderilla + salchipapas + bebida. Sabor de calle con nivel 911.',
      image: '/images/papas.webp',
    },
  ],
  alitas: [
    {
      name: '6 Alitas BBQ',
      price: 89,
      desc: 'Alitas bañadas en BBQ ahumada. Crujientes por fuera, jugosas por dentro.',
      image: '/images/alitas.webp',
    },
    {
      name: '12 Alitas Buffalo',
      price: 149,
      desc: 'La clásica Buffalo que siempre funciona. Picante perfecto.',
      image: '/images/alitas.webp',
    },
    {
      name: '6 Alitas Habanero 911',
      price: 99,
      badge: '🌶️ Nivel Extremo',
      desc: 'Para los que de verdad aguantan. Nuestra salsa bandera.',
      image: '/images/alitas.webp',
    },
  ],
  boneless: [
    {
      name: 'Boneless 150g',
      price: 89,
      desc: '150g de boneless de pechuga real. Con tu salsa favorita.',
      image: '/images/boneless.webp',
    },
    {
      name: 'Boneless 250g',
      price: 129,
      badge: '💪 El Favorito',
      desc: '250g generosos. La opción para el hambre de verdad.',
      image: '/images/boneless.webp',
    },
    {
      name: 'Boneless Chipotle Cremoso',
      price: 109,
      desc: 'Suave, ahumado y cremoso. El más pedido entre los regulares.',
      image: '/images/boneless.webp',
    },
  ],
  complementos: [
    {
      name: 'Papas Loaded',
      price: 55,
      desc: 'Papas fritas con queso cheddar, jalapeños y aderezo ranch.',
      image: '/images/papas.webp',
    },
    {
      name: 'Salchipapas',
      price: 49,
      desc: 'Papas fritas con salchicha en rebanadas. Un clásico de la calle.',
      image: '/images/papas.webp',
    },
    {
      name: 'Dip Extra',
      price: 20,
      desc: 'Cualquiera de nuestras salsas caseras para acompañar lo que quieras.',
      image: '/images/papas.webp',
    },
  ],
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'combos',       label: '🔥 Combos' },
  { id: 'alitas',       label: '🍗 Alitas' },
  { id: 'boneless',     label: '💪 Boneless' },
  { id: 'complementos', label: '🍟 Complementos' },
];

// ─── Card ─────────────────────────────────────────────────────────────────────
function MenuCard({ item }: { item: MenuItem }) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* Image placeholder */}
      <div className="relative w-full h-40 overflow-hidden bg-[#1e1e1e] flex-shrink-0">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl opacity-30">🍗</div>
        )}
        {item.badge && (
          <span
            className="absolute top-3 left-3 text-black text-[0.7rem] font-black px-2 py-1 rounded-full uppercase tracking-wide"
            style={{ background: 'var(--color-accent)' }}
          >
            {item.badge}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <h3 className="m-0 text-[1rem] font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {item.name}
          </h3>
          <p className="m-0 text-[0.82rem] leading-relaxed mt-1" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
            {item.desc}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-black text-xl" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
            ${item.price}
          </span>
          <a
            href={buildWaLink(item.name, String(item.price))}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-bold text-sm py-2 px-4 rounded-lg hover:scale-105 active:scale-95 transition-all duration-200"
            style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}
          >
            📲 Quiero este
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function MenuSection() {
  const [activeTab, setActiveTab] = useState<Tab>('combos');

  return (
    <section id="menu" style={{ background: 'var(--color-bg)', padding: '80px 24px' }}>
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
            EL MENÚ
          </h2>
          <p className="mt-2 text-base" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
            Todo hecho al momento. Sin conservadores.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-8 no-scrollbar">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all duration-200"
              style={{
                fontFamily: 'var(--font-body)',
                background: activeTab === id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeTab === id ? 'white' : 'var(--color-muted)',
                border: activeTab === id ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 grid-animate">
          {menuData[activeTab].map((item) => (
            <MenuCard key={item.name} item={item} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <a
            href={buildWaLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-white font-black px-8 py-4 rounded-full hover:scale-105 active:scale-95 transition-all"
            style={{
              background: 'var(--color-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
            }}
          >
            📲 Ver menú completo por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

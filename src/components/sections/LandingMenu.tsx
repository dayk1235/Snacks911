'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image'; // PERF FIX: replace native <img> with next/image for webp optimization and CLS prevention
import { useGSAP } from '@/lib/gsap';
import { buildWaLink } from '@/utils/whatsapp';
import { useChatStore } from '@/stores/chatStore';
import { Button } from '@/components/ui/Button';

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
  const openChat = useChatStore((state) => state.open);

  return (
    <div
      className="menu-card flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* Image placeholder */}
      <div className="relative w-full h-40 overflow-hidden bg-[#1e1e1e] flex-shrink-0">
        {item.image ? (
          // PERF FIX: migrated <img> to next/image with fill, lazy, sizes — eliminates CLS from menu images
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // PERF FIX: responsive sizes for 1/2/3 col grid
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy" // PERF FIX: below the fold images should not block initial load
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
          <Button
            variant="primary"
            size="sm"
            onClick={() => openChat(`Quiero pedir ${item.name}`)}
          >
            🤖 Pedir con IA
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function MenuSection() {
  const [activeTab, setActiveTab] = useState<Tab>('combos');

  // ── ScrollTrigger: pinned title + parallax + per-card reveal (desktop) / simple stagger (mobile) ──
  useGSAP((gsap, ST) => {
    if (!ST) return;

    ST.matchMedia({
      // ── Desktop: pinned title layout ─────────────────────────────────
      '(min-width: 769px)': function () {
        // Parallax on sticky title
        gsap.to('.menu-sticky-title', {
          scrollTrigger: {
            trigger: '.menu-section',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
          },
          y: -60,
          ease: 'none',
        });

        // Per-card reveal + progressive counter
        const cards = gsap.utils.toArray('.menu-card') as Element[];
        cards.forEach((card: Element, i: number) => {
          gsap.from(card, {
            scrollTrigger: {
              trigger: card as Element,
              start: 'top 85%',
              once: true,
            },
            y: 60,
            opacity: 0,
            scale: 0.96,
            duration: 0.6,
            ease: 'power2.out',
            clearProps: 'all',
          });

          // Progressive counter: "1/12" → "12/12"
          ST.create({
            trigger: card as Element,
            start: 'top 60%',
            onEnter: () => {
              const countEl = document.querySelector('.menu-count');
              if (countEl) countEl.textContent = `${i + 1}/${cards.length}`;
            },
            onLeaveBack: () => {
              const countEl = document.querySelector('.menu-count');
              if (countEl) countEl.textContent = `${i}/${cards.length}`;
            },
          });
        });
      },

      // ── Mobile: simple stagger, no pin ────────────────────────────────
      '(max-width: 768px)': function () {
        gsap.from('.menu-card', {
          scrollTrigger: {
            trigger: '.menu-section',
            start: 'top 80%',
            once: true,
          },
          y: 40,
          opacity: 0,
          stagger: 0.1,
          duration: 0.5,
          ease: 'power2.out',
          clearProps: 'all',
        });
      },
    });
  }, []);

  return (
    <section id="menu" className="menu-section" style={{ background: 'var(--color-bg)', padding: '140px 24px' }}>
      {/* ── Sticky title (left on desktop, top on mobile) ────────────── */}
      <div className="menu-sticky-title">
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
        <span className="menu-count">0/12</span>
      </div>

      {/* ── Cards (right on desktop, below on mobile) ────────────────── */}
      <div className="menu-cards-container">
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-8 no-scrollbar">
          {TABS.map(({ id, label }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`btn btn-pill flex-shrink-0 ${activeTab === id ? 'active' : ''}`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
            >
              {label}
            </motion.button>
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
          <motion.a
            href={buildWaLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg inline-block"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
          >
            📲 Ver menú completo por WhatsApp
          </motion.a>
        </div>
      </div>
    </section>
  );
}

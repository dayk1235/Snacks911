'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Zap, MessageCircle, BarChart3, ShieldCheck, 
  ChevronRight, ArrowRight, Sparkles
} from 'lucide-react';

const FEATURE_CARDS = [
  {
    title: "Venta Automatizada",
    desc: "Nuestra IA no solo responde dudas — toma pedidos completos, gestiona extras y confirma pagos sin intervención humana.",
    icon: <Zap className="w-6 h-6 text-indigo-400" />,
  },
  {
    title: "WhatsApp Realtime",
    desc: "Sin aplicaciones pesadas. Tus clientes te compran desde la app que ya usan todos los días, sin fricción.",
    icon: <MessageCircle className="w-6 h-6 text-indigo-400" />,
  },
  {
    title: "Métricas de Conversión",
    desc: "Dashboard avanzado para ver qué productos se venden más, cuánto ahorras en personal y dónde crecer.",
    icon: <BarChart3 className="w-6 h-6 text-indigo-400" />,
  }
];

const PRICING = [
  {
    name: "Básico",
    price: 2499,
    features: ["Hasta 500 pedidos/mes", "IA Personalizada", "Soporte vía WhatsApp", "Dashboard de Métricas"],
    cta: "Iniciar Prueba",
    featured: false
  },
  {
    name: "Pro",
    price: 4999,
    features: ["Pedidos Ilimitados", "Personalidad Avanzada", "Multi-agente de Ventas", "Reportes Mensuales", "Soporte Prioritario"],
    cta: "Obtener Pro",
    featured: true
  }
];

function formatPrice(n: number) {
  return n.toLocaleString('es-MX');
}

export default function LandingPage() {
  return (
    <div className="min-h-screen pro-void text-white font-sans selection:bg-indigo-500/20 selection:text-indigo-200 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 pro-glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex justify-between items-center px-6 md:px-10 py-5 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
              <Zap className="text-indigo-400 w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white/90">AI Commerce</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/saas#features" className="text-white/35 hover:text-white/70 transition-colors">Funciones</Link>
            <Link href="/saas#pricing" className="text-white/35 hover:text-white/70 transition-colors">Precios</Link>
            <Link href="/" className="text-indigo-300/70 hover:text-indigo-300 transition-colors">Ver Tienda</Link>
            <Link href="/login" className="text-white/35 hover:text-white/70 transition-colors">Entrar</Link>
            <Link href="/onboarding" className="pro-btn-primary text-sm py-2.5 px-5 rounded-xl">
              Prueba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 md:pt-40 pb-20 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-500/5 border border-indigo-500/10 text-indigo-300/80 px-4 py-2 rounded-full text-xs font-semibold mb-10">
              <Sparkles className="w-3 h-3" />
              <span>IA Generativa para Restaurantes</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-[-0.02em] mb-8 text-white">
              Tu WhatsApp<br />
              <span className="text-accent">vende solo.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/30 max-w-lg mb-12 leading-relaxed">
              La primera plataforma de comercio conversacional que convierte tu WhatsApp en un mesero experto, 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/onboarding" className="pro-btn-primary text-base px-10 py-4 rounded-2xl group">
                Empezar 14 días gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/menu" className="pro-btn-secondary text-base px-10 py-4 rounded-2xl">
                Ver Menú / Pedir
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="absolute inset-0 bg-indigo-500/[0.03] blur-[100px] rounded-full scale-90" />
            
            <div className="relative pro-phone rounded-[3rem] p-4">
              <div className="bg-[#0C0C14] rounded-[2.5rem] h-[540px] w-[290px] overflow-hidden flex flex-col border border-white/[0.04]">
                {/* Phone header */}
                <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center text-sm">
                    🔥
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/70">Asistente Virtual</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400/80 font-semibold">En línea</span>
                    </div>
                  </div>
                </div>
                {/* Messages */}
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[88%] text-xs leading-relaxed text-white/50">
                    ¡Hola! 👋 Soy tu asistente. ¿Qué se te antoja hoy?
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/10 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[80%] ml-auto text-xs leading-relaxed text-indigo-200/80">
                    Quiero un combo de alitas con papas
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[88%] text-xs leading-relaxed text-white/50">
                    ¡Excelente! 🍗 Tenemos el Combo 911. ¿Te lo preparo?
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    <span className="px-3 py-1.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/15 text-indigo-300/80">Agregar al carrito</span>
                    <span className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-white/[0.02] border border-white/[0.05] text-white/30">Ver menú</span>
                  </div>
                </div>
                {/* Input */}
                <div className="px-4 py-3 border-t border-white/[0.04]">
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-full px-4 py-2.5 text-[11px] text-white/20">
                    Escribe un mensaje...
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-40 md:py-52">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <motion.div 
            className="text-center mb-24"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] mb-6 text-white">
              No es un bot cualquiera.
            </h2>
            <p className="text-white/25 max-w-lg mx-auto text-lg leading-relaxed">
              Tecnología diseñada para negocios que no quieren perder ni un solo mensaje de sus clientes.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="pro-card p-10 md:p-12"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white tracking-[-0.01em]">{f.title}</h3>
                <p className="text-white/25 leading-relaxed text-[0.94rem]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-40 md:py-52">
        <div className="max-w-5xl mx-auto px-6 md:px-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-white">
              Precios simples.
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {PRICING.map((p, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`text-left flex flex-col rounded-[32px] p-10 md:p-12 ${
                  p.featured 
                    ? 'bg-white/[0.03] border border-indigo-500/10' 
                    : 'pro-card'
                }`}
              >
                <div className="flex justify-between items-start mb-10">
                  <span className="text-sm font-semibold uppercase tracking-widest text-white/30">{p.name}</span>
                  {p.featured && (
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/15 text-indigo-300/80">
                      POPULAR
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-10">
                  <span className="text-5xl md:text-6xl font-bold tracking-[-0.02em] text-white">
                    ${formatPrice(p.price)}
                  </span>
                  <span className="text-sm text-white/20">MXN / mes</span>
                </div>
                <ul className="space-y-4 mb-12 flex-1">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3 text-sm text-white/35">
                      <ShieldCheck className="w-4 h-4 text-indigo-400/60 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/onboarding" 
                  className={`w-full py-4 rounded-2xl font-semibold text-center transition-all text-sm ${
                    p.featured 
                      ? 'pro-btn-primary' 
                      : 'pro-btn-secondary'
                  }`}
                >
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 md:py-52 border-t border-white/[0.03]">
        <div className="max-w-4xl mx-auto px-6 md:px-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-[-0.02em] leading-[1.05]">
              ¿Listo para ver tu negocio<br />escalar en automático?
            </h2>
            <p className="text-white/25 mb-14 text-lg max-w-md mx-auto leading-relaxed">
              Únete a los negocios que ya están vendiendo más con nuestra IA.
            </p>
            <Link 
              href="/onboarding" 
              className="pro-btn-primary text-lg px-12 py-5 rounded-2xl inline-flex items-center gap-3 group"
            >
              Comenzar Prueba Gratuita
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-20">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight">AI Commerce</span>
          </div>
          <p className="text-white/10 text-xs font-medium">
            &copy; {new Date().getFullYear()} AI Commerce Platform &middot; Hecho con fuego
          </p>
        </div>
      </footer>
    </div>
  );
}

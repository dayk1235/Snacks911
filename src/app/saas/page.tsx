'use client';

/**
 * app/saas/page.tsx
 * 
 * Premium Landing Page for the SaaS platform.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Zap, MessageCircle, BarChart3, ShieldCheck, 
  ChevronRight, Play, Star, ArrowRight
} from 'lucide-react';

const FEATURE_CARDS = [
  {
    title: "Venta Automatizada",
    desc: "Nuestra IA no solo responde dudas, toma pedidos completos, gestiona extras y confirma pagos.",
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    color: "bg-amber-50"
  },
  {
    title: "WhatsApp Realtime",
    desc: "Sin aplicaciones pesadas. Tus clientes te compran desde la app que ya usan diario.",
    icon: <MessageCircle className="w-6 h-6 text-green-500" />,
    color: "bg-green-50"
  },
  {
    title: "Métricas de Conversión",
    desc: "Dashboard avanzado para ver qué productos se venden más y cuánto ahorras en personal.",
    icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
    color: "bg-blue-50"
  }
];

const PRICING = [
  {
    name: "Básico",
    price: "2,499",
    features: ["Hasta 500 pedidos/mes", "IA Personalizada", "Soporte vía WhatsApp", "Dashboard de Métricas"],
    cta: "Iniciar Prueba",
    popular: false
  },
  {
    name: "Pro",
    price: "4,999",
    features: ["Pedidos Ilimitados", "Personalidad Avanzada", "Multi-agente de Ventas", "Reportes Mensuales", "Soporte Prioritario"],
    cta: "Obtener Pro",
    popular: true
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Zap className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter">AI COMMERCE</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500">
          <Link href="/saas#features" className="hover:text-gray-900 transition-colors">Funciones</Link>
          <Link href="/saas#pricing" className="hover:text-gray-900 transition-colors">Precios</Link>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 transition-colors">Ver Tienda 🍗</Link>
          <Link href="/login" className="hover:text-gray-900 transition-colors">Entrar</Link>
          <Link href="/onboarding" className="bg-gray-900 text-white px-6 py-3 rounded-full hover:bg-indigo-600 transition-all">
            Prueba Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-bold mb-6">
              <Star className="w-3 h-3 fill-current" />
              <span>NUEVO: IA GENERATIVA PARA RESTAURANTES</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black leading-[0.9] tracking-tighter mb-8">
              Tu WhatsApp <br /> 
              <span className="text-indigo-600">vende solo.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-md mb-10 leading-relaxed">
              La primera plataforma de comercio conversacional que convierte tu WhatsApp en un mesero experto 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/onboarding" className="group bg-indigo-600 text-white px-8 py-5 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200">
                Empezar 14 días gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/menu" className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-bold text-lg border border-gray-200 hover:bg-gray-50 transition-all text-gray-900 no-underline">
                <span className="text-xl">🍗</span>
                Ver Menú / Pedir
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-200 rounded-full blur-[100px] opacity-50" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-200 rounded-full blur-[100px] opacity-50" />
            
            <div className="relative bg-gray-900 rounded-[2.5rem] p-4 shadow-2xl overflow-hidden border-8 border-gray-800">
              <div className="bg-white rounded-[1.5rem] h-[600px] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div>
                    <p className="text-sm font-bold">Asistente Virtual</p>
                    <p className="text-[10px] text-green-500 font-bold uppercase">En Línea</p>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                    ¡Hola! 👋 Soy tu asistente de Snacks 911. ¿Qué se te antoja hoy?
                  </div>
                  <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] ml-auto text-sm">
                    Quiero un combo de alitas con papas y una coca
                  </div>
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                    ¡Excelente elección! 🍗 Tenemos el Combo 911 ($189). ¿Te lo preparo?
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-full px-4 py-2 text-xs text-gray-400">
                    Escribe un mensaje...
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tight mb-4">No es un bot cualquiera.</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Tecnología de punta diseñada para negocios que no quieren perder ni un solo mensaje de sus clientes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURE_CARDS.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100"
              >
                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mb-8`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-black tracking-tight mb-16 italic">Precios Simples.</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {PRICING.map((p, i) => (
              <div key={i} className={`p-12 rounded-[3rem] border-2 text-left flex flex-col ${
                p.popular ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'border-gray-100 bg-white'
              }`}>
                <div className="flex justify-between items-start mb-8">
                  <span className="text-xl font-bold uppercase tracking-widest">{p.name}</span>
                  {p.popular && <span className="bg-white text-indigo-600 text-[10px] px-3 py-1 rounded-full font-black">POPULAR</span>}
                </div>
                <div className="flex items-baseline gap-2 mb-10">
                  <span className="text-5xl font-black">${p.price}</span>
                  <span className="text-sm opacity-60">MXN / mes</span>
                </div>
                <ul className="space-y-4 mb-12 flex-1">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3 text-sm font-medium">
                      <ShieldCheck className={`w-4 h-4 ${p.popular ? 'text-white' : 'text-indigo-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/onboarding" 
                  className={`w-full py-5 rounded-2xl font-bold text-center transition-all ${
                    p.popular ? 'bg-white text-indigo-600 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-indigo-600'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tighter">
            ¿Listo para ver tu negocio <br /> escalar en automático?
          </h2>
          <p className="text-indigo-100 mb-12 text-lg">Únete a cientos de negocios que ya están vendiendo más con nuestra IA.</p>
          <Link href="/onboarding" className="bg-white text-indigo-600 px-12 py-6 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all inline-flex items-center gap-3 shadow-xl">
            Comenzar Prueba Gratuita
            <ChevronRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-xs font-medium">
        © {new Date().getFullYear()} AI COMMERCE PLATFORM · HECHO CON FUEGO
      </footer>
    </div>
  );
}

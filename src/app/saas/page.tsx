'use client';

import React, { useReducer, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronRight, Activity, Users, Globe, Cpu, Server, ShieldCheck, Sparkles, MessageCircle, BarChart3, ArrowRight, Terminal } from 'lucide-react';

/* ─── STATE ARCHITECTURE ─── */
type UIState = "BOOT" | "HERO" | "ACTIVATING" | "MODULES";

type Action =
  | { type: "READY" }
  | { type: "ACTIVATE" }
  | { type: "DONE" };

function reducer(state: UIState, action: Action): UIState {
  switch (state) {
    case "BOOT":
      if (action.type === "READY") return "HERO";
      break;
    case "HERO":
      if (action.type === "ACTIVATE") return "ACTIVATING";
      break;
    case "ACTIVATING":
      if (action.type === "DONE") return "MODULES";
      break;
  }
  return state;
}

const EASING = [0.23, 1, 0.32, 1];

export default function SaaSPage() {
  const [state, dispatch] = useReducer(reducer, "BOOT");

  useEffect(() => {
    // Simulate brief boot to trigger entry animations
    const t = setTimeout(() => dispatch({ type: "READY" }), 100);
    return () => clearTimeout(t);
  }, []);

  const handleActivate = () => {
    if (state !== "HERO") return;
    dispatch({ type: "ACTIVATE" });
    // Sequence: 200ms dark overlay, 400ms blur, 400ms hero fade out = ~800-900ms
    setTimeout(() => {
      dispatch({ type: "DONE" });
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#020204] text-white overflow-hidden relative selection:bg-indigo-500/20 selection:text-indigo-200 font-sans">
      <BackgroundSystem state={state} />
      <Navbar state={state} />

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {state === "BOOT" && <motion.div key="boot" className="min-h-screen" />}
          
          {(state === "HERO" || state === "ACTIVATING") && (
            <HeroSection key="hero" state={state} onActivate={handleActivate} />
          )}

          {state === "MODULES" && (
            <ModulesLayer key="modules" />
          )}
        </AnimatePresence>
      </main>

      {/* Conditionally hide standard landing content when system is activated */}
      <AnimatePresence>
        {(state === "HERO" || state === "BOOT") && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: EASING } }}
            className="relative z-10"
          >
            <LegacyContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activating Dark Overlay */}
      <AnimatePresence>
        {state === "ACTIVATING" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASING, delay: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── BACKGROUND SYSTEM ─── */
function BackgroundSystem({ state }: { state: UIState }) {
  const isAwake = state === "ACTIVATING" || state === "MODULES";
  
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020204]">
      {/* Abstract dark video simulation via CSS / SVGs for performance */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
        animate={{ 
          opacity: state === "BOOT" ? 0 : 1, 
          scale: isAwake ? 1 : 1.02,
          filter: isAwake ? 'blur(0px)' : 'blur(12px)'
        }}
        transition={{ duration: 1.2, ease: EASING }}
        className="absolute inset-0"
      >
        {/* Subtle mesh gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(67,56,202,0.05)_0%,transparent_50%)]" />
        
        {/* Animated dynamic overlay when awake */}
        <motion.div 
          animate={{ 
            opacity: isAwake ? 0.8 : 0.3,
            backgroundPosition: isAwake ? ['0% 0%', '100% 100%'] : '0% 0%'
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)',
            backgroundSize: '200% 200%'
          }}
        />
        
        {/* Noise overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
      </motion.div>
    </div>
  );
}

/* ─── NAVBAR ─── */
function Navbar({ state }: { state: UIState }) {
  const [scrolled, setScrolled] = useState(false);
  const isSystemActive = state === "MODULES" || state === "ACTIVATING";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ 
        y: 0, 
        opacity: isSystemActive ? 0.3 : 1,
      }}
      transition={{ duration: 0.6, ease: EASING }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
        scrolled 
          ? 'bg-[#020204]/70 backdrop-blur-md border-white/5 py-4' 
          : 'bg-transparent border-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
            <Zap className="text-indigo-400 w-4 h-4" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">AI Commerce</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide">
          <Link href="#features" className="text-white/40 hover:text-white transition-colors">Funciones</Link>
          <Link href="#pricing" className="text-white/40 hover:text-white transition-colors">Precios</Link>
          <Link href="/menu" className="text-indigo-400/80 hover:text-indigo-300 transition-colors">Ver Tienda</Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ─── HERO SECTION ─── */
function HeroSection({ state, onActivate }: { state: UIState, onActivate: () => void }) {
  const isActivating = state === "ACTIVATING";

  return (
    <motion.section 
      exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
      transition={{ duration: 0.6, ease: EASING }}
      className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center pt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASING }}
        className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-8"
      >
        <Sparkles className="w-3 h-3" />
        <span>Generative AI Engine</span>
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASING, delay: 0.1 }}
        className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[0.95] tracking-tight mb-8 text-white"
      >
        Tu WhatsApp<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
          vende solo.
        </span>
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASING, delay: 0.25 }}
        className="text-lg text-white/40 max-w-xl mx-auto mb-14 leading-relaxed font-light"
      >
        La primera plataforma de comercio conversacional que convierte tu WhatsApp en un sistema autónomo, 24/7.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASING, delay: 0.4 }}
      >
        <button
          onClick={onActivate}
          className={`relative group overflow-hidden rounded-2xl transition-all duration-200 ${
            isActivating ? 'scale-95 opacity-80' : 'hover:scale-[1.02] active:scale-[0.98]'
          }`}
          style={{
            boxShadow: isActivating 
              ? '0 0 40px rgba(99, 102, 241, 0.6)' 
              : '0 0 20px rgba(99, 102, 241, 0.2)',
          }}
        >
          {/* Subtle pulse idle state */}
          <div className="absolute inset-0 bg-indigo-500/20 animate-pulse pointer-events-none" />
          
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 px-10 py-4 flex items-center gap-3 transition-colors group-hover:bg-white/10">
            <span className="text-sm font-semibold tracking-wide text-white">
              {isActivating ? "Iniciando secuencia..." : "Activar Sistema"}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse" />
          </div>
        </button>
      </motion.div>
    </motion.section>
  );
}

/* ─── MODULES LAYER (ORGANIC LAYOUT) ─── */
function ModulesLayer() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 overflow-hidden flex items-center justify-center pointer-events-none"
    >
      <div className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto pointer-events-auto">
        
        {/* Top Left: Main Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 40, x: -20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, x: 0, rotate: -1 }}
          transition={{ duration: 0.8, ease: EASING, delay: 0.1 }}
          className="absolute top-[15%] left-[5%] md:left-[10%] w-[320px] z-30"
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">Core Metrics</span>
            </div>
            <div className="space-y-5">
              <MetricRow label="AI Agents Online" value={24} suffix="" />
              <MetricRow label="Active Sessions" value={342} suffix="" />
              <MetricRow label="System Load" value={68} suffix="%" />
            </div>
          </GlassCard>
        </motion.div>

        {/* Bottom Right: Network & Latency */}
        <motion.div 
          initial={{ opacity: 0, y: 40, x: 20, rotate: 2 }}
          animate={{ opacity: 1, y: 0, x: 0, rotate: 1 }}
          transition={{ duration: 0.8, ease: EASING, delay: 0.2 }}
          className="absolute bottom-[20%] right-[5%] md:right-[10%] w-[280px] z-20"
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">Network</span>
            </div>
            <div className="space-y-5">
              <MetricRow label="Latency" value={12} suffix="ms" inverseColor />
              <MetricRow label="Requests/sec" value={1204} suffix="" />
            </div>
          </GlassCard>
        </motion.div>

        {/* Center/Bottom: System Logs */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASING, delay: 0.3 }}
          className="absolute bottom-[10%] left-[50%] -translate-x-1/2 w-[400px] z-40"
        >
          <SystemLogs />
        </motion.div>

      </div>
    </motion.div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden ${className}`}>
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      {children}
    </div>
  );
}

function MetricRow({ label, value, suffix, inverseColor = false }: { label: string, value: number, suffix: string, inverseColor?: boolean }) {
  const [currentValue, setCurrentValue] = useState(value);

  // Dynamic fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      // +/- 2% variation
      const variation = value * 0.02;
      const change = (Math.random() * variation * 2) - variation;
      setCurrentValue(Math.round(value + change));
    }, 2000 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="flex items-end justify-between">
      <span className="text-sm font-medium text-white/40">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tracking-tight ${inverseColor ? 'text-white' : 'text-indigo-100'}`}>
          {currentValue.toLocaleString()}
        </span>
        {suffix && <span className="text-xs text-white/30 font-bold">{suffix}</span>}
      </div>
    </div>
  );
}

function SystemLogs() {
  const logs = [
    "connecting nodes...",
    "syncing data streams...",
    "ai agents deployed",
    "system stable"
  ];
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setVisibleLogs(prev => [...prev, logs[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 font-mono text-[10px] text-emerald-400/80 leading-relaxed shadow-2xl">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
        <Terminal className="w-3 h-3 opacity-50" />
        <span className="opacity-50 uppercase tracking-widest">Sys.Log</span>
      </div>
      <div className="space-y-1 min-h-[80px]">
        {visibleLogs.map((log, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="opacity-40 mr-2">{`>`}</span> {log}
          </motion.div>
        ))}
        {visibleLogs.length < logs.length && (
          <motion.div 
            animate={{ opacity: [1, 0] }} 
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="w-1.5 h-3 bg-emerald-400/80 inline-block align-middle ml-1"
          />
        )}
      </div>
    </div>
  );
}


/* ─── LEGACY CONTENT (FEATURES / PRICING) ─── */
// Keeping the rest of the landing page structure below the hero fold
function LegacyContent() {
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

  return (
    <div className="relative bg-[#020204]">
      {/* Features */}
      <section id="features" className="py-32 md:py-40 border-t border-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">
              No es un bot cualquiera.
            </h2>
            <p className="text-white/30 max-w-lg mx-auto text-base leading-relaxed">
              Tecnología diseñada para negocios que no quieren perder ni un solo mensaje de sus clientes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((f, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 md:p-10 transition-colors hover:bg-white/[0.04]">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-8">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-4 text-white">{f.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-12 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-white/20 text-xs font-medium">
            &copy; {new Date().getFullYear()} AI Commerce Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

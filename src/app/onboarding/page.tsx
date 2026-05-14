'use client';

/**
 * app/onboarding/page.tsx
 * 
 * Tenant self-service onboarding.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MessageSquare, Upload, 
  Settings, CheckCircle, ChevronRight, ArrowLeft 
} from 'lucide-react';

const STEPS = [
  { id: 'business', title: 'Negocio', icon: <Building2 className="w-5 h-5" /> },
  { id: 'whatsapp', title: 'WhatsApp', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'menu', title: 'Menú', icon: <Upload className="w-5 h-5" /> },
  { id: 'personality', title: 'IA', icon: <Settings className="w-5 h-5" /> }
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    businessName: '',
    slug: '',
    whatsappNumber: '',
    whatsappToken: '',
    personality: 'Eres un asistente amable y eficiente...',
  });
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call to create tenant
    setTimeout(() => {
      setLoading(false);
      setCompleted(true);
    }, 2000);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 selection:bg-[var(--accent)]/30">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">¡Todo listo!</h1>
          <p className="text-[var(--muted)] mb-8">
            Tu instancia de IA ha sido creada. Ahora configura el webhook en Meta Developers.
          </p>
          <div className="bg-white/5 p-5 rounded-2xl text-left border border-white/10 mb-8 backdrop-blur-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Webhook URL</p>
            <code className="text-sm text-[var(--accent)] break-all font-mono font-bold">
              {`https://snacks911.com/api/whatsapp/webhook`}
            </code>
          </div>
          <button 
            className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,90,0,0.3)]"
            onClick={() => window.location.href = '/admin'}
          >
            Ir al Dashboard →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center py-16 px-4 selection:bg-[var(--accent)]/30">
      {/* Progress Bar */}
      <div className="max-w-2xl w-full mb-20 px-6">
        <div className="flex justify-between relative">
          {STEPS.map((s, i) => (
            <div key={s.id} className="z-10 flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                i <= step 
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-black shadow-[0_0_30px_rgba(255,90,0,0.4)] scale-110' 
                  : 'bg-white/5 border-white/10 text-white/20'
              }`}>
                {s.icon}
              </div>
              <span className={`text-[9px] sm:text-[10px] mt-4 font-black uppercase tracking-[0.2em] ${i <= step ? 'text-[var(--accent)]' : 'text-white/20'}`}>
                {s.title}
              </span>
            </div>
          ))}
          <div className="absolute top-7 left-0 w-full h-[2px] bg-white/5 -z-0">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-1000 ease-out shadow-[0_0_20px_var(--accent)]" 
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full bg-white/[0.03] backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 md:p-16 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center"
            >
              <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter">Háblanos de tu negocio</h2>
              <p className="text-[var(--muted)] mb-12 max-w-md">Comencemos con lo básico para personalizar tu IA.</p>
              
              <div className="space-y-10 w-full text-left">
                <div className="w-full">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 ml-2">Nombre Comercial</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Tacos El Pastor"
                    className="w-full px-8 py-5 rounded-[2rem] bg-white/[0.05] border border-white/10 text-white focus:border-[var(--accent)]/50 focus:ring-8 focus:ring-[var(--accent)]/5 outline-none transition-all placeholder:text-white/10 text-lg"
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 ml-2">Slug del Negocio</label>
                  <div className="flex flex-col sm:flex-row group">
                    <span className="px-8 py-5 bg-white/[0.02] border border-white/10 sm:border-r-0 rounded-t-[2rem] sm:rounded-t-none sm:rounded-l-[2rem] text-white/20 text-sm font-mono flex items-center justify-center">
                      snacks911.com/
                    </span>
                    <input 
                      type="text" 
                      placeholder="tacos-el-pastor"
                      className="w-full px-8 py-5 rounded-b-[2rem] sm:rounded-b-none sm:rounded-r-[2rem] bg-white/[0.05] border border-white/10 text-white focus:border-[var(--accent)]/50 focus:ring-8 focus:ring-[var(--accent)]/5 outline-none transition-all placeholder:text-white/10 font-mono text-lg"
                      value={formData.slug}
                      onChange={e => setFormData({...formData, slug: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center"
            >
              <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter">Conecta WhatsApp</h2>
              <p className="text-[var(--muted)] mb-12 max-w-md">Ingresa tus credenciales de Meta for Developers.</p>
              
              <div className="space-y-10 w-full text-left">
                <div className="w-full">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 ml-2">Número de WhatsApp (con lada)</label>
                  <input 
                    type="text" 
                    placeholder="521234567890"
                    className="w-full px-8 py-5 rounded-[2rem] bg-white/[0.05] border border-white/10 text-white focus:border-[var(--accent)]/50 focus:ring-8 focus:ring-[var(--accent)]/5 outline-none transition-all placeholder:text-white/10 text-lg"
                    value={formData.whatsappNumber}
                    onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 ml-2">System User Access Token</label>
                  <textarea 
                    rows={4}
                    placeholder="EAA..."
                    className="w-full px-8 py-5 rounded-[2rem] bg-white/[0.05] border border-white/10 text-white focus:border-[var(--accent)]/50 focus:ring-8 focus:ring-[var(--accent)]/5 outline-none resize-none transition-all placeholder:text-white/10 font-mono text-sm"
                    value={formData.whatsappToken}
                    onChange={e => setFormData({...formData, whatsappToken: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center"
            >
              <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter">Sube tu Menú</h2>
              <p className="text-[var(--muted)] mb-12 max-w-md">Aceptamos CSV con: nombre, precio, categoría, descripción.</p>
              
              <div className="w-full border-2 border-dashed border-white/10 rounded-[3rem] p-16 text-center hover:border-[var(--accent)]/40 hover:bg-white/[0.02] transition-all cursor-pointer group">
                <div className="w-24 h-24 bg-white/5 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(255,90,0,0.3)] transition-all">
                  <Upload className="w-12 h-12" />
                </div>
                <p className="text-lg font-black text-white uppercase tracking-widest">Haz clic para subir</p>
                <p className="text-sm text-white/20 mt-3 uppercase tracking-widest font-bold">O arrastra tu archivo aquí</p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center"
            >
              <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter">Personalidad de la IA</h2>
              <p className="text-[var(--muted)] mb-12 max-w-md">Define cómo quieres que el bot hable con tus clientes.</p>
              
              <div className="space-y-10 w-full text-left">
                <div className="w-full">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 ml-2">Prompt de Personalidad</label>
                  <textarea 
                    rows={8}
                    className="w-full px-8 py-5 rounded-[2rem] bg-white/[0.05] border border-white/10 text-white focus:border-[var(--accent)]/50 focus:ring-8 focus:ring-[var(--accent)]/5 outline-none resize-none transition-all placeholder:text-white/10 text-lg"
                    value={formData.personality}
                    onChange={e => setFormData({...formData, personality: e.target.value})}
                  />
                  <div className="mt-6 flex gap-4 p-6 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-[2rem]">
                    <span className="text-2xl">💡</span>
                    <p className="text-[12px] text-[var(--accent)] leading-relaxed font-bold uppercase tracking-wide">
                      Tip: Incluye el tono (formal, divertido, callejero) y si quieres que use emojis para conectar mejor.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Actions */}
        <div className="flex gap-4 mt-16">
          {step > 0 && (
            <button 
              onClick={back}
              className="btn btn-ghost flex-1 !py-5"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Atrás
            </button>
          )}
          
          {step < STEPS.length - 1 ? (
            <button 
              onClick={next}
              className="btn btn-primary flex-[2] !py-5"
            >
              Continuar <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary flex-[2] !py-5 disabled:opacity-50 disabled:grayscale"
            >
              {loading ? 'Creando instancia...' : 'Finalizar Configuración 🔥'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

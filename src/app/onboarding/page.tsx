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
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Todo listo!</h1>
          <p className="text-gray-600 mb-8">
            Tu instancia de IA ha sido creada. Ahora configura el webhook en Meta Developers.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100 mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Webhook URL</p>
            <code className="text-sm text-indigo-600 break-all">
              {`https://snacks911.com/api/whatsapp/webhook`}
            </code>
          </div>
          <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
            Ir al Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      {/* Progress Bar */}
      <div className="max-w-2xl w-full mb-12">
        <div className="flex justify-between relative">
          {STEPS.map((s, i) => (
            <div key={s.id} className="z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                i <= step ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {s.icon}
              </div>
              <span className={`text-xs mt-2 font-medium ${i <= step ? 'text-indigo-600' : 'text-gray-400'}`}>
                {s.title}
              </span>
            </div>
          ))}
          <div className="absolute top-5 left-0 w-full h-[2px] bg-gray-200 -z-0">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500" 
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 md:p-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Háblanos de tu negocio</h2>
              <p className="text-gray-500 mb-8">Comencemos con lo básico para personalizar tu IA.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Comercial</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Tacos El Pastor"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Slug del Negocio</label>
                  <div className="flex">
                    <span className="px-4 py-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-gray-400 text-sm">
                      snacks911.com/
                    </span>
                    <input 
                      type="text" 
                      placeholder="tacos-el-pastor"
                      className="w-full px-4 py-3 rounded-r-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Conecta WhatsApp</h2>
              <p className="text-gray-500 mb-8">Ingresa tus credenciales de Meta for Developers.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Número de WhatsApp (con lada)</label>
                  <input 
                    type="text" 
                    placeholder="521234567890"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                    value={formData.whatsappNumber}
                    onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">System User Access Token</label>
                  <textarea 
                    rows={3}
                    placeholder="EAA..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none resize-none"
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sube tu Menú</h2>
              <p className="text-gray-500 mb-8">Aceptamos CSV con: nombre, precio, categoría, descripción.</p>
              
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer group">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-gray-900">Haz clic para subir</p>
                <p className="text-xs text-gray-400 mt-1">O arrastra y suelta tu archivo aquí</p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalidad de la IA</h2>
              <p className="text-gray-500 mb-8">Define cómo quieres que el bot hable con tus clientes.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Prompt de Personalidad</label>
                  <textarea 
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none resize-none"
                    value={formData.personality}
                    onChange={e => setFormData({...formData, personality: e.target.value})}
                  />
                  <p className="text-xs text-gray-400 mt-2 italic">
                    Tip: Incluye el tono (formal, divertido, callejero) y si quieres que use emojis.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-4 mt-12">
          {step > 0 && (
            <button 
              onClick={back}
              className="flex-1 px-6 py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Atrás
            </button>
          )}
          
          {step < STEPS.length - 1 ? (
            <button 
              onClick={next}
              className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Continuar <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando instancia...' : 'Finalizar Configuración'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

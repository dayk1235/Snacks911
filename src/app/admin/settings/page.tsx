'use client';

import { useEffect, useState } from 'react';
import { useStoreSettings } from '@/lib/storeSettingsStore';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const {
    isOpen, closedMessage, promoBannerActive, promoBannerText,
    heroTitle, heroSubtitle, isLoading, error, fetchSettings, updateSettings
  } = useStoreSettings();

  const [formData, setFormData] = useState({
    isOpen: true,
    closedMessage: '',
    promoBannerActive: false,
    promoBannerText: '',
    heroTitle: '',
    heroSubtitle: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setFormData({
      isOpen,
      closedMessage,
      promoBannerActive,
      promoBannerText,
      heroTitle,
      heroSubtitle
    });
  }, [isOpen, closedMessage, promoBannerActive, promoBannerText, heroTitle, heroSubtitle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      alert('Configuración guardada exitosamente.');
    } catch (err) {
      alert('Error al guardar: ' + err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            ⚙️ Configuraciones Web
          </h1>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 transition-colors text-white font-bold rounded uppercase tracking-wide disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded">
            {error}
          </div>
        )}

        {isLoading && !isSaving ? (
          <div className="text-neutral-400 animate-pulse">Cargando configuraciones...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* ESTADO DE LA TIENDA */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-800 p-6 rounded-xl border border-white/5 space-y-6"
            >
              <h2 className="text-xl font-bold text-red-400 uppercase tracking-wide flex items-center gap-2">
                🔴 Estado de la Tienda
              </h2>
              
              <label className="flex items-center gap-4 cursor-pointer bg-black/30 p-4 rounded-lg border border-white/5">
                <input 
                  type="checkbox" 
                  name="isOpen"
                  checked={formData.isOpen}
                  onChange={handleChange}
                  className="w-6 h-6 accent-red-600"
                />
                <div>
                  <div className="font-bold text-lg">{formData.isOpen ? 'Abierto (Recibiendo Pedidos)' : 'Cerrado (Pausado)'}</div>
                  <div className="text-sm text-neutral-400">Si cierras la tienda, los clientes no podrán hacer pedidos.</div>
                </div>
              </label>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-300">Mensaje de "Cerrado"</label>
                <input 
                  type="text" 
                  name="closedMessage"
                  value={formData.closedMessage}
                  onChange={handleChange}
                  placeholder="Ej: ¡Estamos cerrados por hoy! Vuelve pronto 🔥"
                  className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </motion.section>

            {/* BANNER DE PROMOCIONES */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-neutral-800 p-6 rounded-xl border border-white/5 space-y-6"
            >
              <h2 className="text-xl font-bold text-red-400 uppercase tracking-wide flex items-center gap-2">
                🏷️ Promos & Banners
              </h2>
              
              <label className="flex items-center gap-4 cursor-pointer bg-black/30 p-4 rounded-lg border border-white/5">
                <input 
                  type="checkbox" 
                  name="promoBannerActive"
                  checked={formData.promoBannerActive}
                  onChange={handleChange}
                  className="w-6 h-6 accent-red-600"
                />
                <div>
                  <div className="font-bold text-lg">Activar Banner Superior</div>
                  <div className="text-sm text-neutral-400">Muestra una tira de texto en la parte superior de toda la web.</div>
                </div>
              </label>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-300">Texto del Banner</label>
                <input 
                  type="text" 
                  name="promoBannerText"
                  value={formData.promoBannerText}
                  onChange={handleChange}
                  placeholder="Ej: ENVÍO GRATIS EN PEDIDOS MAYORES A $300"
                  className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </motion.section>

            {/* TEXTOS DEL HERO */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="md:col-span-2 bg-neutral-800 p-6 rounded-xl border border-white/5 space-y-6"
            >
              <h2 className="text-xl font-bold text-red-400 uppercase tracking-wide flex items-center gap-2">
                🎨 Textos de Bienvenida (Hero)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-300">Título Principal</label>
                  <input 
                    type="text" 
                    name="heroTitle"
                    value={formData.heroTitle}
                    onChange={handleChange}
                    placeholder="Ej: El Hambre No Espera"
                    className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <p className="text-xs text-neutral-500">Dejar en blanco para usar el texto por defecto.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-300">Subtítulo (Párrafo)</label>
                  <textarea 
                    name="heroSubtitle"
                    value={formData.heroSubtitle}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Ej: Pide ahora y disfruta de los mejores snacks..."
                    className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </motion.section>

          </div>
        )}
      </div>
    </div>
  );
}

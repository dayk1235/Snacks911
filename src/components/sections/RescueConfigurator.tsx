'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';

const CONFIG_OPTIONS = {
  bases: [
    { id: 'p1', name: 'Papas Locas', price: 6.00 },
    { id: 'p2', name: 'Classic Burger', price: 8.50 },
    { id: 'p3', name: 'Boneless (6pcs)', price: 9.00 }
  ],
  extras: [
    { id: 'e1', name: 'Queso Extra', price: 1.50 },
    { id: 'e2', name: 'Tocino', price: 2.00 },
    { id: 'e3', name: 'Salsa 911', price: 1.00 }
  ],
  drinks: [
    { id: 'd1', name: 'Coca-Cola', price: 2.50 },
    { id: 'd2', name: 'Agua Mineral', price: 2.00 },
    { id: 'd3', name: 'Malteada Fuego', price: 5.00 }
  ]
};

export default function RescueConfigurator() {
  const [step, setStep] = useState(1);
  const [base, setBase] = useState<typeof CONFIG_OPTIONS.bases[0] | null>(null);
  const [extras, setExtras] = useState<typeof CONFIG_OPTIONS.extras>([]);
  const [drink, setDrink] = useState<typeof CONFIG_OPTIONS.drinks[0] | null>(null);
  const { addToCart } = useCartStore();

  const calculateTotal = () => {
    let total = (base?.price || 0) + (drink?.price || 0);
    extras.forEach(e => total += e.price);
    return total;
  };

  const toggleExtra = (extra: typeof CONFIG_OPTIONS.extras[0]) => {
    setExtras(prev => 
      prev.find(e => e.id === extra.id) 
        ? prev.filter(e => e.id !== extra.id) 
        : [...prev, extra]
    );
  };

  const handleAddCombo = () => {
    if (!base) {
      alert('🚨 ERROR: Selecciona una base para el rescate.');
      return;
    }
    
    const comboName = `Combo Personalizado (${base.name}${extras.length ? ` + ${extras.map(e => e.name).join(', ')}` : ''}${drink ? ` + ${drink.name}` : ''})`;
    
    addToCart({
      id: `custom_${Date.now()}`,
      name: 'Combo Personalizado',
      description: comboName,
      price: calculateTotal(),
      category: 'combos',
      image: '/images/combo.webp'
    });

    // Reset
    setBase(null);
    setExtras([]);
    setDrink(null);
    setStep(1);
    
    // Feedback
    window.dispatchEvent(new CustomEvent('show-cart-feedback'));
  };

  return (
    <section id="configurator" className="py-24 px-6 bg-[var(--bg-secondary)]/30">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black mb-4 uppercase tracking-tighter text-white">
            ⚡ ARMA TU RESCATE
          </h2>
          <p className="text-[var(--muted)] text-sm uppercase tracking-[0.3em] font-bold">
            Configuración táctica de sabor personalizado
          </p>
        </div>
        
        <div className="glass p-6 md:p-12 relative overflow-hidden">
          <div className="flex justify-center gap-3 sm:gap-6 mb-12 overflow-x-auto pb-4 no-scrollbar">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`step-pill cursor-pointer px-8 py-3 rounded-full whitespace-nowrap text-[0.75rem] font-black uppercase tracking-widest transition-all duration-500 border ${
                  step === s 
                    ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-[0_0_30px_var(--accent)] scale-105' 
                    : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                }`}
                onClick={() => setStep(s)}
              >
                {s === 1 ? '1. BASE' : s === 2 ? '2. EXTRAS' : '3. BEBIDA'}
              </div>
            ))}
          </div>

          <div className="min-h-[250px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {step === 1 && CONFIG_OPTIONS.bases.map(b => (
              <div 
                key={b.id}
                className={`group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer ${
                  base?.id === b.id 
                    ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-[0_0_40px_rgba(255,90,0,0.2)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
                onClick={() => setBase(b)}
              >
                <div className="text-[1.1rem] font-black uppercase tracking-tight mb-2">{b.name}</div>
                <div className={`font-mono font-black text-lg ${base?.id === b.id ? 'text-[var(--bg)]' : 'text-[var(--accent)]'}`}>
                  ${b.price.toFixed(2)}
                </div>
              </div>
            ))}

            {step === 2 && CONFIG_OPTIONS.extras.map(e => (
              <div 
                key={e.id}
                className={`group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer ${
                  extras.find(ex => ex.id === e.id) 
                    ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-[0_0_40px_rgba(255,90,0,0.2)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
                onClick={() => toggleExtra(e)}
              >
                <div className="text-[1.1rem] font-black uppercase tracking-tight mb-2">{e.name}</div>
                <div className={`font-mono font-black text-lg ${extras.find(ex => ex.id === e.id) ? 'text-[var(--bg)]' : 'text-[var(--accent)]'}`}>
                  ${e.price.toFixed(2)}
                </div>
              </div>
            ))}

            {step === 3 && CONFIG_OPTIONS.drinks.map(d => (
              <div 
                key={d.id}
                className={`group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer ${
                  drink?.id === d.id 
                    ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-[0_0_40px_rgba(255,90,0,0.2)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
                onClick={() => setDrink(d)}
              >
                <div className="text-[1.1rem] font-black uppercase tracking-tight mb-2">{d.name}</div>
                <div className={`font-mono font-black text-lg ${drink?.id === d.id ? 'text-[var(--bg)]' : 'text-[var(--accent)]'}`}>
                  ${d.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="text-center md:text-left">
              <div className="text-[0.7rem] text-[var(--muted)] uppercase font-black tracking-[0.3em] mb-2">PRECIO DEL RESCATE</div>
              <div className="font-mono font-black text-[3rem] text-[var(--accent)] leading-tight drop-shadow-[0_0_30px_rgba(255,90,0,0.3)]">
                ${calculateTotal().toFixed(2)}
              </div>
            </div>
            <button 
              className="btn btn-primary min-w-[280px] !py-6 !text-xl"
              onClick={handleAddCombo}
            >
              AGREGAR COMBO 🔥
            </button>
          </div>
        </div>
      </div>
    </section>

  );
}

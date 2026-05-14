'use client';

import { useEffect, useState } from 'react';

export default function DispatchOrb() {
  const [active, setActive] = useState(false);

  const toggleAI = () => {
    window.dispatchEvent(new CustomEvent('toggle-ai'));
  };

  useEffect(() => {
    const handleFeedback = () => {
      setActive(true);
      setTimeout(() => setActive(false), 500);
    };
    window.addEventListener('show-cart-feedback', handleFeedback);
    return () => window.removeEventListener('show-cart-feedback', handleFeedback);
  }, []);

  return (
    <div 
      className={`dispatch-orb fixed bottom-[130px] right-10 w-[70px] h-[70px] rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center z-[1100] cursor-pointer transition-all duration-300 animate-[float_5s_infinite_ease-in-out] shadow-[0_0_40px_rgba(0,0,0,0.6)] hover:scale-115 hover:rotate-[10deg] hover:border-[var(--accent)] ${active ? '!scale-140 !border-[var(--accent)]' : ''}`}
      onClick={toggleAI}
    >
      <div className="dispatch-pulse-ring absolute inset-[-8px] border-2 border-[var(--accent)] rounded-full opacity-0 animate-[ring-pulse_2.5s_infinite]"></div>
      <div className="dispatch-pulse-ring absolute inset-[-8px] border-2 border-[var(--accent)] rounded-full opacity-0 animate-[ring-pulse_2.5s_infinite_1.25s]"></div>
      <div className="inner-core w-[15px] h-[15px] bg-[var(--accent)] rounded-full shadow-[0_0_25px_var(--accent)]"></div>
      <span className="text-2xl z-[1] absolute">🤖</span>
    </div>
  );
}

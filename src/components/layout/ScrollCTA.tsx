'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/lib/chatStore';

export default function ScrollCTA() {
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);
  const setPhase = useChatStore((s) => s.setPhase);

  useEffect(() => {
    const handleScroll = () => {
      if (closed) return;
      
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollY / height) * 100;

      if (progress > 40) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [closed]);

  const handleOpenChat = () => {
    setShow(false);
    // Disparar el evento para abrir el chat si es necesario
    // O simplemente confiar en que el usuario hará clic en el FAB
    // Pero aquí podemos forzar el inicio del flujo
    window.dispatchEvent(new CustomEvent('open-snacks-chat'));
  };

  if (!show || closed) return null;

  return (
    <div className="scroll-cta-container">
      <div className="scroll-cta-content">
        <span className="scroll-cta-text">🔥 ¿Ya sabes qué pedir?</span>
        <button className="scroll-cta-button" onClick={handleOpenChat}>
          Pedir ahora
        </button>
        <button className="scroll-cta-close" onClick={() => setClosed(true)}>×</button>
      </div>

      <style jsx>{`
        .scroll-cta-container {
          position: fixed;
          bottom: 2rem;
          right: 5.5rem;
          z-index: 9990;
          animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .scroll-cta-content {
          background: #1a1a1a;
          border: 1px solid rgba(255, 69, 0, 0.3);
          border-radius: 16px;
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 69, 0, 0.1);
          backdrop-filter: blur(10px);
        }
        .scroll-cta-text {
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .scroll-cta-button {
          background: linear-gradient(135deg, #FF4500, #FF6B00);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 0.5rem 1rem;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          transition: transform 0.2s;
          white-space: nowrap;
        }
        .scroll-cta-button:hover {
          transform: scale(1.05);
        }
        .scroll-cta-close {
          background: none;
          border: none;
          color: #666;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

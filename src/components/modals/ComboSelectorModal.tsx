'use client';

import Image from 'next/image';
import { products, getProductImage } from '@/data/products';

// Products to show in the selector (combos + proteins)
const SELECTOR_ITEMS = products.filter(p =>
  p.category === 'combos' || p.category === 'proteina'
).slice(0, 6);

interface ComboSelectorModalProps {
  onSelect: (value: string, label: string, image: string) => void;
  onClose: () => void;
}

export default function ComboSelectorModal({ onSelect, onClose }: ComboSelectorModalProps) {
  // Map product name → action value used by flowEngine
  const toActionValue = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal Panel */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', maxWidth: '680px', maxHeight: '90vh',
          background: '#111',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,69,0,0.1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'all',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                🔥 Elige tu combo
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#666' }}>
                Tap para seleccionar y continuar
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#888', fontSize: '1.1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Grid */}
          <div style={{
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
          }}>
            {SELECTOR_ITEMS.map(item => {
              const actionValue = toActionValue(item.name);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(actionValue, item.name, item.image)}
                  style={{
                    background: '#181818',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', height: '110px', width: '100%' }}>
                    <Image
                      src={getProductImage(item)}
                      alt={item.name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                    {item.popular && (
                      <div style={{
                        position: 'absolute', top: '8px', left: '8px',
                        background: 'rgba(255,69,0,0.92)',
                        color: '#fff', fontSize: '0.55rem', fontWeight: 900,
                        padding: '3px 8px', borderRadius: '6px',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                      }}>
                        ⭐ Popular
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'start', gap: '6px', marginBottom: '4px',
                    }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#FF4500', flexShrink: 0 }}>
                        ${item.price}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#666', lineHeight: 1.4 }}>
                      {item.description.slice(0, 55)}{item.description.length > 55 ? '…' : ''}
                    </p>
                    <div style={{
                      marginTop: '8px',
                      background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                      borderRadius: '8px', padding: '5px 10px',
                      fontSize: '0.65rem', fontWeight: 800, color: '#fff',
                      textAlign: 'center',
                    }}>
                      Seleccionar →
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

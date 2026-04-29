'use client';

import { products, getProductImage } from '@/data/products';
import Image from 'next/image';

interface ComboShowcaseProps {
  combos: { id: string; badge?: string }[];
  onHide: () => void;
}

export default function ComboShowcase({ combos, onHide }: ComboShowcaseProps) {
  
  // Filter products and attach dynamic badges
  const items = combos.map(c => {
    const product = products.find(p => 
      p.id.toString() === c.id || 
      p.name.toLowerCase().replace(/ /g, '_') === c.id ||
      c.id.includes(p.name.toLowerCase().replace(/ /g, '_'))
    );
    return product ? { ...product, dynamicBadge: c.badge } : null;
  }).filter(Boolean) as any[];

  if (items.length === 0) return null;

  const handleCheckout = (itemName: string) => {
    const phone = "525610885062";
    const message = `Quiero ordenar ${itemName}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <section style={{
      width: '100%',
      padding: '2rem 1.5rem',
      background: 'linear-gradient(to bottom, rgba(255,69,0,0.15), transparent)',
      borderBottom: '1px solid rgba(255,69,0,0.2)',
      position: 'relative',
      zIndex: 100,
      animation: 'slideDown 0.5s cubic-bezier(0.34,1.56,0.64,1)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              🔥 Recomendaciones Especiales
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#888' }}>Seleccionado especialmente para ti ahora</p>
          </div>
          <button 
            onClick={onHide}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 16px',
              borderRadius: '30px',
              transition: 'all 0.2s ease'
            }}
          >
            Ocultar
          </button>
        </div>

        <div className="showcase-grid">
          {items.map(item => (
            <div key={item.id} className="premium-showcase-card">
              <div className="card-image-container">
                <Image 
                  src={getProductImage(item)} 
                  alt={item.name} 
                  fill
                  style={{ objectFit: 'cover' }}
                  className="card-image"
                />
                {item.dynamicBadge && <div className="card-badge">{item.dynamicBadge}</div>}
              </div>
              
              <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{item.name}</h4>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FF4500' }}>${item.price}</span>
                </div>
                
                <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#aaa', lineHeight: 1.5, minHeight: '3em' }}>
                  {item.description}
                </p>
                
                <button 
                  className="card-cta"
                  onClick={() => handleCheckout(item.name)}
                >
                  🔥 Pedir ahora
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .showcase-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .showcase-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .premium-showcase-card {
          background: #121212;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display: flex;
          flex-direction: column;
        }
        .premium-showcase-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255,69,0,0.4);
          box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,69,0,0.1);
        }
        .card-image-container {
          position: relative;
          height: 180px;
          width: 100%;
          overflow: hidden;
        }
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .premium-showcase-card:hover .card-image {
          transform: scale(1.1);
        }
        .card-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: #FF4500;
          color: #fff;
          font-size: 0.6rem;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.05em;
        }
        .card-content {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .card-cta {
          margin-top: auto;
          background: linear-gradient(135deg, #FF4500, #FF6500);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 10px;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(255,69,0,0.3);
        }
        .card-cta:hover {
          transform: scale(1.02);
          filter: brightness(1.1);
          box-shadow: 0 6px 20px rgba(255,69,0,0.4);
        }
        .card-cta:active {
          transform: scale(0.98);
        }
      `}</style>
    </section>
  );
}

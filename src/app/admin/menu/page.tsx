'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/lib/productStore';
import { CATEGORY_LABELS } from '@/lib/adminTypes';
import type { Product } from '@/data/products';
import Image from 'next/image';

export default function AdminMenuPage() {
  const { products, isLoading, error, fetchProducts, updateProduct } = useProductStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProducts(true); // fetch all, including unavailable
  }, [fetchProducts]);

  const handleEdit = (p: Product) => {
    setEditingProduct({ ...p });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    const success = await updateProduct(editingProduct);
    if (success) {
      setEditingProduct(null);
    } else {
      alert('Error al guardar cambios');
    }
    setSaving(false);
  };

  const toggleAvailability = async (p: Product) => {
    await updateProduct({ ...p, available: !p.available });
  };

  const filteredProducts = products.filter(p => filter === 'all' ? true : p.category === filter);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem', fontFamily: 'var(--font-display)', color: '#FF4500' }}>
            Editor de Menú en Vivo
          </h1>
          <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
            Los cambios se reflejan al instante en la aplicación principal sin tocar código.
          </p>
        </div>
        
        {/* Filtros */}
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '0.6rem 1rem', background: '#1a1a1a', border: '1px solid #333', 
            borderRadius: '8px', color: '#fff', fontSize: '0.9rem'
          }}
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Cargando menú...</div>
      ) : error ? (
        <div style={{ color: '#ef4444', padding: '2rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
          Error: {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredProducts.map(p => (
            <div key={p.id} style={{
              background: '#141414', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              opacity: p.available === false ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}>
              <div style={{ position: 'relative', height: '140px', background: '#111' }}>
                <Image src={p.image} alt={p.name} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <button 
                    onClick={() => toggleAvailability(p)}
                    style={{
                      padding: '0.4rem 0.8rem', borderRadius: '20px', border: 'none',
                      background: p.available !== false ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
                      color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    {p.available !== false ? '✅ Visible' : '❌ Oculto'}
                  </button>
                </div>
              </div>
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{p.name}</h3>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FF4500' }}>${p.price}</span>
                </div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#888', flex: 1 }}>{p.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#222', borderRadius: '4px', color: '#ccc' }}>
                    {CATEGORY_LABELS[p.category] || p.category}
                  </span>
                  <button 
                    onClick={() => handleEdit(p)}
                    style={{
                      padding: '0.5rem 1rem', background: '#222', border: '1px solid #333',
                      borderRadius: '6px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <form onSubmit={handleSave} style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px',
            width: '100%', maxWidth: '500px', padding: '2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem', fontFamily: 'var(--font-display)', color: '#FF4500' }}>Editar Producto</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Nombre</label>
                <input 
                  required
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Precio ($)</label>
                  <input 
                    type="number" required min="0" step="0.5"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.8rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Precio Anterior ($)</label>
                  <input 
                    type="number" min="0" step="0.5"
                    value={editingProduct.originalPrice || ''}
                    onChange={e => setEditingProduct({...editingProduct, originalPrice: e.target.value ? Number(e.target.value) : undefined})}
                    style={{ width: '100%', padding: '0.8rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Descripción</label>
                <textarea 
                  required rows={3}
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Imagen (URL local / externa)</label>
                <input 
                  required
                  value={editingProduct.image}
                  onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button 
                type="button" 
                onClick={() => setEditingProduct(null)}
                style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={saving}
                style={{ 
                  padding: '0.8rem 2rem', background: '#FF4500', border: 'none', borderRadius: '8px', 
                  color: '#fff', fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

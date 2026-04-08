'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { AdminStore } from '@/lib/adminStore';
import { AdminProduct, ProductCategory, CATEGORY_LABELS } from '@/lib/adminTypes';

const CARD: React.CSSProperties = {
  background: '#111', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const CATEGORIES: ProductCategory[] = ['alitas', 'boneless', 'papas', 'combos'];

const emptyForm = (): Omit<AdminProduct, 'id'> => ({
  name: '', price: 0, category: 'alitas',
  description: '', imageUrl: '', available: true,
});

export default function ProductsPage() {
  const [products, setProducts]       = useState<AdminProduct[]>([]);
  const [filter, setFilter]           = useState<ProductCategory | 'all'>('all');
  const [search, setSearch]           = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<AdminProduct | null>(null);
  const [form, setForm]               = useState(emptyForm());
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const reload = () => setProducts(AdminStore.getProducts());

  useEffect(() => {
    reload();
    gsap.from(gridRef.current?.children ?? [], {
      opacity: 0, y: 20, stagger: 0.06, duration: 0.45, ease: 'power3.out',
    });
  }, []);

  const filtered = products.filter(p => {
    const matchCat = filter === 'all' || p.category === filter;
    const matchQ   = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditTarget(p);
    setForm({ name: p.name, price: p.price, category: p.category, description: p.description, imageUrl: p.imageUrl, available: p.available });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const product: AdminProduct = {
      id: editTarget?.id ?? `p${Date.now()}`,
      ...form,
    };
    AdminStore.saveProduct(product);
    reload();
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    AdminStore.deleteProduct(id);
    reload();
    setDeleteId(null);
  };

  const handleToggle = (id: string) => {
    AdminStore.toggleProduct(id);
    reload();
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagen máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, imageUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.9rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '9px', color: '#fff',
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>🍗 Productos</h1>
          <p style={{ margin: '0.3rem 0 0', color: '#555', fontSize: '0.875rem' }}>{products.length} productos en total</p>
        </div>
        <button
          onClick={openAdd}
          style={{ padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg,#FF4500,#FF6500)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 0 20px rgba(255,69,0,0.25)' }}
        >
          ➕ Nuevo producto
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '220px', padding: '0.6rem 0.9rem' }}
        />
        {(['all', ...CATEGORIES] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '0.45rem 1rem', borderRadius: '20px',
              background: filter === cat ? 'rgba(255,69,0,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === cat ? '#FF4500' : 'rgba(255,255,255,0.08)'}`,
              color: filter === cat ? '#FF4500' : '#666',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cat === 'all' ? '🔍 Todos' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
        {filtered.map(p => (
          <div key={p.id} style={{ ...CARD, overflow: 'hidden' }}>
            {/* Image / placeholder */}
            <div style={{
              height: '160px', background: p.imageUrl ? `url(${p.imageUrl}) center/cover` : 'linear-gradient(135deg,#1a1a1a,#111)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {!p.imageUrl && <span style={{ fontSize: '3rem', opacity: 0.3 }}>{CATEGORY_LABELS[p.category].split(' ')[0]}</span>}
            </div>

            <div style={{ padding: '1rem' }}>
              {/* Category badge */}
              <span style={{ fontSize: '0.68rem', color: '#FF4500', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[p.category]}
              </span>
              <h3 style={{ margin: '0.25rem 0 0.4rem', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{p.name}</h3>
              <p style={{ margin: '0 0 0.75rem', color: '#555', fontSize: '0.78rem', lineHeight: 1.5 }}>{p.description}</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFB800' }}>${p.price}</span>

                {/* Available toggle */}
                <button
                  onClick={() => handleToggle(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    background: p.available ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${p.available ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '20px', padding: '0.3rem 0.65rem',
                    color: p.available ? '#22c55e' : '#555',
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <span>{p.available ? '●' : '○'}</span>
                  {p.available ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  onClick={() => openEdit(p)}
                  style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ccc', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => setDeleteId(p.id)}
                  style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#333' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥺</div>
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#111', borderRadius: '20px', border: '1px solid rgba(255,69,0,0.2)', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
                {editTarget ? '✏️ Editar producto' : '➕ Nuevo producto'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre *</span>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ej: Alitas BBQ" />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precio *</span>
                  <input required type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} style={inputStyle} placeholder="120" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría *</span>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))} style={{ ...inputStyle, appearance: 'none' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</span>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Describir brevemente el platillo..." />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagen (URL o archivo)</span>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} style={inputStyle} placeholder="https://... o sube un archivo ↓" />
                <input type="file" accept="image/*" onChange={handleImage} style={{ color: '#666', fontSize: '0.8rem' }} />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="" style={{ marginTop: '0.25rem', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
                )}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} />
                <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Disponible para pedidos</span>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#666', cursor: 'pointer', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 2, padding: '0.8rem', background: 'linear-gradient(135deg,#FF4500,#FF6500)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(255,69,0,0.2)' }}>
                  {editTarget ? '💾 Guardar cambios' : '✅ Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', padding: '2rem', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>¿Eliminar producto?</h3>
            <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: '#ccc', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

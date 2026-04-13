'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  name: string;
  price: number;
  description: string;
  category: string;
}

const PRESETS = [
  { id: 'snacks', label: 'Snacks', desc: 'vendo alitas, boneless, papas, refrescos, postres', emoji: '🍟' },
  { id: 'wings', label: 'Alitas', desc: 'vendo alitas BBQ, buffalo, mango habanero, boneless, papas loaded, combos', emoji: '🍗' },
  { id: 'street', label: 'Comida Callejera', desc: 'vendo boneless, alitas, papas, corn dogs, refrescos, combos', emoji: '🌮' },
];

const CATEGORY_COLORS: Record<string, string> = {
  alitas: '#FF4500',
  boneless: '#FF6500',
  papas: '#FFB800',
  combos: '#22c55e',
  extras: '#888888',
  corn_dogs: '#a855f7',
  postres: '#ec4899',
};

export default function MenuEditorPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) { setError('Describe que vendes'); return; }
    setGenerating(true);
    setError('');
    setEditingIdx(null);
    try {
      const res = await fetch('/api/menu/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Error generando menu'); return; }
      setItems(data.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setGenerating(false); }
  }, [description]);

  const handleGenerateWithPreset = useCallback(async (presetDesc: string) => {
    setGenerating(true);
    setError('');
    setEditingIdx(null);
    try {
      const res = await fetch('/api/menu/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: presetDesc }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Error generando menu'); return; }
      setItems(data.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setGenerating(false); }
  }, []);

  const updateItem = (idx: number, field: keyof MenuItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const deleteItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const moveItem = (from: number, to: number) => {
    setItems(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const addManualItem = () => {
    setItems(prev => [...prev, { name: 'Nuevo producto', price: 50, description: 'Descripcion', category: 'extras' }]);
    setEditingIdx(items.length);
  };

  const handleSave = async () => {
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/menu/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      router.push('/admin/products');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const categories = [...new Set(items.map(i => i.category))];
  const filteredItems = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'var(--font-body)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 1.5rem', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>← Volver</button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Generar Menu</h1>
        </div>
        {items.length > 0 && (
          <button onClick={handleSave} disabled={saving} style={{
            padding: '0.45rem 1rem',
            background: saving ? 'rgba(255,69,0,0.3)' : 'linear-gradient(135deg, #FF4500, #FF6500)',
            border: 'none', borderRadius: '8px',
            color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: saving ? 'wait' : 'pointer',
          }}>
            {saving ? '...' : `Guardar (${items.length})`}
          </button>
        )}
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Input */}
        {items.length === 0 && (
          <>
            {/* Presets */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#888', marginBottom: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Elige un tipo de negocio
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PRESETS.map(preset => (
                  <button key={preset.id} onClick={() => { setDescription(preset.desc); handleGenerateWithPreset(preset.desc); }}
                    style={{
                      padding: '0.65rem 1rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{preset.emoji}</span>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', color: '#444', fontSize: '0.75rem', marginBottom: '1rem' }}>— o escribe tu propia descripcion —</div>

            <textarea ref={inputRef} value={description} onChange={e => setDescription(e.target.value)}
              placeholder='Ej: "vendo alitas, boneless, papas, refrescos"' rows={3}
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff',
                fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <button onClick={handleGenerate} disabled={generating || !description.trim()} style={{
              width: '100%', marginTop: '0.75rem', padding: '0.85rem',
              background: (generating || !description.trim()) ? 'rgba(255,69,0,0.3)' : 'linear-gradient(135deg, #FF4500, #FF6500)',
              border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '0.95rem',
              cursor: generating ? 'wait' : 'pointer',
            }}>
              {generating ? 'Generando...' : 'Generar Menu'}
            </button>
            {error && <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.2)', borderRadius: '10px', color: '#FF7040', fontSize: '0.82rem' }}>{error}</div>}
          </>
        )}

        {/* Editor */}
        {items.length > 0 && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => setFilterCat('all')} style={{
                padding: '0.3rem 0.65rem', borderRadius: '6px',
                background: filterCat === 'all' ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filterCat === 'all' ? 'rgba(255,69,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: filterCat === 'all' ? '#FF4500' : '#888', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
              }}>
                Todos ({items.length})
              </button>
              {categories.map(cat => {
                const count = items.filter(i => i.category === cat).length;
                const active = filterCat === cat;
                return (
                  <button key={cat} onClick={() => setFilterCat(active ? 'all' : cat)} style={{
                    padding: '0.3rem 0.65rem', borderRadius: '6px',
                    background: active ? `${CATEGORY_COLORS[cat] || '#555'}20` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? (CATEGORY_COLORS[cat] || '#555') + '40' : 'rgba(255,255,255,0.06)'}`,
                    color: CATEGORY_COLORS[cat] || '#888', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {cat} ({count})
                  </button>
                );
              })}
              <button onClick={addManualItem} style={{
                marginLeft: 'auto', padding: '0.3rem 0.65rem', borderRadius: '6px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
              }}>
                + Agregar
              </button>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredItems.map((item, fi) => {
                const realIdx = items.indexOf(item);
                const editing = editingIdx === realIdx;
                const catColor = CATEGORY_COLORS[item.category] || '#555';
                return (
                  <div key={realIdx} style={{
                    background: editing ? 'rgba(255,69,0,0.06)' : 'rgba(20,20,20,0.7)',
                    border: `1px solid ${editing ? 'rgba(255,69,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px', padding: '0.85rem',
                    transition: 'all 0.15s',
                  }}>
                    {/* Row 1: drag + name + price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {/* Drag handle */}
                      <div
                        draggable
                        onDragStart={() => setDragIdx(realIdx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { if (dragIdx !== null && dragIdx !== realIdx) moveItem(dragIdx, realIdx); setDragIdx(null); }}
                        style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', cursor: 'grab', fontSize: '0.9rem' }}
                      >
                        ⠿
                      </div>

                      {/* Name - inline edit */}
                      {editing ? (
                        <input value={item.name} onChange={e => updateItem(realIdx, 'name', e.target.value)}
                          style={{ flex: 1, padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,69,0,0.3)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                          autoFocus
                        />
                      ) : (
                        <span onClick={() => setEditingIdx(realIdx)} style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem', color: '#fff', cursor: 'text' }}>{item.name}</span>
                      )}

                      {/* Price - inline edit */}
                      {editing ? (
                        <input type="number" value={item.price} onChange={e => updateItem(realIdx, 'price', parseInt(e.target.value) || 0)}
                          style={{ width: '60px', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,69,0,0.3)', borderRadius: '6px', color: '#FF4500', fontSize: '0.9rem', fontWeight: 900, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <span onClick={() => setEditingIdx(realIdx)} style={{ fontSize: '0.9rem', fontWeight: 900, color: '#FF4500', cursor: 'text', minWidth: '45px', textAlign: 'right' }}>${item.price}</span>
                      )}

                      {/* Actions */}
                      <button onClick={() => setEditingIdx(editing ? null : realIdx)} style={{
                        background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0.25rem',
                      }}>
                        {editing ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        )}
                      </button>
                      <button onClick={() => deleteItem(realIdx)} style={{
                        background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '0.25rem',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>

                    {/* Row 2: category + description */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '4px', background: catColor + '15', color: catColor, textTransform: 'capitalize' }}>
                        {item.category}
                      </span>
                      {editing ? (
                        <input value={item.description} onChange={e => updateItem(realIdx, 'description', e.target.value)}
                          style={{ flex: 1, padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#888', fontSize: '0.72rem', outline: 'none' }}
                        />
                      ) : (
                        <span onClick={() => setEditingIdx(realIdx)} style={{ fontSize: '0.72rem', color: '#555', cursor: 'text' }}>{item.description}</span>
                      )}
                    </div>

                    {/* Move arrows */}
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => realIdx > 0 && moveItem(realIdx, realIdx - 1)} disabled={realIdx === 0} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: realIdx === 0 ? '#333' : '#666', fontSize: '0.65rem', padding: '0.15rem 0.5rem', cursor: realIdx === 0 ? 'default' : 'pointer' }}>↑ Subir</button>
                      <button onClick={() => realIdx < items.length - 1 && moveItem(realIdx, realIdx + 1)} disabled={realIdx === items.length - 1} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: realIdx === items.length - 1 ? '#333' : '#666', fontSize: '0.65rem', padding: '0.15rem 0.5rem', cursor: realIdx === items.length - 1 ? 'default' : 'pointer' }}>↓ Bajar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

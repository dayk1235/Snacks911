'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  active: boolean;
  createdAt: string;
}

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' as 'admin' | 'staff', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('snacks911_staff');
    if (stored) setStaff(JSON.parse(stored));
  }, []);

  const persist = useCallback((list: StaffMember[]) => {
    setStaff(list);
    try { localStorage.setItem('snacks911_staff', JSON.stringify(list)); } catch {}
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setError('Nombre y email son requeridos');
      return;
    }
    if (!editId && !form.password) {
      setError('Contraseña es requerida para nuevos usuarios');
      return;
    }

    setSaving(true);
    setError('');

    if (editId) {
      // Update existing
      setStaff(prev => prev.map(s =>
        s.id === editId
          ? { ...s, name: form.name, email: form.email, role: form.role }
          : s
      ));
    } else {
      const member: StaffMember = {
        id: `staff_${Date.now()}`,
        name: form.name,
        email: form.email,
        role: form.role,
        active: true,
        createdAt: new Date().toISOString(),
      };
      persist([...staff, member]);
    }

    setForm({ name: '', email: '', role: 'staff', password: '' });
    setShowForm(false);
    setEditId(null);
    setSaving(false);
  };

  const handleEdit = (member: StaffMember) => {
    setForm({ name: member.name, email: member.email, role: member.role, password: '' });
    setEditId(member.id);
    setShowForm(true);
  };

  const handleToggle = (id: string) => {
    persist(staff.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const handleDelete = (id: string) => {
    persist(staff.filter(s => s.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 1.5rem', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none', border: 'none', color: '#666',
              fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF4500'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
          >
            ← Volver
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
            Personal
          </h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', email: '', role: 'staff', password: '' }); }}
          style={{
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, #FF4500, #FF6500)',
            border: 'none', borderRadius: '10px',
            color: '#fff', fontWeight: 700, fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          + Nuevo
        </button>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Create/Edit Form */}
        {showForm && (
          <div style={{
            background: '#111', borderRadius: '16px',
            border: '1px solid rgba(255,69,0,0.15)',
            padding: '1.5rem', marginBottom: '1.5rem',
          }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              {editId ? 'Editar' : 'Nuevo miembro'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{
                  padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{
                  padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {!editId && (
                <input
                  placeholder="Contraseña"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{
                    padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                    color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              )}
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                style={{
                  padding: '0.7rem 0.9rem', background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>

              {error && (
                <div style={{ color: '#FF7040', fontSize: '0.8rem', background: 'rgba(255,69,0,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '0.7rem', background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                    border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700,
                    fontSize: '0.85rem', cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  {saving ? '...' : (editId ? 'Guardar' : 'Crear')}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                  style={{
                    flex: 1, padding: '0.7rem', background: 'none',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                    color: '#888', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff List */}
        {staff.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#444' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem', display: 'block' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            No hay miembros registrados
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {staff.map(member => (
            <div
              key={member.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem', borderRadius: '12px',
                background: member.active ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${member.active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`,
                opacity: member.active ? 1 : 0.5,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{member.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#555' }}>{member.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                  padding: '0.2rem 0.5rem', borderRadius: '6px',
                  background: member.role === 'admin' ? 'rgba(255,69,0,0.12)' : 'rgba(255,255,255,0.04)',
                  color: member.role === 'admin' ? '#FF4500' : '#888',
                  textTransform: 'uppercase',
                }}>
                  {member.role}
                </span>
                <button
                  onClick={() => handleToggle(member.id)}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: member.active ? '#FF4500' : 'rgba(255,255,255,0.1)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: '2px',
                    left: member.active ? '18px' : '2px',
                    transition: 'left 0.2s',
                  }} />
                </button>
                <button
                  onClick={() => handleEdit(member)}
                  style={{
                    background: 'none', border: 'none', color: '#666',
                    cursor: 'pointer', padding: '0.25rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  style={{
                    background: 'none', border: 'none', color: '#444',
                    cursor: 'pointer', padding: '0.25rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

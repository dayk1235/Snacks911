'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  role: 'admin' | 'staff';
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface ResetCode {
  employee_id: string;
  token: string;
  expires_at: string;
  used: boolean;
}

const inputStyle: React.CSSProperties = {
  padding: '0.7rem 0.9rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#fff', fontSize: '0.9rem',
  outline: 'none', boxSizing: 'border-box',
  width: '100%',
};

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [resetCodes, setResetCodes] = useState<ResetCode[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showCodes, setShowCodes] = useState(false);
  const [tab, setTab]             = useState<'staff' | 'codes'>('staff');

  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    role: 'staff' as 'admin' | 'staff',
    password: '',
  });

  // ── Cargar empleados ─────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      } else {
        setError('No se pudo cargar el personal');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Cargar códigos de reset pendientes ────────────────────────────────────
  const loadResetCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reset-codes');
      if (res.ok) {
        const data = await res.json();
        setResetCodes(data.codes || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadStaff();
    loadResetCodes();
  }, [loadStaff, loadResetCodes]);

  // ── Crear / Actualizar empleado ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.employeeId) {
      setError('Nombre y número de empleado son requeridos');
      return;
    }
    if (!editId && !form.password) {
      setError('La contraseña es requerida para nuevos empleados');
      return;
    }
    if (!editId && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/staff', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          employeeId: form.employeeId.trim().toLowerCase(),
          name: form.name.trim(),
          role: form.role,
          password: form.password || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al guardar');
        return;
      }

      setSuccess(editId ? '✅ Empleado actualizado' : '✅ Empleado creado correctamente');
      setShowForm(false);
      setEditId(null);
      setForm({ employeeId: '', name: '', role: 'staff', password: '' });
      await loadStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Activar / Desactivar ─────────────────────────────────────────────────
  const handleToggle = async (member: StaffMember) => {
    try {
      await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, active: !member.active }),
      });
      await loadStaff();
    } catch {}
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`¿Eliminar a ${member.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await fetch(`/api/admin/staff?id=${member.id}`, { method: 'DELETE' });
      await loadStaff();
    } catch {}
  };

  // ── Editar ───────────────────────────────────────────────────────────────
  const handleEdit = (member: StaffMember) => {
    setForm({ employeeId: member.employeeId, name: member.name, role: member.role, password: '' });
    setEditId(member.id);
    setShowForm(true);
    setError('');
  };

  const activeCount   = staff.filter(s => s.active).length;
  const pendingCodes  = resetCodes.filter(c => !c.used && new Date(c.expires_at) > new Date());

  return (
    <div style={{ minHeight: '100vh', background: '#080808' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 1.5rem', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF4500'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
          >← Volver</button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Personal</h1>
          <span style={{ fontSize: '0.72rem', color: '#555', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
            {activeCount} activos
          </span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ employeeId: '', name: '', role: 'staff', password: '' }); setError(''); }}
          style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #FF4500, #FF6500)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          + Nuevo empleado
        </button>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'staff', label: '👥 Empleados' },
            { key: 'codes', label: `🔑 Códigos de Reset${pendingCodes.length ? ` (${pendingCodes.length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{
                padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.82rem',
                background: tab === t.key ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.04)',
                color: tab === t.key ? '#FF4500' : '#666',
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
          <button onClick={() => { loadStaff(); loadResetCodes(); }} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#555', fontSize: '0.8rem', cursor: 'pointer', padding: '0.45rem 0.75rem' }}>
            ↻ Actualizar
          </button>
        </div>

        {/* ── Mensajes globales ──────────────────────────────── */}
        {success && (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#4ade80', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: EMPLEADOS                                        */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === 'staff' && (
          <>
            {/* Form */}
            {showForm && (
              <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,69,0,0.2)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {editId ? 'Editar empleado' : 'Nuevo empleado'}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Número de empleado *
                    </label>
                    <input
                      placeholder="ej: emp001, juan01"
                      value={form.employeeId}
                      disabled={!!editId}
                      onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                      style={{ ...inputStyle, opacity: editId ? 0.5 : 1 }}
                    />
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: '#444' }}>
                      Este será su usuario para iniciar sesión
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Nombre completo *
                    </label>
                    <input
                      placeholder="ej: Juan García"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {editId ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                    </label>
                    <input
                      placeholder={editId ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginBottom: '0.3rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Rol
                    </label>
                    <select
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                      style={{ ...inputStyle, background: '#1a1a1a' }}
                    >
                      <option value="staff">👤 Staff (solo pedidos)</option>
                      <option value="admin">👑 Admin (acceso total)</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.25)', borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#FF7040', fontSize: '0.82rem', marginTop: '0.75rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: saving ? 'rgba(255,69,0,0.5)' : 'linear-gradient(135deg, #FF4500, #FF6500)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Crear empleado')}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditId(null); setError(''); }} style={{ flex: 1, padding: '0.75rem', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#888', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Cargando...</div>
            ) : staff.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                No hay empleados registrados
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {staff.map(member => (
                  <div key={member.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.9rem 1.1rem', borderRadius: '12px',
                    background: member.active ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${member.active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'}`,
                    opacity: member.active ? 1 : 0.5,
                    transition: 'opacity 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: member.role === 'admin' ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem',
                      }}>
                        {member.role === 'admin' ? '👑' : '👤'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{member.name}</div>
                        <div style={{ fontSize: '0.73rem', color: '#555', display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: '#666', fontFamily: 'monospace' }}>#{member.employeeId}</span>
                          {member.lastLoginAt && (
                            <span>· Último acceso: {new Date(member.lastLoginAt).toLocaleDateString('es-MX')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                        padding: '0.2rem 0.55rem', borderRadius: '6px',
                        background: member.role === 'admin' ? 'rgba(255,69,0,0.12)' : 'rgba(255,255,255,0.04)',
                        color: member.role === 'admin' ? '#FF4500' : '#777',
                        textTransform: 'uppercase',
                      }}>{member.role}</span>

                      {/* Badge especial para admin maestro */}
                      {member.employeeId === 'admin001' && (
                        <span title="Admin maestro — protegido" style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                          padding: '0.2rem 0.55rem', borderRadius: '6px',
                          background: 'rgba(255,215,0,0.1)', color: '#FFD700',
                          border: '1px solid rgba(255,215,0,0.2)',
                        }}>👑 Maestro</span>
                      )}

                      {/* Toggle activo — oculto para admin maestro */}
                      {member.employeeId !== 'admin001' && (
                        <button onClick={() => handleToggle(member)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: member.active ? '#FF4500' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: member.active ? '18px' : '2px', transition: 'left 0.2s' }} />
                        </button>
                      )}

                      {/* Edit — siempre visible (puede cambiar nombre/contraseña) */}
                      <button onClick={() => handleEdit(member)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '0.25rem', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF4500'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>

                      {/* Delete — oculto para admin maestro */}
                      {member.employeeId !== 'admin001' && (
                        <button onClick={() => handleDelete(member)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '0.25rem', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF4500'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#333'}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: CÓDIGOS DE RESET                                 */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === 'codes' && (
          <div>
            <div style={{ background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.15)', borderRadius: '12px', padding: '1rem 1.2rem', marginBottom: '1.25rem', fontSize: '0.83rem', color: '#FFD700' }}>
              💡 Cuando un empleado solicita resetear su contraseña, el código de 6 dígitos aparece aquí. Díselo por teléfono o mensaje — expira en 15 minutos.
            </div>

            {pendingCodes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔑</div>
                No hay solicitudes de reset pendientes
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {resetCodes.map(code => {
                  const expired  = new Date(code.expires_at) < new Date();
                  const remaining = Math.max(0, Math.round((new Date(code.expires_at).getTime() - Date.now()) / 60000));
                  return (
                    <div key={code.employee_id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.2rem', borderRadius: '12px',
                      background: expired || code.used ? 'rgba(255,255,255,0.02)' : 'rgba(255,200,0,0.06)',
                      border: `1px solid ${expired || code.used ? 'rgba(255,255,255,0.05)' : 'rgba(255,200,0,0.2)'}`,
                      opacity: expired || code.used ? 0.5 : 1,
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                          Empleado: <span style={{ fontFamily: 'monospace', color: '#FF4500' }}>#{code.employee_id}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.2rem' }}>
                          {expired ? '⏰ Expirado' : code.used ? '✅ Ya usado' : `⏱ Expira en ${remaining} min`}
                        </div>
                      </div>
                      {!expired && !code.used && (
                        <div style={{
                          fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.25em',
                          color: '#FFD700', fontFamily: 'monospace',
                          background: 'rgba(255,200,0,0.1)', padding: '0.4rem 0.8rem',
                          borderRadius: '8px', border: '1px solid rgba(255,200,0,0.25)',
                        }}>
                          {code.token}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={loadResetCodes} style={{ marginTop: '1rem', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#555', fontSize: '0.8rem', cursor: 'pointer', padding: '0.5rem 1rem' }}>
              ↻ Refrescar códigos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

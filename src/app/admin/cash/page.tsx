'use client';

import { useEffect, useState } from 'react';
import { useCashStore } from '@/lib/cashStore';

const fmt = (n: number) => `$${n.toFixed(0)}`;

export default function CashPage() {
  const { session, movements, dailySales, salesByMethod, isLoading, error, fetchSession, openSession, closeSession, addMovement } = useCashStore();

  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [showClose, setShowClose] = useState(false);
  const [closeSummary, setCloseSummary] = useState<{ expected: number; diff: number } | null>(null);

  const [movType, setMovType] = useState<'IN' | 'OUT'>('IN');
  const [movAmount, setMovAmount] = useState('');
  const [movConcept, setMovConcept] = useState('');

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const movementsNet = movements.reduce((s, m) => s + (m.type === 'IN' ? m.amount : -m.amount), 0);

  const handleOpen = async () => {
    const amt = parseFloat(openingAmount);
    if (isNaN(amt) || amt < 0) return;
    await openSession(amt);
    setOpeningAmount('');
  };

  const handleClose = async () => {
    if (!session) return;
    const amt = parseFloat(closingAmount);
    if (isNaN(amt)) return;
    const result = await closeSession(session.id, amt, closeNotes);
    setCloseSummary(result);
    setShowClose(false);
  };

  const handleMovement = async () => {
    if (!session) return;
    const amt = parseFloat(movAmount);
    if (isNaN(amt) || amt <= 0 || !movConcept.trim()) return;
    await addMovement(session.id, movType, amt, movConcept);
    setMovAmount(''); setMovConcept('');
  };

  const s: React.CSSProperties = {};
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1.25rem' };
  const inp = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' as const };
  const btn = (color = '#FF4500') => ({ background: color, border: 'none', borderRadius: '9px', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>💰 Control de Caja</h1>
      <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        {session ? `Abierta ${new Date(session.opened_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Sin caja abierta'}
      </p>

      {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.82rem' }}>{error}</p>}

      {/* ── CLOSED STATE ── */}
      {!session && !closeSummary && (
        <div style={{ ...card, maxWidth: '380px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Abrir Caja</h2>
          <label style={{ fontSize: '0.78rem', color: '#888', display: 'block', marginBottom: '0.3rem' }}>Fondo inicial ($)</label>
          <input type="number" placeholder="0" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} style={{ ...inp, marginBottom: '0.75rem' }} />
          <button onClick={handleOpen} disabled={isLoading} style={btn('#22c55e')}>
            {isLoading ? 'Abriendo...' : '✅ Abrir Caja'}
          </button>
        </div>
      )}

      {/* ── CLOSE SUMMARY ── */}
      {closeSummary && (
        <div style={{ ...card, maxWidth: '420px', borderColor: closeSummary.diff >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>📋 Resumen de Cierre</h2>
          <Row label="Esperado" value={fmt(closeSummary.expected)} />
          <Row label="Real" value={fmt(parseFloat(closingAmount))} />
          <Row label="Diferencia" value={`${closeSummary.diff >= 0 ? '+' : ''}${fmt(closeSummary.diff)}`} color={closeSummary.diff >= 0 ? '#22c55e' : '#ef4444'} />
          <button onClick={() => { setCloseSummary(null); fetchSession(); }} style={{ ...btn('#555'), marginTop: '1rem' }}>Cerrar</button>
        </div>
      )}

      {/* ── OPEN SESSION ── */}
      {session && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* Stats */}
          <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <StatCard label="Ventas Hoy" value={fmt(dailySales)} color="#22c55e" />
            <StatCard label="Efectivo" value={fmt(salesByMethod['CASH'] || 0)} color="#f59e0b" />
            <StatCard label="Tarjeta" value={fmt(salesByMethod['CARD'] || 0)} color="#3b82f6" />
            <StatCard label="Transfer" value={fmt(salesByMethod['TRANSFER'] || 0)} color="#a78bfa" />
          </div>

          {/* Add movement */}
          <div style={card}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.9rem' }}>➕ Entrada / Salida</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {(['IN', 'OUT'] as const).map(t => (
                <button key={t} onClick={() => setMovType(t)} style={{ padding: '0.5rem', borderRadius: '8px', border: `1px solid ${movType === t ? (t === 'IN' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') : 'rgba(255,255,255,0.08)'}`, background: movType === t ? (t === 'IN' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(255,255,255,0.03)', color: movType === t ? (t === 'IN' ? '#22c55e' : '#ef4444') : '#666', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                  {t === 'IN' ? '📥 Entrada' : '📤 Salida'}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Monto $" value={movAmount} onChange={e => setMovAmount(e.target.value)} style={{ ...inp, marginBottom: '0.5rem' }} />
            <input type="text" placeholder="Concepto" value={movConcept} onChange={e => setMovConcept(e.target.value)} style={{ ...inp, marginBottom: '0.75rem' }} />
            <button onClick={handleMovement} disabled={isLoading} style={btn(movType === 'IN' ? '#22c55e' : '#ef4444')}>
              Registrar
            </button>
          </div>

          {/* Movements list */}
          <div style={card}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.9rem' }}>📋 Movimientos ({movements.length})</h2>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {movements.length === 0 && <p style={{ color: '#444', fontSize: '0.78rem' }}>Sin movimientos aún.</p>}
              {movements.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: m.type === 'IN' ? '#22c55e' : '#ef4444', marginRight: '0.4rem' }}>{m.type === 'IN' ? '↑' : '↓'}</span>
                    <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{m.concept}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: m.type === 'IN' ? '#22c55e' : '#ef4444' }}>
                    {m.type === 'IN' ? '+' : '-'}{fmt(m.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.75rem', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>Neto movimientos</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: movementsNet >= 0 ? '#22c55e' : '#ef4444' }}>{movementsNet >= 0 ? '+' : ''}{fmt(movementsNet)}</span>
            </div>
          </div>

          {/* Close session */}
          <div style={{ gridColumn: '1/-1' }}>
            {!showClose ? (
              <button onClick={() => setShowClose(true)} style={{ ...btn('#ef4444'), opacity: 0.85 }}>🔒 Cerrar Caja</button>
            ) : (
              <div style={{ ...card, maxWidth: '420px', borderColor: 'rgba(239,68,68,0.3)' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.9rem' }}>Confirmar Cierre</h2>
                <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.3rem' }}>Dinero contado ($)</label>
                <input type="number" placeholder="0" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} style={{ ...inp, marginBottom: '0.5rem' }} />
                <input type="text" placeholder="Notas (opcional)" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} style={{ ...inp, marginBottom: '0.75rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleClose} disabled={isLoading} style={btn('#ef4444')}>Confirmar Cierre</button>
                  <button onClick={() => setShowClose(false)} style={{ ...btn('#333'), color: '#aaa' }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.78rem', color: '#666' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

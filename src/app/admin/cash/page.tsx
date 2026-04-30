'use client';

/**
 * admin/cash/page.tsx — High-efficiency Cash Control.
 * 
 * Optimized for quick cash entry/exit management.
 * Rule: BIG balance display, only 2 primary actions, last 24h visibility.
 */

import { useEffect, useState, useMemo } from 'react';
import { useCashStore } from '@/lib/cashStore';

const fmt = (n: number) => `$${n.toFixed(0)}`;

export default function CashPage() {
  const { 
    session, movements, salesByMethod, isLoading, error,
    fetchSession, addMovement, openSession 
  } = useCashStore();

  const [movType, setMovType] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  
  // For opening session
  const [openingAmount, setOpeningAmount] = useState('');

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Calculations
  const movementsNet = useMemo(() => 
    movements.reduce((s, m) => s + (m.type === 'IN' ? m.amount : -m.amount), 0),
  [movements]);

  const currentBalance = useMemo(() => 
    (session?.opening_amount || 0) + movementsNet + (salesByMethod['CASH'] || 0),
  [session, movementsNet, salesByMethod]);

  const last24hMovements = useMemo(() => 
    movements.filter(m => (Date.now() - new Date(m.created_at).getTime()) < 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [movements]);

  const handleRegister = async () => {
    if (!session) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !concept.trim()) return;
    try {
      await addMovement(session.id, movType, amt, concept);
      setAmount(''); setConcept('');
    } catch (e) {}
  };

  const handleOpenSession = async () => {
    const amt = parseFloat(openingAmount);
    if (isNaN(amt) || amt < 0) return;
    try {
      await openSession(amt, 'Admin');
      setOpeningAmount('');
    } catch (e) {}
  };

  return (
    <div style={{ 
      minHeight: '100vh', background: '#000', color: '#fff', 
      fontFamily: 'system-ui, sans-serif', padding: '1.5rem', paddingBottom: '100px'
    }}>
      
      {/* ⚠️ ERROR BANNER */}
      {error && (
        <div style={{ 
          background: '#ef4444', color: '#fff', padding: '1rem', 
          textAlign: 'center', fontSize: '0.9rem', fontWeight: 700,
          borderRadius: '12px', marginBottom: '1.5rem'
        }}>
          ❌ {error}
        </div>
      )}

      {!session ? (
        /* 🔓 OPEN SESSION VIEW */
        <div style={{ 
          maxWidth: '400px', margin: '4rem auto', textAlign: 'center',
          background: '#111', padding: '2.5rem', borderRadius: '24px', border: '1px solid #222'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🔐</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Caja Cerrada</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Ingresa el monto inicial para abrir el turno.</p>
          
          <input 
            type="number" placeholder="Monto Inicial $" 
            value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
            style={{ 
              width: '100%', padding: '1.25rem', background: '#000', border: '1px solid #333',
              borderRadius: '14px', color: '#fff', fontSize: '1.5rem', fontWeight: 900,
              textAlign: 'center', marginBottom: '1.5rem', outline: 'none'
            }}
          />
          
          <button 
            onClick={handleOpenSession}
            disabled={isLoading || !openingAmount}
            style={{ 
              width: '100%', padding: '1.25rem', borderRadius: '14px', border: 'none',
              background: '#22c55e', color: '#fff', fontWeight: 900, fontSize: '1.1rem',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            {isLoading ? 'ABRIENDO...' : 'ABRIR CAJA 🚀'}
          </button>
        </div>
      ) : (
        /* 💰 ACTIVE SESSION VIEW */
        <>
          {/* 💰 BIG BALANCE DISPLAY */}
          <div style={{ 
            textAlign: 'center', padding: '3rem 1rem', 
            background: 'linear-gradient(180deg, #111 0%, #000 100%)',
            borderRadius: '24px', border: '1px solid #222', marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              SALDO ACTUAL EN CAJA
            </div>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#22c55e', letterSpacing: '-0.02em' }}>
              {fmt(currentBalance)}
            </div>
          </div>

          {/* ➕ PRIMARY ACTIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              onClick={() => setMovType('IN')}
              style={{ 
                padding: '2rem 1rem', borderRadius: '20px', border: 'none',
                background: movType === 'IN' ? '#22c55e' : '#111',
                color: movType === 'IN' ? '#fff' : '#444',
                fontWeight: 900, fontSize: '1.1rem', transition: 'all 0.2s'
              }}
            >
              📥 ENTRADA
            </button>
            <button 
              onClick={() => setMovType('OUT')}
              style={{ 
                padding: '2rem 1rem', borderRadius: '20px', border: 'none',
                background: movType === 'OUT' ? '#ef4444' : '#111',
                color: movType === 'OUT' ? '#fff' : '#444',
                fontWeight: 900, fontSize: '1.1rem', transition: 'all 0.2s'
              }}
            >
              📤 SALIDA
            </button>
          </div>

          {/* 📝 REGISTRATION FORM */}
          <div style={{ 
            background: '#111', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem', 
            border: '1px solid #222', opacity: isLoading ? 0.7 : 1
          }}>
            <input 
              type="number" placeholder="Monto $" 
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{ 
                width: '100%', padding: '1.25rem', background: '#000', border: '1px solid #333',
                borderRadius: '14px', color: '#fff', fontSize: '1.2rem', fontWeight: 700,
                marginBottom: '0.75rem', outline: 'none'
              }}
            />
            <input 
              type="text" placeholder="Concepto de la operación" 
              value={concept} onChange={e => setConcept(e.target.value)}
              style={{ 
                width: '100%', padding: '1.25rem', background: '#000', border: '1px solid #333',
                borderRadius: '14px', color: '#fff', fontSize: '1rem',
                marginBottom: '1.25rem', outline: 'none'
              }}
            />
            <button 
              onClick={handleRegister}
              disabled={!amount || !concept || isLoading}
              style={{ 
                width: '100%', padding: '1.25rem', borderRadius: '14px', border: 'none',
                background: movType === 'IN' ? '#22c55e' : '#ef4444',
                color: '#fff', fontWeight: 900, fontSize: '1.1rem',
                opacity: (isLoading || !amount || !concept) ? 0.5 : 1, cursor: 'pointer'
              }}
            >
              {isLoading ? 'PROCESANDO...' : `CONFIRMAR ${movType === 'IN' ? 'ENTRADA' : 'SALIDA'}`}
            </button>
          </div>

          {/* 📋 RECENT MOVEMENTS (LAST 24H) */}
          <div style={{ padding: '0 0.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#444', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '1rem' }}>
              ÚLTIMAS 24 HORAS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {last24hMovements.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#222', fontSize: '0.9rem' }}>
                  Sin movimientos recientes.
                </div>
              ) : (
                last24hMovements.map(m => (
                  <div key={m.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem', background: '#0a0a0a', border: '1px solid #111', borderRadius: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ddd' }}>{m.concept}</div>
                      <div style={{ fontSize: '0.65rem', color: '#444', marginTop: '3px' }}>
                        {new Date(m.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', fontWeight: 900, 
                      color: m.type === 'IN' ? '#22c55e' : '#ef4444' 
                    }}>
                      {m.type === 'IN' ? '+' : '-'}{fmt(m.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        body { background: #000; margin: 0; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        button:active { transform: scale(0.98); transition: transform 0.1s; }
      `}</style>
    </div>
  );
}

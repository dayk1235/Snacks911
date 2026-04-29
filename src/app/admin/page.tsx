'use client';

/**
 * src/app/admin/page.tsx — Executive Business Dashboard.
 * 
 * Part of Phase 2: Analytics & Revenue Intelligence.
 * Simplified for maximum focus on KPIs and critical operations.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getDailyRevenue, getConversionRate, getUpsellRate } from '@/core/revenueMetrics';
import { checkAlerts, type Alert } from '@/core/alertEngine';
import { useStoreSettings } from '@/lib/storeSettingsStore';

const fmt = (n: number) => `$${n.toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function AdminDashboard() {
  const router = useRouter();
  const { isOpen: storeOpen, toggleStore, fetchSettings } = useStoreSettings();

  const [metrics, setMetrics] = useState({ revenue: 0, conversion: 0, upsell: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const [revenue, conversion, upsell, activeAlerts] = await Promise.all([
        getDailyRevenue(now),
        getConversionRate(now),
        getUpsellRate(now),
        checkAlerts()
      ]);

      setMetrics({ revenue, conversion, upsell });
      setAlerts(activeAlerts);
      setLoading(false);
    }
    load();
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '1.5rem' }}>
      
      {/* 🚀 HEADER & STATUS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>ADMIN DASHBOARD</h1>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Resumen ejecutivo en tiempo real</div>
        </div>
        <button 
          onClick={toggleStore}
          style={{ 
            padding: '0.75rem 1.5rem', borderRadius: '50px', border: 'none',
            background: storeOpen ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: storeOpen ? '#22c55e' : '#ef4444',
            fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
          }}
        >
          {storeOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}
        </button>
      </div>

      {/* 💰 MAIN REVENUE CARD */}
      <div style={{ 
        background: 'linear-gradient(180deg, #111 0%, #000 100%)',
        border: '1px solid #222', borderRadius: '24px', padding: '2.5rem',
        textAlign: 'center', marginBottom: '1.5rem'
      }}>
        <div style={{ fontSize: '0.85rem', color: '#444', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          VENTAS DE HOY
        </div>
        <div style={{ fontSize: '4rem', fontWeight: 900, color: '#FF4500' }}>
          {loading ? '...' : fmt(metrics.revenue)}
        </div>
      </div>

      {/* 🚨 CRITICAL ALERTS */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{ 
              background: alert.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${alert.severity === 'critical' ? '#ef4444' : '#f59e0b'}44`,
              padding: '1rem 1.5rem', borderRadius: '14px', color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
              fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <span>{alert.severity === 'critical' ? '🔴' : '⚠️'}</span>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* 📊 CORE KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '20px', border: '1px solid #222' }}>
          <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: 800, marginBottom: '0.5rem' }}>CONVERSIÓN</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{loading ? '...' : pct(metrics.conversion)}</div>
        </div>
        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '20px', border: '1px solid #222' }}>
          <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: 800, marginBottom: '0.5rem' }}>ACEPTACIÓN UPSELL</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{loading ? '...' : pct(metrics.upsell)}</div>
        </div>
      </div>

      {/* 🎯 PRIMARY ACTIONS (THE 3 BIG BUTTONS) */}
      <h3 style={{ fontSize: '0.8rem', color: '#333', fontWeight: 900, marginBottom: '1rem', letterSpacing: '0.1em' }}>ACCIONES PRINCIPALES</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => router.push('/admin/pos')}
          style={{ 
            padding: '2.5rem', borderRadius: '20px', border: 'none',
            background: 'linear-gradient(135deg, #111, #080808)',
            border: '1px solid #222', color: '#fff', fontWeight: 900, fontSize: '1.2rem',
            cursor: 'pointer', textAlign: 'left'
          }}
        >
          🖥️ PUNTO DE VENTA
        </button>
        <button 
          onClick={() => router.push('/admin/cash')}
          style={{ 
            padding: '2.5rem', borderRadius: '20px', border: 'none',
            background: 'linear-gradient(135deg, #111, #080808)',
            border: '1px solid #222', color: '#fff', fontWeight: 900, fontSize: '1.2rem',
            cursor: 'pointer', textAlign: 'left'
          }}
        >
          💵 CONTROL DE CAJA
        </button>
        <button 
          onClick={() => router.push('/admin/orders')}
          style={{ 
            padding: '2.5rem', borderRadius: '20px', border: 'none',
            background: 'linear-gradient(135deg, #111, #080808)',
            border: '1px solid #222', color: '#fff', fontWeight: 900, fontSize: '1.2rem',
            cursor: 'pointer', textAlign: 'left'
          }}
        >
          📦 PEDIDOS ACTIVOS
        </button>
      </div>

      <style jsx global>{`
        body { background: #000; margin: 0; }
        button:active { transform: scale(0.97); transition: transform 0.1s; }
      `}</style>
    </div>
  );
}

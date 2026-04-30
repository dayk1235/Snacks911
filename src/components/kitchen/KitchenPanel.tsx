'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { playOrderNotification } from '@/lib/sound';

export default function KitchenPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const lastSoundAtRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data);
      });

    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const isTabActive =
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible' &&
            (document.hasFocus?.() ?? true);
          const now = Date.now();
          if (isTabActive && now - lastSoundAtRef.current >= 3000) {
            lastSoundAtRef.current = now;
            playOrderNotification();
          }
          setOrders((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((prev) => prev.map((o) => (o?.id === payload.new?.id ? payload.new : o)));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const pendingOrders = orders.filter((o) => o?.status === 'pending');
  const preparingOrders = orders.filter((o) => o?.status === 'preparing');
  const readyOrders = orders.filter((o) => o?.status === 'ready');

  const renderOrder = (o: any) => {
    const time = o?.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const status = String(o?.status ?? '');
    const label =
      status === 'pending' ? 'Preparar' :
      status === 'preparing' ? 'Listo' :
      status === 'ready' ? 'Entregar' :
      '';

    const isDelayed = o?.created_at && (currentTime - new Date(o.created_at).getTime() > 10 * 60 * 1000);

    return (
      <div
        key={o?.id ?? `${o?.created_at ?? ''}-${Math.random()}`}
        style={{
          background: '#fff',
          border: isDelayed ? '2px solid #ef4444' : '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: isDelayed ? '0 0 12px rgba(239,68,68,0.4)' : '0 2px 8px rgba(0,0,0,0.05)',
          color: '#111827',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: isDelayed ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{o?.customer_name || 'Cliente'}</span>
          <span style={{ fontWeight: 800, color: '#FF4500' }}>${o?.total ?? 0}</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: isDelayed ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
          {time} {isDelayed && ' (Retrasado)'}
        </div>
        
        {label && (
          <button
            type="button"
            onClick={() => {}}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              background: '#111827',
              color: '#fff',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Pending Column */}
        <div style={{ background: '#fef08a', padding: '20px', borderRadius: '16px' }}>
          <h2 style={{ color: '#854d0e', fontWeight: 800, marginBottom: '16px', fontSize: '1.25rem' }}>Pendientes ({pendingOrders.length})</h2>
          {pendingOrders.map(renderOrder)}
        </div>

        {/* Preparing Column */}
        <div style={{ background: '#bae6fd', padding: '20px', borderRadius: '16px' }}>
          <h2 style={{ color: '#075985', fontWeight: 800, marginBottom: '16px', fontSize: '1.25rem' }}>Preparando ({preparingOrders.length})</h2>
          {preparingOrders.map(renderOrder)}
        </div>

        {/* Ready Column */}
        <div style={{ background: '#bbf7d0', padding: '20px', borderRadius: '16px' }}>
          <h2 style={{ color: '#166534', fontWeight: 800, marginBottom: '16px', fontSize: '1.25rem' }}>Listos ({readyOrders.length})</h2>
          {readyOrders.map(renderOrder)}
        </div>

      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/db.client';
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
          background: 'rgba(255, 255, 255, 0.03)',
          border: isDelayed ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: isDelayed ? '0 0 20px rgba(239,68,68,0.2)' : '0 4px 12px rgba(0,0,0,0.2)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backdropFilter: 'blur(10px)',
          animation: isDelayed ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>{o?.customer_name || 'Cliente'}</span>
          <span style={{ fontWeight: 900, color: '#FF4500', fontSize: '1.1rem' }}>${o?.total ?? 0}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: isDelayed ? '#ef4444' : 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {time} {isDelayed && ' • RETRASADO'}
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
              border: 'none',
              background: isDelayed ? '#ef4444' : '#FF4500',
              color: '#000',
              fontWeight: 900,
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {label}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', padding: '32px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', height: 'calc(100vh - 64px)' }}>
        
        {/* Pending Column */}
        <div style={{ background: 'rgba(254, 240, 138, 0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(254, 240, 138, 0.1)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: '#fef08a', fontWeight: 900, marginBottom: '20px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', justifyContent: 'space-between' }}>
            <span>Pendientes</span>
            <span style={{ opacity: 0.5 }}>{pendingOrders.length}</span>
          </h2>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }} className="no-scrollbar">
            {pendingOrders.map(renderOrder)}
          </div>
        </div>

        {/* Preparing Column */}
        <div style={{ background: 'rgba(186, 230, 253, 0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(186, 230, 253, 0.1)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: '#bae6fd', fontWeight: 900, marginBottom: '20px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', justifyContent: 'space-between' }}>
            <span>Preparando</span>
            <span style={{ opacity: 0.5 }}>{preparingOrders.length}</span>
          </h2>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }} className="no-scrollbar">
            {preparingOrders.map(renderOrder)}
          </div>
        </div>

        {/* Ready Column */}
        <div style={{ background: 'rgba(187, 247, 208, 0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(187, 247, 208, 0.1)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: '#bbf7d0', fontWeight: 900, marginBottom: '20px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', justifyContent: 'space-between' }}>
            <span>Listos</span>
            <span style={{ opacity: 0.5 }}>{readyOrders.length}</span>
          </h2>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }} className="no-scrollbar">
            {readyOrders.map(renderOrder)}
          </div>
        </div>

      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

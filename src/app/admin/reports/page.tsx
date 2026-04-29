'use client';

import { useState } from 'react';
import { AdminStore } from '@/lib/adminStore';

const CARD: React.CSSProperties = {
  background: '#111',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '2rem',
  textAlign: 'center'
};

const BUTTON = (color: string) => ({
  background: color,
  color: '#fff',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  margin: '0 auto'
} as React.CSSProperties);

export default function ReportsPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadCSV = (filename: string, data: any[]) => {
    if (data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => 
        typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${String(val).replace(/"/g, '""')}"`
      ).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportOrders = async () => {
    setExporting('orders');
    try {
      const orders = await AdminStore.getOrders();
      downloadCSV(`orders_${new Date().toISOString().slice(0,10)}.csv`, orders);
    } finally { setExporting(null); }
  };

  const exportLogs = async () => {
    setExporting('logs');
    try {
      const logs = await AdminStore.getAuditLogs();
      downloadCSV(`audit_logs_${new Date().toISOString().slice(0,10)}.csv`, logs);
    } finally { setExporting(null); }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>📊 Reportes y Datos</h1>
        <p style={{ color: '#888' }}>Exporta la información de tu negocio para análisis externo</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={CARD}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ marginBottom: '1rem' }}>Historial de Órdenes</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Descarga todas las órdenes registradas, incluyendo totales, clientes y estados.
          </p>
          <button 
            onClick={exportOrders} 
            disabled={exporting === 'orders'}
            style={BUTTON(exporting === 'orders' ? '#444' : '#FF4500')}
          >
            {exporting === 'orders' ? 'Generando...' : '📥 Descargar CSV'}
          </button>
        </div>

        <div style={CARD}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕵️</div>
          <h3 style={{ marginBottom: '1rem' }}>Logs de Auditoría</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Exporta el registro de cambios para revisiones de seguridad y cumplimiento.
          </p>
          <button 
            onClick={exportLogs} 
            disabled={exporting === 'logs'}
            style={BUTTON(exporting === 'logs' ? '#444' : '#3b82f6')}
          >
            {exporting === 'logs' ? 'Generando...' : '📥 Descargar CSV'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '4rem', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.1)' }}>
        <h4 style={{ color: '#FFB800', marginBottom: '0.5rem' }}>💡 Tip Profesional</h4>
        <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.5' }}>
          Puedes importar estos archivos CSV directamente en Google Sheets o Excel para crear tus propios gráficos de rendimiento y KPIs personalizados.
        </p>
      </div>
    </div>
  );
}

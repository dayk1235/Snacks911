'use client';

import { useEffect, useState } from 'react';
import { AdminStore } from '@/lib/adminStore';
import { AuditLog } from '@/lib/adminTypes';

const CARD: React.CSSProperties = {
  background: '#111',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '1.5rem',
};

const BADGE = (color: string) => ({
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 'bold',
  background: `${color}22`,
  color: color,
  border: `1px solid ${color}44`,
} as React.CSSProperties);

function formatAuditDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await AdminStore.getAuditLogs();
      setLogs(data);
      setLoading(false);
    };
    load();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return '#22c55e';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      default: return '#888';
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>🕵️ Auditoría de Cambios</h1>
          <p style={{ color: '#888', marginTop: '0.5rem' }}>Registro histórico de todas las operaciones críticas</p>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>Cargando logs...</div>
      ) : (
        <div style={CARD}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: '0.9rem' }}>
                <th style={{ padding: '1rem' }}>Fecha</th>
                <th style={{ padding: '1rem' }}>Usuario</th>
                <th style={{ padding: '1rem' }}>Tabla</th>
                <th style={{ padding: '1rem' }}>Acción</th>
                <th style={{ padding: '1rem' }}>ID Registro</th>
                <th style={{ padding: '1rem' }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.95rem' }}>
                  <td style={{ padding: '1rem' }}>
                    {formatAuditDate(log.createdAt)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#bbb' }}>👤 {log.changedBy}</span>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#facc15' }}>
                    {log.tableName}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={BADGE(getActionColor(log.action))}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#666', fontSize: '0.8rem' }}>
                    {log.recordId}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => setSelectedLog(log)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Ver Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#555' }}>No hay registros de auditoría aún.</div>
          )}
        </div>
      )}

      {/* Modal Detalle */}
      {selectedLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '2rem'
        }}>
          <div style={{ ...CARD, width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Detalle del Cambio</h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Anterior</h4>
                <pre style={{ background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.oldData, null, 2)}
                </pre>
              </div>
              <div>
                <h4 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>Nuevo</h4>
                <pre style={{ background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.newData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

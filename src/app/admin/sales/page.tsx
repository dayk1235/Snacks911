'use client';

import { useEffect, useState } from 'react';
import { AdminStore } from '@/lib/adminStore';
import { SaleRecord } from '@/lib/adminTypes';

function BarChart({ data }: { data: SaleRecord[] }) {
  const max  = Math.max(...data.map(d => d.total), 1);
  const W    = 620;
  const H    = 170;
  const pad  = 10;
  const n    = data.length;
  const slot = (W - pad * 2) / n;
  const bw   = Math.floor(slot * 0.55);

  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
  };

  return (
    <svg viewBox={`0 0 ${W} ${H + 44}`} style={{ width: '100%', display: 'block' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <line key={pct} x1={pad} x2={W - pad} y1={H - pct * H} y2={H - pct * H}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}

      {data.map((d, i) => {
        const bh  = Math.max(4, Math.round((d.total / max) * (H - 12)));
        const x   = pad + i * slot + (slot - bw) / 2;
        const y   = H - bh;
        const isToday = i === data.length - 1;

        return (
          <g key={d.date}>
            <rect x={x} y={y} width={bw} height={bh}
              fill={isToday ? '#FFB800' : '#FF4500'}
              rx={5} opacity={isToday ? 1 : 0.75}
            />
            {/* Value label */}
            <text x={x + bw / 2} y={y - 5}
              textAnchor="middle" fontSize="9.5" fill={isToday ? '#FFB800' : '#FF4500'} fontWeight="700"
            >
              ${(d.total / 1000).toFixed(1)}k
            </text>
            {/* Date label */}
            <text x={x + bw / 2} y={H + 18}
              textAnchor="middle" fontSize="9.5" fill="#555"
            >
              {fmtDate(d.date)}
            </text>
            {/* Order count */}
            <text x={x + bw / 2} y={H + 32}
              textAnchor="middle" fontSize="9" fill="#333"
            >
              {d.orderCount} ped.
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);

  useEffect(() => {
    AdminStore.getSales().then(setSales);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayRec  = sales.find(s => s.date === today);
  const weekTotal = sales.slice(-7).reduce((s, r) => s + r.total, 0);
  const weekOrders = sales.slice(-7).reduce((s, r) => s + r.orderCount, 0);
  const bestDay   = [...sales].sort((a, b) => b.total - a.total)[0];
  const avgTicket = weekOrders > 0 ? Math.round(weekTotal / weekOrders) : 0;

  const CARD: React.CSSProperties = {
    background: '#111', borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem',
  };

  const kpis = [
    { label: 'Ventas hoy',       value: `$${(todayRec?.total ?? 0).toLocaleString()}`,  icon: '📅', color: '#FFB800', sub: `${todayRec?.orderCount ?? 0} pedidos` },
    { label: 'Ventas semana',    value: `$${weekTotal.toLocaleString()}`,                icon: '📊', color: '#FF4500', sub: `${weekOrders} pedidos totales`       },
    { label: 'Ticket promedio',  value: `$${avgTicket}`,                                 icon: '🎯', color: '#22c55e', sub: 'Últimos 7 días'                       },
    { label: 'Mejor día',        value: bestDay ? `$${bestDay.total.toLocaleString()}` : '—', icon: '🏆', color: '#818cf8', sub: bestDay?.date ?? '' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>💰 Ventas</h1>
        <p style={{ margin: '0.3rem 0 0', color: '#555', fontSize: '0.875rem' }}>Resumen de los últimos 7 días</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={CARD}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {kpi.icon} {kpi.label}
            </p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#444' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ ...CARD, marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
          📈 Ventas diarias
          <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem', color: '#555', fontWeight: 400 }}>
            🟡 Hoy &nbsp; 🟠 Días anteriores
          </span>
        </h2>
        {sales.length > 0 ? <BarChart data={sales} /> : (
          <p style={{ color: '#333', textAlign: 'center', padding: '3rem 0' }}>Sin datos de ventas</p>
        )}
      </div>

      {/* Daily breakdown table */}
      <div style={CARD}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>📋 Detalle por día</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Fecha', 'Pedidos', 'Total', 'Promedio'].map(h => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...sales].reverse().map(s => {
              const avg = s.orderCount > 0 ? Math.round(s.total / s.orderCount) : 0;
              const isToday = s.date === today;
              return (
                <tr key={s.date} style={{ background: isToday ? 'rgba(255,184,0,0.04)' : 'transparent' }}>
                  <td style={{ padding: '0.7rem 0.75rem', fontSize: '0.85rem', color: isToday ? '#FFB800' : '#ccc', fontWeight: isToday ? 700 : 400, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {isToday && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#FFB800', fontWeight: 700 }}>HOY</span>}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', fontSize: '0.85rem', color: '#888', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{s.orderCount}</td>
                  <td style={{ padding: '0.7rem 0.75rem', fontSize: '0.9rem', color: '#FF4500', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>${s.total.toLocaleString()}</td>
                  <td style={{ padding: '0.7rem 0.75rem', fontSize: '0.85rem', color: '#555', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>${avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

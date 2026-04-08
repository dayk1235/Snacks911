'use client';

import { useEffect, useState } from 'react';
import { AdminStore } from '@/lib/adminStore';
import { BusinessSettings, DayHours } from '@/lib/adminTypes';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const CARD: React.CSSProperties = {
  background: '#111', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem', marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px',
  color: '#fff', fontSize: '0.9rem', outline: 'none',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    setSettings(AdminStore.getSettings());
  }, []);

  if (!settings) return null;

  const update = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => {
    setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const updateHours = (day: string, patch: Partial<DayHours>) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        openHours: {
          ...prev.openHours,
          [day]: { ...prev.openHours[day], ...patch },
        },
      };
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!settings) return;
    AdminStore.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>⚙️ Configuración</h1>
        <p style={{ margin: '0.3rem 0 0', color: '#555', fontSize: '0.875rem' }}>Ajustes generales del negocio</p>
      </div>

      {/* Big accepting toggle */}
      <div style={{
        ...CARD,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: settings.acceptingOrders ? 'rgba(34,197,94,0.06)' : 'rgba(255,69,0,0.06)',
        border: `1px solid ${settings.acceptingOrders ? 'rgba(34,197,94,0.2)' : 'rgba(255,69,0,0.2)'}`,
      }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
            {settings.acceptingOrders ? '🟢 Aceptando pedidos' : '🔴 Pedidos desactivados'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#555' }}>
            {settings.acceptingOrders
              ? 'El negocio está abierto. Los clientes pueden hacer pedidos.'
              : 'El negocio está cerrado. Los clientes no pueden hacer pedidos.'}
          </p>
        </div>
        <button
          onClick={() => update('acceptingOrders', !settings.acceptingOrders)}
          style={{
            width: '56px', height: '30px', borderRadius: '15px', flexShrink: 0,
            background: settings.acceptingOrders ? '#22c55e' : '#333',
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'background 0.25s', marginLeft: '1rem',
          }}
        >
          <span style={{
            position: 'absolute', top: '4px',
            left: settings.acceptingOrders ? '28px' : '4px',
            width: '22px', height: '22px',
            background: '#fff', borderRadius: '50%',
            transition: 'left 0.25s', display: 'block',
          }} />
        </button>
      </div>

      {/* Operations */}
      <div style={CARD}>
        <h2 style={{ margin: '0 0 1.25rem', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>📋 Operaciones</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⏱ Tiempo de preparación (min)
            </span>
            <input
              type="number" min={5} max={120}
              value={settings.prepTime}
              onChange={e => update('prepTime', +e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📱 WhatsApp (con código de país)
            </span>
            <input
              type="text"
              value={settings.whatsappNumber}
              onChange={e => update('whatsappNumber', e.target.value)}
              style={inputStyle}
              placeholder="5215551234567"
            />
          </label>
        </div>
      </div>

      {/* Business hours */}
      <div style={CARD}>
        <h2 style={{ margin: '0 0 1.25rem', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>🕐 Horarios</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {DAYS.map(day => {
            const hours: DayHours = settings.openHours[day] ?? { open: false, from: '13:00', to: '22:00' };
            return (
              <div key={day} style={{
                display: 'grid', gridTemplateColumns: '110px auto 1fr 1fr',
                alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: '10px',
                background: hours.open ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: '0.875rem', color: hours.open ? '#ccc' : '#444', fontWeight: 600 }}>
                  {day}
                </span>

                {/* toggle */}
                <button
                  onClick={() => updateHours(day, { open: !hours.open })}
                  style={{
                    width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
                    background: hours.open ? '#22c55e' : '#333',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: hours.open ? '20px' : '3px',
                    width: '16px', height: '16px',
                    background: '#fff', borderRadius: '50%',
                    transition: 'left 0.2s', display: 'block',
                  }} />
                </button>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: hours.open ? 1 : 0.3 }}>
                  <span style={{ fontSize: '0.72rem', color: '#555', whiteSpace: 'nowrap' }}>Abre:</span>
                  <input
                    type="time" value={hours.from}
                    disabled={!hours.open}
                    onChange={e => updateHours(day, { from: e.target.value })}
                    style={{ ...inputStyle, flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem', colorScheme: 'dark' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: hours.open ? 1 : 0.3 }}>
                  <span style={{ fontSize: '0.72rem', color: '#555', whiteSpace: 'nowrap' }}>Cierra:</span>
                  <input
                    type="time" value={hours.to}
                    disabled={!hours.open}
                    onChange={e => updateHours(day, { to: e.target.value })}
                    style={{ ...inputStyle, flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem', colorScheme: 'dark' }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '0.9rem 2.5rem',
            background: saved ? '#22c55e' : 'linear-gradient(135deg,#FF4500,#FF6500)',
            border: 'none', borderRadius: '12px',
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            cursor: 'pointer', transition: 'background 0.3s',
            boxShadow: '0 0 20px rgba(255,69,0,0.2)',
          }}
        >
          {saved ? '✅ Guardado' : '💾 Guardar cambios'}
        </button>
        {saved && (
          <span style={{ fontSize: '0.85rem', color: '#22c55e' }}>
            Configuración guardada exitosamente
          </span>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { AdminStore } from '@/lib/adminStore';
import type { BusinessSettings, DayHours, DeliveryApp, HeroStat } from '@/lib/adminTypes';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const CARD: React.CSSProperties = {
  background: '#111', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem', marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px',
  color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem', color: '#555', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem',
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 1.25rem', color: '#fff', fontSize: '1rem', fontWeight: 700,
};

const APP_ICONS: Record<string, { icon: string; color: string }> = {
  'Uber Eats': { icon: '🟢', color: '#06C167' },
  'Rappi':     { icon: '🟠', color: '#FF441A' },
  'DiDi Food': { icon: '🟡', color: '#FF6E20' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    AdminStore.getSettings().then(setSettings);
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
        openHours: { ...prev.openHours, [day]: { ...prev.openHours[day], ...patch } },
      };
    });
    setSaved(false);
  };

  const updateDeliveryApp = (idx: number, patch: Partial<DeliveryApp>) => {
    setSettings(prev => {
      if (!prev) return prev;
      const apps = prev.deliveryApps.map((a, i) => i === idx ? { ...a, ...patch } : a);
      return { ...prev, deliveryApps: apps };
    });
    setSaved(false);
  };

  const updateStat = (idx: number, patch: Partial<HeroStat>) => {
    setSettings(prev => {
      if (!prev) return prev;
      const stats = prev.heroStats.map((s, i) => i === idx ? { ...s, ...patch } : s);
      return { ...prev, heroStats: stats };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    await AdminStore.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>⚙️ Configuración</h1>
        <p style={{ margin: '0.3rem 0 0', color: '#555', fontSize: '0.875rem' }}>Ajustes generales del negocio y contenido del sitio</p>
      </div>

      {/* ── Accepting orders toggle ───────────────────────────────────────── */}
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

      {/* ── Info del Negocio ─────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={sectionTitle}>🏪 Información del Negocio</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>
            <span style={labelStyle}>Nombre del negocio</span>
            <input
              type="text"
              value={settings.businessName ?? ''}
              onChange={e => update('businessName', e.target.value)}
              style={inputStyle}
              placeholder="Snacks 911"
            />
          </label>
          <label>
            <span style={labelStyle}>Dirección física</span>
            <input
              type="text"
              value={settings.address ?? ''}
              onChange={e => update('address', e.target.value)}
              style={inputStyle}
              placeholder="Av. Ejemplo 123, Col. Centro, Ciudad"
            />
          </label>
        </div>
      </div>

      {/* ── Operaciones ─────────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={sectionTitle}>📋 Operaciones</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={labelStyle}>⏱ Tiempo de preparación (min)</span>
            <input
              type="number" min={5} max={120}
              value={settings.prepTime}
              onChange={e => update('prepTime', +e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={labelStyle}>📱 WhatsApp (con código de país)</span>
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

      {/* ── Apps de Delivery ─────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={sectionTitle}>🚗 Apps de Delivery</h2>
        <p style={{ margin: '-0.5rem 0 1.2rem', fontSize: '0.8rem', color: '#444' }}>
          Activa o desactiva cada app y edita el enlace a tu perfil.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {(settings.deliveryApps ?? []).map((app, idx) => {
            const meta = APP_ICONS[app.name] ?? { icon: '🔗', color: '#888' };
            return (
              <div
                key={app.name}
                style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center', gap: '0.85rem',
                  padding: '0.9rem 1rem',
                  borderRadius: '12px',
                  background: app.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                  border: app.enabled
                    ? `1px solid ${meta.color}30`
                    : '1px solid rgba(255,255,255,0.05)',
                  opacity: app.enabled ? 1 : 0.5,
                  transition: 'opacity 0.2s, border 0.2s',
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{meta.icon}</span>

                {/* URL input */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: app.enabled ? '#ccc' : '#555', marginBottom: '0.35rem' }}>
                    {app.name}
                  </div>
                  <input
                    type="url"
                    value={app.href}
                    onChange={e => updateDeliveryApp(idx, { href: e.target.value })}
                    style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    placeholder={`https://${app.name.toLowerCase().replace(' ', '')}.com/tu-perfil`}
                  />
                </div>

                {/* Toggle */}
                <button
                  onClick={() => updateDeliveryApp(idx, { enabled: !app.enabled })}
                  title={app.enabled ? 'Desactivar' : 'Activar'}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                    background: app.enabled ? meta.color : '#333',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.25s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: app.enabled ? '22px' : '3px',
                    width: '18px', height: '18px',
                    background: '#fff', borderRadius: '50%',
                    transition: 'left 0.25s', display: 'block',
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hero Content ─────────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={sectionTitle}>🎯 Contenido del Hero</h2>

        {/* Badge text */}
        <label style={{ display: 'block', marginBottom: '1.25rem' }}>
          <span style={labelStyle}>🔴 Texto del badge (ej: "Abierto ahora · Entrega en ~30 min")</span>
          <input
            type="text"
            value={settings.heroBadgeText ?? ''}
            onChange={e => update('heroBadgeText', e.target.value)}
            style={inputStyle}
            placeholder="Abierto ahora · Entrega en ~30 min"
          />
        </label>

        {/* Stats */}
        <div style={{ marginTop: '0.25rem' }}>
          <span style={labelStyle}>📊 Estadísticas (3 cifras en el hero)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
            {(settings.heroStats ?? []).map((stat, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid', gridTemplateColumns: '140px 1fr',
                  gap: '0.75rem', alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#444', marginBottom: '0.25rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Valor</div>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={e => updateStat(idx, { value: e.target.value })}
                    style={{ ...inputStyle, textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#FF4500' }}
                    placeholder="500+"
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#444', marginBottom: '0.25rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Etiqueta</div>
                  <input
                    type="text"
                    value={stat.label}
                    onChange={e => updateStat(idx, { label: e.target.value })}
                    style={inputStyle}
                    placeholder="Pedidos diarios"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Horarios ─────────────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={sectionTitle}>🕐 Horarios</h2>
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

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '0.9rem 2.5rem',
            background: saved ? '#22c55e' : 'linear-gradient(135deg,#FF4500,#FF6500)',
            border: 'none', borderRadius: '12px',
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            cursor: 'pointer', transition: 'background 0.3s',
            boxShadow: saved ? '0 0 20px rgba(34,197,94,0.25)' : '0 0 20px rgba(255,69,0,0.2)',
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

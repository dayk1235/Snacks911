'use client';

import { memo, useEffect } from 'react';
import { useStoreSettings } from '@/lib/storeSettingsStore';

function PromoBannerComponent() {
  const { promoBannerActive, promoBannerText, fetchSettings } = useStoreSettings();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!promoBannerActive || !promoBannerText) return null;

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(255,69,0,0.15), rgba(255,69,0,0.05))',
      border: '1px solid rgba(255,69,0,0.3)',
      borderRadius: '14px',
      padding: '1rem 1.25rem',
      margin: '1rem 1.5rem',
      maxWidth: '600px',
      animation: 'promoPulse 2s ease-in-out infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <h3 style={{
        margin: '0',
        fontSize: '1rem',
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '0.05em'
      }}>
        {promoBannerText}
      </h3>

      <style>{`
        @keyframes promoPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,69,0,0.1); }
          50% { box-shadow: 0 0 30px rgba(255,69,0,0.2); }
        }
      `}</style>
    </div>
  );
}

const PromoBanner = memo(PromoBannerComponent);

export default PromoBanner;

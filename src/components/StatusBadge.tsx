'use client';

import { useEffect, useState } from 'react';
import { getBusinessStatus } from '@/utils/businessStatus';

export default function StatusBadge() {
  const [status, setStatus] = useState<ReturnType<typeof getBusinessStatus> | null>(null);
  // Math.random() SOLO en cliente para evitar hydration mismatch
  const [minAgo, setMinAgo] = useState<number | null>(null);

  useEffect(() => {
    const s = getBusinessStatus();
    setStatus(s);
    if (s.isOpen) {
      setMinAgo(Math.floor(Math.random() * 12) + 3);
    }
  }, []);

  if (!status) return null;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span style={{ color: status.color }} className="font-bold text-sm uppercase tracking-widest">
        {status.label}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {status.isOpen && minAgo
          ? `Entrega en 25-35 min · Último pedido hace ${minAgo} min`
          : status.sublabel}
      </span>
    </div>
  );
}

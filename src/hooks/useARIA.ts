'use client';

import { useState, useCallback, useRef } from 'react';

export interface ARIAMessage {
  id: string;
  role: 'user' | 'aria';
  content: string;
  timestamp: Date;
  contextSnapshot?: {
    salesToday?: number;
    activeOrders?: number;
    criticalStock?: string[];
    conversionRate?: number;
  };
}

const WELCOME_MESSAGE: ARIAMessage = {
  id: 'welcome',
  role: 'aria',
  content: '¡Hola! Soy ARIA, tu COO digital. Tengo acceso a tus métricas en tiempo real. ¿Qué analizamos?',
  timestamp: new Date(),
};

export function useARIA(tenantId: string) {
  const [messages, setMessages] = useState<ARIAMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable conversationId — never regenerates on re-renders
  const conversationId = useRef(
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg: ARIAMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build history from current messages (excluding the welcome message static id)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role === 'aria' ? 'assistant' : 'user', content: m.content }));

      const res = await fetch('/api/ai/aria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text.trim(),
          conversationId: conversationId.current,
          tenantId,
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.reply || data?.error || `Error ${res.status}`);
      }

      const ctx = data.contextSnapshot;
      const ariaMsg: ARIAMessage = {
        id: crypto.randomUUID(),
        role: 'aria',
        content: data.reply,
        timestamp: new Date(),
        contextSnapshot: ctx ? {
          salesToday: ctx.salesToday,
          activeOrders: ctx.activeOrders,
          criticalStock: ctx.criticalStock?.map((s: { name: string }) => s.name) ?? [],
          conversionRate: ctx.conversionRate,
        } : undefined,
      };

      setMessages(prev => [...prev, ariaMsg]);
    } catch (err: any) {
      const msg = err.message || 'Error al conectar con ARIA. Intenta de nuevo.';
      setError(msg);
      // Also push error as ARIA message so it's visible inline
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'aria',
        content: `⚠️ ${msg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, messages, isLoading]);

  const clear = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: 'welcome', timestamp: new Date() }]);
    setError(null);
    conversationId.current = crypto.randomUUID();
  }, []);

  return { messages, send, isLoading, error, clear };
}

export const ARIA_SUGGESTIONS = [
  '¿Cómo van las ventas vs la meta de hoy?',
  '¿Qué debo reabastecer urgente?',
  '¿Qué estrategia de venta funcionó mejor hoy?',
  '¿Cuántas ventas perdí y por qué?',
  'Dame un resumen ejecutivo del día',
  '¿Estoy en camino de cumplir la meta este mes?',
];

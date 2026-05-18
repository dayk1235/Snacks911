'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useARIA, ARIA_SUGGESTIONS } from '@/hooks/useARIA';
import type { ARIAMessage } from '@/hooks/useARIA';

// ─── Context Snapshot Mini-Card ──────────────────────────────────
function ContextSnapshot({ snapshot }: { snapshot: NonNullable<ARIAMessage['contextSnapshot']> }) {
  const [open, setOpen] = useState(false);
  const hasCritical = (snapshot.criticalStock?.length ?? 0) > 0;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[0.7rem] text-blue-400/70 hover:text-blue-300 transition-colors flex items-center gap-1"
      >
        Ver datos usados {open ? '↑' : '↓'}
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-white/10 bg-white/5 p-2.5 text-[0.72rem] space-y-1 text-gray-300">
          {snapshot.salesToday !== undefined && snapshot.salesToday >= 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ventas hoy</span>
              <span className="font-semibold text-green-400">${snapshot.salesToday.toLocaleString()} MXN</span>
            </div>
          )}
          {snapshot.activeOrders !== undefined && snapshot.activeOrders >= 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pedidos activos</span>
              <span className="font-semibold">{snapshot.activeOrders}</span>
            </div>
          )}
          {snapshot.conversionRate !== undefined && snapshot.conversionRate >= 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Conversión</span>
              <span className="font-semibold text-blue-400">{(snapshot.conversionRate * 100).toFixed(1)}%</span>
            </div>
          )}
          {hasCritical && (
            <div>
              <span className="text-gray-500 block mb-0.5">Stock crítico</span>
              {snapshot.criticalStock!.map(name => (
                <span key={name} className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[0.65rem] font-medium">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────
function TypingBubble() {
  return (
    <div className="flex items-end gap-2.5 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 self-end">
        AR
      </div>
      <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ARIAPage() {
  const { messages, send, isLoading, error, clear } = useARIA('snacks911');
  const [inputValue, setInputValue] = useState('');
  const [dismissedError, setDismissedError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset dismissed error when a new error appears
  useEffect(() => {
    if (error) setDismissedError(false);
  }, [error]);

  const handleSend = () => {
    const txt = inputValue.trim();
    if (!txt || isLoading) return;
    setInputValue('');
    send(txt);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    send(suggestion);
  };

  // Only show suggestion chips when there's only the welcome message
  const showSuggestions = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 bg-[#080808]">

      {/* ── ZONA 1: Header fijo ─────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-white/8 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
            AR
          </div>
          {/* Name + badge */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-[0.95rem] leading-none">ARIA</span>
              <span className="text-[0.6rem] font-semibold text-gray-500 bg-white/6 border border-white/10 px-1.5 py-0.5 rounded-full tracking-wide uppercase">
                COO Digital
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[0.68rem] text-emerald-400/80">En línea</span>
            </div>
          </div>
        </div>
        <button
          onClick={clear}
          className="text-[0.75rem] text-gray-500 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/5"
        >
          Limpiar chat
        </button>
      </header>

      {/* ── ZONA 2: Mensajes ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scroll-smooth">
        {/* Error banner */}
        {error && !dismissedError && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <span className="text-red-400 text-sm mt-0.5">⚠️</span>
            <p className="flex-1 text-red-300 text-[0.78rem] leading-relaxed">{error}</p>
            <button
              onClick={() => setDismissedError(true)}
              className="text-red-400/60 hover:text-red-300 text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse ml-auto max-w-[78%]' : 'max-w-[80%]'}`}
          >
            {/* Avatar — ARIA only */}
            {msg.role === 'aria' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 self-end">
                AR
              </div>
            )}

            {/* Bubble */}
            <div
              className={`relative px-4 py-3 rounded-2xl text-[0.83rem] leading-relaxed ${
                msg.role === 'aria'
                  ? 'bg-white/8 border border-white/10 text-gray-200 rounded-bl-sm'
                  : 'bg-blue-600/25 border border-blue-500/30 text-blue-50 rounded-br-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'aria' && msg.contextSnapshot && (
                <ContextSnapshot snapshot={msg.contextSnapshot} />
              )}
              <div className={`text-[0.62rem] mt-1.5 ${msg.role === 'aria' ? 'text-gray-600' : 'text-blue-300/50'}`}>
                {msg.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && <TypingBubble />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── ZONA 3: Input fijo abajo ─────────────────── */}
      <div className="shrink-0 border-t border-white/8 bg-[#0a0a0a]/80 backdrop-blur-md px-6 py-4">
        {/* Suggestion chips — visible only when no real messages yet */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 mb-3">
            {ARIA_SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                disabled={isLoading}
                className="text-[0.72rem] px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-gray-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-600/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Pregunta sobre ventas, inventario, pedidos..."
            className="flex-1 bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-[0.85rem] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all duration-200 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-blue-600/90 hover:bg-blue-500 disabled:bg-white/8 disabled:text-gray-600 text-white flex items-center justify-center transition-all duration-200 shrink-0 shadow-lg shadow-blue-600/20 disabled:shadow-none"
            aria-label="Enviar mensaje a ARIA"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22 11 13 2 9z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

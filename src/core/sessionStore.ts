/**
 * core/sessionStore.ts — Manejo de estado por usuario (User Session State)
 *
 * Arquitectura: In-Memory (Map) con interfaz lista para Redis.
 *
 * Para escalar a Redis, solo reemplaza las funciones internas de `MemoryDriver`
 * con llamadas a `ioredis` — la interfaz pública `getSession`/`updateSession`
 * no cambia, por lo que el resto del sistema no necesita modificaciones.
 *
 * TTL por defecto: 30 minutos de inactividad (compatible con WhatsApp sessions).
 */

import type { CartItem } from './types';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type SessionStep = 'menu' | 'ordering' | 'checkout' | 'confirmed';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | null;

export interface SessionCartItem extends CartItem {
  /** Alias de 'quantity' para compatibilidad con el motor del bot */
  qty: number;
}

export interface UserSession {
  /** ID del usuario (número de WhatsApp o identificador web) */
  userId: string;
  /** Etapa actual del flujo de pedido */
  step: SessionStep;
  /** Carrito activo de esta sesión */
  cart: SessionCartItem[];
  /** Dirección de entrega capturada en el flujo */
  address: string | null;
  /** Método de pago seleccionado */
  payment: PaymentMethod;
  /** Nombre del cliente (capturado en checkout) */
  customerName: string | null;
  /** Referencia de la dirección */
  addressReference: string | null;
  /** Timestamp de última actividad (para TTL) */
  lastActivityAt: number;
  /** Número de intento fallido de confirmación */
  retryCount: number;
  /** Metadatos extendidos — campo libre para el bot engine */
  meta: Record<string, unknown>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Tiempo de vida de sesión inactiva: 30 minutos en ms */
const SESSION_TTL_MS = 30 * 60 * 1_000;

const DEFAULT_SESSION = (userId: string): UserSession => ({
  userId,
  step: 'menu',
  cart: [],
  address: null,
  payment: null,
  customerName: null,
  addressReference: null,
  lastActivityAt: Date.now(),
  retryCount: 0,
  meta: {},
});

// ─── Driver: In-Memory ────────────────────────────────────────────────────────
// Swap this section for a Redis driver cuando quieras escalar a multi-instancia.

const _store = new Map<string, UserSession>();

/**
 * Limpieza periódica de sesiones expiradas.
 * Corre en background cada 5 minutos en entornos non-edge.
 */
function _evictExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of _store.entries()) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      _store.delete(id);
    }
  }
}

// Solo correr en entorno Node.js (no en Edge Runtime / Vercel Edge)
if (typeof setInterval !== 'undefined') {
  setInterval(_evictExpiredSessions, 5 * 60 * 1_000);
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Obtiene la sesión de un usuario. Si no existe, la crea con valores por defecto.
 *
 * @param userId - Identificador único del usuario (phone number, web session ID, etc.)
 * @returns La sesión actual del usuario (nunca undefined)
 *
 * @example
 * const session = getSession('+5215512345678');
 * console.log(session.step); // 'menu'
 */
export function getSession(userId: string): UserSession {
  if (!_store.has(userId)) {
    _store.set(userId, DEFAULT_SESSION(userId));
  }

  const session = _store.get(userId)!;

  // Verificar TTL — si expiró, resetear silenciosamente
  if (Date.now() - session.lastActivityAt > SESSION_TTL_MS) {
    const fresh = DEFAULT_SESSION(userId);
    _store.set(userId, fresh);
    return fresh;
  }

  return session;
}

/**
 * Actualiza parcialmente la sesión de un usuario (shallow merge).
 * Siempre actualiza `lastActivityAt` para reiniciar el TTL.
 *
 * @param userId - Identificador único del usuario
 * @param data - Campos a actualizar (no requiere el objeto completo)
 * @returns La sesión actualizada
 *
 * @example
 * updateSession(userId, { step: 'ordering', cart: [...] });
 * updateSession(userId, { address: 'Calle Reforma 123' });
 */
export function updateSession(userId: string, data: Partial<Omit<UserSession, 'userId'>>): UserSession {
  const current = getSession(userId);

  const updated: UserSession = {
    ...current,
    ...data,
    userId,                          // Inmutable — nunca se sobreescribe
    lastActivityAt: Date.now(),      // Siempre refrescar TTL
  };

  _store.set(userId, updated);
  return updated;
}

/**
 * Elimina la sesión de un usuario. Útil al confirmar un pedido o al
 * resetear el flujo por inactividad.
 *
 * @param userId - Identificador único del usuario
 */
export function clearSession(userId: string): void {
  _store.delete(userId);
}

/**
 * Resetea la sesión a su estado inicial sin eliminarla del store.
 * Útil para reiniciar el flujo sin perder el userId en el Map.
 *
 * @param userId - Identificador único del usuario
 * @returns La sesión reseteada
 */
export function resetSession(userId: string): UserSession {
  const fresh = DEFAULT_SESSION(userId);
  _store.set(userId, fresh);
  return fresh;
}

// ─── Helpers de Carrito ───────────────────────────────────────────────────────

/**
 * Calcula el total del carrito de una sesión.
 */
export function getCartTotal(session: UserSession): number {
  return session.cart.reduce(
    (sum, item) => sum + item.price * (item.qty ?? item.quantity ?? 1),
    0,
  );
}

/**
 * Agrega o incrementa un producto en el carrito de la sesión.
 * Si el producto ya existe (por id), incrementa su cantidad.
 *
 * @returns La sesión actualizada con el carrito modificado
 */
export function addToSessionCart(
  userId: string,
  item: Omit<SessionCartItem, 'qty' | 'quantity'> & { qty?: number; quantity?: number },
): UserSession {
  const session = getSession(userId);
  const existing = session.cart.findIndex(c => c.id === item.id);
  const qty = item.qty ?? item.quantity ?? 1;

  let newCart: SessionCartItem[];
  if (existing >= 0) {
    newCart = session.cart.map((c, i) =>
      i === existing
        ? { ...c, qty: (c.qty ?? c.quantity ?? 1) + qty, quantity: (c.quantity ?? 1) + qty }
        : c,
    );
  } else {
    newCart = [...session.cart, { ...item, qty, quantity: qty } as SessionCartItem];
  }

  return updateSession(userId, { cart: newCart });
}

/**
 * Elimina un producto del carrito por su id.
 */
export function removeFromSessionCart(userId: string, itemId: string): UserSession {
  const session = getSession(userId);
  return updateSession(userId, {
    cart: session.cart.filter(c => c.id !== itemId),
  });
}

// ─── Debug / Admin ────────────────────────────────────────────────────────────

/**
 * Solo para uso en desarrollo/debug. Retorna un snapshot del store completo.
 * NO exponer en endpoints de producción.
 */
export function __debugGetAllSessions(): Map<string, UserSession> {
  return _store;
}

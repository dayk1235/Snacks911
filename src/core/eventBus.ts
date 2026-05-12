import { EventEmitter } from 'events';

// ------------------------------------------------------------------
// System Events Definition
// ------------------------------------------------------------------

export type SystemEventMap = {
  /** Triggered when a new message arrives from a user */
  'USER_MESSAGE': {
    tenantId: string;
    userId: string; // phone number
    message: string;
    timestamp: number;
  };
  
  /** Triggered when the AI responds to the user */
  'BOT_RESPONSE': {
    tenantId: string;
    userId: string;
    response: string;
    intentDetected?: string;
    timestamp: number;
  };

  /** Triggered when the user's cart changes */
  'CART_UPDATED': {
    tenantId: string;
    userId: string;
    cart: any[];
    total: number;
    timestamp: number;
  };

  /** Triggered by the Shadow Engine when a sales opportunity is detected */
  'OPPORTUNITY_DETECTED': {
    tenantId: string;
    userId: string;
    score: number; // 0-100 probability
    reason: string;
    recommendedAction: string;
    timestamp: number;
  };

  /** Triggered by the Shadow Engine when user frustration is detected */
  'FRUSTRATION_DETECTED': {
    tenantId: string;
    userId: string;
    reason: string;
    timestamp: number;
  };

  /** Triggered when a critical technical error occurs */
  'ERROR_EVENT': {
    tenantId?: string;
    code: string;
    message: string;
    timestamp: number;
  };
};

// ------------------------------------------------------------------
// Typed Event Bus Implementation
// ------------------------------------------------------------------

class TypedEventBus extends EventEmitter {
  emit<K extends keyof SystemEventMap>(eventName: K, payload: SystemEventMap[K]): boolean {
    return super.emit(eventName, payload);
  }

  on<K extends keyof SystemEventMap>(eventName: K, listener: (payload: SystemEventMap[K]) => void): this {
    return super.on(eventName, listener);
  }

  off<K extends keyof SystemEventMap>(eventName: K, listener: (payload: SystemEventMap[K]) => void): this {
    return super.off(eventName, listener);
  }
}

// Singleton instance
// In Next.js dev mode, we prevent recreating the instance on hot reloads
const globalForEventBus = globalThis as unknown as {
  _eventBus: TypedEventBus | undefined;
};

export const eventBus = globalForEventBus._eventBus ?? new TypedEventBus();

if (process.env.NODE_ENV !== 'production') {
  globalForEventBus._eventBus = eventBus;
}

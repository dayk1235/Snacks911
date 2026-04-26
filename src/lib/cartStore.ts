import { useSyncExternalStore } from 'react';
import type { CartState, CoreProduct, CartItem } from '@/core/types';
import * as cartEngine from '@/core/cartEngine';

const LS_CART_KEY = 'snacks911_cart';
const EMPTY_CART_STATE = cartEngine.createEmptyCart();

// Internal state reference
let state: CartState = EMPTY_CART_STATE;
let listeners: Array<() => void> = [];

// Initialize from localStorage if available (on client side)
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(LS_CART_KEY);
    if (saved) {
      state = cartEngine.deserializeCart(saved);
    }
  } catch (err) {
    console.error('Failed to parse cart state from localStorage', err);
  }

  // Listen for changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === LS_CART_KEY) {
      state = cartEngine.deserializeCart(e.newValue);
      emitChange();
    }
  });
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function persistState(newState: CartState) {
  state = newState;
  if (typeof window !== 'undefined') {
    if (cartEngine.hasItems(state)) {
      localStorage.setItem(LS_CART_KEY, cartEngine.serializeCart(state));
    } else {
      localStorage.removeItem(LS_CART_KEY);
    }
  }
  emitChange();
}

export const cartStore = {
  add: (product: CoreProduct | Omit<CartItem, 'quantity'>) => {
    persistState(cartEngine.addToCart(state, product));
  },
  updateQuantity: (id: number, delta: number) => {
    persistState(cartEngine.updateQuantity(state, id, delta));
  },
  remove: (id: number) => {
    persistState(cartEngine.removeFromCart(state, id));
  },
  clear: () => {
    persistState(cartEngine.clearCart());
  },
  subscribe: (listener: () => void) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => {
    // React expects the server snapshot to stay referentially stable.
    return EMPTY_CART_STATE;
  },
};

/**
 * Hook to use the global cart store.
 * Safe to use in SSR (returns empty cart on server, hydrates on client).
 */
export function useCartStore() {
  const storeState = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );

  return {
    ...storeState,
    addToCart: cartStore.add,
    updateQuantity: cartStore.updateQuantity,
    removeFromCart: cartStore.remove,
    clearCart: cartStore.clear,
  };
}

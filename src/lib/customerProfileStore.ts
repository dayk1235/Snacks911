import { useSyncExternalStore } from 'react';

/**
 * lib/customerProfileStore.ts — Local persistence for customer data.
 * 
 * Part of Phase 1.6: Customer Memory & Context.
 * Stores basic metrics to personalize the experience.
 */

export interface CustomerProfile {
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

const LS_PROFILE_KEY = 'snacks911_customer_profile';
const DEFAULT_PROFILE: CustomerProfile = {
  phone: '',
  totalOrders: 0,
  totalSpent: 0
};

let state: CustomerProfile = DEFAULT_PROFILE;
let listeners: Array<() => void> = [];

// Hydrate from localStorage on client
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(LS_PROFILE_KEY);
    if (saved) {
      state = JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to parse customer profile', err);
  }
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const customerStore = {
  /**
   * Updates the profile and persists to localStorage.
   */
  update: (updates: Partial<CustomerProfile>) => {
    state = { ...state, ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(state));
    }
    emitChange();
  },

  /**
   * Clears the profile.
   */
  clear: () => {
    state = DEFAULT_PROFILE;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_PROFILE_KEY);
    }
    emitChange();
  },

  subscribe: (listener: () => void) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getSnapshot: () => state,
  getServerSnapshot: () => DEFAULT_PROFILE,
};

/**
 * Hook to access customer profile data and update functions.
 */
export function useCustomerProfile() {
  const profile = useSyncExternalStore(
    customerStore.subscribe,
    customerStore.getSnapshot,
    customerStore.getServerSnapshot
  );

  return {
    ...profile,
    updateProfile: customerStore.update,
    clearProfile: customerStore.clear,
  };
}

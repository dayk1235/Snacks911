import { useSyncExternalStore } from 'react';
import { AdminStore } from './adminStore';

/**
 * lib/customerProfileStore.ts — Syncs customer data with Supabase.
 * 
 * Part of Phase 1.6: Customer Memory & Context.
 * Stores basic metrics to personalize the experience.
 * localStorage is used only for session persistence of the phone number.
 */

export interface CustomerProfile {
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  favoriteProduct?: string;
}

const LS_PROFILE_KEY = 'snacks911_customer_profile';
const DEFAULT_PROFILE: CustomerProfile = {
  phone: '',
  totalOrders: 0,
  totalSpent: 0
};

let state: CustomerProfile = DEFAULT_PROFILE;
let listeners: Array<() => void> = [];

// Initial hydration from localStorage (mainly to keep track of the session's phone number)
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
   * Fetches profile from Supabase and updates the store.
   */
  fetchProfile: async (phone: string) => {
    if (!phone || phone.length < 10) return;
    try {
      const dbProfile = await AdminStore.getCustomer(phone);
      if (dbProfile) {
        const profile: CustomerProfile = {
          phone: dbProfile.phoneNumber,
          name: dbProfile.name,
          totalOrders: dbProfile.totalOrders,
          totalSpent: dbProfile.lastOrderTotal,
          lastOrderDate: dbProfile.lastOrderDate,
          favoriteProduct: dbProfile.favoriteProduct
        };
        state = profile;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(state));
        }
        emitChange();
      }
    } catch (e) {
      console.warn('[customerStore] Failed to fetch profile', e);
    }
  },

  /**
   * Updates the profile and persists to Supabase.
   */
  update: async (updates: Partial<CustomerProfile>) => {
    state = { ...state, ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(state));
    }
    emitChange();

    // Persist to Supabase if phone exists
    if (state.phone) {
      try {
        await AdminStore.upsertCustomer({
          phoneNumber: state.phone,
          name: state.name || '',
          totalOrders: state.totalOrders,
          lastOrderDate: state.lastOrderDate || new Date().toISOString(),
          lastOrderTotal: state.totalSpent,
          favoriteProduct: state.favoriteProduct || '',
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[customerStore] Supabase sync failed', e);
      }
    }
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
    fetchProfile: customerStore.fetchProfile,
    updateProfile: customerStore.update,
    clearProfile: customerStore.clear,
  };
}

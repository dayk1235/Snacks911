import { create } from 'zustand';
import type { Product } from '@/data/products';

export interface CartItem extends Product {
  qty: number;
}

interface ChatStore {
  isOpen: boolean;
  externalMessage: string | null;
  cart: CartItem[];
  
  // Actions
  open: (msg?: string) => void;
  close: () => void;
  toggle: () => void;
  clearExternalMessage: () => void;
  
  // Cart Actions
  addToCart: (product: Product) => void;
  syncCart: (items: CartItem[]) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  externalMessage: null,
  cart: [],

  open: (msg) => set({ isOpen: true, externalMessage: msg || null }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  clearExternalMessage: () => set({ externalMessage: null }),

  addToCart: (product) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].qty += 1;
      set({ cart: newCart });
    } else {
      set({ cart: [...cart, { ...product, qty: 1 }] });
    }
  },

  syncCart: (items) => set({ cart: items }),

  removeFromCart: (id) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(item => item.id === id);

    if (existingIndex > -1) {
      const newCart = [...cart];
      if (newCart[existingIndex].qty > 1) {
        newCart[existingIndex].qty -= 1;
        set({ cart: newCart });
      } else {
        set({ cart: cart.filter(item => item.id !== id) });
      }
    }
  },

  clearCart: () => set({ cart: [] }),

  getTotal: () => {
    const { cart } = get();
    return cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  },
}));

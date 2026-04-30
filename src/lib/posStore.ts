/**
 * posStore.ts — Zustand store for POS operations.
 * Manages active cart, order submission, and today's orders list.
 */

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────
export interface PosCartItem {
  product_id: string;
  product_name: string;
  category: string;
  qty: number;
  unit_price: number;
  selected_modifiers_json: { name: string; price: number }[];
}

export interface PosOrder {
  id: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  channel: string;
  customer_name: string | null;
  payment_method: string;
  delivery_type: string;
  total: number;
  created_at: string;
  order_items?: {
    id: string;
    qty: number;
    unit_price: number;
    selected_modifiers_json: any[];
    product_name: string;
  }[];
}

export interface PosState {
  // Cart
  cart: PosCartItem[];
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  deliveryType: 'PICKUP' | 'DELIVERY';
  customerName: string;

  // Orders today
  orders: PosOrder[];

  // UI
  isLoading: boolean;
  error: string | null;
  lastOrderId: string | null;

  // Cart actions
  addItem: (item: Omit<PosCartItem, 'qty'>) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setPaymentMethod: (method: 'CASH' | 'CARD' | 'TRANSFER') => void;
  setDeliveryType: (type: 'PICKUP' | 'DELIVERY') => void;
  setCustomerName: (name: string) => void;

  // Order actions
  submitOrder: () => Promise<void>;
  fetchTodayOrders: () => Promise<void>;
  updateOrderStatus: (id: string, status: PosOrder['status']) => Promise<void>;

  // Computed
  cartTotal: () => number;
  cartCount: () => number;
}

export const usePosStore = create<PosState>()((set, get) => ({
  cart: [],
  paymentMethod: 'CASH',
  deliveryType: 'PICKUP',
  customerName: '',
  orders: [],
  isLoading: false,
  error: null,
  lastOrderId: null,

  // ── Cart ──────────────────────────────────────────────────────────────
  addItem: (item) => {
    const cart = get().cart;
    const existing = cart.findIndex(c => c.product_id === item.product_id);
    if (existing >= 0) {
      const updated = [...cart];
      updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 };
      set({ cart: updated });
    } else {
      set({ cart: [...cart, { ...item, qty: 1 }] });
    }
  },

  removeItem: (productId) => {
    set({ cart: get().cart.filter(c => c.product_id !== productId) });
  },

  setQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      cart: get().cart.map(c =>
        c.product_id === productId ? { ...c, qty } : c
      ),
    });
  },

  clearCart: () => set({ cart: [], customerName: '', paymentMethod: 'CASH', deliveryType: 'PICKUP' }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setDeliveryType: (type) => set({ deliveryType: type }),
  setCustomerName: (name) => set({ customerName: name }),

  // ── Computed ──────────────────────────────────────────────────────────
  cartTotal: () => get().cart.reduce((sum, i) => sum + i.unit_price * i.qty, 0),
  cartCount: () => get().cart.reduce((sum, i) => sum + i.qty, 0),

  // ── Submit Order ──────────────────────────────────────────────────────
  submitOrder: async () => {
    const { cart, paymentMethod, deliveryType, customerName } = get();
    if (cart.length === 0) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            product_id: i.product_id,
            product_name: i.product_name,
            qty: i.qty,
            unit_price: i.unit_price,
            selected_modifiers_json: i.selected_modifiers_json,
          })),
          payment_method: paymentMethod,
          delivery_type: deliveryType,
          customer_name: customerName || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear orden');

      set({ lastOrderId: data.order.id, isLoading: false });
      get().clearCart();
      await get().fetchTodayOrders();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ── Fetch today's orders ──────────────────────────────────────────────
  fetchTodayOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/pos/orders');
      if (!res.ok) throw new Error('Error al cargar órdenes');
      const data = await res.json();
      console.log('FETCH_RESULT:', data.orders);
      if (data.orders?.length) {
        console.log('SETTING_ORDERS:', data.orders);
      }
      set((state) => ({ orders: data.orders?.length ? data.orders : state.orders, isLoading: false }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // ── Update order status ───────────────────────────────────────────────
  updateOrderStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar pedido');

      set({
        orders: get().orders.map(o =>
          o.id === id ? { ...o, status } : o
        ),
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));

/**
 * adminStore.ts — Thin async wrapper over db.ts (Supabase).
 * All methods are now async. Falls back to localStorage when Supabase is unavailable.
 */

import type {
  AdminProduct, Order, OrderStatus,
  SaleRecord, BusinessSettings, CustomCategory,
  Customer,
} from './adminTypes';

import {
  dbGetProducts, dbSaveProduct, dbDeleteProduct, dbToggleProduct,
  dbGetOrders, dbSaveOrder, dbUpdateOrderStatus,
  dbGetSettings, dbSaveSettings,
  dbGetSales,
  dbGetCustomCategories, dbSaveCustomCategory, dbDeleteCustomCategory,
  dbGetCustomer, dbUpsertCustomer, dbGetAllCustomers,
} from './db';

// ─── localStorage keys (used as offline cache) ────────────────────────────────
const K = {
  PRODUCTS:   'snacks911_admin_products',
  ORDERS:     'snacks911_admin_orders',
  SETTINGS:   'snacks911_admin_settings',
  CATEGORIES: 'snacks911_admin_categories',
} as const;

function lsRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsWrite<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── AdminStore ───────────────────────────────────────────────────────────────
export const AdminStore = {

  // ── Products ────────────────────────────────────────────────────────────────
  async getProducts(): Promise<AdminProduct[]> {
    try {
      const products = await dbGetProducts();
      lsWrite(K.PRODUCTS, products); // update local cache
      return products;
    } catch (e) {
      console.warn('[AdminStore] Supabase unavailable, using localStorage', e);
      return lsRead<AdminProduct[]>(K.PRODUCTS, []);
    }
  },

  async saveProduct(product: AdminProduct): Promise<void> {
    try {
      await dbSaveProduct(product);
      // update local cache
      const all = lsRead<AdminProduct[]>(K.PRODUCTS, []);
      const idx = all.findIndex(p => p.id === product.id);
      if (idx >= 0) all[idx] = product; else all.push(product);
      lsWrite(K.PRODUCTS, all);
    } catch (e) {
      console.warn('[AdminStore] saveProduct fallback', e);
      const all = lsRead<AdminProduct[]>(K.PRODUCTS, []);
      const idx = all.findIndex(p => p.id === product.id);
      if (idx >= 0) all[idx] = product; else all.push(product);
      lsWrite(K.PRODUCTS, all);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await dbDeleteProduct(id);
    } catch (e) {
      console.warn('[AdminStore] deleteProduct fallback', e);
    }
    const all = lsRead<AdminProduct[]>(K.PRODUCTS, []).filter(p => p.id !== id);
    lsWrite(K.PRODUCTS, all);
  },

  async toggleProduct(id: string): Promise<void> {
    try {
      await dbToggleProduct(id);
    } catch (e) {
      console.warn('[AdminStore] toggleProduct fallback', e);
    }
    const all = lsRead<AdminProduct[]>(K.PRODUCTS, []);
    const prod = all.find(p => p.id === id);
    if (prod) { prod.available = !prod.available; lsWrite(K.PRODUCTS, all); }
  },

  // ── Orders ──────────────────────────────────────────────────────────────────
  async getOrders(): Promise<Order[]> {
    try {
      const orders = await dbGetOrders();
      lsWrite(K.ORDERS, orders);
      return orders;
    } catch (e) {
      console.warn('[AdminStore] getOrders fallback', e);
      return lsRead<Order[]>(K.ORDERS, []);
    }
  },

  async saveOrder(order: Order): Promise<void> {
    try {
      await dbSaveOrder(order);
      const all = lsRead<Order[]>(K.ORDERS, []);
      const idx = all.findIndex(o => o.id === order.id);
      if (idx >= 0) all[idx] = order; else all.unshift(order);
      lsWrite(K.ORDERS, all);
      return;
    } catch (e) {
      console.warn('[AdminStore] saveOrder fallback', e);
    }
    const all = lsRead<Order[]>(K.ORDERS, []);
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) all[idx] = order; else all.unshift(order);
    lsWrite(K.ORDERS, all);
  },

  /** Quick order submit — generates ID, saves to Supabase, returns order ID */
  async submitOrder(
    items: { id: number; name: string; price: number; quantity: number; linkedExtras?: string[] }[],
    total: number,
    whatsappNumber?: string,
    customerName?: string,
    customerPhone?: string,
  ): Promise<string> {
    const id = `ord_${Date.now()}`;
    const order: Order = {
      id,
      items: items.map(i => ({
        productId: String(i.id),
        productName: i.name + (i.linkedExtras && i.linkedExtras.length ? ` (${i.linkedExtras.join(', ')})` : ''),
        quantity: i.quantity,
        price: i.price,
      })),
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerName: customerName || 'Web Order',
      customerPhone: customerPhone || '',
    };
    await this.saveOrder(order);
    return id;
  },

  async updateOrderStatus(id: string, status: OrderStatus, handledBy?: string): Promise<void> {
    try {
      await dbUpdateOrderStatus(id, status, handledBy);
    } catch (e) {
      console.warn('[AdminStore] updateOrderStatus fallback', e);
    }
    const all = lsRead<Order[]>(K.ORDERS, []);
    const order = all.find(o => o.id === id);
    if (order) { order.status = status; if (handledBy) order.handledBy = handledBy; lsWrite(K.ORDERS, all); }
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  async getSettings(): Promise<BusinessSettings> {
    try {
      const settings = await dbGetSettings();
      lsWrite(K.SETTINGS, settings);
      return settings;
    } catch (e) {
      console.warn('[AdminStore] getSettings fallback', e);
      return lsRead<BusinessSettings>(K.SETTINGS, {
        prepTime: 25, acceptingOrders: true, whatsappNumber: '525584507458',
        openHours: {}, businessName: 'Snacks 911', address: '',
        heroBadgeText: 'Abierto ahora · Entrega en ~30 min',
        heroStats: [
          { value: '500+', label: 'Pedidos diarios' },
          { value: '4.9★', label: 'Calificación' },
          { value: '30min', label: 'Tiempo promedio' },
        ],
        deliveryApps: [
          { name: 'Uber Eats', href: 'https://ubereats.com',  icon: '🟢', color: '#06C167', enabled: true },
          { name: 'Rappi',     href: 'https://rappi.com',      icon: '🟠', color: '#FF441A', enabled: true },
          { name: 'DiDi Food', href: 'https://didiglobal.com', icon: '🟡', color: '#FF6E20', enabled: true },
        ],
      });
    }
  },

  async saveSettings(settings: BusinessSettings): Promise<void> {
    try {
      await dbSaveSettings(settings);
    } catch (e) {
      console.warn('[AdminStore] saveSettings fallback', e);
    }
    lsWrite(K.SETTINGS, settings);
  },

  // ── Sales ────────────────────────────────────────────────────────────────────
  async getSales(): Promise<SaleRecord[]> {
    try {
      return await dbGetSales();
    } catch (e) {
      console.warn('[AdminStore] getSales fallback', e);
      return [];
    }
  },

  // ── Custom Categories ────────────────────────────────────────────────────────
  async getCustomCategories(): Promise<CustomCategory[]> {
    try {
      const cats = await dbGetCustomCategories();
      lsWrite(K.CATEGORIES, cats);
      return cats;
    } catch (e) {
      console.warn('[AdminStore] getCustomCategories fallback', e);
      return lsRead<CustomCategory[]>(K.CATEGORIES, []);
    }
  },

  async saveCustomCategory(cat: CustomCategory): Promise<void> {
    try {
      await dbSaveCustomCategory(cat);
    } catch (e) {
      console.warn('[AdminStore] saveCustomCategory fallback', e);
    }
    const all = lsRead<CustomCategory[]>(K.CATEGORIES, []);
    const idx = all.findIndex(c => c.id === cat.id);
    if (idx >= 0) all[idx] = cat; else all.push(cat);
    lsWrite(K.CATEGORIES, all);
  },

  async deleteCustomCategory(id: string): Promise<void> {
    try {
      await dbDeleteCustomCategory(id);
    } catch (e) {
      console.warn('[AdminStore] deleteCustomCategory fallback', e);
    }
    const all = lsRead<CustomCategory[]>(K.CATEGORIES, []).filter(c => c.id !== id);
    lsWrite(K.CATEGORIES, all);
  },

  // ── Customers ───────────────────────────────────────────────────────────────
  async getCustomer(phone: string): Promise<Customer | null> {
    try { return await dbGetCustomer(phone); }
    catch { return null; }
  },

  async upsertCustomer(c: Customer): Promise<void> {
    try { await dbUpsertCustomer(c); }
    catch (e) { console.warn('[AdminStore] upsertCustomer fallback', e); }
  },

  async getAllCustomers(): Promise<Customer[]> {
    try { return await dbGetAllCustomers(); }
    catch { return []; }
  },

  /** Update customer stats after an order. Creates if new. */
  async trackCustomerOrder(phone: string, name: string, total: number, orderDate: string, topProduct: string): Promise<void> {
    if (!phone || phone.length < 10) return;
    const existing = await this.getCustomer(phone);
    const now = new Date().toISOString();

    if (existing) {
      existing.totalOrders += 1;
      existing.lastOrderDate = orderDate;
      existing.lastOrderTotal = total;
      if (name) existing.name = name;
      // Update favorite: count occurrences
      const favCounts: Record<string, number> = {};
      favCounts[existing.favoriteProduct] = (favCounts[existing.favoriteProduct] || 0) + 1;
      favCounts[topProduct] = (favCounts[topProduct] || 0) + 1;
      const top = Object.entries(favCounts).sort(([, a], [, b]) => b - a)[0];
      if (top) existing.favoriteProduct = top[0];
      await this.upsertCustomer(existing);
    } else {
      await this.upsertCustomer({
        phoneNumber: phone,
        name,
        totalOrders: 1,
        lastOrderDate: orderDate,
        lastOrderTotal: total,
        favoriteProduct: topProduct,
        createdAt: now,
      });
    }
  },
};

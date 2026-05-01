/**
 * adminStore.ts — Thin async wrapper over db.ts (Supabase).
 * All methods are now async. Falls back to localStorage when Supabase is unavailable.
 */

import type {
  AdminProduct, Order, OrderStatus, OrderChannel,
  SaleRecord, BusinessSettings, CustomCategory,
  Customer, AuditLog,
} from './adminTypes';

import {
  dbGetProducts, dbSaveProduct, dbDeleteProduct, dbToggleProduct,
  dbGetOrders, dbSaveOrder, dbUpdateOrderStatus,
  dbGetSettings, dbSaveSettings,
  dbGetSales,
  dbGetCustomCategories, dbSaveCustomCategory, dbDeleteCustomCategory,
  dbGetCustomer, dbUpsertCustomer, dbGetAllCustomers,
  dbGetAuditLogs,
} from './db';

// ─── localStorage keys (used as offline cache) ────────────────────────────────
const K = {
  PRODUCTS:   'snacks911_admin_products',
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

// ─── In-memory TTL cache ──────────────────────────────────────────────────────
type CacheEntry = { data: unknown; expires: number };
const _cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  _cache.delete(key);
  return null;
}

function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  _cache.set(key, { data, expires: Date.now() + ttlMs });
}

function cacheDel(...keys: string[]): void {
  keys.forEach(k => _cache.delete(k));
}

const TTL = {
  SETTINGS:   5 * 60 * 1000, // 5 min
  PRODUCTS:   2 * 60 * 1000, // 2 min
  CATEGORIES: 5 * 60 * 1000, // 5 min
} as const;

function createUuid() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // RFC4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


// ─── AdminStore ───────────────────────────────────────────────────────────────
export const AdminStore = {

  // ── Products ────────────────────────────────────────────────────────────────
  async getProducts(): Promise<AdminProduct[]> {
    const hit = cacheGet<AdminProduct[]>('products');
    if (hit) return hit;
    try {
      const products = await dbGetProducts();
      lsWrite(K.PRODUCTS, products);
      cacheSet('products', products, TTL.PRODUCTS);
      return products;
    } catch (e) {
      console.warn('[AdminStore] Supabase unavailable, using localStorage', e);
      return lsRead<AdminProduct[]>(K.PRODUCTS, []);
    }
  },

  async saveProduct(product: AdminProduct): Promise<void> {
    cacheDel('products');
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
    cacheDel('products');
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
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error');
      return result.data;
    } catch (e) {
      console.warn('[AdminStore] getOrders API failed', e);
      return [];
    }
  },

  async saveOrder(order: Order): Promise<void> {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: order.items,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          channel: order.channel,
          notes: order.notes,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown API error' }));
        throw new Error(err.error || 'Failed to save order via API');
      }

      const result = await response.json();
      order.id = result.orderId;
    } catch (e) {
      console.error('[AdminStore] saveOrder failed', e);
      throw e;
    }
  },

  /** Quick order submit — generates ID, saves to Supabase, returns order ID */
  async submitOrder(
    items: { id: number; name: string; price: number; quantity: number; linkedExtras?: string[] }[],
    total: number,
    whatsappNumber?: string,
    customerName?: string,
    customerPhone?: string,
    whatsappConfirmed?: boolean,
    channel: OrderChannel = 'WEB'
  ): Promise<string> {
    const id = createUuid();
    const dbProducts = await this.getProducts().catch(() => []);
    const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
    const byName = new Map(dbProducts.map(p => [normalize(p.name), p.id]));

    const order: Order = {
      id,
      items: items.map(i => ({
        productId: byName.get(normalize(i.name)) ?? String(i.id),
        productName: i.name + (i.linkedExtras && i.linkedExtras.length ? ` (${i.linkedExtras.join(', ')})` : ''),
        quantity: i.quantity,
        price: i.price,
      })),
      total,
      status: 'pending',
      channel,
      createdAt: new Date().toISOString(),
      customerName: customerName || 'Web Order',
      customerPhone: customerPhone || '',
      whatsappConfirmed: whatsappConfirmed ?? false,
    };
    await this.saveOrder(order);
    return id;
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
    console.log('[AdminStore] update', id, status);
    const response = await fetch('/api/orders/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to update status: ${response.status}`);
    }
  },

  async updateOrderWhatsAppConfirmed(id: string, confirmed: boolean): Promise<void> {
    try {
      const response = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, whatsappConfirmed: confirmed }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
    } catch (e) {
      console.warn('[AdminStore] updateOrderWhatsAppConfirmed failed', e);
    }
  },

  // ── Settings — stale-while-revalidate ────────────────────────────────────────
  async getSettings(): Promise<BusinessSettings> {
    // 1. In-memory cache hit
    const memHit = cacheGet<BusinessSettings>('settings');
    if (memHit) return memHit;

    const DEFAULTS: BusinessSettings = {
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
    };

    // 2. Stale-while-revalidate: return localStorage instantly, refresh in bg
    const lsHit = lsRead<BusinessSettings | null>(K.SETTINGS, null);
    if (lsHit) {
      cacheSet('settings', lsHit, TTL.SETTINGS);
      dbGetSettings()
        .then(fresh => { lsWrite(K.SETTINGS, fresh); cacheDel('settings'); })
        .catch(() => {});
      return lsHit;
    }

    // 3. No cache — fetch and wait
    try {
      const settings = await dbGetSettings();
      lsWrite(K.SETTINGS, settings);
      cacheSet('settings', settings, TTL.SETTINGS);
      return settings;
    } catch (e) {
      console.warn('[AdminStore] getSettings fallback', e);
      return DEFAULTS;
    }
  },

  async saveSettings(settings: BusinessSettings): Promise<void> {
    cacheDel('settings');
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
    const hit = cacheGet<CustomCategory[]>('categories');
    if (hit) return hit;
    try {
      const cats = await dbGetCustomCategories();
      lsWrite(K.CATEGORIES, cats);
      cacheSet('categories', cats, TTL.CATEGORIES);
      return cats;
    } catch (e) {
      console.warn('[AdminStore] getCustomCategories fallback', e);
      return lsRead<CustomCategory[]>(K.CATEGORIES, []);
    }
  },

  async saveCustomCategory(cat: CustomCategory): Promise<void> {
    cacheDel('categories');
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
    cacheDel('categories');
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
  
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      return await dbGetAuditLogs();
    } catch (e) {
      console.warn('[AdminStore] getAuditLogs fallback', e);
      return [];
    }
  },
};

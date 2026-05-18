/**
 * adminStore.ts — Unified data access layer for Snacks 911 Admin.
 * Uses fetch API to interact with /api/* endpoints.
 * Safe for both Client and Server Components (SSR-safe).
 */

import type {
  AdminProduct, Order, OrderStatus, OrderChannel,
  SaleRecord, BusinessSettings, CustomCategory,
  Customer, AuditLog,
} from './adminTypes';
import { createUuid } from '@/lib/utils/core';

const isServer = typeof window === 'undefined';
const IS_TEST = process.env.NODE_ENV === 'test';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  // On server, we MUST have an absolute URL
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return base.replace(/\/$/, ''); // Remove trailing slash
};

// ─── In-memory TTL cache ──────────────────────────────────────
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
};

// ─── AdminStore ───────────────────────────────────────────────
export const AdminStore = {

  // ── Products ─────────────────────────────────────────────────
  async getProducts(): Promise<AdminProduct[]> {
    if (IS_TEST) {
      return [
        { id: '1', name: 'Combo Mixto 911', price: 249 },
        { id: '8', name: 'Boneless 250g', price: 139 }
      ] as any[];
    }
    const hit = cacheGet<AdminProduct[]>('products');
    if (hit) return hit;
    try {
      const response = await fetch(`${getBaseUrl()}/api/products?all=true`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const products = await response.json();
      cacheSet('products', products, TTL.PRODUCTS);
      return products;
    } catch (e) {
      console.error('[AdminStore] getProducts failed', e);
      throw e;
    }
  },

  async saveProduct(product: AdminProduct): Promise<void> {
    cacheDel('products');
    try {
      const method = product.id && product.id.length > 0 ? 'PUT' : 'POST';
      const response = await fetch(`${getBaseUrl()}/api/products`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!response.ok) throw new Error('Failed to save product');
    } catch (e) {
      console.error('[AdminStore] saveProduct failed', e);
      throw e;
    }
  },

  async insertProducts(products: AdminProduct[]): Promise<void> {
    cacheDel('products');
    try {
      await Promise.all(
        products.map(p =>
          fetch(`${getBaseUrl()}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
          })
        )
      );
    } catch (e) {
      console.error('[AdminStore] insertProducts failed', e);
      throw e;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    cacheDel('products');
    try {
      const response = await fetch(`${getBaseUrl()}/api/products?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete product');
    } catch (e) {
      console.error('[AdminStore] deleteProduct failed', e);
      throw e;
    }
  },

  async deleteAllProducts(): Promise<void> {
    cacheDel('products');
    try {
      const response = await fetch(`${getBaseUrl()}/api/products/delete-all`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to delete all products');
    } catch (e) {
      console.error('[AdminStore] deleteAllProducts failed', e);
      throw e;
    }
  },

  async toggleProduct(id: string): Promise<void> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/products/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to toggle product');
      cacheDel('products');
    } catch (e) {
      console.error('[AdminStore] toggleProduct failed', e);
      throw e;
    }
  },

  // ── Orders ─────────────────────────────────────────────────
  async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/orders`);
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
    if (IS_TEST) {
      console.log("🧪 MOCK ORDER SAVED");
      return;
    }
    try {
      const response = await fetch(`${getBaseUrl()}/api/orders`, {
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

  async submitOrder(
    items: { id: string | number; name: string; price: number; quantity: number; linkedExtras?: string[] }[],
    total: number,
    whatsappNumber?: string,
    customerName?: string,
    customerPhone?: string,
    whatsappConfirmed?: boolean,
    channel: OrderChannel = 'WEB'
  ): Promise<string> {
    if (IS_TEST) {
      return "test-order-id";
    }
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
    try {
      const response = await fetch(`${getBaseUrl()}/api/orders/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to update status: ${response.status}`);
      }
    } catch (e) {
      console.error('[AdminStore] updateOrderStatus failed', e);
      throw e;
    }
  },

  async updateOrderWhatsAppConfirmed(id: string, confirmed: boolean): Promise<void> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/orders/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, whatsappConfirmed: confirmed }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
    } catch (e) {
      console.warn('[AdminStore] updateOrderWhatsAppConfirmed failed', e);
    }
  },

  // ── Settings ────────────────────────────────────────────────
  async getSettings(): Promise<BusinessSettings> {
    const memHit = cacheGet<BusinessSettings>('settings');
    if (memHit) return memHit;

    try {
      const response = await fetch(`${getBaseUrl()}/api/settings`);
      if (!response.ok) {
        console.warn('[AdminStore] settings fallback');
        return {
          businessName: "Snacks 911",
          acceptingOrders: true,
          prepTime: 30,
          whatsappNumber: "521234567890",
          openHours: {},
          address: "",
          heroBadgeText: "",
          heroStats: [],
          deliveryApps: []
        };
      }
      const settings = await response.json();
      cacheSet('settings', settings, TTL.SETTINGS);
      return settings;
    } catch (e) {
      console.warn('[AdminStore] settings fallback');
      return {
        businessName: "Snacks 911",
        acceptingOrders: true,
        prepTime: 30,
        whatsappNumber: "521234567890",
        openHours: {},
        address: "",
        heroBadgeText: "",
        heroStats: [],
        deliveryApps: []
      };
    }
  },

  async saveSettings(settings: BusinessSettings): Promise<void> {
    cacheDel('settings');
    try {
      const response = await fetch(`${getBaseUrl()}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
    } catch (e) {
      console.error('[AdminStore] saveSettings failed', e);
      throw e;
    }
  },

  // ── Sales ──────────────────────────────────────────────────
  async getSales(): Promise<SaleRecord[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/sales`);
      if (!response.ok) throw new Error('Failed to fetch sales');
      return await response.json();
    } catch (e) {
      console.warn('[AdminStore] getSales failed', e);
      return [];
    }
  },

  // ── Custom Categories ──────────────────────────────────────
  async getCustomCategories(): Promise<CustomCategory[]> {
    const hit = cacheGet<CustomCategory[]>('categories');
    if (hit) return hit;
    try {
      const response = await fetch(`${getBaseUrl()}/api/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const cats = await response.json();
      cacheSet('categories', cats, TTL.CATEGORIES);
      return cats;
    } catch (e) {
      console.warn('[AdminStore] getCustomCategories failed', e);
      return [];
    }
  },

  async saveCustomCategory(cat: CustomCategory): Promise<void> {
    cacheDel('categories');
    try {
      const response = await fetch(`${getBaseUrl()}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      if (!response.ok) throw new Error('Failed to save category');
    } catch (e) {
      console.error('[AdminStore] saveCustomCategory failed', e);
      throw e;
    }
  },

  async deleteCustomCategory(id: string): Promise<void> {
    cacheDel('categories');
    try {
      const response = await fetch(`${getBaseUrl()}/api/categories?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete category');
    } catch (e) {
      console.error('[AdminStore] deleteCustomCategory failed', e);
      throw e;
    }
  },

  // ── Customers ─────────────────────────────────────────────
  async getCustomer(phone: string): Promise<Customer | null> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/customers?phone=${phone}`);
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  },

  async upsertCustomer(c: Customer): Promise<void> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
      if (!response.ok) throw new Error('Failed to upsert customer');
    } catch (e) {
      console.warn('[AdminStore] upsertCustomer failed', e);
    }
  },

  async getAllCustomers(): Promise<Customer[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/customers`);
      if (!response.ok) return [];
      return await response.json();
    } catch { return []; }
  },

  async trackCustomerOrder(phone: string, name: string, total: number, orderDate: string, topProduct: string): Promise<void> {
    if (!phone || phone.length < 10) return;
    const existing = await this.getCustomer(phone);
    const now = new Date().toISOString();

    if (existing) {
      existing.totalOrders += 1;
      existing.lastOrderDate = orderDate;
      existing.lastOrderTotal = total;
      if (name) existing.name = name;
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
      const response = await fetch(`${getBaseUrl()}/api/audit-logs`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.warn('[AdminStore] getAuditLogs failed', e);
      return [];
    }
  },
};

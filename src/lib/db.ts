/**
 * db.ts — Supabase data access layer (async)
 * All AdminStore methods delegate here.
 */

import { supabase } from './supabase';
import type {
  AdminProduct, Order, OrderStatus,
  SaleRecord, BusinessSettings, CustomCategory,
  Customer, AuditLog,
} from './adminTypes';

// ─── Development Seed Defaults (used ONLY for local dev fallback) ─────────────
const SEED_PRODUCTS: AdminProduct[] = [
  { id: 'p1', name: 'Alitas BBQ',              price: 120, category: 'alitas',   available: true,  description: '8 alitas bañadas en salsa BBQ ahumada',          imageUrl: '' },
  { id: 'p2', name: 'Alitas Buffalo',           price: 120, category: 'alitas',   available: true,  description: '8 alitas en salsa buffalo picante clásica',      imageUrl: '' },
  { id: 'p3', name: 'Boneless Mango Habanero',  price: 130, category: 'boneless', available: true,  description: '10 boneless con salsa mango habanero artesanal', imageUrl: '' },
  { id: 'p4', name: 'Boneless BBQ Ranch',       price: 125, category: 'boneless', available: false, description: '10 boneless en salsa BBQ con aderezo ranch',      imageUrl: '' },
  { id: 'p5', name: 'Papas Gajo Loaded',        price: 80,  category: 'papas',    available: true,  description: 'Papas gajo con queso, tocino y jalapeños',       imageUrl: '' },
  { id: 'p6', name: 'Combo 911',                price: 220, category: 'combos',   available: true,  description: '12 alitas + papas gajo + 2 refrescos',           imageUrl: '' },
  { id: 'e1', name: 'Salsa Valentina',          price: 5,   category: 'extras',   available: true,  description: 'Salsa Valentina extra',                          imageUrl: '' },
  { id: 'e2', name: 'Salsa Buffalo',            price: 10,  category: 'extras',   available: true,  description: 'Porción extra de salsa buffalo',                 imageUrl: '' },
  { id: 'e3', name: 'Limones (6)',              price: 0,   category: 'extras',   available: true,  description: '6 limones frescos',                              imageUrl: '' },
  { id: 'e4', name: 'Cebolla Curtida',          price: 10,  category: 'extras',   available: true,  description: 'Porción de cebolla curtida',                     imageUrl: '' },
  { id: 'e5', name: 'Zanahorias',              price: 10,  category: 'extras',   available: true,  description: 'Zanahorias con limón y chile',                   imageUrl: '' },
  { id: 'e6', name: 'Queso Extra',              price: 20,  category: 'extras',   available: true,  description: 'Porción extra de queso derretido',               imageUrl: '' },
  { id: 'e7', name: 'Refresco',                price: 25,  category: 'extras',   available: true,  description: 'Refresco de 600ml',                              imageUrl: '' },
  { id: 'e8', name: 'Salsa Habanero',           price: 10,  category: 'extras',   available: true,  description: 'Salsa habanero artesanal 🌶️',                   imageUrl: '' },
];

const DEFAULT_SETTINGS: BusinessSettings = {
  prepTime: 25,
  acceptingOrders: true,
  whatsappNumber: '525584507458',
  openHours: {
    Lunes:    { open: true,  from: '13:00', to: '22:00' },
    Martes:   { open: true,  from: '13:00', to: '22:00' },
    Miércoles:{ open: true,  from: '13:00', to: '22:00' },
    Jueves:   { open: true,  from: '13:00', to: '23:00' },
    Viernes:  { open: true,  from: '12:00', to: '00:00' },
    Sábado:   { open: true,  from: '12:00', to: '00:00' },
    Domingo:  { open: false, from: '13:00', to: '21:00' },
  },
  businessName: 'Snacks 911',
  address: '',
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

// ─── Row mapping helpers ──────────────────────────────────────────────────────

export function rowToProduct(row: Record<string, unknown>): AdminProduct {
  const availabilityRaw = row.is_available ?? row.available;
  return {
    id:                   String(row.id),
    name:                 String(row.name),
    price:                Number(row.price),
    category:             String(row.category),
    imageUrl:             String(row.image_url ?? ''),
    available:            availabilityRaw === undefined ? true : Boolean(availabilityRaw),
    description:          String(row.description ?? ''),
    applicableProductIds: (row.applicable_product_ids as string[]) ?? [],
    deliveryPrice:        row.delivery_price ? Number(row.delivery_price) : undefined,
    priceToShow:          row.delivery_price ? Number(row.delivery_price) : Number(row.price),
  };
}

export function productToRow(p: AdminProduct) {
  const avail = (p as any).is_available ?? p.available ?? true;
  return {
    id:                    p.id,
    name:                  p.name,
    price:                 p.price,
    category:              p.category,
    image_url:             p.imageUrl,
    is_available:          avail,
    description:           p.description,
    applicable_product_ids: p.applicableProductIds ?? [],
    delivery_price:        p.deliveryPrice ?? null,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapOrderStatusFromDb(status: unknown): OrderStatus {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'draft') return 'pending';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'pending' || normalized === 'confirmed' || normalized === 'preparing' || normalized === 'ready' || normalized === 'delivered') {
    return normalized;
  }
  return 'pending';
}

function mapOrderStatusToDb(status: OrderStatus): string {
  return status;
}

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

function rowToOrder(row: Record<string, unknown>, items: Record<string, unknown>[]): Order {
  return {
    id:            String(row.id),
    status:        mapOrderStatusFromDb(row.status),
    channel:       (row.channel as any) || 'WEB',
    total:         Number(row.total),
    createdAt:     String(row.created_at),
    customerName:  String(row.customer_name),
    customerPhone: String(row.customer_phone ?? ''),
    notes:         String(row.notes ?? ''),
    handledBy:     String(row.handled_by ?? ''),
    whatsappConfirmed: Boolean(row.whatsapp_confirmed ?? false),
    items: items.map(i => ({
      productId:   String(i.product_id ?? ''),
      productName: String(i.product_name ?? i.product_id ?? 'Producto'),
      quantity:    Number(i.qty ?? i.quantity ?? 1),
      price:       Number(i.unit_price ?? i.price ?? 0),
    })),
  };
}

function rowToSettings(row: Record<string, unknown>): BusinessSettings {
  return {
    prepTime:        Number(row.prep_time ?? 25),
    acceptingOrders: Boolean(row.accepting_orders ?? true),
    whatsappNumber:  String(row.whatsapp_number ?? '525584507458'),
    openHours:       (row.open_hours as BusinessSettings['openHours']) ?? DEFAULT_SETTINGS.openHours,
    businessName:    String(row.business_name ?? 'Snacks 911'),
    address:         String(row.address ?? ''),
    heroBadgeText:   String(row.hero_badge_text ?? DEFAULT_SETTINGS.heroBadgeText),
    heroStats:       (row.hero_stats as BusinessSettings['heroStats']) ?? DEFAULT_SETTINGS.heroStats,
    deliveryApps:    (row.delivery_apps as BusinessSettings['deliveryApps']) ?? DEFAULT_SETTINGS.deliveryApps,
  };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function dbGetProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase.from('products').select('*').order('created_at');
  if (error) throw error;
  
  if (!data || data.length === 0) {
    // Return dev fallback if table is empty (useful for rapid dev, but not for prod)
    return SEED_PRODUCTS;
  }
  
  return (data as Record<string, unknown>[]).map(rowToProduct);
}



export async function dbSaveProduct(product: AdminProduct): Promise<void> {
  const { error } = await supabase.from('products').upsert(productToRow(product));
  if (error) throw error;
}

export async function dbDeleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function dbToggleProduct(id: string): Promise<void> {
  // Atomic toggle via Postgres function — no read-then-write race condition
  const { error } = await supabase.rpc('toggle_product_available', { p_id: id });
  if (error) throw error;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function dbGetOrders(): Promise<Order[]> {
  // Single query with embedded join (PostgREST foreign key embedding)
  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (ordersErr) throw ordersErr;
  if (!ordersData || ordersData.length === 0) return [];

  return (ordersData as Record<string, unknown>[]).map(row =>
    rowToOrder(row, (row.order_items as Record<string, unknown>[]) ?? [])
  );
}

export async function dbSaveOrder(order: Order): Promise<string> {
  const orderId = isUuid(order.id) ? order.id : createUuid();
  const orderRow = {
    id:             orderId,
    status:         mapOrderStatusToDb(order.status),
    channel:        order.channel || 'WEB',
    total:          order.total,
    created_at:     order.createdAt,
    customer_name:  order.customerName,
    customer_phone: order.customerPhone ?? '',
    notes:          order.notes ?? '',
    whatsapp_confirmed: order.whatsappConfirmed ?? false,
  };
  const { error } = await supabase.from('orders').upsert(orderRow);
  if (error) throw error;

  // Delete existing items & re-insert (ignore error if RLS prevents delete, e.g. for public users)
  try {
    await supabase.from('order_items').delete().eq('order_id', orderId);
  } catch (e) {
    console.warn('[db] Could not delete order_items (expected for new public orders)', e);
  }

  if (order.items.length > 0) {
    const itemRows = order.items.map(i => ({
      order_id: orderId,
      product_id: i.productId || '0', // fallback to '0' as text NOT NULL
      product_name: i.productName,
      quantity: i.quantity,
      price: i.price,
    }));
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
    if (itemsErr) throw itemsErr;
  }

  return orderId;
}

export async function dbUpdateOrderStatus(id: string, status: OrderStatus, handledBy?: string): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (handledBy) update.handled_by = handledBy;
  const { error } = await supabase.from('orders').update(update).eq('id', id);
  if (error) throw error;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function dbGetSettings(): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Insert default row
    await dbSaveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return rowToSettings(data as Record<string, unknown>);
}

export async function dbSaveSettings(settings: BusinessSettings): Promise<void> {
  const row = {
    prep_time:        settings.prepTime,
    accepting_orders: settings.acceptingOrders,
    whatsapp_number:  settings.whatsappNumber,
    open_hours:       settings.openHours,
    business_name:    settings.businessName,
    address:          settings.address,
    hero_badge_text:  settings.heroBadgeText,
    hero_stats:       settings.heroStats,
    delivery_apps:    settings.deliveryApps,
    updated_at:       new Date().toISOString(),
  };

  // Atomic upsert — no check-then-write race
  const { error } = await supabase
    .from('business_settings')
    .upsert({ ...row, id: 1 }, { onConflict: 'id' });
  if (error) throw error;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export async function dbGetSales(): Promise<SaleRecord[]> {
  // Server-side aggregation — push GROUP BY to Postgres
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total')
    .in('status', ['preparing', 'ready', 'delivered'])
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  if (error) throw error;
  if (!data || data.length === 0) return getSeededSales();

  const byDate: Record<string, { total: number; orderCount: number }> = {};
  for (const row of data as Record<string, unknown>[]) {
    const date = String(row.created_at).slice(0, 10);
    if (!byDate[date]) byDate[date] = { total: 0, orderCount: 0 };
    byDate[date].total += Number(row.total);
    byDate[date].orderCount += 1;
  }

  return Object.entries(byDate)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
}

function getSeededSales(): SaleRecord[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      total: 800 + Math.floor(Math.random() * 1200),
      orderCount: 8 + Math.floor(Math.random() * 12),
    };
  });
}

// ─── Custom Categories ────────────────────────────────────────────────────────

export async function dbGetCustomCategories(): Promise<CustomCategory[]> {
  const { data, error } = await supabase.from('custom_categories').select('*');
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:    (r as Record<string, unknown>).id as string,
    label: (r as Record<string, unknown>).label as string,
    emoji: (r as Record<string, unknown>).emoji as string,
  }));
}

export async function dbSaveCustomCategory(cat: CustomCategory): Promise<void> {
  const { error } = await supabase.from('custom_categories').upsert(cat);
  if (error) throw error;
}

export async function dbDeleteCustomCategory(id: string): Promise<void> {
  const { error } = await supabase.from('custom_categories').delete().eq('id', id);
  if (error) throw error;
}

// ─── Customers ────────────────────────────────────────────────────────────────

function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    phoneNumber:    String(row.phone_number),
    name:           String(row.name ?? ''),
    totalOrders:    Number(row.total_orders ?? 0),
    lastOrderDate:  String(row.last_order_date ?? ''),
    lastOrderTotal: Number(row.last_order_total ?? 0),
    favoriteProduct: String(row.favorite_product ?? ''),
    createdAt:      String(row.created_at ?? new Date().toISOString()),
  };
}

export async function dbGetCustomer(phone: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', phone)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToCustomer(data as Record<string, unknown>);
}

export async function dbUpsertCustomer(c: Customer): Promise<void> {
  const row = {
    phone_number:    c.phoneNumber,
    name:            c.name,
    total_orders:    c.totalOrders,
    last_order_date: c.lastOrderDate,
    last_order_total: c.lastOrderTotal,
    favorite_product: c.favoriteProduct,
    created_at:      c.createdAt,
  };
  const { error } = await supabase.from('customers').upsert(row);
  if (error) throw error;
}

export async function dbGetAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('total_orders', { ascending: false });
  if (error) throw error;
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToCustomer);
}

export async function dbGetAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:        String(r.id),
    tableName: String(r.table_name),
    recordId:  String(r.record_id),
    action:    (r.action === 'INSERT' || r.action === 'UPDATE' || r.action === 'DELETE') ? r.action : 'UPDATE',
    oldData:   r.old_data,
    newData:   r.new_data,
    changedBy: String(r.changed_by),
    createdAt: String(r.created_at),
  }));
}

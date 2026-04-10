/**
 * db.ts — Supabase data access layer (async)
 * All AdminStore methods delegate here.
 */

import { supabase } from './supabase';
import type {
  AdminProduct, Order, OrderStatus,
  SaleRecord, BusinessSettings, CustomCategory,
  Customer,
} from './adminTypes';

// ─── Seed defaults (used when table is empty) ─────────────────────────────────
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

function rowToProduct(row: Record<string, unknown>): AdminProduct {
  return {
    id:                   String(row.id),
    name:                 String(row.name),
    price:                Number(row.price),
    category:             String(row.category),
    imageUrl:             String(row.image_url ?? ''),
    available:            Boolean(row.available),
    description:          String(row.description ?? ''),
    applicableProductIds: (row.applicable_product_ids as string[]) ?? [],
  };
}

function productToRow(p: AdminProduct) {
  return {
    id:                    p.id,
    name:                  p.name,
    price:                 p.price,
    category:              p.category,
    image_url:             p.imageUrl,
    available:             p.available,
    description:           p.description,
    applicable_product_ids: p.applicableProductIds ?? [],
  };
}

function rowToOrder(row: Record<string, unknown>, items: Record<string, unknown>[]): Order {
  return {
    id:            String(row.id),
    status:        (row.status as OrderStatus) ?? 'pending',
    total:         Number(row.total),
    createdAt:     String(row.created_at),
    customerName:  String(row.customer_name),
    customerPhone: String(row.customer_phone ?? ''),
    notes:         String(row.notes ?? ''),
    handledBy:     String(row.handled_by ?? ''),
    items: items.map(i => ({
      productId:   String(i.product_id ?? ''),
      productName: String(i.product_name),
      quantity:    Number(i.quantity),
      price:       Number(i.price),
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
    // Seed on first use
    await dbSeedProducts();
    return SEED_PRODUCTS;
  }
  return (data as Record<string, unknown>[]).map(rowToProduct);
}

async function dbSeedProducts() {
  const rows = SEED_PRODUCTS.map(productToRow);
  await supabase.from('products').upsert(rows);
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
  // Read current, flip, write back
  const { data, error } = await supabase.from('products').select('available').eq('id', id).single();
  if (error) throw error;
  const { error: e2 } = await supabase.from('products').update({ available: !data.available }).eq('id', id);
  if (e2) throw e2;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function dbGetOrders(): Promise<Order[]> {
  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (ordersErr) throw ordersErr;
  if (!ordersData || ordersData.length === 0) return [];

  const orderIds = ordersData.map((o: Record<string, unknown>) => o.id as string);
  const { data: itemsData, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);
  if (itemsErr) throw itemsErr;

  const itemsByOrder: Record<string, Record<string, unknown>[]> = {};
  for (const item of (itemsData ?? []) as Record<string, unknown>[]) {
    const oid = item.order_id as string;
    if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
    itemsByOrder[oid].push(item);
  }

  return (ordersData as Record<string, unknown>[]).map(row =>
    rowToOrder(row, itemsByOrder[row.id as string] ?? [])
  );
}

export async function dbSaveOrder(order: Order): Promise<void> {
  const orderRow = {
    id:             order.id,
    status:         order.status,
    total:          order.total,
    created_at:     order.createdAt,
    customer_name:  order.customerName,
    customer_phone: order.customerPhone ?? '',
    notes:          order.notes ?? '',
  };
  const { error } = await supabase.from('orders').upsert(orderRow);
  if (error) throw error;

  // Delete existing items & re-insert
  await supabase.from('order_items').delete().eq('order_id', order.id);
  if (order.items.length > 0) {
    const itemRows = order.items.map(i => ({
      order_id:     order.id,
      product_id:   i.productId,
      product_name: i.productName,
      quantity:     i.quantity,
      price:        i.price,
    }));
    const { error: e2 } = await supabase.from('order_items').insert(itemRows);
    if (e2) throw e2;
  }
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

  // Check if a row exists
  const { data: existing } = await supabase
    .from('business_settings')
    .select('id')
    .order('id')
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase.from('business_settings').update(row).eq('id', (existing as Record<string, unknown>).id);
  } else {
    await supabase.from('business_settings').insert(row);
  }
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export async function dbGetSales(): Promise<SaleRecord[]> {
  // Derive sales from orders table (group by date)
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total, status')
    .neq('status', 'pending');
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

import type {
  AdminProduct, Order, OrderStatus,
  SaleRecord, BusinessSettings,
} from './adminTypes';

// ─── localStorage keys ────────────────────────────────────────────────────────
const K = {
  PRODUCTS: 'snacks911_admin_products',
  ORDERS:   'snacks911_admin_orders',
  SETTINGS: 'snacks911_admin_settings',
  SALES:    'snacks911_admin_sales',
} as const;

// ─── Seed data ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const ts = (h: number, m = 0) =>
  new Date(new Date().setHours(h, m, 0, 0)).toISOString();

const SEED_PRODUCTS: AdminProduct[] = [
  { id: 'p1', name: 'Alitas BBQ',              price: 120, category: 'alitas',   available: true,  description: '8 alitas bañadas en salsa BBQ ahumada',          imageUrl: '' },
  { id: 'p2', name: 'Alitas Buffalo',           price: 120, category: 'alitas',   available: true,  description: '8 alitas en salsa buffalo picante clásica',      imageUrl: '' },
  { id: 'p3', name: 'Boneless Mango Habanero',  price: 130, category: 'boneless', available: true,  description: '10 boneless con salsa mango habanero artesanal', imageUrl: '' },
  { id: 'p4', name: 'Boneless BBQ Ranch',       price: 125, category: 'boneless', available: false, description: '10 boneless en salsa BBQ con aderezo ranch',      imageUrl: '' },
  { id: 'p5', name: 'Papas Gajo Loaded',        price: 80,  category: 'papas',    available: true,  description: 'Papas gajo con queso, tocino y jalapeños',       imageUrl: '' },
  { id: 'p6', name: 'Combo 911',                price: 220, category: 'combos',   available: true,  description: '12 alitas + papas gajo + 2 refrescos',           imageUrl: '' },
];

const SEED_ORDERS: Order[] = [
  {
    id: 'ORD-001', status: 'pending',   total: 120,  createdAt: ts(12, 48), customerName: 'Carlos M.',    customerPhone: '555-1234',
    items: [{ productId: 'p1', productName: 'Alitas BBQ',             quantity: 1, price: 120 }],
  },
  {
    id: 'ORD-002', status: 'preparing', total: 300,  createdAt: ts(12, 20), customerName: 'María G.',     customerPhone: '555-5678',
    items: [
      { productId: 'p6', productName: 'Combo 911',         quantity: 1, price: 220 },
      { productId: 'p5', productName: 'Papas Gajo Loaded', quantity: 1, price: 80  },
    ],
  },
  {
    id: 'ORD-003', status: 'ready',     total: 130,  createdAt: ts(11, 55), customerName: 'Juan R.',      notes: 'Sin jalapeños',
    items: [{ productId: 'p3', productName: 'Boneless Mango Habanero', quantity: 1, price: 130 }],
  },
  {
    id: 'ORD-004', status: 'delivered', total: 240,  createdAt: ts(11, 10), customerName: 'Ana P.',
    items: [{ productId: 'p1', productName: 'Alitas BBQ', quantity: 2, price: 120 }],
  },
  {
    id: 'ORD-005', status: 'delivered', total: 220,  createdAt: ts(10, 30), customerName: 'Luis T.',
    items: [{ productId: 'p6', productName: 'Combo 911', quantity: 1, price: 220 }],
  },
];

const seedDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const SEED_SALES: SaleRecord[] = [
  { date: seedDate(6), total: 1240, orderCount: 12 },
  { date: seedDate(5), total: 980,  orderCount: 9  },
  { date: seedDate(4), total: 1560, orderCount: 14 },
  { date: seedDate(3), total: 2100, orderCount: 19 },
  { date: seedDate(2), total: 1780, orderCount: 16 },
  { date: seedDate(1), total: 1340, orderCount: 12 },
  { date: today,       total: 710,  orderCount: 6  },
];

const SEED_SETTINGS: BusinessSettings = {
  prepTime: 25,
  acceptingOrders: true,
  whatsappNumber: '5215551234567',
  openHours: {
    Lunes:    { open: true,  from: '13:00', to: '22:00' },
    Martes:   { open: true,  from: '13:00', to: '22:00' },
    Miércoles:{ open: true,  from: '13:00', to: '22:00' },
    Jueves:   { open: true,  from: '13:00', to: '23:00' },
    Viernes:  { open: true,  from: '12:00', to: '00:00' },
    Sábado:   { open: true,  from: '12:00', to: '00:00' },
    Domingo:  { open: false, from: '13:00', to: '21:00' },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── AdminStore ───────────────────────────────────────────────────────────────
export const AdminStore = {
  // ── Products ──────────────────────────────────────────────────────────────
  getProducts(): AdminProduct[] {
    const stored = read<AdminProduct[] | null>(K.PRODUCTS, null);
    if (!stored) {
      write(K.PRODUCTS, SEED_PRODUCTS);
      return SEED_PRODUCTS;
    }
    return stored;
  },

  saveProduct(product: AdminProduct): void {
    const all = this.getProducts();
    const idx = all.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      all[idx] = product;
    } else {
      all.push(product);
    }
    write(K.PRODUCTS, all);
  },

  deleteProduct(id: string): void {
    const all = this.getProducts().filter(p => p.id !== id);
    write(K.PRODUCTS, all);
  },

  toggleProduct(id: string): void {
    const all = this.getProducts();
    const prod = all.find(p => p.id === id);
    if (prod) { prod.available = !prod.available; write(K.PRODUCTS, all); }
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  getOrders(): Order[] {
    const stored = read<Order[] | null>(K.ORDERS, null);
    if (!stored) {
      write(K.ORDERS, SEED_ORDERS);
      return SEED_ORDERS;
    }
    return stored;
  },

  saveOrder(order: Order): void {
    const all = this.getOrders();
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) { all[idx] = order; } else { all.unshift(order); }
    write(K.ORDERS, all);
  },

  updateOrderStatus(id: string, status: OrderStatus): void {
    const all = this.getOrders();
    const order = all.find(o => o.id === id);
    if (order) { order.status = status; write(K.ORDERS, all); }
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings(): BusinessSettings {
    const stored = read<BusinessSettings | null>(K.SETTINGS, null);
    if (!stored) { write(K.SETTINGS, SEED_SETTINGS); return SEED_SETTINGS; }
    return stored;
  },

  saveSettings(settings: BusinessSettings): void {
    write(K.SETTINGS, settings);
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  getSales(): SaleRecord[] {
    const stored = read<SaleRecord[] | null>(K.SALES, null);
    if (!stored) { write(K.SALES, SEED_SALES); return SEED_SALES; }
    return stored;
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  login(user: string, pass: string): boolean {
    const validUser = process.env.NEXT_PUBLIC_ADMIN_USER ?? 'admin';
    const validPass = process.env.NEXT_PUBLIC_ADMIN_PASS ?? 'snacks911';
    if (user === validUser && pass === validPass) {
      localStorage.setItem('admin_token', 'local_auth_ok');
      return true;
    }
    return false;
  },

  logout(): void {
    localStorage.removeItem('admin_token');
  },

  isAuthed(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('admin_token') === 'local_auth_ok';
  },
};

// ─── Admin Types ──────────────────────────────────────────────────────────────

// Known categories + allow custom ones
export type ProductCategory = 'proteina' | 'papas' | 'combos' | 'banderillas' | 'postres' | 'extras' | (string & {});

export const DEFAULT_CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'proteina', label: 'Proteína', emoji: '🍗' },
  { id: 'papas',    label: 'Papas',    emoji: '🍟' },
  { id: 'combos',   label: 'Combos',   emoji: '🔥' },
  { id: 'banderillas', label: 'Banderillas', emoji: '🌭' },
  { id: 'postres',  label: 'Postres',  emoji: '🍫' },
  { id: 'extras',   label: 'Extras',   emoji: '➕' },
];

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  available: boolean;
  description: string;
  /** Only for extras: which product IDs this extra applies to. Empty = applies to all. */
  applicableProductIds?: string[];
  deliveryPrice?: number;
  priceToShow?: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export type OrderChannel = 'WEB' | 'POS' | 'WHATSAPP';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  channel?: OrderChannel;
  createdAt: string;       // ISO date string
  customerName: string;
  customerPhone?: string;
  notes?: string;
  handledBy?: string;      // employee name who handled this order
  whatsappConfirmed?: boolean; // true if customer confirmed WhatsApp sent
}

export interface SaleRecord {
  date: string;            // 'YYYY-MM-DD'
  total: number;
  orderCount: number;
}

export interface Customer {
  phoneNumber: string;     // primary key
  name: string;
  totalOrders: number;
  lastOrderDate: string;   // ISO date
  lastOrderTotal: number;
  favoriteProduct: string;
  createdAt: string;       // ISO date
}

export type UserRole = 'admin' | 'gerente' | 'staff';

export interface Employee {
  id: string;
  employeeId: string;     // Unique login identifier (e.g. "admin001")
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface DayHours {
  open: boolean;
  from: string;            // 'HH:mm'
  to: string;              // 'HH:mm'
}

export interface DeliveryApp {
  name: string;
  href: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface BusinessSettings {
  prepTime: number;        // minutes
  acceptingOrders: boolean;
  whatsappNumber: string;
  openHours: Record<string, DayHours>;
  // Info del negocio
  businessName: string;
  address: string;
  // Hero content
  heroBadgeText: string;
  heroStats: HeroStat[];
  deliveryApps: DeliveryApp[];
}

export interface CustomCategory {
  id: string;
  label: string;
  emoji: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   '⏳ Pendiente',
  confirmed: '🤝 Confirmado',
  preparing: '🔥 Preparando',
  ready:     '✅ Listo',
  delivered: '📦 Entregado',
  cancelled: '❌ Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   '#FFB800',
  confirmed: '#3B82F6',
  preparing: '#FF4500',
  ready:     '#22c55e',
  delivered: '#555555',
  cancelled: '#ef4444',
};

export const CATEGORY_LABELS: Record<string, string> = {
  proteina: '🍗 Proteína',
  papas:    '🍟 Papas',
  combos:   '🚨 Combos',
  banderillas: '🌭 Banderillas',
  postres:  '🍫 Postres',
  extras:   '🍋 Extras',
};

/** Get all category labels including custom ones */
export function getAllCategoryLabels(customCategories: CustomCategory[]): Record<string, string> {
  const labels = { ...CATEGORY_LABELS };
  for (const cat of customCategories) {
    labels[cat.id] = cat.label;
  }
  return labels;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData: any;
  newData: any;
  changedBy: string;
  createdAt: string;
}

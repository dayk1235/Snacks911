// ─── Admin Types ──────────────────────────────────────────────────────────────

export type ProductCategory = 'alitas' | 'boneless' | 'papas' | 'combos';

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  available: boolean;
  description: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

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
  createdAt: string;       // ISO date string
  customerName: string;
  customerPhone?: string;
  notes?: string;
}

export interface SaleRecord {
  date: string;            // 'YYYY-MM-DD'
  total: number;
  orderCount: number;
}

export interface DayHours {
  open: boolean;
  from: string;            // 'HH:mm'
  to: string;              // 'HH:mm'
}

export interface BusinessSettings {
  prepTime: number;        // minutes
  acceptingOrders: boolean;
  whatsappNumber: string;
  openHours: Record<string, DayHours>;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   '⏳ Pendiente',
  preparing: '🔥 Preparando',
  ready:     '✅ Listo',
  delivered: '📦 Entregado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   '#FFB800',
  preparing: '#FF4500',
  ready:     '#22c55e',
  delivered: '#555555',
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  alitas:   '🍗 Alitas',
  boneless: '🔥 Boneless',
  papas:    '🍟 Papas',
  combos:   '🚨 Combos',
};

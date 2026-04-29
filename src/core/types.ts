/**
 * core/types.ts — Shared types for the CORE layer (pure TypeScript, no React).
 *
 * This layer contains ALL business logic types.
 * UI components only import from here, never from lib/ directly.
 */

import type { Product } from '@/data/products';

// ─── Chat/Order Types ────────────────────────────────────────────────────────

export type Intent =
  | 'aceptacion'
  | 'rechazo'
  | 'rechazo_fuerte'
  | 'pago_problema'
  | 'exploracion'
  | 'browsing'
  | 'hambre'
  | 'duda'
  | 'precio'
  | 'pedido'
  | 'gratitud'
  | 'despedida'
  | 'edicion'
  | 'urgencia'
  | 'mixto';

export type Stage = 'inicio' | 'explorando' | 'decidiendo' | 'ordenando' | 'post_venta';

export type UpsellStep = 'none' | 'papas' | 'bebida' | 'postre' | 'done';
export type DeliveryStep = 'none' | 'name' | 'address' | 'reference' | 'payment' | 'done';

export interface ConversationState {
  stage: Stage;
  lastIntent: Intent;
  lastResponse: string | null;
  comboSelected: boolean;
  upsellStep: UpsellStep;
  deliveryStep: DeliveryStep;
  customerName: string;
  customerAddress: string;
  customerReference: string;
  customerPayment: string;
  orderConfirmed: boolean;
  retryCount: number;
  cart: string[];
  cartTotal: number;
  whatsappUrl: string | null;
  reset: boolean;
}

export interface QuickAction {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  actions?: QuickAction[];
  productCards?: CoreProduct[];
}

// ─── Product Types ───────────────────────────────────────────────────────────

export interface CoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Product['category'];
  imageUrl?: string;
  available?: boolean;
  badge?: string;
  badges?: string[];
  originalPrice?: number;
}

export interface ProductRefs {
  comboName: string;
  comboPrice: number;
  papasName: string;
  papasPrice: number;
  bebidaName: string;
  bebidaPrice: number;
  postreName: string;
  postrePrice: number;
  comboBonelessName: string;
  comboBonelessPrice: number;
  ahorroBoneless: number;
  currentTotal: number;
  hasPapas: boolean;
  hasBebida: boolean;
  hasPostre: boolean;
}

// ─── Cart Types ──────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Product['category'];
  image: string;
  quantity: number;
  isStandaloneExtra?: boolean;
  linkedExtras?: string[];
}

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// ─── Order Types ─────────────────────────────────────────────────────────────

export interface OrderItem {
  product: CoreProduct;
  qty: number;
}

export interface OrderSummary {
  lines: string[];
  total: number;
  whatsappUrl: string;
}

export interface CustomerProfile {
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: Date | null;
  createdAt: Date;
  favoriteItems?: Array<{ itemId: string; orderCount: number }>;
  preferredUpsellType?: 'value' | 'premium' | 'bundle' | null;
}

export interface UserPrefs {
  pastOrders: Array<{ items: string[]; total: number; date: string }>;
  favorites: Record<string, number>;
}

// ─── Response Engine Types ───────────────────────────────────────────────────

export interface PromptContext {
  comboName: string;
  comboPrice: number;
  papasName: string;
  papasPrice: number;
  bebidaName: string;
  bebidaPrice: number;
  postreName: string;
  postrePrice: number;
  comboBonelessName: string;
  comboBonelessPrice: number;
  ahorroBoneless: number;
  currentTotal: number;
  hasPapas: boolean;
  hasBebida: boolean;
  hasPostre: boolean;
}

export interface ResponseOutput {
  text: string;
  actions?: QuickAction[];
  nextState: ConversationState;
}

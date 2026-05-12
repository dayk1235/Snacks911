/**
 * core/types.ts — Shared types for the CORE layer (pure TypeScript, no React).
 *
 * This layer contains ALL business logic types.
 * UI components only import from here, never from lib/ directly.
 */

// ─── Chat/Order Types ────────────────────────────────────────────────────────

export type Intent =
  | 'aceptacion'
  | 'rechazo'
  | 'rechazo_fuerte'
  | 'pago_problema'
  | 'exploracion'
  | 'browsing'
  | 'hungry_strong'
  | 'hungry_light'
  | 'undecided'
  | 'pricing'
  | 'ready_to_order'
  | 'complaint'
  | 'gratitud'
  | 'despedida'
  | 'edicion'
  | 'urgencia'
  | 'mixto'
  | 'duda'
  | 'list_products'
  | 'pedido'
  | 'hambre'
  | 'precio'
  | 'SHOW_MENU'
  | 'ADD_TO_CART'
  | 'VIEW_CART'
  | 'CONFIRM_ORDER'
  | 'CHECKOUT'
  | 'EDIT_CART'
  | 'RECOMMEND'
  | 'UNKNOWN'
  | 'SHOW_CATEGORY'
  | 'LOYALTY_QUERY'
  | 'REDEEM_POINTS'
  | 'APPLY_REFERRAL'
  | 'other';


export type CategoryType = 'combo' | 'boneless' | 'alitas' | 'papas' | 'bebida' | 'postre' | 'extra' | 'none';

export interface Entities {
  products: string[];
  categories: string[];
  qty: number[];
  sauces: string[];
  restrictions: string[];
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
  action?: ActionType;
  filters?: string[];
  category?: CategoryType;
  allergies?: string[];
  scores?: Record<string, number>;
}

export type Stage = 'inicio' | 'explorando' | 'decidiendo' | 'ordenando' | 'post_venta';

export type UpsellStep = 'none' | 'papas' | 'bebida' | 'postre' | 'done';
export type DeliveryStep = 'none' | 'name' | 'address' | 'reference' | 'payment' | 'done';

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
}

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
  cart: Cart;
  cartTotal: number;
  whatsappUrl: string | null;
  phone?: string;
  orderTimestamp?: number;
  reset: boolean;
  allergies: string[];
  recommendedProducts?: RecommendedProduct[];
  lastProductsShown?: string[];
  messages: ChatMessage[];
}

export const INITIAL_STATE: ConversationState = {
  stage: 'inicio',
  lastIntent: 'UNKNOWN',
  lastResponse: null,
  comboSelected: false,
  upsellStep: 'none',
  deliveryStep: 'none',
  customerName: '',
  customerAddress: '',
  customerReference: '',
  customerPayment: '',
  orderConfirmed: false,
  retryCount: 0,
  cart: { items: [], total: 0 },
  cartTotal: 0,
  whatsappUrl: null,
  reset: false,
  allergies: [],
  messages: []
};

export interface QuickAction {
  label: string;
  value: string;
  id?: string | number;
  image?: string;
  price?: number;
}

export type ActionType =
  | 'add_to_cart'
  | 'upsell'
  | 'show_category'
  | 'recommend'
  | 'navigate'
  | 'dismiss'
  | 'repeat_order'
  | 'checkout'
  | 'view_cart';

export interface Action<T = any> {
  id: string;
  label: string;
  type: ActionType;
  payload?: T;
  disabled?: boolean;
  meta?: {
    sourceSkill?: string;
    strategy?: string;
  };
  /** @deprecated use type/payload */
  value?: string;
  image?: string;
  price?: number;
}

export interface UICard {
  id: string;
  title: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  actions?: Action[];
}

export interface UICart {
  total: number;
  itemCount: number;
}

export interface BotUI {
  cards?: UICard[];
  suggestions?: string[];
  cart?: UICart;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  type?: 'text' | 'buttons' | 'products';
  actions?: Action[];
  productCards?: CoreProduct[];
}

// ─── Product Types ───────────────────────────────────────────────────────────

export interface CoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  ingredients: string[];
  available?: boolean;
  badge?: string;
  badges?: string[];
  originalPrice?: number;
  stock?: number;
  cost?: number;
}

// ─── Standardized Types ──────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

/**
 * Canonical CartItem — single source of truth.
 *
 * UI layer (cartEngine) populates: id, name, price, quantity, category, image, description, ingredients, linkedExtras, isStandaloneExtra
 * Bot engine layer populates: productId, qty (aliasing id/quantity)
 *
 * All fields except name and price are optional to allow both shapes.
 */
export interface CartItem {
  // UI / cartEngine primary fields
  id: string;
  name: string;
  price: number;
  quantity: number;
  // Optional UI fields
  description?: string;
  category?: string;
  image?: string;
  ingredients?: string[];
  linkedExtras?: string[];
  isStandaloneExtra?: boolean;
  // Bot engine aliases (populated alongside id/quantity when coming from bot)
  productId?: string;
  qty?: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface UserContext {
  userId: string;
  cart: Cart;
  state: string;
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

// Legacy Cart types (to be migrated)
export interface LegacyCartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  quantity: number;
  ingredients: string[];
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
  favoriteProduct?: string;
  preferences?: string[];
  restrictions?: string[];
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
  type?: 'text' | 'buttons' | 'products';
  actions?: Action[];
  cart?: Cart;
  nextState: ConversationState;
  ui?: BotUI;
}

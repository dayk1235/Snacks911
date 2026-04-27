/**
 * sessionManager.ts
 * Reads and writes WhatsApp bot sessions (cart + state) in Supabase.
 */

import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';

const db = () => supabaseAdmin || supabaseAnon;

export type BotState =
  | 'S0_IDLE'
  | 'S1_BROWSING_MENU'
  | 'S2_BUILDING_CART'
  | 'S3_NEED_SAUCE'
  | 'S4_UPSELL_OFFER'
  | 'S5_CONFIRM'
  | 'S6_CHECKOUT'
  | 'S7_HANDOFF';

export interface CartItem {
  product: string;
  qty: number;
  unit_price: number;
  sauce?: string;
  modifiers?: string[];
}

export interface BotSession {
  phone_number: string;
  state: BotState;
  cart_data: CartItem[];
  unknown_count: number;
  last_interaction: string;
}

// ── Get or create session ──────────────────────────────────────────────────
export async function getSession(phone: string): Promise<BotSession> {
  const client = db();
  if (!client) throw new Error('No DB connection');

  const { data, error } = await client
    .from('wa_sessions')
    .select('*')
    .eq('phone_number', phone)
    .single();

  if (error || !data) {
    // Create new session
    const newSession: Omit<BotSession, 'last_interaction'> = {
      phone_number: phone,
      state: 'S0_IDLE',
      cart_data: [],
      unknown_count: 0,
    };
    const { data: created } = await client
      .from('wa_sessions')
      .upsert({ ...newSession, last_interaction: new Date().toISOString() })
      .select()
      .single();
    return created as BotSession;
  }

  return data as BotSession;
}

// ── Update session state ───────────────────────────────────────────────────
export async function updateState(phone: string, state: BotState): Promise<void> {
  const client = db();
  if (!client) return;
  await client
    .from('wa_sessions')
    .upsert({ phone_number: phone, state, last_interaction: new Date().toISOString() });
}

// ── Update cart ────────────────────────────────────────────────────────────
export async function updateCart(phone: string, cart: CartItem[]): Promise<void> {
  const client = db();
  if (!client) return;
  await client
    .from('wa_sessions')
    .upsert({ phone_number: phone, cart_data: cart, last_interaction: new Date().toISOString() });
}

// ── Add item to cart ───────────────────────────────────────────────────────
export async function addToCart(phone: string, item: CartItem): Promise<CartItem[]> {
  const session = await getSession(phone);
  const cart = session.cart_data || [];

  // Check if same product already in cart
  const existingIndex = cart.findIndex(c => c.product === item.product);
  if (existingIndex >= 0) {
    cart[existingIndex].qty += item.qty;
  } else {
    cart.push(item);
  }

  await updateCart(phone, cart);
  return cart;
}

// ── Remove item from cart ──────────────────────────────────────────────────
export async function removeFromCart(phone: string, productName: string): Promise<CartItem[]> {
  const session = await getSession(phone);
  const cart = session.cart_data.filter(c => !c.product.toLowerCase().includes(productName.toLowerCase()));
  await updateCart(phone, cart);
  return cart;
}

// ── Set sauce on last item ─────────────────────────────────────────────────
export async function setSauceOnLastItem(phone: string, sauce: string): Promise<CartItem[]> {
  const session = await getSession(phone);
  const cart = [...session.cart_data];
  if (cart.length > 0) {
    // Apply to last item that requires sauce without one set
    const pending = [...cart].reverse().find(c => !c.sauce);
    if (pending) {
      const idx = cart.lastIndexOf(pending);
      cart[idx] = { ...cart[idx], sauce };
    }
  }
  await updateCart(phone, cart);
  return cart;
}

// ── Clear cart ─────────────────────────────────────────────────────────────
export async function clearCart(phone: string): Promise<void> {
  await updateCart(phone, []);
  await updateState(phone, 'S0_IDLE');
}

// ── Increment unknown count ────────────────────────────────────────────────
export async function incrementUnknown(phone: string): Promise<number> {
  const session = await getSession(phone);
  const count = (session.unknown_count || 0) + 1;
  const client = db();
  if (client) {
    await client
      .from('wa_sessions')
      .upsert({ phone_number: phone, unknown_count: count, last_interaction: new Date().toISOString() });
  }
  return count;
}

// ── Reset unknown count ────────────────────────────────────────────────────
export async function resetUnknown(phone: string): Promise<void> {
  const client = db();
  if (!client) return;
  await client
    .from('wa_sessions')
    .upsert({ phone_number: phone, unknown_count: 0, last_interaction: new Date().toISOString() });
}

// ── Format cart as readable text ───────────────────────────────────────────
export function formatCartText(cart: CartItem[]): string {
  if (!cart || cart.length === 0) return '_(carrito vacío)_';

  const lines = cart.map(item => {
    const sauce = item.sauce && item.sauce !== 'NONE' ? ` (${item.sauce})` : '';
    const mods = item.modifiers?.length ? ` + ${item.modifiers.join(', ')}` : '';
    return `• ${item.qty}x ${item.product}${sauce}${mods} — $${(item.unit_price * item.qty).toFixed(0)}`;
  });

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
  return lines.join('\n') + `\n\n*Total: $${total.toFixed(0)}*`;
}

// ── Log KPI event ───────────────────────────────────────────────────────────
export async function logEvent(
  phone: string,
  event_type: string,
  payload: Record<string, any> = {}
): Promise<void> {
  const client = db();
  if (!client) return;
  await client
    .from('wa_events')
    .insert({ phone_number: phone, event_type, payload });
}

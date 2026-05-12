import { supabaseAdmin as admin } from './supabaseAdmin';
import * as server from './server/supabaseServer';
import { createUuid } from '@/lib/utils/core';
export type { Customer } from './adminTypes';

const isServer = typeof window === 'undefined';

if (!isServer) {
  console.warn(
    'db.server.ts is server-only. Do not import in React components or client code.'
  );
}

export const db = isServer ? admin : ({} as any);
export const supabase = isServer ? admin : ({} as any);

export const getSupabaseAdmin = isServer ? server.getSupabaseAdmin : (() => ({} as any));
export const supabaseAnon = isServer ? server.supabaseAnon : ({} as any);
export const getCustomerProfileFromDB = isServer ? server.getCustomerProfileFromDB : (async () => null);
export const upsertCustomerProfile = isServer ? server.upsertCustomerProfile : (async () => {});

export async function getSystemState() {
  if (!isServer) return { mode: 'NORMAL' };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('system_state')
    .select('*')
    .eq('id', 'global')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSystemState(updates: any) {
  if (!isServer) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('system_state')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 'global');
  if (error) throw error;
}

export async function saveAiCost(data: {
  user_id: string;
  tokens_input: number;
  tokens_output: number;
  cost: number;
  intent?: string;
  order_id?: string;
}) {
  if (!isServer) return;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('ai_costs')
      .insert(data);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn("AI cost skipped:", error.message);
      } else {
        console.error('[db.server] Error saving AI cost:', error);
      }
    }
  } catch (err: any) {
    console.warn("AI cost skipped:", err?.message || err);
  }
}

// Re-exports from db.ts (using dynamic import to avoid circular dependency at top level)
async function getDbModule() {
  return import('./db');
}

// ─── Product Cache ────────────────────────────────────────────────────────────
let productCache: any = null;
let productCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

async function realDbFetch() {
  try {
    const m = await getDbModule();
    return await m.dbGetProducts();
  } catch (err) {
    console.error('[db.server] realDbFetch error:', err);
    throw err;
  }
}

export function invalidateProductCache() {
  if (productCache) {
    console.log("[CACHE] invalidated products");
  }
  productCache = null;
  productCacheTime = 0;
}

export const dbGetProducts = async () => {
  if (!isServer) return [];
  
  const now = Date.now();
  if (productCache && (now - productCacheTime < CACHE_TTL)) {
    return productCache;
  }

  try {
    const data = await realDbFetch();
    productCache = data;
    productCacheTime = now;
    return data;
  } catch (err) {
    // If error, return stale cache if available, otherwise empty array
    return productCache || [];
  }
};

export const dbSaveProduct = async (product: any) => {
  if (!isServer) return;
  const m = await getDbModule();
  const res = await m.dbSaveProduct(product);
  invalidateProductCache();
  return res;
};

export const dbInsertProducts = async (products: any[]) => {
  if (!isServer) return;
  const m = await getDbModule();
  const res = await m.dbInsertProducts(products);
  invalidateProductCache();
  return res;
};

export const dbDeleteProduct = async (id: string) => {
  if (!isServer) return;
  const m = await getDbModule();
  const res = await m.dbDeleteProduct(id);
  invalidateProductCache();
  return res;
};

export const dbDeleteAllProducts = async () => {
  if (!isServer) return;
  const m = await getDbModule();
  const res = await m.dbDeleteAllProducts();
  invalidateProductCache();
  return res;
};

export const dbToggleProduct = async (id: string) => {
  if (!isServer) return;
  const m = await getDbModule();
  const res = await m.dbToggleProduct(id);
  invalidateProductCache();
  return res;
};

export const dbSaveOrder = async (order: any) => {
  if (!isServer) return { status: "error", code: "SERVER_ONLY" };

  try {
    const supabase = getSupabaseAdmin();
    const orderId = order.id && order.id.length > 5 ? order.id : createUuid();

    // 1. Recalculate total from DB prices (NEVER trust client)
    const productIds = order.items.map((i: any) => String(i.productId));
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, price')
      .in('id', productIds);

    if (prodErr || !dbProducts) {
      console.error('[dbSaveOrder] Price fetch error:', prodErr);
      throw new Error("COULD_NOT_VALIDATE_PRICES");
    }

    let recalculatedTotal = 0;
    const itemsWithVerifiedPrices = order.items.map((item: any) => {
      const dbProd = dbProducts.find((p: any) => String(p.id) === String(item.productId));
      const verifiedPrice = dbProd ? Number(dbProd.price) : 0;
      recalculatedTotal += verifiedPrice * Number(item.quantity || 1);
      return {
        ...item,
        price: verifiedPrice // Overwrite with DB price
      };
    });

    // 2. Execute Transactional RPC (SELECT FOR UPDATE + Stock Check + Insert)
    const { data, error } = await supabase.rpc('process_order', {
      p_order_id:         orderId,
      p_channel:          order.channel || 'WEB',
      p_total:            recalculatedTotal,
      p_customer_name:    order.customerName || 'Cliente',
      p_customer_phone:   order.customerPhone || '',
      p_notes:            order.notes || '',
      p_whatsapp_confirmed: order.whatsappConfirmed || false,
      p_items:            itemsWithVerifiedPrices,
    });

    if (error) {
      // 3. Handle Structured OUT_OF_STOCK Error
      if (error.message.includes('OUT_OF_STOCK')) {
        // Extract productId from "Insufficient stock for product PRODUCT_ID"
        const match = error.message.match(/product (.*?)(?=\s|\(|$)/);
        return {
          status: "error",
          code: "OUT_OF_STOCK",
          productId: match ? match[1].trim() : "unknown"
        };
      }
      throw error;
    }

    return { status: "success", orderId: data };
  } catch (err) {
    console.error('[dbSaveOrder CRITICAL] Failed:', err);
    return {
      status: "error",
      code: "TRANSACTION_FAILED",
      message: String(err)
    };
  }
};

export const dbGetCustomer = async (phone: string) => {
  if (!isServer) return null;
  const m = await getDbModule();
  return m.dbGetCustomer(phone);
};

export const dbUpsertCustomer = async (customer: any) => {
  if (!isServer) return;
  const m = await getDbModule();
  return m.dbUpsertCustomer(customer);
};

export const productToRow = async (p: any) => {
  if (!isServer) return {};
  const m = await getDbModule();
  return m.productToRow(p);
};

export { createUuid };

/**
 * Lightweight single-user check: did this user ADD_TO_CART
 * within the window but never CONFIRM_ORDER?
 *
 * Returns true if the session should be marked as abandoned.
 */
export async function checkCartAbandonment(
  userId: string,
  windowMs: number,
): Promise<{ abandoned: boolean; lastCartAt?: string; cartValue?: number }> {
  if (!isServer) return { abandoned: false };
  try {
    const supabase = getSupabaseAdmin();
    const since = new Date(Date.now() - windowMs * 2).toISOString();

    // Latest ADD_TO_CART for this user
    const { data: addLogs } = await supabase
      .from('ai_logs')
      .select('created_at, cart, total, trace_id')
      .eq('user_id', userId)
      .eq('intent', 'ADD_TO_CART')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!addLogs || addLogs.length === 0) return { abandoned: false };

    const lastAdd = addLogs[0];
    const addTime = new Date(lastAdd.created_at).getTime();
    const elapsed = Date.now() - addTime;

    // Not old enough to be considered abandoned
    if (elapsed < windowMs) return { abandoned: false };

    // Check if CONFIRM_ORDER or ABANDONED_CART exists after that ADD_TO_CART
    const { data: resolved } = await supabase
      .from('ai_logs')
      .select('id')
      .eq('user_id', userId)
      .in('intent', ['CONFIRM_ORDER', 'ABANDONED_CART'])
      .gte('created_at', lastAdd.created_at);

    if (resolved && resolved.length > 0) return { abandoned: false };

    // Check if already logged as abandoned
    const { data: alreadyAbandoned } = await supabase
      .from('ai_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('intent', 'ABANDONED_CART')
      .gte('created_at', lastAdd.created_at);

    if (alreadyAbandoned && alreadyAbandoned.length > 0) return { abandoned: false };

    const cartData = lastAdd.cart;
    const items = Array.isArray(cartData)
      ? cartData
      : (cartData?.items || []);

    return {
      abandoned: true,
      lastCartAt: lastAdd.created_at,
      cartValue: Number(lastAdd.total || 0),
    };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'ABANDONMENT_CHECK_FAILED',
      userId,
      error: String(err),
      timestamp: Date.now(),
    }));
    return { abandoned: false };
  }
}

export async function saveAiLog(log: any): Promise<{ success: boolean; error?: string }> {
  if (!isServer) return { success: true };
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('ai_logs').insert({
      trace_id: log.traceId,
      user_id: log.userId,
      channel: log.channel,
      input: log.input,
      intent: log.intent,
      flow_state: log.flowState,
      cart: log.cart,
      total: log.total,
      products_shown: log.productsShown,
      error: log.error,
      session_status: log.sessionStatus || 'ACTIVE',
    });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn("AI log skipped:", error.message);
        return { success: true };
      }
      console.error(JSON.stringify({
        event: 'SAVE_AI_LOG_DB_ERROR',
        error: error.message,
        code: error.code,
        traceId: log.traceId,
        userId: log.userId,
        timestamp: Date.now(),
      }));
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'SAVE_AI_LOG_EXCEPTION',
      error: String(err),
      traceId: log.traceId,
      userId: log.userId,
      timestamp: Date.now(),
    }));
    return { success: false, error: String(err) };
  }
}

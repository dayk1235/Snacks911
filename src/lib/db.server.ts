import { supabaseAdmin as admin } from './supabaseAdmin';
import * as server from './server/supabaseServer';
import { createUuid } from '@/lib/utils/core';
import { sendAlert } from './alert';
export type { Customer } from './adminTypes';

const IS_SERVER_ENV = typeof window === 'undefined';

if (!IS_SERVER_ENV) {
  console.warn(
    'db.server.ts is server-only. Do not import in React components or client code.'
  );
}

// --- Circuit Breaker Logic ---
type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
const CB_COOLDOWN_MS = 60000;

class CircuitBreaker {
  private state: CBState = 'CLOSED';
  private lastRetryAt = 0;
  private failuresCount = 0;
  private lastFailureTimestamp = 0;
  private transitions: { from: CBState; to: CBState; ts: string }[] = [];
  private name: string;
  private buffer: any[] = [];
  private maxBufferSize = 200;

  constructor(name: string) {
    this.name = name;
  }

  private transitionTo(newState: CBState) {
    if (this.state === newState) return;
    this.transitions.push({
      from: this.state,
      to: newState,
      ts: new Date().toISOString()
    });
    if (this.transitions.length > 10) this.transitions.shift();
    this.state = newState;
  }

  shouldSkip(): boolean {
    if (this.state === 'CLOSED') return false;
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastRetryAt > CB_COOLDOWN_MS) {
        this.transitionTo('HALF_OPEN');
        this.lastRetryAt = now;
        console.log(`[db.server] Circuit breaker ${this.name} HALF_OPEN. Testing recovery...`);
        return false;
      }
      return true;
    }
    if (this.state === 'HALF_OPEN') return true; // Block others while testing
    return false;
  }

  handleError(error: any, itemToBuffer?: any) {
    const isMissingTable = error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist');
    if (isMissingTable) {
      if (itemToBuffer) this.addToBuffer(itemToBuffer);
      this.failuresCount++;
      this.lastFailureTimestamp = Date.now();
      
      const wasOpen = this.state === 'OPEN';
      this.transitionTo('OPEN');
      this.lastRetryAt = Date.now();

      if (!wasOpen) {
        const alertMsg = `🚨 [CRITICAL] DB Circuit OPEN: ${this.name}\n` +
          `Code: ${error.code || 'UNKNOWN'}\n` +
          `Env: ${process.env.NODE_ENV}\n` +
          `Time: ${new Date().toISOString()}`;
        
        console.error(alertMsg);
        sendAlert(alertMsg).catch(() => {});
      }
    } else {
      console.error(`[db.server] Error in ${this.name}:`, error);
    }
  }

  async handleSuccess(flushFn?: () => Promise<void>) {
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
      console.log(`[db.server] Circuit breaker ${this.name} CLOSED. Recovered.`);
      if (flushFn) await flushFn();
    }
  }

  addToBuffer(item: any) {
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  getBuffer() {
    return this.buffer;
  }

  clearBuffer() {
    this.buffer = [];
  }

  getHealth() {
    return {
      state: this.state,
      failuresCount: this.failuresCount,
      lastFailureTimestamp: this.lastFailureTimestamp ? new Date(this.lastFailureTimestamp).toISOString() : null,
      transitions: this.transitions,
      cooldownRemainingMs: this.state === 'OPEN' ? Math.max(0, CB_COOLDOWN_MS - (Date.now() - this.lastRetryAt)) : 0
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failuresCount = 0;
    this.lastFailureTimestamp = 0;
    this.transitions = [];
  }
}

const costsBreaker = new CircuitBreaker('ai_costs');
const logsBreaker = new CircuitBreaker('ai_logs');

export function getDBCircuitHealth() {
  return {
    ai_costs: { ...costsBreaker.getHealth(), bufferSize: costsBreaker.getBuffer().length },
    ai_logs: { ...logsBreaker.getHealth(), bufferSize: logsBreaker.getBuffer().length }
  };
}

export function resetDBCircuits() {
  costsBreaker.reset();
  logsBreaker.reset();
  console.log("[db.server] Circuit breakers manually reset to CLOSED.");
}

// Removal of warning block since moved up

export const db = IS_SERVER_ENV ? admin : ({} as any);
export const supabase = IS_SERVER_ENV ? admin : ({} as any);

export const getSupabaseAdmin = IS_SERVER_ENV ? server.getSupabaseAdmin : (() => ({} as any));
export const supabaseAnon = IS_SERVER_ENV ? server.supabaseAnon : ({} as any);
export const getCustomerProfileFromDB = IS_SERVER_ENV ? server.getCustomerProfileFromDB : (async () => null);
export const upsertCustomerProfile = IS_SERVER_ENV ? server.upsertCustomerProfile : (async () => {});

export async function getSystemState() {
  if (!IS_SERVER_ENV) return { mode: 'NORMAL' };
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
  if (!IS_SERVER_ENV) return;
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
  if (!IS_SERVER_ENV) return;
  
  if (costsBreaker.shouldSkip()) {
    costsBreaker.addToBuffer(data);
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('ai_costs')
      .insert(data);
      
    if (error) {
      costsBreaker.handleError(error, data);
    } else {
      await costsBreaker.handleSuccess(async () => {
        const buffer = costsBreaker.getBuffer();
        if (buffer.length > 0) {
          const { error: flushErr } = await supabase.from('ai_costs').insert(buffer);
          if (!flushErr) costsBreaker.clearBuffer();
        }
      });
    }
  } catch (err: any) {
    console.warn("AI cost exception:", err?.message || err);
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
  if (!IS_SERVER_ENV) return [];
  
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
  if (!IS_SERVER_ENV) return;
  const m = await getDbModule();
  const res = await m.dbSaveProduct(product);
  invalidateProductCache();
  return res;
};

export const dbInsertProducts = async (products: any[]) => {
  if (!IS_SERVER_ENV) return;
  const m = await getDbModule();
  const res = await m.dbInsertProducts(products);
  invalidateProductCache();
  return res;
};

export const dbDeleteProduct = async (id: string) => {
  if (!IS_SERVER_ENV) return;
  const m = await getDbModule();
  const res = await m.dbDeleteProduct(id);
  invalidateProductCache();
  return res;
};

export const dbDeleteAllProducts = async () => {
  if (!IS_SERVER_ENV) return;
  const m = await getDbModule();
  const res = await m.dbDeleteAllProducts();
  invalidateProductCache();
  return res;
};

export const dbToggleProduct = async (id: string) => {
  if (!IS_SERVER_ENV) return;
  const m = await getDbModule();
  const res = await m.dbToggleProduct(id);
  invalidateProductCache();
  return res;
};

export const dbSaveOrder = async (order: any) => {
  if (!IS_SERVER_ENV) return { status: "error", code: "SERVER_ONLY" };

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
  if (!IS_SERVER_ENV) return null;
  const m = await getDbModule();
  return m.dbGetCustomer(phone);
};

export const dbUpsertCustomer = async (customer: any) => {
  if (!IS_SERVER_ENV) return;
  const m = await getDbModule();
  return m.dbUpsertCustomer(customer);
};

export const productToRow = async (p: any) => {
  if (!IS_SERVER_ENV) return {};
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
  if (!IS_SERVER_ENV) return { abandoned: false };
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
  if (!IS_SERVER_ENV) return { success: true };

  if (logsBreaker.shouldSkip()) {
    logsBreaker.addToBuffer(log);
    return { success: true };
  }

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
      logsBreaker.handleError(error, log);
      return { success: true };
    }

    await logsBreaker.handleSuccess(async () => {
      const buffer = logsBreaker.getBuffer();
      if (buffer.length > 0) {
        // Transform buffer to DB schema if needed
        const rows = buffer.map(l => ({
          trace_id: l.traceId,
          user_id: l.userId,
          channel: l.channel,
          input: l.input,
          intent: l.intent,
          flow_state: l.flowState,
          cart: l.cart,
          total: l.total,
          products_shown: l.productsShown,
          error: l.error,
          session_status: l.sessionStatus || 'ACTIVE',
        }));
        const { error: flushErr } = await supabase.from('ai_logs').insert(rows);
        if (!flushErr) logsBreaker.clearBuffer();
      }
    });

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

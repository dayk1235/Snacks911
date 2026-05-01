/**
 * dbServer.ts — Supabase DAL for server routes (service_role ONLY).
 * NO anon key usage. Use only in API routes / webhooks.
 */

import type { AdminProduct, Order, Customer } from './adminTypes';
import { rowToProduct } from './db';
import { getSupabaseAdmin } from './server/supabaseServer';

// ─── Products ───────────────────────────────────────────────────────

export async function dbGetProductsServer(): Promise<AdminProduct[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('products').select('*').order('created_at');
  if (error) throw error;
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToProduct);
}

// ─── Orders ─────────────────────────────────────────────────────────

export async function dbSaveOrderServer(order: Order): Promise<string> {
  const supabase = getSupabaseAdmin();

  const orderId = order.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.id)
    ? order.id
    : crypto.randomUUID();

  const orderRow = {
    id: orderId,
    status: order.status,
    channel: order.channel || 'WEB',
    total: order.total,
    created_at: order.createdAt,
    customer_name: order.customerName,
    customer_phone: order.customerPhone ?? '',
    notes: order.notes ?? '',
    whatsapp_confirmed: order.whatsappConfirmed ?? false,
  };

  const { error } = await supabase.from('orders').upsert(orderRow);
  if (error) throw error;

  // Delete existing items & re-insert
  try {
    await supabase.from('order_items').delete().eq('order_id', orderId);
  } catch {
    // ignore if none exist
  }

  if (order.items.length > 0) {
    const itemRows = order.items.map(i => ({
      order_id: orderId,
      product_id: i.productId || '0',
      product_name: i.productName,
      quantity: i.quantity,
      price: i.price,
    }));
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
    if (itemsErr) throw itemsErr;
  }

  return orderId;
}

// ─── Customers ──────────────────────────────────────────────────────

export async function dbUpsertCustomerServer(customer: Customer): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('customers').upsert({
    phone_number: customer.phoneNumber,
    name: customer.name,
    total_orders: customer.totalOrders,
    last_order_date: customer.lastOrderDate,
    last_order_total: customer.lastOrderTotal,
    favorite_product: customer.favoriteProduct,
    created_at: customer.createdAt,
  });
  if (error) throw error;
}

// ─── WhatsApp Messages (for deduplication) ──────────────────────

export async function dbInsertWaMessage(
  messageId: string,
  phone: string,
  direction: 'inbound' | 'outbound',
  content: string,
  messageType: string = 'text'
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('wa_messages').insert({
    wa_message_id: messageId,
    phone_number: phone,
    direction,
    message_type: messageType,
    content,
  });

  if (error) {
    // Unique violation = duplicate
    if (error.code === '23505') {
      console.log('[dbServer] Duplicate message:', messageId);
      return false;
    }
    throw error;
  }

  return true;
}


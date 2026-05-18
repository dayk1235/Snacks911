/**
 * dbServer.ts — Legacy Supabase DAL for server routes.
 * @deprecated Use src/lib/db.server.ts for better resiliencia (Circuit Breaker + Cache).
 * Redirigiendo funciones para consolidar la arquitectura.
 */

import { dbGetProducts, dbSaveOrder, dbUpsertCustomer } from './db.server';
import { supabaseAdmin as admin } from './db.server';
import type { AdminProduct, Order, Customer } from './adminTypes';

export async function dbGetProductsServer(): Promise<AdminProduct[]> {
  return await dbGetProducts();
}

export async function dbSaveOrderServer(order: Order): Promise<string> {
  const result = await dbSaveOrder(order);
  if (result.status === 'success') return result.orderId!;
  throw new Error(result.message || result.code);
}

export async function dbUpsertCustomerServer(customer: Customer): Promise<void> {
  return await dbUpsertCustomer(customer);
}

export async function dbInsertWaMessage(
  messageId: string,
  phone: string,
  direction: 'inbound' | 'outbound',
  content: string,
  messageType: string = 'text'
): Promise<boolean> {
  const { error } = await admin.from('wa_messages').insert({
    wa_message_id: messageId,
    phone_number: phone,
    direction,
    message_type: messageType,
    content,
  });

  if (error) {
    if (error.code === '23505') return false;
    throw error;
  }
  return true;
}

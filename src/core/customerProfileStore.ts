/**
 * core/customerProfileStore.ts — Persistence and retrieval of customer metrics.
 * 
 * Part of Phase 1.6: Customer Memory.
 * Interacts with the Supabase 'customers' table to manage historical data.
 */

import { supabase } from '@/lib/supabase';

import { CustomerProfile } from './types';

/**
 * Fetches the customer profile from Supabase by phone number.
 * If the customer doesn't exist, returns a default empty profile.
 * 
 * @param phone - Customer phone number (primary key)
 * @returns Promise with CustomerProfile
 */
export async function getProfile(phone: string): Promise<CustomerProfile> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', phone)
    .single();

  if (error || !data) {
    return {
      phone,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      createdAt: new Date()
    };
  }

  return {
    phone: data.phone_number,
    totalOrders: data.total_orders,
    totalSpent: Number(data.last_order_total || 0),
    lastOrderAt: data.last_order_date ? new Date(data.last_order_date) : null,
    createdAt: new Date(data.created_at)
  };
}

/**
 * Records a new order for a customer.
 * Atomically updates order count, total spent, and last order date.
 * 
 * @param phone - Customer phone number
 * @param amount - Total amount of the new order
 */
export async function recordOrder(phone: string, amount: number): Promise<void> {
  const { data: existing } = await supabase
    .from('customers')
    .select('phone_number, total_orders, last_order_total')
    .eq('phone_number', phone)
    .single();

  if (existing) {
    await supabase
      .from('customers')
      .update({
        total_orders: existing.total_orders + 1,
        last_order_total: Number(existing.last_order_total || 0) + amount,
        last_order_date: new Date().toISOString()
      })
      .eq('phone_number', phone);
  } else {
    await supabase
      .from('customers')
      .insert({
        phone_number: phone,
        total_orders: 1,
        last_order_total: amount,
        last_order_date: new Date().toISOString()
      });
  }
}

/**
 * core/inventoryMiddleware.ts — Single source of truth for stock.
 *
 * inventoryFilter: sync filter for in-memory product arrays
 * checkStock: async DB check for availability + stock levels
 */

import { supabase } from '@/lib/supabase';

export interface StockCheck {
  itemId: string;
  available: boolean;
  quantity: number;
  lowStockThreshold: number;
}

/**
 * Filters out products with stock <= 0.
 * A product WITHOUT a stock field (undefined) passes through
 * (assumes unlimited / admin hasn't set stock yet).
 *
 * Call BEFORE ranking in handleMessageModular.
 */
export function inventoryFilter<T extends { id?: string; stock?: number | null }>(
  products: T[],
): T[] {
  if (!products || products.length === 0) return products;

  return products.filter((p) => {
    if (p.stock === undefined || p.stock === null) return true;
    return p.stock > 0;
  });
}

/**
 * Checks stock for a list of item IDs.
 * Queries the 'products' table for availability and stock levels.
 *
 * @param itemIds - Array of product UUIDs to check
 * @returns Promise with StockCheck results for each ID
 */
export async function checkStock(itemIds: string[]): Promise<StockCheck[]> {
  if (!itemIds || itemIds.length === 0) return [];

  // 1. Try selecting with 'stock' column
  let { data, error } = await supabase
    .from('products')
    .select('id, is_available, stock')
    .in('id', itemIds);

  // 2. Fallback: If 'stock' column is missing, retry without it
  if (error && error.message.includes('column products.stock does not exist')) {
    const fallback = await supabase
      .from('products')
      .select('id, is_available')
      .in('id', itemIds);
    
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) {
    console.error('InventoryMiddleware: Error fetching stock:', error.message);
    return itemIds.map(id => ({
      itemId: id,
      available: false,
      quantity: 0,
      lowStockThreshold: 0,
    }));
  }

  return itemIds.map(id => {
    const product = data?.find(p => String(p.id) === String(id));

    if (!product) {
      return { itemId: id, available: false, quantity: 0, lowStockThreshold: 0 };
    }

    const stockQty = product.stock != null ? Number(product.stock) : 999;

    return {
      itemId: String(product.id),
      available: product.is_available ?? true,
      quantity: stockQty,
      lowStockThreshold: 5,
    };
  });
}
/**
 * core/inventoryMiddleware.ts — Single source of truth for stock.
 * 
 * Implements the contract defined in Phase 1.10.2 of the ROADMAP.
 */

import { supabase } from '@/lib/supabase';

export interface StockCheck {
  itemId: string;
  available: boolean;
  quantity: number;
  lowStockThreshold: number;
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

  const { data, error } = await supabase
    .from('products')
    .select('id, is_available')
    .in('id', itemIds);

  if (error) {
    console.error('InventoryMiddleware: Error fetching stock:', error.message);
    // Fallback: return as unavailable on error
    return itemIds.map(id => ({
      itemId: id,
      available: false,
      quantity: 0,
      lowStockThreshold: 0
    }));
  }

  return itemIds.map(id => {
    const product = data?.find(p => p.id === id);
    
    // If product not found, mark as unavailable
    if (!product) {
      return {
        itemId: id,
        available: false,
        quantity: 0,
        lowStockThreshold: 0
      };
    }

    return {
      itemId: product.id,
      available: product.is_available ?? true,
      quantity: 0,
      lowStockThreshold: 0
    };
  });
}

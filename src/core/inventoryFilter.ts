import type { AdminProduct } from "@/lib/adminTypes";

/**
 * inventoryFilter() — PURE Function.
 * Filters out products that are marked as out of stock.
 * 
 * Logic:
 * - If stock is undefined/null, assume unlimited (legacy products).
 * - If stock is 0 or less, exclude.
 * - Otherwise include.
 */
export function inventoryFilter(products: AdminProduct[]): AdminProduct[] {
  return products.filter(p => {
    // If stock is not present, we assume it's available (backwards compatibility)
    if (p.stock === undefined || p.stock === null) return true;
    
    // Explicit stock check
    return p.stock > 0;
  });
}

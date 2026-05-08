import type { Product } from '@/data/products';

// CartItem is defined in @/core/types — re-exported here for backwards-compat imports
export type { CartItem } from '@/core/types';

// Legacy type kept for components that still extend Product
export interface LegacyProductCartItem extends Product {
  quantity?: number;
  linkedExtras?: string[];
  isStandaloneExtra?: boolean;
}

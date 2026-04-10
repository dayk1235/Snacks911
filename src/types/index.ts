import type { Product } from '@/data/products';

export interface CartItem extends Product {
  quantity: number;
  /** Names of extras the user chose when adding this product (shown as notes in cart) */
  linkedExtras?: string[];
  /** True if this item is a standalone extra (not tied to a main product) */
  isStandaloneExtra?: boolean;
}

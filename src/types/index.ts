import type { Product } from '@/data/products';

export interface CartItem extends Product {
  quantity: number;
}

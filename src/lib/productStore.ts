import { create } from 'zustand';
import type { Product } from '@/data/products';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (all?: boolean) => Promise<void>;
  updateProduct: (product: Product) => Promise<boolean>;
  createProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
}

export const useProductStore = create<ProductState>()((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async (all = false) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/products${all ? '?all=true' : ''}`);
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      
      // Map DB snake_case back to camelCase used in the frontend
      const mapped = data.map((dbProduct: any) => ({
        id: Number(dbProduct.id),
        name: dbProduct.name,
        description: dbProduct.description,
        price: Number(dbProduct.price),
        category: dbProduct.category,
        image: dbProduct.image,
        spicy: dbProduct.spicy,
        popular: dbProduct.popular,
        badge: dbProduct.badge,
        badges: dbProduct.badges,
        originalPrice: dbProduct.original_price ? Number(dbProduct.original_price) : undefined,
        available: dbProduct.is_available,
      }));

      set({ products: mapped, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateProduct: async (product) => {
    try {
      // Convert to DB format
      const dbFormat = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        spicy: product.spicy || 0,
        popular: product.popular || false,
        badge: product.badge || null,
        badges: product.badges || null,
        original_price: product.originalPrice || null,
        is_available: product.available !== false,
      };

      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbFormat),
      });

      if (!res.ok) throw new Error('Error al actualizar');
      
      // Update local state immediately
      set((state) => ({
        products: state.products.map(p => p.id === product.id ? product : p)
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  createProduct: async (product) => {
    try {
      // Calculate a temporary ID, or let DB auto-increment if we didn't force ID
      // Since we need an ID for local state immediately, we fetch right after.
      const dbFormat = {
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        spicy: product.spicy || 0,
        popular: product.popular || false,
        badge: product.badge || null,
        badges: product.badges || null,
        original_price: product.originalPrice || null,
        is_available: product.available !== false,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbFormat),
      });

      if (!res.ok) throw new Error('Error al crear');
      
      // Re-fetch to get the new ID assigned by DB
      await get().fetchProducts(true);
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      
      set((state) => ({
        products: state.products.filter(p => p.id !== id)
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  }
}));

import { isProductSafe, filterProducts } from '../allergyFilter';
import { Product } from '@/data/products';

describe('allergyFilter', () => {
  describe('isProductSafe', () => {
    it('returns true when no allergies are provided', () => {
      const product: Product = {
        id: '1',
        name: 'Test Product',
        description: 'Test',
        price: 10,
        category: 'test',
        image: '/test.webp',
        ingredients: ['test'],
      };
      expect(isProductSafe(product, [])).toBe(true);
      expect(isProductSafe(product, undefined as any)).toBe(true);
    });

    it('returns false when product has exact allergy match in ingredients', () => {
      const salchipapas: Product = {
        id: '12',
        name: 'Salchipapas',
        description: 'Salchicha + papas',
        price: 85,
        category: 'papas',
        image: '/papas.webp',
        ingredients: ['salchicha', 'papa'],
      };
      expect(isProductSafe(salchipapas, ['salchicha'])).toBe(false);
    });

    it('returns true when product has no conflicting ingredients', () => {
      const papasClasicas: Product = {
        id: '10',
        name: 'Papas Clásicas',
        description: 'Con sal y especias',
        price: 45,
        category: 'papas',
        image: '/papas.webp',
        ingredients: ['papas'],
      };
      expect(isProductSafe(papasClasicas, ['salchicha'])).toBe(true);
    });

    it('handles bidirectional matching: ingredient contains allergy', () => {
      const product: Product = {
        id: '4',
        name: 'Special Sausage',
        description: 'Special',
        price: 10,
        category: 'test',
        image: '/test.webp',
        ingredients: ['salchicha-especial'],
      };
      // 'salchicha-especial' includes 'salchicha'
      expect(isProductSafe(product, ['salchicha'])).toBe(false);
    });

    it('handles bidirectional matching: allergy contains ingredient', () => {
      const product: Product = {
        id: '5',
        name: 'Dairy Product',
        description: 'Dairy',
        price: 10,
        category: 'test',
        image: '/test.webp',
        ingredients: ['lácteos'],
      };
      // 'sin lácteos' contains 'lácteos'
      expect(isProductSafe(product, ['sin lácteos'])).toBe(false);
    });

    it('applies special rule: salchicha allergy blocks banderilla ingredient', () => {
      const banderillaProduct: Product = {
        id: '13',
        name: 'Banderilla Coreana',
        description: 'Empanizada',
        price: 79,
        category: 'banderillas',
        image: '/combo.webp',
        ingredients: ['banderilla', 'masa'],
      };
      // Allergy to 'salchicha' should block 'banderilla' ingredient
      expect(isProductSafe(banderillaProduct, ['salchicha'])).toBe(false);
    });

    it('Salchipapas rejected, Papas Clásicas accepted with salchicha allergy', () => {
      const salchipapas: Product = {
        id: '12',
        name: 'Salchipapas',
        description: 'Salchicha + papas',
        price: 85,
        category: 'papas',
        image: '/papas.webp',
        ingredients: ['salchicha', 'papa'],
      };
      const papasClasicas: Product = {
        id: '10',
        name: 'Papas Clásicas',
        description: 'Con sal y especias',
        price: 45,
        category: 'papas',
        image: '/papas.webp',
        ingredients: ['papas'],
      };
      const allergy = ['salchicha'];
      expect(isProductSafe(salchipapas, allergy)).toBe(false);
      expect(isProductSafe(papasClasicas, allergy)).toBe(true);
    });
  });

  describe('filterProducts', () => {
    it('filters out products with conflicting ingredients', () => {
      const products: Product[] = [
        {
          id: '12',
          name: 'Salchipapas',
          description: 'Salchicha + papas',
          price: 85,
          category: 'papas',
          image: '/papas.webp',
          ingredients: ['salchicha', 'papa'],
        },
        {
          id: '10',
          name: 'Papas Clásicas',
          description: 'Con sal y especias',
          price: 45,
          category: 'papas',
          image: '/papas.webp',
          ingredients: ['papas'],
        },
      ];
      const result = filterProducts(products, ['salchicha']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('10');
    });
  });
});

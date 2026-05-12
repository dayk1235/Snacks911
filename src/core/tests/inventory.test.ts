import { inventoryFilter } from '../inventoryFilter';

describe('inventoryFilter', () => {
  test('filters out products with stock <= 0', () => {
    const products = [
      { id: '1', name: 'Alitas', stock: 10 },
      { id: '2', name: 'Papas', stock: 0 },
      { id: '3', name: 'Bebida', stock: -1 },
      { id: '4', name: 'Postre', stock: 5 },
    ];

    const filtered = inventoryFilter(products as any);

    expect(filtered.length).toBe(2);
    expect(filtered.some((p: any) => p.id === '1')).toBe(true);
    expect(filtered.some((p: any) => p.id === '4')).toBe(true);
    expect(filtered.some((p: any) => p.id === '2')).toBe(false);
    expect(filtered.some((p: any) => p.id === '3')).toBe(false);
  });

  test('keeps products with undefined or null stock (legacy backward compatibility)', () => {
    const products = [
      { id: '1', name: 'Alitas', stock: 10 },
      { id: '2', name: 'Legacy Product' },
      { id: '3', name: 'Null Stock Product', stock: null },
    ];

    const filtered = inventoryFilter(products as any);

    expect(filtered.length).toBe(3);
  });
});

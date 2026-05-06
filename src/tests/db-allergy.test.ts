import './env-setup';
import { dbGetProducts } from '../lib/db';
import { filterProducts } from '../core/allergyFilter';

// Helper to support both Jest and standalone tsx execution
const _test = typeof describe !== 'undefined' ? it : (name: string, fn: () => Promise<void>) => {
  fn().catch(e => { console.error(`✗ ${name}\n  ${e.message}`); process.exit(1); });
};

async function runDbTest() {
  _test('Filters real database products correctly for salchicha allergy', async () => {
    // 1. Fetch real products from Supabase
    const allProducts = await dbGetProducts();
    
    // 2. Define allergy
    const allergy = 'salchicha';

    // 3. Filter
    const safeProducts = filterProducts(allProducts as any, [allergy]);
    
    // 4. Analyze results
    const rejected = allProducts.filter(p => !safeProducts.some(s => s.id === p.id));
    
    // 5. Explicit check for common items
    const forbiddenKeywords = ['salchicha', 'banderilla', 'salchipapa'];
    const failures = safeProducts.filter(p => {
        const content = `${p.name} ${p.description} ${(p as any).ingredients?.join(' ')}`.toLowerCase();
        return forbiddenKeywords.some(k => content.includes(k));
    });

    if (failures.length > 0) {
        throw new Error(`Safe list still contains forbidden items: ${failures.map(f => f.name).join(', ')}`);
    }
    
    if (rejected.length === 0) {
        console.warn('⚠️ No products were rejected! Check DB data.');
    }
  });
}

if (typeof describe === 'undefined') {
  console.log('=== DB ALLERGY FILTER TEST ===');
  runDbTest();
} else {
  describe('Database Allergy Filtering', () => {
    runDbTest();
  });
}

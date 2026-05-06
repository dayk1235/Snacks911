import './env-setup';
import { dbGetProducts } from '../lib/db';
import { filterProducts } from '../core/allergyFilter';

async function runDbTest() {
  console.log('=== DB ALLERGY FILTER TEST ===');
  
  try {
    // 1. Fetch real products from Supabase
    console.log('Fetching products from DB...');
    const allProducts = await dbGetProducts();
    console.log(`Fetched ${allProducts.length} products.`);

    // 2. Define allergy
    const allergy = 'salchicha';
    console.log(`\nTesting with allergy: "${allergy}"`);

    // 3. Filter
    const safeProducts = filterProducts(allProducts as any, [allergy]);
    
    // 4. Analyze results
    const rejected = allProducts.filter(p => !safeProducts.some(s => s.id === p.id));
    
    console.log(`\nResults:`);
    console.log(`Total Products: ${allProducts.length}`);
    console.log(`Safe Products:  ${safeProducts.length}`);
    console.log(`Rejected:       ${rejected.length}`);

    if (rejected.length > 0) {
      console.log('\nRejected Items:');
      rejected.forEach(p => {
        console.log(`❌ [REJECTED] ${p.name}`);
        console.log(`   - Ingredients: ${(p as any).ingredients?.join(', ') || 'None'}`);
        console.log(`   - Description: ${p.description || 'None'}`);
      });
    } else {
      console.log('\n⚠️ No products were rejected! Check if ingredients are correctly populated in DB.');
    }

    // 5. Explicit check for common items
    const forbiddenKeywords = ['salchicha', 'banderilla', 'salchipapa'];
    const failures = safeProducts.filter(p => {
        const content = `${p.name} ${p.description} ${(p as any).ingredients?.join(' ')}`.toLowerCase();
        return forbiddenKeywords.some(k => content.includes(k));
    });

    if (failures.length > 0) {
        console.log('\n❌ CRITICAL FAIL: Safe list still contains forbidden items:');
        failures.forEach(f => console.log(`   - ${f.name}`));
    } else {
        console.log('\n✅ SUCCESS: No forbidden keywords found in safe list.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

runDbTest();

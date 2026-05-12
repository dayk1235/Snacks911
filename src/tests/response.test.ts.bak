import './env-setup';
import { handleMessageModular, INITIAL_STATE } from '@/core/responseEngine';

// Real product data for testing (with ingredients field)
const mockProducts: any[] = [
  { id: '1', name: 'Combo Mixto 911', price: 239, category: 'combos', description: 'Boneless 150g, Alitas 6pz, Papas, Bebida', ingredients: ['boneless', 'alitas', 'papas', 'bebida'] },
  { id: '2', name: 'Boneless Power 911', price: 149, category: 'combos', description: 'Boneless 250g, Papas, Bebida', ingredients: ['boneless', 'papas', 'bebida'] },
  { id: '3', name: 'Alitas Fuego 911', price: 139, category: 'combos', description: 'Alitas 12pz, Papas, Bebida', ingredients: ['alitas', 'papas', 'bebida'] },
  { id: '4', name: 'Combo Callejero 911', price: 169, category: 'combos', description: 'Banderilla, Salchipapas, Bebida', ingredients: ['salchicha', 'papa', 'bebida'] },
  { id: '5', name: 'Papas Gajo', price: 69, category: 'papas', description: 'Papas fritas en gajo', ingredients: ['papas'] },
  { id: '6', name: 'Papas Loaded', price: 119, category: 'papas', description: 'Papas con queso y tocino', ingredients: ['papas', 'queso', 'tocino'] },
];

const mockProductRefs = {
  comboName: 'Combo 911',
  comboPrice: 119,
  papasName: 'Papas Loaded',
  papasPrice: 69,
  bebidaName: 'Refresco',
  bebidaPrice: 25,
  postreName: 'Brownie',
  postrePrice: 59,
  comboBonelessName: 'Combo Boneless',
  comboBonelessPrice: 99,
  ahorroBoneless: 20,
  currentTotal: 0,
  hasPapas: false,
  hasBebida: false,
  hasPostre: false,
};

async function getResponse(input: string) {
  return await handleMessageModular(
    input,
    { ...INITIAL_STATE, phone: '525512345678' },
    mockProductRefs,
    undefined,
    mockProducts
  );
}

// Helper to support both Jest and standalone tsx execution
const _test = typeof describe !== 'undefined' ? it : (name: string, fn: () => Promise<void>) => {
  fn().catch(e => { console.error(`❌ ${name}\n  ${e.message}`); process.exit(1); });
};

async function runTests() {
  _test("ver menu → lista completa", async () => {
    const res = await getResponse("ver menu");
    const text = res.text.toLowerCase();
    
    // Should contain items from multiple categories
    const hasCombo = text.includes("mixto") || text.includes("power");
    const hasPapas = text.includes("gajo") || text.includes("loaded");
    
    if (!hasCombo || !hasPapas) {
      throw new Error(`Menu incomplete. Expected combos and papas. Got:\n${res.text}`);
    }
    console.log("✅ ver menu → lista completa");
  });

  _test("quiero papas → solo papas", async () => {
    const res = await getResponse("quiero papas");
    const text = res.text.toLowerCase();
    
    const hasPapas = text.includes("gajo") || text.includes("loaded");
    const hasCombo = text.includes("mixto") || text.includes("power") || text.includes("callejero");
    
    if (!hasPapas) {
      throw new Error(`Papas not found in response. Got:\n${res.text}`);
    }
    if (hasCombo) {
      throw new Error(`Unexpected combos found in category-filtered response. Got:\n${res.text}`);
    }
    console.log("✅ quiero papas → solo papas");
  });

  _test("no se → recomendaciones", async () => {
    const res = await getResponse("no se");
    const text = res.text.toLowerCase();
    
    // RECOMMEND intent usually contains "recomiendo", "sugiero" or similar conversational hooks
    const isRecommendation = text.includes("recomiendo") || text.includes("sugiero") || text.includes("prueba") || text.includes("opciones");
    
    if (!isRecommendation) {
      throw new Error(`Response does not look like a recommendation. Got:\n${res.text}`);
    }
    console.log("✅ no se → recomendaciones");
  });

  _test("combo sin salchicha → filtrado correcto", async () => {
    const res = await getResponse("combo sin salchicha");
    const text = res.text.toLowerCase();
    
    // "Combo Callejero" contains salchicha, so it must be excluded
    if (text.includes("callejero")) {
      throw new Error(`Product with salchicha (Combo Callejero) was NOT filtered out. Got:\n${res.text}`);
    }
    
    // It should still recommend other combos like "Combo Mixto"
    if (!text.includes("mixto") && !text.includes("power")) {
      throw new Error(`Safe combos not found in filtered recommendations. Got:\n${res.text}`);
    }
    console.log("✅ combo sin salchicha → filtrado correcto");
  });
}

if (typeof describe === 'undefined') {
  console.log('=== RESPONSE ENGINE TESTS ===\n');
  runTests().then(() => console.log('\nAll response tests passed! 🚀'));
} else {
  describe('Response Engine Modular', () => {
    runTests();
  });
}

import './env-setup';
import { handleMessageModular, INITIAL_STATE } from '@/core/responseEngine';

// Real product data for testing
const mockProducts: any[] = [
  { id: '1', name: 'Combo Mixto 911', price: 239, category: 'combos', description: 'Boneless 150g, Alitas 6pz, Papas, Bebida' },
  { id: '2', name: 'Boneless Power 911', price: 149, category: 'combos', description: 'Boneless 250g, Papas, Bebida' },
  { id: '3', name: 'Alitas Fuego 911', price: 139, category: 'combos', description: 'Alitas 12pz, Papas, Bebida' },
  { id: '4', name: 'Combo Callejero 911', price: 169, category: 'combos', description: 'Banderilla, Salchipapas, Bebida' },
  { id: '5', name: 'Combo Banderilla Suprema', price: 139, category: 'combos', description: '2 Banderillas, Papas con queso, Bebida' },
  { id: '6', name: 'Combo Dedos de Queso + Papas', price: 129, category: 'combos', description: 'Dedos de queso, Papas clásicas, Bebida' },
  { id: '7', name: 'Papas 911 Loaded', price: 139, category: 'combos', description: 'Papas grandes, Queso, Tocino, Jalapeños, Bebida' },
  { id: '8', name: 'Boneless 250g', price: 129, category: 'proteina', description: 'Con papas chicas' },
  { id: '9', name: 'Alitas 6 piezas', price: 115, category: 'proteina', description: 'Con papas chicas' },
  { id: '10', name: 'Papas Clásicas', price: 39, category: 'papas', description: '' },
  { id: '11', name: 'Papas con Queso', price: 59, category: 'papas', description: 'Cheddar fundido + tocino' },
  { id: '12', name: 'Salchipapas', price: 79, category: 'papas', description: 'Salchicha + papas + vegetales' },
  { id: '13', name: 'Banderilla Coreana', price: 69, category: 'banderillas', description: 'Empanizada con salsa especial' },
  { id: '14', name: 'Dedos de Queso', price: 75, category: 'banderillas', description: '6 piezas' },
  { id: '15', name: 'Refresco 400ml', price: 25, category: 'bebidas', description: '' },
  { id: '16', name: 'Salsa Extra', price: 12, category: 'extras', description: '' },
  { id: '17', name: 'Dip Extra', price: 15, category: 'extras', description: '' }
];

// Mock ProductRefs since handleMessageModular expects it
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

async function testCase(input: string, forbidden: string[]) {
  console.log(`Testing: "${input}"`);
  
  // Call handleMessageModular with the mock products override
  const output = await handleMessageModular(
    input, 
    { ...INITIAL_STATE, allergies: [] }, 
    mockProductRefs,
    undefined,
    mockProducts
  );

  // Separate the response into confirmation part and recommendation part
  // We look for patterns like "Te recomendamos:", "Te sugiero estas opciones:", etc.
  const responseText = output.text.toLowerCase();
  const recommendationMarkers = ["te recomendamos", "te sugiero", "opciones:", "productos seguros:", "puedes probar:"];
  
  let recommendationPart = "";
  let foundMarker = false;
  
  for (const marker of recommendationMarkers) {
    if (responseText.includes(marker)) {
      recommendationPart = responseText.split(marker)[1];
      foundMarker = true;
      break;
    }
  }

  // If no marker found, we check the whole text but exclude the first sentence which usually repeats the allergy
  if (!foundMarker) {
    const sentences = output.text.split(/[.!\n]/);
    recommendationPart = sentences.slice(1).join(" ").toLowerCase();
  } else {
    recommendationPart = recommendationPart.toLowerCase();
  }
  
  const found = forbidden.filter(f => recommendationPart.includes(f.toLowerCase()));

  if (found.length > 0) {
    console.log(`❌ FAIL: Recommendations contain forbidden items: [${found.join(', ')}]`);
    console.log(`Response: ${output.text}`);
  } else {
    console.log(`✅ PASS`);
    // Log the recommendations if they were found
    if (foundMarker) {
        const lines = output.text.split('\n').filter(l => l.includes('🍗') || l.includes('•'));
        if (lines.length > 0) console.log(`Items: ${lines.join(' | ')}`);
    }
  }
  console.log('-----------------------------------');
}

async function runTests() {
  console.log('=== ALLERGY FILTER TEST (DB PRODUCTS) ===\n');
  const forbidden = ["salchipapas", "banderilla", "salchicha"];

  await testCase("soy alergico a la salchicha", forbidden);
  await testCase("alérgico a salchicha", forbidden);
  await testCase("no puedo comer salchicha", forbidden);
  await testCase("papas sin salchicha", forbidden);
  await testCase("quiero algo que no tenga salchicha", forbidden);
  await testCase("busco algo sin salchicha", forbidden);
  await testCase("salchicha", forbidden); // Direct mention
  await testCase("dame un combo", forbidden); // Should not recommend Salchipapas or Banderilla combos
}

runTests().catch(console.error);

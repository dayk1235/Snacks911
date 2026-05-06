import { handleMessageModular, INITIAL_STATE } from '@/core/responseEngine';
import { products } from '@/data/products';

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
  
  const output = await handleMessageModular(
    input, 
    { ...INITIAL_STATE, allergies: [] }, 
    mockProductRefs
  );

  // We only care about forbidden terms in the recommendations section
  // If the response contains "Te recomendamos", we check only the part after it.
  let textToCheck = output.text;
  if (textToCheck.includes('Te recomendamos')) {
    textToCheck = textToCheck.split('Te recomendamos')[1];
  }

  const containsForbidden = forbidden.some(f => 
    textToCheck.toLowerCase().includes(f.toLowerCase())
  );

  if (containsForbidden) {
    const found = forbidden.filter(f => textToCheck.toLowerCase().includes(f.toLowerCase()));
    console.log(`❌ FAIL: Recommendations contain forbidden terms: [${found.join(', ')}]`);
    console.log(`Response: ${output.text}`);
  } else {
    console.log(`✅ PASS`);
  }
  console.log('-----------------------------------');
}

async function runTests() {
  const forbidden = ["salchipapas", "banderilla", "salchicha"];

  await testCase("soy alergico a la salchicha", forbidden);
  await testCase("alérgico a salchicha", forbidden);
  await testCase("no puedo comer salchicha", forbidden);
  await testCase("soy alérgico a la salchicha", forbidden);
  await testCase("papas sin salchicha", forbidden);
  await testCase("dame un combo", forbidden);
}

runTests().catch(console.error);

import '../tests/env-setup';
import { getBotResponse } from '../botEngine';
import { dbGetProducts } from '../../lib/db.server';
import { getCustomerProfileFromDB } from '../../lib/db.server';

// Mock simple behavior if needed, but here we want to test the REAL engine logic
// against mock data.

const mockProducts = [
  { id: '1', name: 'Combo Mixto 911', price: 249, category: 'combos' },
  { id: '12', name: 'Salchipapas', price: 85, category: 'papas' },
  { id: '10', name: 'Papas Clásicas', price: 45, category: 'papas' },
  { id: '13', name: 'Banderilla Coreana', price: 79, category: 'banderillas' },
  { id: '11', name: 'Papas con Queso', price: 65, category: 'papas' },
];

async function runManualTest() {
  console.log('ENV URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const phone = '521234567890';
  const cases = [
    { input: 'hola', expected: 'SHOW_MENU' },
    { input: 'quiero boneless', expected: 'ADD_TO_CART' },
    { input: 'agrega papas', expected: 'ADD_TO_CART' },
    { input: 'ver carrito', expected: 'VIEW_CART' },
    { input: 'confirmar', expected: 'CONFIRM_ORDER' }
  ];

  let correct = 0;

  for (const c of cases) {
    const res = await getBotResponse({ message: c.input, phone });

    console.log('\n🧑', c.input);
    console.log('🤖', res.text);
    console.log('🎯 Intent:', res.intent);

    if (res.intent === c.expected) correct++;
  }

  console.log('\nSCORE:', correct, '/', cases.length);
}

runManualTest().catch(console.error);

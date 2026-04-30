/**
 * syncAllProducts.ts — PRODUCTION MENU SYNC SCRIPT.
 * Syncs the real menu items to Supabase. This is the source of truth for production.
 * Run: npx tsx scripts/syncAllProducts.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const products = [
  // Combos (made from existing items)
  { id: 'p_combo_911', name: '🔥 Combo 911', price: 119, category: 'combos', image_url: '/images/combo.webp', is_available: true, description: 'Alitas BBQ + Papas Gajo + Refresco. El clásico que no falla.', applicable_product_ids: [] },
  { id: 'p_combo_boneless', name: '🍗 Combo Boneless', price: 99, category: 'combos', image_url: '/images/combo.webp', is_available: true, description: 'Boneless Clásico + Papas Loaded. Crujiente, jugoso y perfecto.', applicable_product_ids: [] },
  { id: 'p_combo_callejero', name: '🌮 Combo Callejero', price: 89, category: 'combos', image_url: '/images/combo.webp', is_available: true, description: 'Papas Loaded x2 + Refresco. Estilo callejero, sabor de verdad.', applicable_product_ids: [] },
  // Alitas
  { id: 'p_alitas_bbq', name: 'Alitas BBQ', price: 89, category: 'alitas', image_url: '/images/alitas.webp', is_available: true, description: 'Crujientes por fuera, jugosas por dentro. Bañadas en BBQ ahumada 🍯', applicable_product_ids: [] },
  { id: 'p_alitas_buffalo', name: 'Alitas Buffalo', price: 89, category: 'alitas', image_url: '/images/alitas.webp', is_available: true, description: 'Mantequilla derretida + picante. Las que no puedes dejar de comer 🔥', applicable_product_ids: [] },
  // Boneless
  { id: 'p_boneless_clasico', name: 'Boneless Clásico', price: 79, category: 'boneless', image_url: '/images/boneless.webp', is_available: true, description: 'Dorados, suaves y con salsa perfecta. Imposible comer solo uno 😋', applicable_product_ids: [] },
  { id: 'p_boneless_inferno', name: 'Boneless Inferno', price: 79, category: 'boneless', image_url: '/images/boneless.webp', is_available: true, description: 'Solo para valientes. Picante real que te va a hacer sudar 💀🌶️', applicable_product_ids: [] },
  // Papas
  { id: 'p_papas_gajo', name: 'Papas Gajo', price: 55, category: 'papas', image_url: '/images/papas.webp', is_available: true, description: 'Crujientes, doradas y perfectas para dipear. El acompañante que roba el show 🍟', applicable_product_ids: [] },
  { id: 'p_papas_loaded', name: 'Papas Loaded', price: 69, category: 'papas', image_url: '/images/papas.webp', is_available: true, description: 'Queso derretido + jalapeños + crema. El pecado que vale la pena 🤤', applicable_product_ids: [] },
  // Banderillas
  { id: 'p_banderilla_clasica', name: 'Banderilla Clásica', price: 35, category: 'banderillas', image_url: '/images/combo.webp', is_available: true, description: 'Salchicha empanizada crujiente. Estilo callejero puro 🌭', applicable_product_ids: [] },
  { id: 'p_banderilla_queso', name: 'Banderilla con Queso', price: 45, category: 'banderillas', image_url: '/images/combo.webp', is_available: true, description: 'Rellena de queso fundido. Crujiente por fuera, suave por dentro 🧀', applicable_product_ids: [] },
  { id: 'p_banderilla_coreana', name: 'Banderilla Coreana', price: 55, category: 'banderillas', image_url: '/images/combo.webp', is_available: true, description: 'Empanizada con papa y mozzarella. La que está de moda 🔥', applicable_product_ids: [] },
  // Postres
  { id: 'p_brownie_helado', name: 'Brownie con Helado', price: 59, category: 'postres', image_url: '/images/combo.webp', is_available: true, description: 'Chocolate intenso + helado de vainilla. El final perfecto 🍫', applicable_product_ids: [] },
  { id: 'p_churros', name: 'Churros con Chocolate', price: 45, category: 'postres', image_url: '/images/combo.webp', is_available: true, description: 'Crujientes, con salsa de chocolate caliente. Irresistible ✨', applicable_product_ids: [] },
];

async function main() {
  console.log('Syncing all products to Supabase...');

  for (const p of products) {
    const { error } = await supabase.from('products').upsert(p);
    if (error) {
      console.error(`Error syncing ${p.name}:`, error);
    } else {
      console.log(`  ✓ ${p.name} — $${p.price}`);
    }
  }

  console.log('\n✅ All products synced.');
}

main();

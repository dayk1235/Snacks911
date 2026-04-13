/**
 * syncCombosToDb.ts — Script to sync the 3 combo structure to Supabase.
 * Run: npx tsx scripts/syncCombosToDb.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

// Load env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const combos = [
  {
    id: 'p_combo_base',
    name: '🔥 Combo Base',
    price: 109,
    category: 'combos',
    image_url: '/images/combo.webp',
    available: true,
    description: 'Boneless crujiente + papas. Todo el sabor, sin pensarlo ⚡',
    applicable_product_ids: [],
  },
  {
    id: 'p_combo_911',
    name: '🔥 Combo 911',
    price: 119,
    category: 'combos',
    image_url: '/images/combo.webp',
    available: true,
    description: 'El que todos piden. Boneless, papas loaded y aderezo 🤤',
    applicable_product_ids: [],
  },
  {
    id: 'p_combo_premium',
    name: '💎 Combo Premium',
    price: 189,
    category: 'combos',
    image_url: '/images/combo.webp',
    available: true,
    description: 'Alitas + Boneless + papas loaded. Para cuando el antojo es serio 🍗🔥',
    applicable_product_ids: [],
  },
];

async function main() {
  console.log('Syncing combos to Supabase...');

  // Delete old combos
  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .eq('category', 'combos');
  if (delErr) {
    console.error('Error deleting old combos:', delErr);
    process.exit(1);
  }

  // Insert new combos
  const { error: insErr } = await supabase
    .from('products')
    .insert(combos);
  if (insErr) {
    console.error('Error inserting combos:', insErr);
    process.exit(1);
  }

  console.log('✅ 3 combos synced successfully:');
  combos.forEach(c => console.log(`  • ${c.name} — $${c.price}`));
}

main();

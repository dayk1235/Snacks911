
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const productsData = [
  { "id": 1, "name": "Combo Mixto 911", "price": 249, "category": "combos", "description": "Boneless 150g + Alitas 6pz + Papas + Bebida", "ingredients": ["boneless", "alitas", "papas", "bebida"] },
  { "id": 2, "name": "Boneless Power 911", "price": 155, "category": "combos", "description": "Boneless 250g + Papas + Bebida + Salsa", "ingredients": ["boneless", "papas", "bebida", "salsa"] },
  { "id": 3, "name": "Alitas Fuego 911", "price": 145, "category": "combos", "description": "Alitas 12pz + Papas + Bebida + Salsa", "ingredients": ["alitas", "papas", "bebida", "salsa"] },
  { "id": 4, "name": "Combo Callejero 911", "price": 175, "category": "combos", "description": "Banderilla + Salchipapas + Bebida", "ingredients": ["salchicha", "papa", "bebida"] },
  { "id": 5, "name": "Combo Banderilla Suprema", "price": 149, "category": "combos", "description": "2 Banderillas + Papas con queso + Bebida", "ingredients": ["salchicha", "masa", "papas", "queso", "bebida"] },
  { "id": 6, "name": "Combo Dedos de Queso + Papas", "price": 139, "category": "combos", "description": "Dedos de queso + Papas clásicas + Bebida", "ingredients": ["queso", "papas", "bebida"] },
  { "id": 7, "name": "Papas 911 Loaded", "price": 149, "category": "combos", "description": "Papas grandes + Queso + Tocino + Jalapeños + Bebida", "ingredients": ["papas", "queso", "tocino", "jalapeños", "bebida"] },
  { "id": 8, "name": "Boneless 250g", "price": 139, "category": "proteina", "description": "Con papas chicas y salsa a elegir", "ingredients": ["pollo", "papas"] },
  { "id": 9, "name": "Alitas (6 piezas)", "price": 125, "category": "proteina", "description": "Con papas chicas y salsa a elegir", "ingredients": ["alitas", "papas"] },
  { "id": 10, "name": "Papas clásicas", "price": 45, "category": "papas", "description": "Con sal y especias 911", "ingredients": ["papas"] },
  { "id": 11, "name": "Papas con queso", "price": 65, "category": "papas", "description": "Cheddar fundido + tocino", "ingredients": ["papas", "queso", "tocino"] },
  { "id": 12, "name": "Salchipapas", "price": 85, "category": "papas", "description": "Salchicha + papas + vegetales + salsas", "ingredients": ["salchicha", "papa"] },
  { "id": 13, "name": "Banderilla coreana", "price": 79, "category": "banderillas", "description": "Empanizada con salsa especial", "ingredients": ["salchicha", "masa"] },
  { "id": 14, "name": "Dedos de queso", "price": 85, "category": "banderillas", "description": "6 piezas + salsa marinara", "ingredients": ["queso", "masa"] },
  { "id": 15, "name": "Refresco 400 ml", "price": 30, "category": "bebidas", "description": "Coca, Sprite, Fanta, Manzanita", "ingredients": ["bebida"] },
  { "id": 16, "name": "Salsas BBQ / Mango Habanero", "price": 12, "category": "extras", "description": "BBQ o Mango Habanero", "ingredients": ["salsa"] },
  { "id": 17, "name": "Dips Parmesano / Queso Cheddar", "price": 15, "category": "extras", "description": "Parmesano o Queso Cheddar", "ingredients": ["queso"] }
];

async function run() {
  console.log('Cleaning products table...');
  const { error: delError } = await supabase
    .from('products')
    .delete()
    .gte('id', 0);

  if (delError) {
    console.error('Error cleaning products:', delError);
    process.exit(1);
  }

  console.log('Inserting 17 products...');
  
  const rows = productsData.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    description: p.description,
    ingredients: p.ingredients || [],
    image_url: '',
    is_available: true,
    applicable_product_ids: []
  }));

  const { error: insError } = await supabase
    .from('products')
    .insert(rows);

  if (insError) {
    console.error('Error inserting products:', insError);
    process.exit(1);
  }

  console.log('Successfully synchronized 17 products.');
}

run();

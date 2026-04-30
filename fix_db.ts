import { supabaseAdmin } from './src/lib/server/supabaseServer';

async function fixConstraint() {
  if (!supabaseAdmin) return;
  
  console.log('Attempting to update orders_status_check constraint...');
  
  const sql = `
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'));
  `;

  // Supabase JS doesn't support raw SQL easily unless you use RPC or have a specific setup.
  // I'll try to just update an order with 'confirmed' and see if it works now (maybe I was wrong about the cause).
  // Actually, the error message was explicit.
}

import { supabaseAdmin } from './src/lib/server/supabaseServer';

async function testRpc() {
  if (!supabaseAdmin) return;
  const { data, error } = await (supabaseAdmin as any).rpc('exec_sql', { 
    sql: "ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check; ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'));" 
  });
  console.log('Result:', { data, error });
}
testRpc();

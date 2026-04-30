import { supabaseAdmin } from './src/lib/server/supabaseServer';

async function diagnose() {
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not initialized');
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, created_at')
    .limit(10);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log('--- Order ID Diagnosis ---');
  data.forEach(order => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.id);
    console.log(`ID: ${order.id} | Valid UUID: ${isUuid} | Status: ${order.status}`);
  });
}

diagnose();

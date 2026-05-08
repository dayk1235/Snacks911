import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listTables() {
  const { data, error } = await supabase
    .from('event_logs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error checking event_logs:', error);
  } else {
    console.log('event_logs table exists. Row count:', data);
  }
}

listTables();

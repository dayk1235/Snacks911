import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS
);

async function checkUser() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_id', 'admin001')
    .maybeSingle();

  if (error) {
    console.error('Error checking user:', error);
  } else {
    console.log('User found:', data);
  }
}

checkUser();

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log('DEBUG: Env setup complete. URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);


import dotenv from 'dotenv';
import path from 'path';

async function test() {
  // Load environment variables
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  // Dynamic import to ensure env is loaded
  const { upsertCustomerProfile, getCustomerProfileFromDB } = await import('../lib/server/supabaseServer');

  const testPhone = '525500000000';
  console.log(`Testing profile for ${testPhone}...`);
  
  await upsertCustomerProfile({
    phone: testPhone,
    name: 'Test User',
    restrictions: ['cacahuates', 'lactosa']
  });
  
  const profile = await getCustomerProfileFromDB(testPhone);
  console.log('Retrieved profile:', profile);
  
  if (profile && profile.restrictions?.includes('cacahuates')) {
    console.log('✅ TEST PASSED: Allergies saved and retrieved.');
  } else {
    console.log('❌ TEST FAILED');
  }
}

test();

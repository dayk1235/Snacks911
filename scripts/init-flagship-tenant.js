import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initFlagshipTenant() {
  console.log('🚀 Inicializando Tenant Principal (Snacks 911)...');

  try {
    // 1. Ensure the 'snacks911' tenant exists
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'snacks911')
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Error fetching tenant: ${fetchError.message}`);
    }

    let tenantId;

    if (existingTenant) {
      console.log('✅ Tenant "snacks911" ya existe.');
      tenantId = existingTenant.id;
    } else {
      console.log('⏳ Creando tenant "snacks911"...');
      const { data: newTenant, error: insertError } = await supabase
        .from('tenants')
        .insert({
          slug: 'snacks911',
          business_name: 'Snacks 911',
          whatsapp_number: '525584507458', // Número principal de WhatsApp
          ai_personality: 'Eres un asistente experto en comida rápida, amable y directo. Tu objetivo es vender snacks y combos con entusiasmo.',
          plan: 'enterprise',
          active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Error creating tenant: ${insertError.message}`);
      }
      
      console.log('✅ Tenant "snacks911" creado con éxito.');
      tenantId = newTenant.id;
    }

    console.log(`📌 Tenant ID: ${tenantId}`);

    // 2. Assign orphan records to this tenant
    console.log('⏳ Migrando datos huérfanos al tenant principal...');

    const tables = ['products', 'orders', 'ai_logs', 'loyalty_accounts', 'referral_codes'];

    for (const table of tables) {
      // Check if table exists and has tenant_id column (basic error handling)
      const { error: updateError } = await supabase
        .from(table)
        .update({ tenant_id: tenantId })
        .is('tenant_id', null);

      if (updateError) {
        // Ignorar errores de columnas inexistentes si la tabla aún no tiene tenant_id
        if (updateError.code === 'PGRST204' || updateError.message.includes('column "tenant_id" of relation')) {
          console.warn(`⚠️ La tabla '${table}' no tiene columna 'tenant_id' o está vacía.`);
        } else {
          console.error(`❌ Error actualizando '${table}': ${updateError.message}`);
        }
      } else {
        console.log(`✅ Datos huérfanos en '${table}' vinculados exitosamente.`);
      }
    }

    console.log('🎉 Inicialización completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error crítico durante la inicialización:', error);
    process.exit(1);
  }
}

initFlagshipTenant();

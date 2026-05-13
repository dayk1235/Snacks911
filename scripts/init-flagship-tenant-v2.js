const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log('🚀 Inicializando Snacks 911 como tenant principal...\n');

  // Step 1: check the table structure
  const { data: sample, error: sampleErr } = await supabase
    .from('tenants')
    .select('*')
    .limit(1);

  if (sampleErr) {
    console.error('❌ No se pudo acceder a la tabla tenants:', sampleErr.message);
    console.log('\n💡 Tip: Corre primero las migraciones SQL en supabase/migrations/20260508_saas_multi_tenancy.sql');
    process.exit(1);
  }

  const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
  console.log('📋 Columnas en tenants:', columns.length > 0 ? columns.join(', ') : '(tabla vacía)');

  // Step 2: Build a safe payload based on available columns
  const base = {
    slug: 'snacks911',
    business_name: 'Snacks 911',
    whatsapp_number: '525584507458',
    ai_personality: 'Eres el agente de ventas estrella de Snacks 911. Eres amable, rápido y muy bueno para cerrar ventas.',
    active: true,
  };

  const optionals = {
    primary_color: '#FF4500',
    plan: 'enterprise',
  };

  const payload = { ...base };
  for (const [k, v] of Object.entries(optionals)) {
    if (columns.includes(k) || columns.length === 0) {
      payload[k] = v;
    }
  }

  // Step 3: Upsert the tenant
  const { data, error } = await supabase
    .from('tenants')
    .upsert(payload, { onConflict: 'slug' })
    .select('id')
    .single();

  if (error) {
    // Retry without optional columns
    console.warn('⚠️  Primer intento falló, reintentando sin columnas opcionales...');
    const { data: d2, error: e2 } = await supabase
      .from('tenants')
      .upsert(base, { onConflict: 'slug' })
      .select('id')
      .single();
    if (e2) {
      console.error('❌ Error al crear tenant:', e2.message);
      process.exit(1);
    }
    Object.assign(data || {}, d2);
    if (!data) Object.assign({}, d2);
    console.log('✅ Tenant snacks911 creado (sin columnas opcionales). ID:', d2.id);
    await assignOrphans(d2.id);
    return;
  }

  console.log('✅ Tenant snacks911 asegurado. ID:', data.id);
  await assignOrphans(data.id);

  console.log('\n🎉 Snacks 911 es oficialmente el Tenant #1 del sistema!');
}

async function assignOrphans(tenantId) {
  console.log('\n⏳ Vinculando registros huérfanos...');
  for (const table of ['products', 'orders', 'ai_logs', 'loyalty_accounts', 'referral_codes']) {
    const { error } = await supabase
      .from(table)
      .update({ tenant_id: tenantId })
      .is('tenant_id', null);
    if (error) {
      console.warn(`   ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table} → vinculado`);
    }
  }
}

run().catch(e => {
  console.error('Error inesperado:', e);
  process.exit(1);
});

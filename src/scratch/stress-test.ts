/**
 * scratch/stress-test.ts — Performance and resilience validation script.
 */

import { logEvent } from '../core/eventLogger';
import { getDailyRevenue, getConversionRate } from '../core/revenueMetrics';
import { sendMessage } from '../core/whatsappClient';
import { checkAlerts } from '../core/alertEngine';
import { supabase } from '../lib/supabase';

async function runStressTest() {
  console.log('🚀 Iniciando Prueba de Estrés - Snacks 911 Engine\n');

  // --- 1. Event Logging Throughput ---
  console.log('📦 Probando volumen de eventos...');
  const startLogs = Date.now();
  const logs = [];
  for (let i = 0; i < 50; i++) {
    const ev = { event_type: 'cart_created', payload_json: { test_id: i } };
    logs.push(logEvent(ev as any));
  }
  await Promise.all(logs);
  console.log(`✅ 50 eventos registrados en ${Date.now() - startLogs}ms`);

  const { count: totalInDb } = await supabase.from('event_logs').select('*', { count: 'exact', head: true });
  console.log(`📊 Total de eventos en DB: ${totalInDb}`);

  // --- 2. Analytics Performance ---
  console.log('\n📊 Probando velocidad de Analytics...');
  const startMetrics = Date.now();
  const revenue = await getDailyRevenue(new Date());
  const conversion = await getConversionRate(new Date());
  console.log(`✅ Métricas calculadas en ${Date.now() - startMetrics}ms`);
  console.log(`   - Ingresos: $${revenue}`);
  console.log(`   - Conversión: ${(conversion * 100).toFixed(1)}%`);

  // --- 3. Circuit Breaker & Resilience ---
  console.log('\n🛡️ Probando Resiliencia (Circuit Breaker)...');
  console.log('   Simulando 3 fallos en API externa...');
  
  for (let i = 0; i < 3; i++) {
    await sendMessage('525500000000', 'Test message');
  }
  
  const startBlocked = Date.now();
  const allowed = await sendMessage('525500000000', 'Should be blocked');
  console.log(`   - ¿Solicitud permitida tras 3 fallos?: ${allowed ? '❌ ERROR' : '✅ BLOQUEADA (Circuito Abierto)'}`);

  // --- 4. Alert Engine ---
  console.log('\n🚨 Probando Motor de Alertas...');
  const activeAlerts = await checkAlerts();
  console.log(`✅ Alertas activas detectadas: ${activeAlerts.length}`);
  activeAlerts.forEach(a => console.log(`   - [${a.severity.toUpperCase()}] ${a.message}`));

  console.log('\n🏁 Prueba de Estrés Finalizada.');
}

runStressTest().catch(console.error);

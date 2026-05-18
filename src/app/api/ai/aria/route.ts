import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/server/apiAuth';
import { getSupabaseAdmin } from '@/lib/db.server';
import { ariaEngine, ARIAContext } from '@/lib/ai/ariaEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authCheck = await requireApiRole(req, ['admin', 'gerente']);
    if (!authCheck.ok) {
      return authCheck.response;
    }

    const body = await req.json().catch(() => ({}));
    const { message, history = [], tenantId = 'snacks911' } = body;

    if (!message) {
      return NextResponse.json({ reply: 'Por favor, envía un mensaje válido.', error: 'Message is required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const baseUrl = new URL(req.url).origin;

    // RECOPILACIÓN DE CONTEXTO (Promise.allSettled)
    const [metricsResult, ordersResult, stockResult, staffResult, revenueResult] = await Promise.allSettled([
      // 1. Métricas operacionales
      fetch(`${baseUrl}/api/admin/metrics`, { headers: req.headers }).then(res => res.json()),
      
      // 2. Pedidos activos
      db.from('orders')
        .select('id, status, total')
        .in('status', ['new', 'preparing', 'ready'])
        .eq('tenant_id', tenantId),

      // 3. Stock crítico (Filtramos en JS porque SupabaseJS no permite lte(columna, columna) sin RPC)
      db.from('products')
        .select('name, stock, stock_minimo, unit')
        .eq('tenant_id', tenantId)
        .eq('active', true),

      // 4. Personal activo
      db.from('employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('active', true),

      // 5. Revenue intelligence (últimas 24h)
      db.from('event_logs')
        .select('strategy_type, outcome, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    ]);

    // Parse Metrics
    let salesToday = -1;
    let avgTicket = -1;
    let dailyGoal = 5000; // Hardcoded fallback

    if (metricsResult.status === 'fulfilled' && metricsResult.value?.data?.today) {
      const today = metricsResult.value.data.today;
      salesToday = today.revenue || 0;
      avgTicket = today.avgTicket || 0;
    }

    // Parse Orders
    const activeOrders = ordersResult.status === 'fulfilled' && !ordersResult.value.error
      ? ordersResult.value.data.length
      : -1;

    // Parse Stock
    const criticalStock = stockResult.status === 'fulfilled' && !stockResult.value.error
      ? stockResult.value.data.filter((p: { name: string; stock: number; stock_minimo: number; unit: string }) => (p.stock || 0) <= (p.stock_minimo || 0))
      : [];

    // Parse Staff
    const activeStaff = staffResult.status === 'fulfilled' && !staffResult.value.error
      ? staffResult.value.data.length
      : -1;

    // Parse Revenue
    let topStrategy = 'N/A';
    let conversionRate = -1;
    let lostSales = -1;

    if (revenueResult.status === 'fulfilled' && !revenueResult.value.error) {
      const events = revenueResult.value.data || [];
      const strategies: Record<string, number> = {};
      let totalConverted = 0;
      let totalAbandoned = 0;

      for (const ev of events) {
        if (ev.outcome === 'converted') {
          totalConverted++;
          if (ev.strategy_type) {
            strategies[ev.strategy_type] = (strategies[ev.strategy_type] || 0) + 1;
          }
        } else if (ev.outcome === 'abandoned') {
          totalAbandoned++;
        }
      }

      lostSales = totalAbandoned;
      conversionRate = events.length > 0 ? totalConverted / events.length : 0;
      
      let maxCount = 0;
      for (const [strat, count] of Object.entries(strategies)) {
        if (count > maxCount) {
          maxCount = count;
          topStrategy = strat;
        }
      }
    }

    // Construir ARIAContext
    const context: ARIAContext = {
      salesToday,
      dailyGoal,
      activeOrders,
      activeStaff,
      avgTicket,
      topStrategy,
      conversionRate,
      lostSales,
      criticalStock,
      tenantName: 'Snacks 911',
      tenantId,
      date: new Date().toISOString()
    };

    // Llamar al motor ARIA
    const aiResult = await ariaEngine.query({
      userMessage: message,
      context,
      history
    });

    return NextResponse.json({
      reply: aiResult.text,
      model: aiResult.model,
      contextSnapshot: context
    });

  } catch (err: any) {
    console.error('[api/ai/aria] Error inesperado:', err);
    return NextResponse.json(
      { 
        reply: 'Disculpa, ocurrió un error interno al consultar mis sistemas de datos. Intenta de nuevo en unos minutos.',
        error: err.message 
      },
      { status: 500 }
    );
  }
}
